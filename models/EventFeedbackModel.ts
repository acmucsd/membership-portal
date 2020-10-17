import { BaseEntity, Column, Entity, Generated, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PublicEventFeedback, Uuid } from '../types';
import { EventModel } from './EventModel';
import { UserModel } from './UserModel';

@Entity('EventFeedback')
export class EventFeedbackModel extends BaseEntity {
  @Column({ select: false })
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => EventModel, (event) => event.feedback, { nullable: false })
  @JoinColumn({ name: 'event' })
  @Index('event_feedback_by_event_index')
  event: EventModel;

  @ManyToOne((type) => UserModel, (user) => user.eventFeedback, { nullable: false })
  @JoinColumn({ name: 'user' })
  @Index('event_feedback_by_user_index')
  user: UserModel;

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
  })
  comments: string[];

  public getPublicEventFeedback(): PublicEventFeedback[] {
    return this.comments.map((comment) => ({
      uuid: this.uuid,
      user: this.user.uuid,
      comment,
    }));
  }
}
