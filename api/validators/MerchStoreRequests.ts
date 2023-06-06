import {
  Allow,
  IsNotEmpty,
  Min,
  Max,
  IsDefined,
  IsUUID,
  ValidateNested,
  IsHexColor,
  IsDateString,
  ArrayNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateMerchCollectionRequest as ICreateMerchCollectionRequest,
  EditMerchCollectionRequest as IEditMerchCollectionRequest,
  CreateMerchItemRequest as ICreateMerchItemRequest,
  EditMerchItemRequest as IEditMerchItemRequest,
  CreateMerchItemOptionRequest as ICreateMerchItemOptionRequest,
  CreateMerchItemPhotoRequest as ICreateMerchItemPhotoRequest,
  PlaceMerchOrderRequest as IPlaceMerchOrderRequest,
  VerifyMerchOrderRequest as IVerifyMerchOrderRequest,
  FulfillMerchOrderRequest as IFulfillMerchOrderRequest,
  RescheduleOrderPickupRequest as IRescheduleOrderPickupRequest,
  CreateOrderPickupEventRequest as ICreateOrderPickupEventRequest,
  EditOrderPickupEventRequest as IEditOrderPickupEventRequest,
  GetCartRequest as IGetCartRequest,
  MerchItemOptionAndQuantity as IMerchItemOptionAndQuantity,
  OrderItemFulfillmentUpdate as IOrderItemFulfillmentUpdate,
  MerchCollection as IMerchCollection,
  MerchCollectionEdit as IMerchCollectionEdit,
  MerchItem as IMerchItem,
  MerchItemEdit as IMerchItemEdit,
  MerchItemOption as IMerchItemOption,
  MerchItemOptionEdit as IMerchItemOptionEdit,
  MerchItemOptionMetadata as IMerchItemOptionMetadata,
  MerchItemPhoto as IMerchItemPhoto,
  MerchItemPhotoEdit as IMerchItemPhotoEdit,
  MerchOrderEdit as IMerchOrderEdit,
  OrderPickupEvent as IOrderPickupEvent,
  OrderPickupEventEdit as IOrderPickupEventEdit,
} from '../../types';

export class MerchCollection implements IMerchCollection {
  @IsDefined()
  @IsNotEmpty()
  title: string;

  @IsDefined()
  @IsHexColor()
  themeColorHex: string;

  @IsDefined()
  @IsNotEmpty()
  description: string;

  @Allow()
  archived?: boolean;
}

export class MerchCollectionEdit implements IMerchCollectionEdit {
  @IsNotEmpty()
  title?: string;

  @IsHexColor()
  themeColorHex?: string;

  @IsNotEmpty()
  description?: string;

  @Allow()
  archived?: boolean;

  @Min(0)
  @Max(100)
  discountPercentage?: number;
}

export class MerchItemOptionMetadata implements IMerchItemOptionMetadata {
  @IsDefined()
  @IsNotEmpty()
  type: string;

  @IsDefined()
  @IsNotEmpty()
  value: string;

  @IsDefined()
  position: number;
}

export class MerchItemOption implements IMerchItemOption {
  @IsDefined()
  @Min(0)
  quantity: number;

  @IsDefined()
  @Min(0)
  price: number;

  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @Type(() => MerchItemOptionMetadata)
  @ValidateNested()
  @Allow()
  metadata?: MerchItemOptionMetadata;
}

export class MerchItemOptionEdit implements IMerchItemOptionEdit {
  @IsDefined()
  @IsUUID()
  uuid: string;

  /** We allow negative quantityToAdd for decrementing an option's quantity
   * (e.g. if the initial quantity was typoed) */
  @IsNumber()
  quantityToAdd?: number;

  @Min(0)
  price?: number;

  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @Type(() => MerchItemOptionMetadata)
  @ValidateNested()
  @Allow()
  metadata?: MerchItemOptionMetadata;
}

// TODO: use global variable for limit
export class MerchItemPhoto implements IMerchItemPhoto {
  @Allow()
  picture: string;

  @Min(0)
  @Max(4)
  position: number;
}

export class MerchItemPhotoEdit implements IMerchItemPhotoEdit {
  @IsDefined()
  @IsUUID()
  uuid: string;

  @Allow()
  picture?: string;

  @Min(0)
  @Max(4)
  position?: number;
}

export class MerchItem implements IMerchItem {
  @IsDefined()
  @IsNotEmpty()
  itemName: string;

  @IsDefined()
  collection: string;

  @IsDefined()
  @IsNotEmpty()
  description: string;

  @Allow()
  photos: MerchItemPhoto[];

  @Min(0)
  quantity?: number;

  @Min(0)
  monthlyLimit?: number;

  @Min(0)
  lifetimeLimit?: number;

  @Allow()
  hidden?: boolean;

  @Allow()
  hasVariantsEnabled?: boolean;

  @Type(() => MerchItemOption)
  @ValidateNested()
  @IsDefined()
  @ArrayNotEmpty()
  options: MerchItemOption[];
}

export class MerchItemEdit implements IMerchItemEdit {
  @IsNotEmpty()
  itemName?: string;

  @Allow()
  collection?: string;

  @IsNotEmpty()
  description?: string;

  @Allow()
  photos?: MerchItemPhotoEdit[];

  @Allow()
  hidden?: boolean;

  @Min(0)
  monthlyLimit?: number;

  @Min(0)
  lifetimeLimit?: number;

  @Allow()
  hasVariantsEnabled?: boolean;

  @Type(() => MerchItemOptionEdit)
  @ValidateNested()
  options?: MerchItemOptionEdit[];
}

export class MerchItemOptionAndQuantity implements IMerchItemOptionAndQuantity {
  @IsDefined()
  @IsUUID()
  option: string;

  @IsDefined()
  @Min(0)
  quantity: number;
}

export class OrderItemFulfillmentUpdate implements IOrderItemFulfillmentUpdate {
  @IsDefined()
  @IsUUID()
  uuid: string;

  @Allow()
  notes?: string;
}

export class OrderPickupEvent implements IOrderPickupEvent {
  @IsDefined()
  @IsNotEmpty()
  title: string;

  @IsDefined()
  @IsDateString()
  start: Date;

  @IsDefined()
  @IsDateString()
  end: Date;

  @IsNotEmpty()
  description: string;

  @IsDefined()
  @Min(1)
  orderLimit: number;
}

export class OrderPickupEventEdit implements IOrderPickupEventEdit {
  @IsNotEmpty()
  title?: string;

  @IsDateString()
  start?: Date;

  @IsDateString()
  end?: Date;

  @IsNotEmpty()
  description?: string;

  @Min(1)
  orderLimit?: number;
}

export class MerchOrderEdit implements IMerchOrderEdit {
  @IsUUID()
  pickupEvent: string;
}

export class CreateMerchCollectionRequest implements ICreateMerchCollectionRequest {
  @Type(() => MerchCollection)
  @ValidateNested()
  @IsDefined()
  collection: MerchCollection;
}

export class EditMerchCollectionRequest implements IEditMerchCollectionRequest {
  @Type(() => MerchCollectionEdit)
  @ValidateNested()
  @IsDefined()
  collection: MerchCollectionEdit;
}

export class CreateMerchItemRequest implements ICreateMerchItemRequest {
  @Type(() => MerchItem)
  @ValidateNested()
  @IsDefined()
  merchandise: MerchItem;
}

export class EditMerchItemRequest implements IEditMerchItemRequest {
  @Type(() => MerchItemEdit)
  @ValidateNested()
  @IsDefined()
  merchandise: MerchItemEdit;
}

export class CreateMerchItemOptionRequest implements ICreateMerchItemOptionRequest {
  @Type(() => MerchItemOption)
  @ValidateNested()
  @IsDefined()
  option: MerchItemOption;
}

export class CreateMerchItemPhotoRequest implements ICreateMerchItemPhotoRequest {
  @IsDefined()
  @Min(0)
  position: number;
}

export class PlaceMerchOrderRequest implements IPlaceMerchOrderRequest {
  @Type(() => MerchItemOptionAndQuantity)
  @ValidateNested()
  @IsDefined()
  order: MerchItemOptionAndQuantity[];

  @IsDefined()
  @IsUUID()
  pickupEvent: string;
}

export class VerifyMerchOrderRequest implements IVerifyMerchOrderRequest {
  @Type(() => MerchItemOptionAndQuantity)
  @ValidateNested()
  @IsDefined()
  order: MerchItemOptionAndQuantity[];
}

export class FulfillMerchOrderRequest implements IFulfillMerchOrderRequest {
  @Type(() => OrderItemFulfillmentUpdate)
  @ValidateNested()
  @IsDefined()
  items: OrderItemFulfillmentUpdate[];
}

export class RescheduleOrderPickupRequest implements IRescheduleOrderPickupRequest {
  @IsDefined()
  @IsUUID()
  pickupEvent: string;
}

export class CreateOrderPickupEventRequest implements ICreateOrderPickupEventRequest {
  @Type(() => OrderPickupEvent)
  @ValidateNested()
  @IsDefined()
  pickupEvent: OrderPickupEvent;
}

export class EditOrderPickupEventRequest implements IEditOrderPickupEventRequest {
  @Type(() => OrderPickupEventEdit)
  @ValidateNested()
  @IsDefined()
  pickupEvent: OrderPickupEventEdit;
}

export class GetCartRequest implements IGetCartRequest {
  @IsDefined()
  @IsNotEmpty()
  items: string[];
}
