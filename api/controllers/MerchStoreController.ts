import {
  JsonController,
  UseBefore,
  Post,
  Get,
  Patch,
  Delete,
  BodyParam,
  Body,
  Param,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from 'routing-controllers';
import { Inject } from 'typedi';
import PermissionsService from '../../services/PermissionsService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { Uuid } from '../../types';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import MerchStoreService from '../../services/MerchStoreService';
import {
  CreateMerchCollectionRequest,
  EditMerchCollectionRequest,
  CreateMerchItemRequest,
  EditMerchItemRequest,
  PlaceOrderRequest,
  FulfillMerchOrderRequest,
} from '../validators/MerchStoreRequests';
import { UserError } from '../../utils/Errors';

@UseBefore(UserAuthentication)
@JsonController('/store')
export class MerchStoreController {
  @Inject()
  private merchStoreService: MerchStoreService;

  @Get('/collection/:uuid')
  async getOneMerchCollection(@Param('uuid') uuid: Uuid, @AuthenticatedUser() user: UserModel) {
    const canSeeHiddenItems = PermissionsService.canEditMerchStore(user);
    const collection = await this.merchStoreService.findCollectionByUuid(uuid, canSeeHiddenItems);
    return { error: null, collection };
  }

  @Get('/collection')
  async getAllMerchCollections(@AuthenticatedUser() user: UserModel) {
    const canSeeInactiveCollections = PermissionsService.canEditMerchStore(user);
    const collections = await this.merchStoreService.getAllCollections(canSeeInactiveCollections);
    return { error: null, collections };
  }

  @Post('/collection')
  async createMerchCollection(@BodyParam('collection') createCollectionRequest: CreateMerchCollectionRequest,
    @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const collection = await this.merchStoreService.createCollection(createCollectionRequest);
    return { error: null, collection };
  }

  @Patch('/collection/:uuid')
  async editMerchCollection(@Param('uuid') uuid: Uuid,
    @BodyParam('collection') editCollectionRequest: EditMerchCollectionRequest, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const collection = await this.merchStoreService.editCollection(uuid, editCollectionRequest);
    return { error: null, collection };
  }

  @Delete('/collection/:uuid')
  async deleteMerchCollection(@Param('uuid') uuid: Uuid, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteCollection(uuid);
    return { error: null };
  }

  @Get('/merchandise/:uuid')
  async getOneMerchItem(@Param('uuid') uuid: Uuid, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.findItemByUuid(uuid);
    return { error: null, item };
  }

  @Post('/merchandise')
  async createMerchItem(@BodyParam('merchandise') createItemRequest: CreateMerchItemRequest,
    @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.createItem(createItemRequest);
    return { error: null, item };
  }

  @Patch('/merchandise/:uuid')
  async editMerchItem(@Param('uuid') uuid: Uuid,
    @BodyParam('merchandise') editItemRequest: EditMerchItemRequest, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.editItem(uuid, editItemRequest);
    return { error: null, item };
  }

  @Delete('/merchandise/:uuid')
  async deleteMerchItem(@Param('uuid') uuid: Uuid, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteItem(uuid);
    return { error: null };
  }

  @Get('/order/:uuid')
  async getOneMerchOrder(@Param('uuid') uuid: Uuid, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const order = await this.merchStoreService.findOrderByUuid(uuid);
    if (!PermissionsService.canSeeMerchOrder(user, order)) throw new NotFoundError();
    return { error: null, order };
  }

  @Get('/order')
  async getAllMerchOrders(@AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const canSeeAllOrders = PermissionsService.canSeeAllMerchOrders(user);
    const orders = await this.merchStoreService.getAllOrders(user, canSeeAllOrders);
    return { error: null, orders };
  }

  @Post('/order')
  async placeMerchOrder(@Body() placeOrderRequest: PlaceOrderRequest, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const originalOrder = placeOrderRequest.order.filter((oi) => oi.quantity > 0);
    const orderIsEmpty = originalOrder.reduce((x, n) => x + n.quantity, 0) === 0;
    if (orderIsEmpty) throw new UserError('There are no items in this order');
    const numUniqueUuids = (new Set(originalOrder.map((oi) => oi.item))).size;
    if (originalOrder.length !== numUniqueUuids) throw new BadRequestError('There are duplicate items in this order');
    const order = await this.merchStoreService.placeOrder(originalOrder, user);
    return { error: null, order };
  }

  @Patch('/order')
  async editMerchOrder(@Body() fulfillOrderRequest: FulfillMerchOrderRequest, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canFulfillMerchOrders(user)) throw new ForbiddenError();
    const numUniqueUuids = (new Set(fulfillOrderRequest.items.map((oi) => oi.uuid))).size;
    if (fulfillOrderRequest.items.length !== numUniqueUuids) {
      throw new BadRequestError('There are duplicate order items');
    }
    await this.merchStoreService.updateOrderItems(fulfillOrderRequest.items);
    return { error: null };
  }
}
