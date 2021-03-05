import { EntityRepository } from 'typeorm';
import { Uuid } from '../types';
import { AttendanceModel } from '../models/AttendanceModel';
import { UserModel } from '../models/UserModel';
import { EventModel } from '../models/EventModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(AttendanceModel)
export class AttendanceRepository extends BaseRepository<AttendanceModel> {
  public async getAttendancesForUser(user: UserModel): Promise<AttendanceModel[]> {
    return this.repository.find({
      relations: ['event'],
      where: { user },
      order: { timestamp: 'ASC' },
    });
  }

  public async getAttendancesForEvent(event: Uuid): Promise<AttendanceModel[]> {
    return this.repository.find({
      relations: ['user'],
      where: { event },
    });
  }

  public async hasUserAttendedEvent(user: UserModel, event: EventModel): Promise<boolean> {
    const count = await this.repository.count({
      where: { user, event },
    });
    return count > 0;
  }

  public async attendEvent(user: UserModel, event: EventModel, asStaff: boolean): Promise<AttendanceModel> {
    const attendance = {
      user,
      event,
      asStaff,
    };
    return this.repository.save(AttendanceModel.create(attendance));
  }

  public async batchAttendEvent(users: UserModel[], event: EventModel, asStaffBatch: boolean[]) {
    const attendances: AttendanceModel[] = [];
    for (let i = 0; i < users.length; i += 1) {
      const attendance = {
        user: users[i],
        event,
        asStaff: asStaffBatch[i],
      };
      attendances.push(AttendanceModel.create(attendance));
    }
    return this.repository.save(attendances);
  }

  public async getUserAttendanceForEvent(user: UserModel, event: EventModel): Promise<AttendanceModel> {
    return this.repository.findOne({ user, event });
  }

  public async submitEventFeedback(attendance: AttendanceModel, feedback: string[]): Promise<AttendanceModel> {
    attendance.feedback = feedback;
    return this.repository.save(attendance);
  }
}
