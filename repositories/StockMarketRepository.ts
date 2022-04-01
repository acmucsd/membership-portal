import { EntityRepository } from 'typeorm';
import { Stock, StockBroker, StockTransactionType } from '../types';
import { UserModel } from '../models/UserModel';
import { BaseRepository } from './BaseRepository';
import { StockModel } from '../models/StockModel';
import { StockTransactionModel } from '../models/StockTransactionModel';

@EntityRepository(StockModel)
export class StockRepository extends BaseRepository<StockModel> {
  public async getStocks(): Promise<StockModel[]> {
    return this.repository.find({ relations: ['transactions'] });
  }

  public async getStockBySymbol(symbol: string): Promise<StockModel> {
    return this.repository.findOne({ where: { symbol } });
  }

  public async createStock(stock: Stock): Promise<StockModel> {
    return this.repository.save(StockModel.create(stock));
  }

  public async updateStockPrice(stock: StockModel, price: number): Promise<StockModel> {
    // what interesting stock brokers we have...
    stock = StockModel.merge(stock, { currentPrice: price });
    return this.repository.save(stock);
  }
}

@EntityRepository(StockTransactionModel)
export class StockTransactionRepository extends BaseRepository<StockTransactionModel> {
  public async getBuysForSymbolAndUser(symbol: string, user: UserModel): Promise<StockTransactionModel[]> {
    return this.repository.find({ where: {
      owner: user,
      stock: {
        symbol,
      },
      type: StockTransactionType.BUY,
    } });
  }

  public async getSellsForSymbolAndUser(symbol: string, user: UserModel): Promise<StockTransactionModel[]> {
    return this.repository.find({ where: {
      owner: user,
      stock: {
        symbol,
      },
      type: StockTransactionType.SELL,
    } });
  }

  public async addBuyTransaction(stock: StockModel, shares: number, broker: StockBroker, user: UserModel) {
    return this.repository.save(StockTransactionModel.create({
      broker,
      owner: user,
      stock,
      numShares: shares,
      type: StockTransactionType.BUY,
    }));
  }

  public async addSellTransaction(stock: StockModel, shares: number, broker: StockBroker, user: UserModel) {
    return this.repository.save(StockTransactionModel.create({
      broker,
      owner: user,
      stock,
      numShares: shares,
      type: StockTransactionType.SELL,
    }));
  }
}
