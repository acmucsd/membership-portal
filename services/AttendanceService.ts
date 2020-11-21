import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import * as moment from 'moment';
import { ActivityType, PublicAttendance, Uuid } from '../types';
import { Config } from '../config';
import { UserModel } from '../models/UserModel';
import { UserError } from '../utils/Errors';
import Repositories, { TransactionsManager } from '../repositories';

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

  public async getAttendancesForUser(user: UserModel): Promise<PublicAttendance[]> {
    const attendances = await this.transactions.readOnly(async (txn) => Repositories
      .attendance(txn)
      .getAttendancesForUser(user));
    return attendances.map((attendance) => attendance.getPublicAttendance());
  }

  public async attendEvent(user: UserModel, attendanceCode: string, asStaff = false): Promise<PublicAttendance> {
    return this.transactions.readWrite(async (txn) => {
      const event = await Repositories.event(txn).findByAttendanceCode(attendanceCode);
      if (!event) throw new NotFoundError('Oh no! That code didn\'t work.');
      if (!event.isOngoing()) throw new UserError('You can only enter the attendance code during the event!');

      const attendanceRepository = Repositories.attendance(txn);
      const hasAlreadyAttended = await attendanceRepository.hasUserAttendedEvent(user, event);
      if (hasAlreadyAttended) throw new UserError('You have already attended this event');

      const attendedAsStaff = asStaff && user.isStaff() && event.requiresStaff;
      const pointsEarned = attendedAsStaff ? event.pointValue + event.staffPointBonus : event.pointValue;
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity(
        user,
        attendedAsStaff ? ActivityType.ATTEND_EVENT_AS_STAFF : ActivityType.ATTEND_EVENT,
        pointsEarned,
      );
      await Repositories.user(txn).addPoints(user, pointsEarned);

      const attendance = await attendanceRepository.attendEvent(user, event, attendedAsStaff);
      return attendance.getPublicAttendance();
    });
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
      await Repositories.activity(txn).logActivity(user, ActivityType.SUBMIT_EVENT_FEEDBACK, pointsEarned);
      await Repositories.user(txn).addPoints(user, pointsEarned);

      return attendanceWithFeedback.getPublicAttendance();
    });
  }
}
