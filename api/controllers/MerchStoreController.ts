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
import { v4 as uuid } from 'uuid';
import PermissionsService from '../../services/PermissionsService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import {
  GetOneMerchCollectionResponse,
  GetAllMerchCollectionsResponse,
  CreateMerchCollectionResponse,
  EditMerchCollectionResponse,
  CreateCollectionPhotoResponse,
  DeleteCollectionPhotoResponse,
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
  CancelMerchOrderResponse,
} from '../../types';
import { UuidParam } from '../validators/GenericRequests';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import MerchStoreService from '../../services/MerchStoreService';
import MerchOrderService from '../../services/MerchOrderService';
import {
  CreateMerchCollectionRequest,
  EditMerchCollectionRequest,
  CreateCollectionPhotoRequest,
  CreateMerchItemRequest,
  EditMerchItemRequest,
  PlaceMerchOrderRequest,
  VerifyMerchOrderRequest,
  FulfillMerchOrderRequest,
  RescheduleOrderPickupRequest,
  CreateMerchItemOptionRequest,
  CreateMerchItemPhotoRequest,
  CreateOrderPickupEventRequest,
  EditOrderPickupEventRequest,
  GetCartRequest,
} from '../validators/MerchStoreRequests';
import { UserError } from '../../utils/Errors';
import StorageService from '../../services/StorageService';

@UseBefore(UserAuthentication)
@JsonController('/merch')
export class MerchStoreController {
  private merchStoreService: MerchStoreService;

  private merchOrderService: MerchOrderService;

  private storageService: StorageService;

  constructor(merchStoreService: MerchStoreService, merchOrderService: MerchOrderService,
    storageService: StorageService) {
    this.merchStoreService = merchStoreService;
    this.merchOrderService = merchOrderService;
    this.storageService = storageService;
  }

  @Get('/collection/:uuid')
  async getOneMerchCollection(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<GetOneMerchCollectionResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const canSeeHiddenItems = PermissionsService.canEditMerchStore(user);
    const collection = await this.merchStoreService.findCollectionByUuid(params.uuid, canSeeHiddenItems);
    return { error: null, collection: canSeeHiddenItems ? collection : collection.getPublicMerchCollection() };
  }

  @Get('/collection')
  async getAllMerchCollections(@AuthenticatedUser() user: UserModel): Promise<GetAllMerchCollectionsResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const canSeeInactiveCollections = PermissionsService.canEditMerchStore(user);
    const collections = await this.merchStoreService.getAllCollections(canSeeInactiveCollections);
    return { error: null, collections: collections.map((c) => c.getPublicMerchCollection(canSeeInactiveCollections)) };
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

  @UseBefore(UserAuthentication)
  @Post('/collection/picture/:uuid')
  async createMerchCollectionPhoto(@UploadedFile('image',
    { options: StorageService.getFileOptions(MediaType.MERCH_PHOTO) }) file: File,
    @Params() params: UuidParam,
    @Body() createCollectionRequest: CreateCollectionPhotoRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateCollectionPhotoResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();

    // generate a random string for the uploaded photo url
    const position = parseInt(createCollectionRequest.position, 10);
    if (Number.isNaN(position)) throw new BadRequestError('Position must be a number');
    const uniqueFileName = uuid();
    const uploadedPhoto = await this.storageService.uploadToFolder(
      file, MediaType.MERCH_PHOTO, uniqueFileName, params.uuid,
    );
    const collectionPhoto = await this.merchStoreService.createCollectionPhoto(
      params.uuid, { uploadedPhoto, position },
    );

    return { error: null, collectionPhoto: collectionPhoto.getPublicMerchCollectionPhoto() };
  }

  @UseBefore(UserAuthentication)
  @Delete('/collection/picture/:uuid')
  async deleteMerchCollectionPhoto(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<DeleteCollectionPhotoResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const photoToDelete = await this.merchStoreService.getCollectionPhotoForDeletion(params.uuid);
    await this.storageService.deleteAtUrl(photoToDelete.uploadedPhoto);
    await this.merchStoreService.deleteCollectionPhoto(photoToDelete);
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
    @Params() params: UuidParam,
    @Body() createItemPhotoRequest: CreateMerchItemPhotoRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateMerchPhotoResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();

    // generate a random string for the uploaded photo url
    const position = Number(createItemPhotoRequest.position);
    if (Number.isNaN(position)) throw new BadRequestError('Position is not a number');
    const uniqueFileName = uuid();
    const uploadedPhoto = await this.storageService.uploadToFolder(
      file, MediaType.MERCH_PHOTO, uniqueFileName, params.uuid,
    );
    const merchPhoto = await this.merchStoreService.createItemPhoto(
      params.uuid, { uploadedPhoto, position },
    );

    return { error: null, merchPhoto: merchPhoto.getPublicMerchItemPhoto() };
  }

  @UseBefore(UserAuthentication)
  @Delete('/item/picture/:uuid')
  async deleteMerchItemPhoto(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<DeleteMerchItemPhotoResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const photoToDelete = await this.merchStoreService.getItemPhotoForDeletion(params.uuid);
    await this.storageService.deleteAtUrl(photoToDelete.uploadedPhoto);
    await this.merchStoreService.deleteItemPhoto(photoToDelete);
    return { error: null };
  }

  @Post('/option/:uuid')
  async createMerchItemOption(@Params() params: UuidParam,
    @Body() createItemOptionRequest: CreateMerchItemOptionRequest, @AuthenticatedUser() user: UserModel):
    Promise<CreateMerchItemOptionResponse> {
    if (!PermissionsService.canEditMerchStore(user)) throw new ForbiddenError();
    const option = await this.merchStoreService.createItemOption(params.uuid, createItemOptionRequest.option);
    return { error: null, option: option.getPublicMerchItemOption() };
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
    // get "public" order bc canSeeMerchOrder need singular merchPhoto field
    // default order has merchPhotos field, which cause incorrect casting
    const publicOrder = (await this.merchOrderService.findOrderByUuid(params.uuid)).getPublicOrderWithItems();
    if (!PermissionsService.canSeeMerchOrder(user, publicOrder)) throw new NotFoundError();
    return { error: null, order: publicOrder };
  }

  @Get('/orders/all')
  async getMerchOrdersForAllUsers(@AuthenticatedUser() user: UserModel): Promise<GetMerchOrdersResponse> {
    if (!(PermissionsService.canAccessMerchStore(user)
      && PermissionsService.canSeeAllMerchOrders(user))) throw new ForbiddenError();
    const orders = await this.merchOrderService.getAllOrdersForAllUsers();
    return { error: null, orders: orders.map((o) => o.getPublicOrder()) };
  }

  @Get('/orders')
  async getMerchOrdersForCurrentUser(@AuthenticatedUser() user: UserModel): Promise<GetMerchOrdersResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const orders = await this.merchOrderService.getAllOrdersForUser(user);
    return { error: null, orders: orders.map((o) => o.getPublicOrder()) };
  }

  @Post('/order')
  async placeMerchOrder(@Body() placeOrderRequest: PlaceMerchOrderRequest,
    @AuthenticatedUser() user: UserModel): Promise<PlaceMerchOrderResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const originalOrder = this.validateMerchOrderRequest(placeOrderRequest.order);
    const order = await this.merchOrderService.placeOrder(originalOrder, user, placeOrderRequest.pickupEvent);
    return { error: null, order: order.getPublicOrderWithItems() };
  }

  @Post('/order/verification')
  async verifyMerchOrder(@Body() verifyOrderRequest: VerifyMerchOrderRequest,
    @AuthenticatedUser() user: UserModel): Promise<VerifyMerchOrderResponse> {
    const originalOrder = this.validateMerchOrderRequest(verifyOrderRequest.order);
    await this.merchOrderService.validateOrder(originalOrder, user);
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
    await this.merchOrderService.rescheduleOrderPickup(params.uuid, rescheduleOrderPickupRequest.pickupEvent, user);
    return { error: null };
  }

  @Post('/order/:uuid/cancel')
  async cancelMerchOrder(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<CancelMerchOrderResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const order = await this.merchOrderService.cancelMerchOrder(params.uuid, user);
    return { error: null, order: order.getPublicOrderWithItems() };
  }

  @Post('/order/:uuid/fulfill')
  async fulfillMerchOrderItems(@Params() params: UuidParam, @Body() fulfillOrderRequest: FulfillMerchOrderRequest,
    @AuthenticatedUser() user: UserModel): Promise<FulfillMerchOrderResponse> {
    if (!PermissionsService.canManageMerchOrders(user)) throw new ForbiddenError();
    const numUniqueUuids = (new Set(fulfillOrderRequest.items.map((oi) => oi.uuid))).size;
    if (fulfillOrderRequest.items.length !== numUniqueUuids) {
      throw new BadRequestError('There are duplicate order items');
    }
    const updatedOrder = await this.merchOrderService.fulfillOrderItems(fulfillOrderRequest.items, params.uuid, user);
    return { error: null, order: updatedOrder.getPublicOrder() };
  }

  @Post('/order/cleanup')
  async cancelAllPendingMerchOrders(@AuthenticatedUser() user: UserModel): Promise<CancelAllPendingOrdersResponse> {
    if (!PermissionsService.canCancelAllPendingOrders(user)) throw new ForbiddenError();
    await this.merchOrderService.cancelAllPendingOrders(user);
    return { error: null };
  }

  @Get('/order/pickup/past')
  async getPastPickupEvents(@AuthenticatedUser() user: UserModel): Promise<GetOrderPickupEventsResponse> {
    const pickupEvents = await this.merchOrderService.getPastPickupEvents();
    const canSeePickupEventOrders = PermissionsService.canSeePickupEventOrders(user);
    const publicPickupEvents = pickupEvents.map((pickupEvent) => pickupEvent
      .getPublicOrderPickupEvent(canSeePickupEventOrders));
    return { error: null, pickupEvents: publicPickupEvents };
  }

  @Get('/order/pickup/future')
  async getFuturePickupEvents(@AuthenticatedUser() user: UserModel): Promise<GetOrderPickupEventsResponse> {
    const pickupEvents = await this.merchOrderService.getFuturePickupEvents();
    const canSeePickupEventOrders = PermissionsService.canSeePickupEventOrders(user);
    const publicPickupEvents = pickupEvents.map((pickupEvent) => pickupEvent
      .getPublicOrderPickupEvent(canSeePickupEventOrders));
    return { error: null, pickupEvents: publicPickupEvents };
  }

  @Get('/order/pickup/:uuid')
  async getOnePickupEvent(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<GetOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    const pickupEvent = await this.merchOrderService.getPickupEvent(params.uuid);
    return { error: null, pickupEvent: pickupEvent.getPublicOrderPickupEvent(true) };
  }

  @Post('/order/pickup')
  async createPickupEvent(@Body() createOrderPickupEventRequest: CreateOrderPickupEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    const pickupEvent = await this.merchOrderService.createPickupEvent(createOrderPickupEventRequest.pickupEvent);
    return { error: null, pickupEvent: pickupEvent.getPublicOrderPickupEvent() };
  }

  @Patch('/order/pickup/:uuid')
  async editPickupEvent(@Params() params: UuidParam,
    @Body() editOrderPickupEventRequest: EditOrderPickupEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<EditOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    const pickupEvent = await this.merchOrderService.editPickupEvent(params.uuid,
      editOrderPickupEventRequest.pickupEvent);
    return { error: null,
      pickupEvent: pickupEvent.getPublicOrderPickupEvent() };
  }

  @Delete('/order/pickup/:uuid')
  async deletePickupEvent(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<DeleteOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    await this.merchOrderService.deletePickupEvent(params.uuid);
    return { error: null };
  }

  @Post('/order/pickup/:uuid/cancel')
  async cancelPickupEvent(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<CancelOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    await this.merchOrderService.cancelPickupEvent(params.uuid);
    return { error: null };
  }

  @Post('/order/pickup/:uuid/complete')
  async completePickupEvent(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel):
  Promise<CompleteOrderPickupEventResponse> {
    if (!PermissionsService.canManagePickupEvents(user)) throw new ForbiddenError();
    const ordersMarkedAsMissed = await this.merchOrderService.completePickupEvent(params.uuid);
    return { error: null, orders: ordersMarkedAsMissed.map((order) => order.getPublicOrder()) };
  }

  @Get('/cart')
  async getCartItems(@Body() getCartRequest: GetCartRequest,
    @AuthenticatedUser() user: UserModel): Promise<GetCartResponse> {
    if (!PermissionsService.canAccessMerchStore(user)) throw new ForbiddenError();
    const cartItems = await this.merchStoreService.getCartItems(getCartRequest.items);
    return { error: null, cart: cartItems.map((option) => option.getPublicOrderMerchItemOption()) };
  }
}
