import { EntityRepository } from 'typeorm';
import { Uuid } from '@acmucsd/membership-portal-types';
import { AttendanceModel } from '../models/AttendanceModel';
import { UserModel } from '../models/UserModel';
import { EventModel } from '../models/EventModel';
import { BaseRepository } from './BaseRepository';
import { Attendance } from '../../types';

@EntityRepository(AttendanceModel)
export class AttendanceRepository extends BaseRepository<AttendanceModel> {
  public async getAttendancesForUser(user: UserModel): Promise<AttendanceModel[]> {
    return this.repository.find({
      relations: ['user', 'event'],
      where: { user },
      order: { timestamp: 'ASC' },
    });
  }

  public async getAttendancesForEvent(event: Uuid): Promise<AttendanceModel[]> {
    return this.repository.find({
      relations: ['user', 'event'],
      where: { event },
    });
  }

  public async hasUserAttendedEvent(user: UserModel, event: EventModel): Promise<boolean> {
    const count = await this.repository.count({
      where: { user, event },
    });
    return count > 0;
  }

  public async writeAttendance(attendance: Attendance): Promise<AttendanceModel> {
    return this.repository.save(AttendanceModel.create(attendance));
  }

  public async writeAttendanceBatch(attendances: Attendance[]) {
    const attendanceModels = attendances.map((attendance) => AttendanceModel.create(attendance));
    return this.repository.save(attendanceModels);
  }

  public async getUserAttendanceForEvent(user: UserModel, event: EventModel): Promise<AttendanceModel> {
    return this.repository.findOne({ user, event });
  }

  public async submitEventFeedback(attendance: AttendanceModel, feedback: string[]): Promise<AttendanceModel> {
    attendance.feedback = feedback;
    return this.repository.save(attendance);
  }
}
