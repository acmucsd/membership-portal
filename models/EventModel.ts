import * as moment from 'moment';
import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { PublicEvent, Uuid } from '../types';
import { AttendanceModel } from './AttendanceModel';
import { ExpressCheckinModel } from './ExpressCheckinModel';

@Entity('Events')
@Index('event_start_end_index', ['start', 'end'])
export class EventModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column('varchar', { length: 255, default: 'ACM' })
  organization: string;

  @Column('varchar', { length: 255, default: 'ACM' })
  @Index()
  committee: string;

  @Column('varchar', { length: 255, nullable: true })
  thumbnail: string;

  @Column('varchar', { length: 255, nullable: true })
  cover: string;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column('varchar', { length: 255 })
  location: string;

  @Column('varchar', { length: 255, nullable: true })
  eventLink: string;

  @Column('timestamptz')
  start: Date;

  @Column('timestamptz')
  end: Date;

  @Column('varchar', { length: 255 })
  @Index({ unique: true })
  attendanceCode: string;

  @Column('integer')
  pointValue: number;

  @Column('boolean', { default: false })
  deleted: boolean;

  @Column('boolean', { default: false })
  requiresStaff: boolean;

  @Column('integer', { default: 0 })
  staffPointBonus: number;

  @OneToMany((type) => AttendanceModel, (attendance) => attendance.event, { cascade: true })
  attendances: AttendanceModel[];

  @OneToMany((type) => ExpressCheckinModel, (expressCheckin) => expressCheckin.event, { cascade: true })
  expressCheckins: ExpressCheckinModel[];

  @Column('uuid', { nullable: true })
  discordEventUuid: Uuid;

  @Column('uuid', { nullable: true })
  googleCalendarEventUuid: Uuid;

  public getPublicEvent(canSeeAttendanceCode = false): PublicEvent {
    const publicEvent: PublicEvent = {
      uuid: this.uuid,
      organization: this.organization,
      committee: this.committee,
      thumbnail: this.thumbnail,
      cover: this.cover,
      title: this.title,
      description: this.description,
      location: this.location,
      eventLink: this.eventLink,
      start: this.start,
      end: this.end,
      pointValue: this.pointValue,
      requiresStaff: this.requiresStaff,
      staffPointBonus: this.staffPointBonus,
      discordEventUuid: this.discordEventUuid,
      googleCalendarEventUuid: this.googleCalendarEventUuid,
    };
    if (canSeeAttendanceCode) publicEvent.attendanceCode = this.attendanceCode;
    return publicEvent;
  }

  public isTooEarlyToAttendEvent(): boolean {
    const now = new Date();
    const thirtyMinutesBeforeStartOfEvent = moment(this.start).subtract(30, 'minutes').toDate();
    return now < thirtyMinutesBeforeStartOfEvent;
  }

  public isTooLateToAttendEvent(): boolean {
    const now = new Date();
    const thirtyMinutesAfterEndOfEvent = moment(this.end).add(30, 'minutes').toDate();
    return now > thirtyMinutesAfterEndOfEvent;
  }
}
