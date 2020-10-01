import {
  JsonController,
  UseBefore,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from 'routing-controllers';
import { Inject } from 'typedi';
import PermissionsService from '../../services/PermissionsService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import {
  Uuid,
  GetOneMerchCollectionResponse,
  GetAllMerchCollectionsResponse,
  CreateMerchCollectionResponse,
  EditMerchCollectionResponse,
  GetOneMerchItemResponse,
  DeleteMerchCollectionResponse,
  CreateMerchItemResponse,
  EditMerchItemResponse,
  DeleteMerchItemResponse,
  GetOneMerchOrderResponse,
  GetAllMerchOrdersResponse,
  PlaceMerchOrderResponse,
  EditMerchOrderResponse,
  CreateMerchItemOptionResponse,
  DeleteMerchItemOptionResponse,
} from '../../types';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import MerchStoreService from '../../services/MerchStoreService';
import {
  CreateMerchCollectionRequest,
  EditMerchCollectionRequest,
  CreateMerchItemRequest,
  EditMerchItemRequest,
  PlaceMerchOrderRequest,
  FulfillMerchOrderRequest,
  CreateMerchItemOptionRequest,
} from '../validators/MerchStoreRequests';
import { UserError } from '../../utils/Errors';

@UseBefore(UserAuthentication)
@JsonController('/merch')
export class MerchStoreController {
  @Inject()
  private merchStoreService: MerchStoreService;

  @Get('/collection/:uuid')
  async getOneMerchCollection(@Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchCollectionResponse> {
    const canSeeHiddenItems = PermissionsService.canEditMerchStore(user);
    const collection = await this.merchStoreService.findCollectionByUuid(uuid, canSeeHiddenItems);
    return { error: null, collection };
  }

  @Get('/collection')
  async getAllMerchCollections(@AuthenticatedUser() user: UserModel): Promise<GetAllMerchCollectionsResponse> {
    const canSeeInactiveCollections = PermissionsService.canEditMerchStore(user);
    const collections = await this.merchStoreService.getAllCollections(canSeeInactiveCollections);
    return { error: null, collections };
  }

  @Post('/collection')
  async createMerchCollection(@Body() createCollectionRequest: CreateMerchCollectionRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateMerchCollectionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const collection = await this.merchStoreService.createCollection(createCollectionRequest.collection);
    return { error: null, collection };
  }

  @Patch('/collection/:uuid')
  async editMerchCollection(@Param('uuid') uuid: Uuid,
    @Body() editCollectionRequest: EditMerchCollectionRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditMerchCollectionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const collection = await this.merchStoreService.editCollection(uuid, editCollectionRequest.collection);
    return { error: null, collection };
  }

  @Delete('/collection/:uuid')
  async deleteMerchCollection(@Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel): Promise<DeleteMerchCollectionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteCollection(uuid);
    return { error: null };
  }

  @Get('/item/:uuid')
  async getOneMerchItem(@Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchItemResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.findItemByUuid(uuid);
    return { error: null, item };
  }

  @Post('/item')
  async createMerchItem(@Body() createItemRequest: CreateMerchItemRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateMerchItemResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.createItem(createItemRequest.merchandise);
    return { error: null, item };
  }

  @Patch('/item/:uuid')
  async editMerchItem(@Param('uuid') uuid: Uuid,
    @Body() editItemRequest: EditMerchItemRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditMerchItemResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.editItem(uuid, editItemRequest.merchandise);
    return { error: null, item };
  }

  @Delete('/item/:uuid')
  async deleteMerchItem(@Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel): Promise<DeleteMerchItemResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteItem(uuid);
    return { error: null };
  }

  @Post('/option/:uuid')
  async createMerchItemOption(@Param('uuid') uuid: Uuid,
    @Body() createItemOptionRequest: CreateMerchItemOptionRequest, @AuthenticatedUser() user: UserModel):
    Promise<CreateMerchItemOptionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const option = await this.merchStoreService.createItemOption(uuid, createItemOptionRequest.option);
    return { error: null, option };
  }

  @Delete('/option/:uuid')
  async deleteMerchItemOption(@Param('uuid') uuid: Uuid, @AuthenticatedUser() user: UserModel):
  Promise<DeleteMerchItemOptionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteItemOption(uuid);
    return { error: null };
  }

  @Get('/order/:uuid')
  async getOneMerchOrder(@Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchOrderResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const order = await this.merchStoreService.findOrderByUuid(uuid);
    if (!PermissionsService.canSeeMerchOrder(user, order)) throw new NotFoundError();
    return { error: null, order };
  }

  @Get('/order')
  async getAllMerchOrders(@AuthenticatedUser() user: UserModel): Promise<GetAllMerchOrdersResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const canSeeAllOrders = PermissionsService.canSeeAllMerchOrders(user);
    const orders = await this.merchStoreService.getAllOrders(user, canSeeAllOrders);
    return { error: null, orders };
  }

  @Post('/order')
  async placeMerchOrder(@Body() placeOrderRequest: PlaceMerchOrderRequest,
    @AuthenticatedUser() user: UserModel): Promise<PlaceMerchOrderResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const originalOrder = placeOrderRequest.order.filter((oi) => oi.quantity > 0);
    const orderIsEmpty = originalOrder.reduce((x, n) => x + n.quantity, 0) === 0;
    if (orderIsEmpty) throw new UserError('There are no items in this order');
    const numUniqueUuids = (new Set(originalOrder.map((oi) => oi.option))).size;
    if (originalOrder.length !== numUniqueUuids) throw new BadRequestError('There are duplicate items in this order');
    const order = await this.merchStoreService.placeOrder(originalOrder, user);
    return { error: null, order };
  }

  @Patch('/order')
  async editMerchOrder(@Body() fulfillOrderRequest: FulfillMerchOrderRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditMerchOrderResponse> {
    if (!PermissionsService.canFulfillMerchOrders(user)) throw new ForbiddenError();
    const numUniqueUuids = (new Set(fulfillOrderRequest.items.map((oi) => oi.uuid))).size;
    if (fulfillOrderRequest.items.length !== numUniqueUuids) {
      throw new BadRequestError('There are duplicate order items');
    }
    await this.merchStoreService.updateOrderItems(fulfillOrderRequest.items);
    return { error: null };
  }
}
