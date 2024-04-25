import { BaseEntity, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PublicExpressCheckin, Uuid } from '@customtypes';
import { EventModel } from '@models';

@Entity('ExpressCheckins')
export class ExpressCheckinModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column()
  @Index({ unique: true })
  email: string;

  @ManyToOne((type) => EventModel, (event) => event.expressCheckins, { nullable: false })
  @JoinColumn({ name: 'event' })
  event: EventModel;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)' })
  timestamp: Date;

  public getPublicExpressCheckin(): PublicExpressCheckin {
    return {
      email: this.email,
      event: this.event.getPublicEvent(),
      timestamp: this.timestamp,
    };
  }
}
