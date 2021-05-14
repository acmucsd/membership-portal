import { Entity, BaseEntity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { PublicAttendance, Uuid } from '../types';
import { UserModel } from './UserModel';
import { EventModel } from './EventModel';

@Entity('Attendances')
export class AttendanceModel extends BaseEntity {
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

  @Column('boolean', { default: false })
  asStaff: boolean;

  @Column({
    type: 'text',
    transformer: {
      to(value: string[]) {
        return JSON.stringify(value);
      },
      from(value: string) {
        return JSON.parse(value);
      },
    },
    nullable: true,
  })
  feedback: string[];

  public getPublicAttendance(): PublicAttendance {
    return {
      user: this.user?.getPublicProfile(),
      event: this.event?.getPublicEvent(),
      timestamp: this.timestamp,
      asStaff: this.asStaff,
      feedback: this.feedback,
    };
  }
}
