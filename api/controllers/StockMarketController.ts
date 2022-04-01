import { JsonController, Get, Post, UseBefore, ForbiddenError, Body, Patch } from 'routing-controllers';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import StockMarketService from '../../services/StockMarketService';
import PermissionsService from '../../services/PermissionsService';
import { CreateStockRequest, StockTransactionRequest } from '../../types';

@UseBefore(UserAuthentication)
@JsonController('/stock')
export class StockMarketController {
  private stockMarketService: StockMarketService;

  constructor(stockMarketService: StockMarketService) {
    this.stockMarketService = stockMarketService;
  }

  @Get('/')
  async getStocks(@AuthenticatedUser() user: UserModel) {
    const stocks = await this.stockMarketService.getStocks();
    return { error: null, stocks };
  }

  @Post('/')
  async createStock(@Body() body: CreateStockRequest, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canCreateStocks(user)) throw new ForbiddenError();
    const stock = await this.stockMarketService.createStock(body.stock);
    return { error: null, stock };
  }

  @Patch('/:symbol')
  async updateStockPrice(@Body() body: CreateStockRequest, @AuthenticatedUser() user: UserModel) {
    const stock = await this.stockMarketService.updateStockPrice(body.stock);
    return { error: null, stock };
  }

  @Post('/buy')
  async buyStock(@Body() body: StockTransactionRequest, @AuthenticatedUser() user: UserModel) {
    const { shares, symbol, broker } = body;
    const transaction = await this.stockMarketService.buyStock(user, symbol, shares, broker);
    return { error: null, transaction };
  }

  @Post('/sell')
  async sellStock(@Body() body: StockTransactionRequest, @AuthenticatedUser() user: UserModel) {
    const { shares, symbol, broker } = body;
    const transaction = await this.stockMarketService.sellStock(user, symbol, shares, broker);
    return { error: null, transaction };
  }
}
