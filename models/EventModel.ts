import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { pick } from 'underscore';
import { PublicEvent, Uuid } from '../types';
import { AttendanceModel } from './AttendanceModel';

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

  public getPublicEvent(canSeeAttendanceCode = false): PublicEvent {
    const publicEvent: PublicEvent = pick(this, [
      'uuid',
      'organization',
      'committee',
      'thumbnail',
      'cover',
      'title',
      'description',
      'location',
      'eventLink',
      'start',
      'end',
      'pointValue',
      'requiresStaff',
      'staffPointBonus',
    ]);
    if (canSeeAttendanceCode) publicEvent.attendanceCode = this.attendanceCode;
    return publicEvent;
  }

  public isOngoing(): boolean {
    const now = new Date();
    return now >= this.start && now <= this.end;
  }
}
