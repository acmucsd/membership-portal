import { BaseEntity, DataSource, DeepPartial } from 'typeorm';
import Container from 'typedi';
import { ExpressCheckinModel } from '../models/ExpressCheckinModel';
import { Uuid } from '../types';
import { AttendanceModel } from '../models/AttendanceModel';
import { UserModel } from '../models/UserModel';
import { EventModel } from '../models/EventModel';
import { Attendance } from '../types/internal';

export const AttendanceRepository = Container.get(DataSource)
  .getRepository(AttendanceModel)
  .extend({
    async getAttendancesForUser(user: UserModel): Promise<AttendanceModel[]> {
      return this.repository.find({
        relations: ['user', 'event'],
        where: { user },
        order: { timestamp: 'ASC' },
      });
    },

    async getAttendancesForEvent(event: Uuid): Promise<AttendanceModel[]> {
      return this.repository.find({
        relations: ['user', 'event'],
        where: { event },
      });
    },

    async hasUserAttendedEvent(user: UserModel, event: EventModel): Promise<boolean> {
      const count = await this.repository.count({
        where: { user, event },
      });
      return count > 0;
    },

    async writeAttendance(attendance: Attendance): Promise<AttendanceModel> {
      return this.repository.save(AttendanceModel.create(attendance as DeepPartial<AttendanceModel>));
    },

    async writeAttendanceBatch(attendances: Attendance[]) {
      const attendanceModels = attendances.map((attendance) => AttendanceModel.create(attendance as DeepPartial<AttendanceModel>));
      return this.repository.save(attendanceModels);
    },

    async getUserAttendanceForEvent(user: UserModel, event: EventModel): Promise<AttendanceModel> {
      return this.repository.findOne({ user, event });
    },

    async submitEventFeedback(attendance: AttendanceModel, feedback: string[]): Promise<AttendanceModel> {
      attendance.feedback = feedback;
      return this.repository.save(attendance);
    },
  });

export const ExpressCheckinRepository = Container.get(DataSource)
  .getRepository(ExpressCheckinModel)
  .extend({
    async getPastExpressCheckin(email: string): Promise<ExpressCheckinModel> {
      return this.repository.findOne({ where: { email }, relations: ['event'] });
    },

    async createExpressCheckin(email: string, event: EventModel): Promise<ExpressCheckinModel> {
      return this.repository.save(ExpressCheckinModel.create({ email, event }));
    },
  });
