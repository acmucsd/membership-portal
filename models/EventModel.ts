import { BaseEntity, Column, Entity, Generated, Index, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { pick } from 'underscore';
import { PublicEvent, Uuid } from '../types';
import { AttendanceModel } from './AttendanceModel';

@Entity('Events')
@Index('event_start_end_index', ['start', 'end'])
export class EventModel extends BaseEntity {
  @Column({ select: false })
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column({ default: 'ACM' })
  organization: string;

  @Column({ default: 'ACM' })
  @Index()
  committee: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ nullable: true })
  cover: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  location: string;

  @Column({ nullable: true })
  eventLink: string;

  @Column('timestamptz')
  start: Date;

  @Column('timestamptz')
  end: Date;

  @Column()
  @Index({ unique: true })
  attendanceCode: string;

  @Column()
  pointValue: number;

  @Column({ default: false })
  deleted: boolean;

  @Column({ default: false })
  requiresStaff: boolean;

  @Column({ default: 0 })
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
