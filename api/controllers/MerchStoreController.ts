import {
  JsonController,
  UseBefore,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Params,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from 'routing-controllers';
import PermissionsService from '../../services/PermissionsService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import {
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
import { ValidUuid } from '../validators/GenericRequests';
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
  private merchStoreService: MerchStoreService;

  constructor(merchStoreService: MerchStoreService) {
    this.merchStoreService = merchStoreService;
  }

  @Get('/collection/:uuid')
  async getOneMerchCollection(@Params() vUuid: ValidUuid,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchCollectionResponse> {
    const canSeeHiddenItems = PermissionsService.canEditMerchStore(user);
    const collection = await this.merchStoreService.findCollectionByUuid(vUuid.uuid, canSeeHiddenItems);
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
  async editMerchCollection(@Params() vUuid: ValidUuid,
    @Body() editCollectionRequest: EditMerchCollectionRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditMerchCollectionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const collection = await this.merchStoreService.editCollection(vUuid.uuid, editCollectionRequest.collection);
    return { error: null, collection };
  }

  @Delete('/collection/:uuid')
  async deleteMerchCollection(@Params() vUuid: ValidUuid,
    @AuthenticatedUser() user: UserModel): Promise<DeleteMerchCollectionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteCollection(vUuid.uuid);
    return { error: null };
  }

  @Get('/item/:uuid')
  async getOneMerchItem(@Params() vUuid: ValidUuid,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchItemResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.findItemByUuid(vUuid.uuid);
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
  async editMerchItem(@Params() vUuid: ValidUuid,
    @Body() editItemRequest: EditMerchItemRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditMerchItemResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.editItem(vUuid.uuid, editItemRequest.merchandise);
    return { error: null, item };
  }

  @Delete('/item/:uuid')
  async deleteMerchItem(@Params() vUuid: ValidUuid,
    @AuthenticatedUser() user: UserModel): Promise<DeleteMerchItemResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteItem(vUuid.uuid);
    return { error: null };
  }

  @Post('/option/:uuid')
  async createMerchItemOption(@Params() vUuid: ValidUuid,
    @Body() createItemOptionRequest: CreateMerchItemOptionRequest, @AuthenticatedUser() user: UserModel):
    Promise<CreateMerchItemOptionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const option = await this.merchStoreService.createItemOption(vUuid.uuid, createItemOptionRequest.option);
    return { error: null, option };
  }

  @Delete('/option/:uuid')
  async deleteMerchItemOption(@Params() vUuid: ValidUuid, @AuthenticatedUser() user: UserModel):
  Promise<DeleteMerchItemOptionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteItemOption(vUuid.uuid);
    return { error: null };
  }

  @Get('/order/:uuid')
  async getOneMerchOrder(@Params() vUuid: ValidUuid,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchOrderResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const order = await this.merchStoreService.findOrderByUuid(vUuid.uuid);
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
