import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { BadRequestError, ForbiddenError, NotFoundError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import * as moment from 'moment';
import { ActivityType, PublicAttendance, Uuid } from '../types';
import { Config } from '../config';
import { UserModel } from '../models/UserModel';
import { EventModel } from '../models/EventModel';
import { AttendanceModel } from '../models/AttendanceModel';
import { UserError } from '../utils/Errors';
import Repositories, { TransactionsManager } from '../repositories';
import { Activity, Attendance } from '../types/internal';

@Service()
export default class AttendanceService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async getAttendancesForEvent(event: Uuid): Promise<PublicAttendance[]> {
    const attendances = await this.transactions.readOnly(async (txn) => Repositories
      .attendance(txn)
      .getAttendancesForEvent(event));
    return attendances.map((attendance) => attendance.getPublicAttendance());
  }

  public async getAttendancesForCurrentUser(user: UserModel): Promise<PublicAttendance[]> {
    const attendances = await this.transactions.readOnly(async (txn) => Repositories
      .attendance(txn)
      .getAttendancesForUser(user));
    return attendances.map((attendance) => attendance.getPublicAttendance());
  }

  public async getAttendancesForUser(uuid: Uuid): Promise<PublicAttendance[]> {
    return this.transactions.readOnly(async (txn) => {
      const user = await Repositories.user(txn).findByUuid(uuid);
      if (!user) throw new NotFoundError('User does not exist');
      if (!user.isAttendancePublic) throw new ForbiddenError();
      const attendances = await Repositories.attendance(txn).getAttendancesForUser(user);
      return attendances.map((attendance) => attendance.getPublicAttendance());
    });
  }

  public async attendEvent(user: UserModel, attendanceCode: string, asStaff = false): Promise<PublicAttendance> {
    return this.transactions.readWrite(async (txn) => {
      const event = await Repositories.event(txn).findByAttendanceCode(attendanceCode);
      if (!event) throw new NotFoundError('Oh no! That code didn\'t work.');
      if (event.isTooEarlyToAttendEvent()) {
        throw new UserError('This event hasn\'t started yet, please wait to check in.');
      }
      if (event.isTooLateToAttendEvent()) {
        throw new UserError('This event has ended and is no longer accepting attendances');
      }

      const hasAlreadyAttended = await Repositories.attendance(txn).hasUserAttendedEvent(user, event);
      if (hasAlreadyAttended) throw new UserError('You have already attended this event');

      const attendance = await this.writeEventAttendance(user, event, asStaff, txn);
      return attendance.getPublicAttendance();
    });
  }

  private async writeEventAttendance(user: UserModel, event: EventModel, asStaff: boolean,
    txn: EntityManager): Promise<AttendanceModel> {
    const attendedAsStaff = asStaff && user.isStaff() && event.requiresStaff;
    const pointsEarned = attendedAsStaff ? event.pointValue + event.staffPointBonus : event.pointValue;

    await Repositories.activity(txn).logActivity({
      user,
      pointsEarned,
      type: attendedAsStaff ? ActivityType.ATTEND_EVENT_AS_STAFF : ActivityType.ATTEND_EVENT,
    });
    await Repositories.user(txn).addPoints(user, pointsEarned);
    return Repositories.attendance(txn).writeAttendance({
      user,
      event,
      asStaff: attendedAsStaff,
    });
  }

  public async submitAttendanceForUsers(emails: string[], eventUuid: Uuid, asStaff = false,
    proxyUser: UserModel): Promise<PublicAttendance[]> {
    return this.transactions.readWrite(async (txn) => {
      const event = await Repositories.event(txn).findByUuid(eventUuid);
      if (!event) throw new NotFoundError('This event doesn\'t exist');

      const users = await Repositories.user(txn).findByEmails(emails);
      const emailsFound = users.map((user) => user.email);
      const emailsNotFound = emails.filter((email) => !emailsFound.includes(email));

      if (emailsNotFound.length > 0) {
        throw new BadRequestError(`Couldn't find accounts matching these emails: ${emailsNotFound}`);
      }

      const userAttendancesOfEvent = await this.haveUsersAttendedEvent(users, event, txn);
      const usersThatHaventAttended = Array.from(userAttendancesOfEvent.entries())
        .filter(([_user, hasAttended]) => !hasAttended)
        .map(([user, _hasAttended]) => user);

      return this.batchWriteEventAttendance(usersThatHaventAttended, event, asStaff, proxyUser, txn);
    });
  }

  private async haveUsersAttendedEvent(users: UserModel[], event: EventModel,
    txn: EntityManager): Promise<Map<UserModel, boolean>> {
    const attendances = await Repositories.attendance(txn).getAttendancesForEvent(event.uuid);
    const usersThatAttended = attendances.map((attendance) => attendance.user.uuid);
    return new Map(users.map((user) => [user, usersThatAttended.includes(user.uuid)]));
  }

  private async batchWriteEventAttendance(users: UserModel[], event: EventModel, asStaff: boolean,
    proxyUser: UserModel, txn: EntityManager): Promise<AttendanceModel[]> {
    const attendances: Attendance[] = [];
    const activities: Activity[] = [];

    users.forEach((user) => {
      const attendedAsStaff = asStaff && user.isStaff() && event.requiresStaff;
      const description = `Attendance submitted on behalf of user by ${proxyUser.uuid}`;

      const attendance = {
        user,
        event,
        asStaff: attendedAsStaff,
      };
      const activity = {
        user,
        type: attendedAsStaff ? ActivityType.ATTEND_EVENT_AS_STAFF : ActivityType.ATTEND_EVENT,
        pointsEarned: attendedAsStaff ? event.pointValue + event.staffPointBonus : event.pointValue,
        description,
      };

      attendances.push(attendance);
      activities.push(activity);
    });

    await Repositories.user(txn).addPointsByActivities(activities);
    await Repositories.activity(txn).logActivityBatch(activities);
    return Repositories.attendance(txn).writeAttendanceBatch(attendances);
  }

  public async submitEventFeedback(feedback: string[], eventUuid: Uuid, user: UserModel): Promise<PublicAttendance> {
    return this.transactions.readWrite(async (txn) => {
      const attendanceRepository = Repositories.attendance(txn);

      const event = await Repositories.event(txn).findByUuid(eventUuid);
      if (!event) throw new NotFoundError('Event not found');

      const attendance = await attendanceRepository.getUserAttendanceForEvent(user, event);
      if (!attendance) throw new UserError('You must attend this event before submiting feedback');
      if (attendance.feedback) throw new UserError('You cannot submit feedback for this event more than once');

      const twoDaysPastEventEnd = moment(event.end).add(2, 'days').valueOf();
      if (moment.now() > twoDaysPastEventEnd) {
        throw new UserError('You must submit feedback within 2 days of the event ending');
      }

      const attendanceWithFeedback = await attendanceRepository.submitEventFeedback(attendance, feedback);
      const pointsEarned = Config.pointReward.EVENT_FEEDBACK_POINT_REWARD;
      await Repositories.activity(txn).logActivity({
        user,
        type: ActivityType.SUBMIT_EVENT_FEEDBACK,
        pointsEarned,
      });
      await Repositories.user(txn).addPoints(user, pointsEarned);

      return attendanceWithFeedback.getPublicAttendance();
    });
  }
}
