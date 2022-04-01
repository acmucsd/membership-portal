import { Entity, BaseEntity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany, ManyToOne } from 'typeorm';
import { StockBroker, StockTransactionType, Uuid } from '../types';
import { OrderModel } from './OrderModel';
import { StockModel } from './StockModel';
import { UserModel } from './UserModel';

@Entity('OrderPickupEvents')
export class StockTransactionModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => StockModel, (stock) => stock.transactions, { nullable: false })
  @JoinColumn({ name: 'stock' })
  stock: StockModel;

  @Column('integer')
  numShares: number;

  @ManyToOne((type) => UserModel, (user) => user.stocksOwned, { nullable: false })
  @JoinColumn({ name: 'owner' })
  owner: UserModel;

  @Column('varchar', { length: 255, default: StockBroker.ROBINHOOD_MARKETS })
  broker: StockBroker;

  @Column('varchar', { length: 255 })
  type: StockTransactionType;

  @OneToMany((type) => OrderModel, (order) => order.pickupEvent, { nullable: false })
  @JoinColumn({ name: 'order' })
  transactions: OrderModel[];
}
