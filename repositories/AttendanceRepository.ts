import { DataSource } from 'typeorm';
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
      return this.find({
        relations: ['user', 'event'],
        where: { user },
        order: { timestamp: 'ASC' },
      });
    },

    async getAttendancesForEvent(event: Uuid): Promise<AttendanceModel[]> {
      return this.find({
        where: { event: { uuid: event } },
        relations: ['user', 'event'],
      });
    },

    async hasUserAttendedEvent(user: UserModel, event: EventModel): Promise<boolean> {
      console.log('Checking if user has attended event', user, event);
      const count = await this.count({
        where: { user: user, event: event },
      });
      return count > 0;
    },

    async writeAttendance(attendance: Attendance): Promise<AttendanceModel> {
      return this.save(this.create(attendance));
    },

    async writeAttendanceBatch(attendances: Attendance[]) {
      const attendanceModels = attendances.map((attendance) => this.create(attendance));
      return this.save(attendanceModels);
    },

    async getUserAttendanceForEvent(user: UserModel, event: EventModel): Promise<AttendanceModel> {
      return this.findOne({ where: { user, event } });
    },

    async submitEventFeedback(attendance: AttendanceModel, feedback: string[]): Promise<AttendanceModel> {
      attendance.feedback = feedback;
      return this.save(attendance);
    },
  });

export const ExpressCheckinRepository = Container.get(DataSource)
  .getRepository(ExpressCheckinModel)
  .extend({
    async getPastExpressCheckin(email: string): Promise<ExpressCheckinModel> {
      return this.findOne({ where: { email }, relations: ['event'] });
    },

    async createExpressCheckin(email: string, event: EventModel): Promise<ExpressCheckinModel> {
      return this.save(this.create({ email, event }));
    },
  });
