import { Entity, BaseEntity, Column, Generated, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { pick } from 'underscore';
import { PublicAttendance, Uuid } from '../types';
import { UserModel } from './UserModel';
import { EventModel } from './EventModel';

@Entity('Attendances')
export class AttendanceModel extends BaseEntity {
  @Column({ select: false })
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.attendances, { nullable: false })
  @JoinColumn({ name: 'user' })
  @Index('attendances_by_user_index')
  user: UserModel;

  @ManyToOne((type) => EventModel, (event) => event.attendances, { nullable: false })
  @JoinColumn({ name: 'event' })
  @Index('attendances_by_event_index')
  event: EventModel;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)' })
  timestamp: Date;

  @Column({ default: false })
  asStaff: boolean;

  public getPublicAttendance(): PublicAttendance {
    const rawAttendance = pick(this, [
      'user',
      'event',
      'timestamp',
      'asStaff',
    ]);

    const publicAttendance: PublicAttendance = {
      ...rawAttendance,
      event: {
        ...rawAttendance.event,
        feedback: rawAttendance.event.feedback.map((feedback) => feedback.getPublicEventFeedback()),
      },
    };
    if (rawAttendance.user) publicAttendance.user = rawAttendance.user.getPublicProfile();
    if (rawAttendance.event) publicAttendance.event = rawAttendance.event.getPublicEvent();
    return publicAttendance;
  }
}
