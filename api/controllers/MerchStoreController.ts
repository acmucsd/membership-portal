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
  UploadedFile,
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
  GetMerchOrdersResponse,
  PlaceMerchOrderResponse,
  VerifyMerchOrderResponse,
  EditMerchOrderResponse,
  FulfillMerchOrderResponse,
  CreateMerchItemOptionResponse,
  DeleteMerchItemOptionResponse,
  MerchItemOptionAndQuantity,
  CreateOrderPickupEventResponse,
  GetOrderPickupEventsResponse,
  GetCartResponse,
  DeleteOrderPickupEventResponse,
  EditOrderPickupEventResponse,
  CancelAllPendingOrdersResponse,
  MediaType,
  File,
  CreateMerchPhotoResponse,
  DeleteMerchItemPhotoResponse,
  CompleteOrderPickupEventResponse,
  GetOrderPickupEventResponse,
  CancelOrderPickupEventResponse,
} from '../../types';
import { UuidParam } from '../validators/GenericRequests';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import MerchStoreService from '../../services/MerchStoreService';
import {
  CreateMerchCollectionRequest,
  EditMerchCollectionRequest,
  CreateMerchItemRequest,
  EditMerchItemRequest,
  PlaceMerchOrderRequest,
  VerifyMerchOrderRequest,
  FulfillMerchOrderRequest,
  RescheduleOrderPickupRequest,
  CreateMerchItemOptionRequest,
  CreateOrderPickupEventRequest,
  EditOrderPickupEventRequest,
  GetCartRequest,
  CreateMerchItemPhotoRequest,
} from '../validators/MerchStoreRequests';
import { UserError } from '../../utils/Errors';
import StorageService from '../../services/StorageService';

@UseBefore(UserAuthentication)
@JsonController('/merch')
export class MerchStoreController {
  private merchStoreService: MerchStoreService;

  private storageService: StorageService;

  constructor(merchStoreService: MerchStoreService, storageService: StorageService) {
    this.merchStoreService = merchStoreService;
    this.storageService = storageService;
  }

  @Get('/collection/:uuid')
  async getOneMerchCollection(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchCollectionResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const canSeeHiddenItems = PermissionsService.canEditMerchStore(user);
    const collection = await this.merchStoreService.findCollectionByUuid(params.uuid, canSeeHiddenItems);
    return { error: null, collection };
  }

  @Get('/collection')
  async getAllMerchCollections(@AuthenticatedUser() user: UserModel): Promise<GetAllMerchCollectionsResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
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
  async editMerchCollection(@Params() params: UuidParam,
    @Body() editCollectionRequest: EditMerchCollectionRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditMerchCollectionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const collection = await this.merchStoreService.editCollection(params.uuid, editCollectionRequest.collection);
    return { error: null, collection };
  }

  @Delete('/collection/:uuid')
  async deleteMerchCollection(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<DeleteMerchCollectionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteCollection(params.uuid);
    return { error: null };
  }

  @Get('/item/:uuid')
  async getOneMerchItem(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchItemResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.findItemByUuid(params.uuid, user);
    return { error: null, item };
  }

  @Post('/item')
  async createMerchItem(@Body() createItemRequest: CreateMerchItemRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateMerchItemResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    // Default behavior is to have variants disabled if not specified
    createItemRequest.merchandise.hasVariantsEnabled ??= false;
    const item = await this.merchStoreService.createItem(createItemRequest.merchandise);
    return { error: null, item };
  }

  @Patch('/item/:uuid')
  async editMerchItem(@Params() params: UuidParam,
    @Body() editItemRequest: EditMerchItemRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditMerchItemResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const item = await this.merchStoreService.editItem(params.uuid, editItemRequest.merchandise);
    return { error: null, item };
  }

  @Delete('/item/:uuid')
  async deleteMerchItem(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<DeleteMerchItemResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteItem(params.uuid);
    return { error: null };
  }

  @UseBefore(UserAuthentication)
  @Post('/item/picture/:uuid')
  async createMerchItemPhoto(@UploadedFile('image',
    { options: StorageService.getFileOptions(MediaType.MERCH_PHOTO) }) file: File,
    @Body() createMerchItemPhotoRequest: CreateMerchItemPhotoRequest,
    @Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<CreateMerchPhotoResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();

    // generate a random string for the picture url
    const randomID = StorageService.getRandomString();
    const picture = await this.storageService.uploadToFolder(file, MediaType.MERCH_PHOTO, randomID, params.uuid);
    const photo = await this.merchStoreService.createItemPhoto(params.uuid, {picture});

    return { error: null, photo };
  }

  @UseBefore(UserAuthentication)
  @Delete('/item/picture/:uuid')
  async deleteMerchItemPhoto(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<DeleteMerchItemPhotoResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteItemPhoto(params.uuid);
    return { error: null };
  }

  @Post('/option/:uuid')
  async createMerchItemOption(@Params() params: UuidParam,
    @Body() createItemOptionRequest: CreateMerchItemOptionRequest, @AuthenticatedUser() user: UserModel):
    Promise<CreateMerchItemOptionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const option = await this.merchStoreService.createItemOption(params.uuid, createItemOptionRequest.option);
    return { error: null, option };
  }

  @Delete('/option/:uuid')
  async deleteMerchItemOption(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<DeleteMerchItemOptionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.deleteItemOption(params.uuid);
    return { error: null };
  }

  @Get('/order/:uuid')
  async getOneMerchOrder(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchOrderResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const order = await this.merchStoreService.findOrderByUuid(params.uuid);
    if (!PermissionsService.canSeeMerchOrder(user, order.getPublicOrderWithItems())) throw new NotFoundError();
    return { error: null, order: order.getPublicOrderWithItems() };
  }

  @Get('/orders/all')
  async getMerchOrdersForAllUsers(@AuthenticatedUser() user: UserModel): Promise<GetMerchOrdersResponse> {
    if (!(PermissionsService.canAccessMerchStore(user)
      && PermissionsService.canSeeAllMerchOrders(user))) throw new ForbiddenError();
    const orders = await this.merchStoreService.getAllOrdersForAllUsers();
    return { error: null, orders: orders.map((o) => o.getPublicOrder()) };
  }

  @Get('/orders')
  async getMerchOrdersForCurrentUser(@AuthenticatedUser() user: UserModel): Promise<GetMerchOrdersResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const orders = await this.merchStoreService.getAllOrdersForUser(user);
    return { error: null, orders: orders.map((o) => o.getPublicOrder()) };
  }

  @Post('/order')
  async placeMerchOrder(@Body() placeOrderRequest: PlaceMerchOrderRequest,
    @AuthenticatedUser() user: UserModel): Promise<PlaceMerchOrderResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const originalOrder = this.validateMerchOrderRequest(placeOrderRequest.order);
    const order = await this.merchStoreService.placeOrder(originalOrder, user, placeOrderRequest.pickupEvent);
    return { error: null, order: order.getPublicOrderWithItems() };
  }

  @Post('/order/verification')
  async verifyMerchOrder(@Body() verifyOrderRequest: VerifyMerchOrderRequest,
    @AuthenticatedUser() user: UserModel): Promise<VerifyMerchOrderResponse> {
    const originalOrder = this.validateMerchOrderRequest(verifyOrderRequest.order);
    await this.merchStoreService.validateOrder(originalOrder, user);
    return { error: null };
  }

  private validateMerchOrderRequest(orderRequest: MerchItemOptionAndQuantity[]): MerchItemOptionAndQuantity[] {
    const originalOrder = orderRequest.filter((oi) => oi.quantity > 0);
    const orderIsEmpty = originalOrder.reduce((x, n) => x + n.quantity, 0) === 0;
    if (orderIsEmpty) throw new UserError('There are no items in this order');
    const numUniqueUuids = (new Set(originalOrder.map((oi) => oi.option))).size;
    if (originalOrder.length !== numUniqueUuids) throw new BadRequestError('There are duplicate items in this order');
    return originalOrder;
  }

  @Post('/order/:uuid/reschedule')
  async rescheduleOrderPickup(@Params() params: UuidParam,
    @Body() rescheduleOrderPickupRequest: RescheduleOrderPickupRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditMerchOrderResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    await this.merchStoreService.rescheduleOrderPickup(params.uuid, rescheduleOrderPickupRequest.pickupEvent, user);
    return { error: null };
  }

  @Post('/order/:uuid/cancel')
  async cancelMerchOrder(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    console.log('dam 2.6');
    const order = await this.merchStoreService.cancelMerchOrder(params.uuid, user);
    console.log('dam 2.9');
    return { error: null, order };
  }

  @Post('/order/:uuid/fulfill')
  async fulfillMerchOrderItems(@Params() params: UuidParam, @Body() fulfillOrderRequest: FulfillMerchOrderRequest,
    @AuthenticatedUser() user: UserModel): Promise<FulfillMerchOrderResponse> {
    if (!PermissionsService.canManageMerchOrders(user)) throw new ForbiddenError();
    const numUniqueUuids = (new Set(fulfillOrderRequest.items.map((oi) => oi.uuid))).size;
    if (fulfillOrderRequest.items.length !== numUniqueUuids) {
      throw new BadRequestError('There are duplicate order items');
    }
    const updatedOrder = await this.merchStoreService.fulfillOrderItems(fulfillOrderRequest.items, params.uuid, user);
    return { error: null, order: updatedOrder.getPublicOrder() };
  }

  @Post('/order/cleanup')
  async cancelAllPendingMerchOrders(@AuthenticatedUser() user: UserModel): Promise<CancelAllPendingOrdersResponse> {
    if (!PermissionsService.canCancelAllPendingOrders(user)) throw new ForbiddenError();
    await this.merchStoreService.cancelAllPendingOrders(user);
    return { error: null };
  }

  @Get('/order/pickup/past')
  async getPastPickupEvents(@AuthenticatedUser() user: UserModel): Promise<GetOrderPickupEventsResponse> {
    const pickupEvents = await this.merchStoreService.getPastPickupEvents();
    const canSeePickupEventOrders = PermissionsService.canSeePickupEventOrders(user);
    const publicPickupEvents = pickupEvents.map((pickupEvent) => pickupEvent
      .getPublicOrderPickupEvent(canSeePickupEventOrders));
    return { error: null, pickupEvents: publicPickupEvents };
  }

  @Get('/order/pickup/future')
  async getFuturePickupEvents(@AuthenticatedUser() user: UserModel): Promise<GetOrderPickupEventsResponse> {
    const pickupEvents = await this.merchStoreService.getFuturePickupEvents();
    const canSeePickupEventOrders = PermissionsService.canSeePickupEventOrders(user);
    const publicPickupEvents = pickupEvents.map((pickupEvent) => pickupEvent
      .getPublicOrderPickupEvent(canSeePickupEventOrders));
    return { error: null, pickupEvents: publicPickupEvents };
  }

  @Get('/order/pickup/:uuid')
  async getOnePickupEvent(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<GetOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    const pickupEvent = await this.merchStoreService.getPickupEvent(params.uuid);
    return { error: null, pickupEvent: pickupEvent.getPublicOrderPickupEvent(true) };
  }

  @Post('/order/pickup')
  async createPickupEvent(@Body() createOrderPickupEventRequest: CreateOrderPickupEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    const pickupEvent = await this.merchStoreService.createPickupEvent(createOrderPickupEventRequest.pickupEvent);
    return { error: null, pickupEvent: pickupEvent.getPublicOrderPickupEvent() };
  }

  @Patch('/order/pickup/:uuid')
  async editPickupEvent(@Params() params: UuidParam,
    @Body() editOrderPickupEventRequest: EditOrderPickupEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    const pickupEvent = await this.merchStoreService.editPickupEvent(params.uuid,
      editOrderPickupEventRequest.pickupEvent);
    return { error: null,
      pickupEvent: pickupEvent.getPublicOrderPickupEvent() };
  }

  @Delete('/order/pickup/:uuid')
  async deletePickupEvent(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<DeleteOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    await this.merchStoreService.deletePickupEvent(params.uuid);
    return { error: null };
  }

  @Post('/order/pickup/:uuid/cancel')
  async cancelPickupEvent(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<CancelOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    await this.merchStoreService.cancelPickupEvent(params.uuid);
    return { error: null };
  }

  @Post('/order/pickup/:uuid/complete')
  async completePickupEvent(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<CompleteOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    const ordersMarkedAsMissed = await this.merchStoreService.completePickupEvent(params.uuid);
    return { error: null, orders: ordersMarkedAsMissed.map((order) => order.getPublicOrder()) };
  }

  @Get('/cart')
  async getCartItems(@Body() getCartRequest: GetCartRequest,
    @AuthenticatedUser() user: UserModel): Promise<GetCartResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const cartItems = await this.merchStoreService.getCartItems(getCartRequest.items);
    console.log(cartItems);
    return { error: null, cart: cartItems.map((option) => option.getPublicOrderMerchItemOption()) };
  }
}
