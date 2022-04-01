import { Entity, BaseEntity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany } from 'typeorm';
import { Uuid } from '../types';
import { StockTransactionModel } from './StockTransactionModel';

@Entity('OrderPickupEvents')
export class StockModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column('varchar', { length: 5 })
  symbol: string;

  @Column('integer')
  currentPrice: number;

  @OneToMany((type) => StockTransactionModel, (txn) => txn.stock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order' })
  transactions: StockTransactionModel[];
}
