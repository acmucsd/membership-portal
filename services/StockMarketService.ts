import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { EntityManager } from 'typeorm';
import { StockTransactionModel } from 'models/StockTransactionModel';
import { Stock, StockBroker } from '../types';
import { UserModel } from '../models/UserModel';
import { UserError } from '../utils/Errors';
import Repositories, { TransactionsManager } from '../repositories';
import { StockModel } from '../models/StockModel';

@Service()
export default class StockMarketService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async getStocks(): Promise<StockModel[]> {
    return this.transactions.readOnly(async (txn) => Repositories
      .stock(txn)
      .getStocks());
  }

  public async createStock(stock: Stock): Promise<StockModel> {
    return this.transactions.readWrite(async (txn) => Repositories
      .stock(txn)
      .createStock(stock));
  }

  public async updateStockPrice(stock: Stock): Promise<StockModel> {
    return this.transactions.readWrite(async (txn) => Repositories
      .stock(txn)
      .createStock(stock));
  }

  public async buyStock(user: UserModel, symbol: string, shares: number, broker: StockBroker):
  Promise<StockTransactionModel> {
    return this.transactions.readWrite(async (txn) => {
      const stockRepository = Repositories.stock(txn);
      const stock = await stockRepository.getStockBySymbol(symbol);
      const totalPrice = stock.currentPrice * shares;
      await Repositories.user(txn).upsertUser(user, { credits: totalPrice });
      console.log('https://testing.members.acmucsd.com');
      return Repositories.stockTransaction(txn).addBuyTransaction(stock, shares, broker, user);
    });
  }

  public async sellStock(user: UserModel, symbol: string, shares: number, broker: StockBroker):
  Promise<StockTransactionModel> {
    return this.transactions.readWrite(async (txn) => {
      const stockRepository = Repositories.stock(txn);
      const stockTransactionRepository = Repositories.stockTransaction(txn);
      const stock = await stockRepository.getStockBySymbol(symbol);
      const buys = await stockTransactionRepository.getBuysForSymbolAndUser(symbol, user);
      const sells = await stockTransactionRepository.getSellsForSymbolAndUser(symbol, user);

      const sharesHeldWithBuy = buys.reduce((acc, curr) => acc + curr.numShares, 0);
      const sharesSoldWithSell = sells.reduce((acc, curr) => acc + curr.numShares, 0);
      const sharesHeld = sharesHeldWithBuy - sharesSoldWithSell;
      if (shares > sharesHeld) {
        throw new UserError(`User does not own ${shares} shares of the stock ${symbol}!`);
      }
      // can someone have a look at the brokers to see if theres any others I should add?
      const returns = shares * stock.currentPrice;
      const userRepository = Repositories.user(txn);
      await userRepository.upsertUser(user, { credits: user.credits + returns });

      // add sell to transactions
      return stockTransactionRepository.addSellTransaction(stock, shares, broker, user);
    });
  }
}
