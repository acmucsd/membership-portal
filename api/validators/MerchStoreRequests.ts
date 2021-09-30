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
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateMerchCollectionRequest as ICreateMerchCollectionRequest,
  EditMerchCollectionRequest as IEditMerchCollectionRequest,
  CreateMerchItemRequest as ICreateMerchItemRequest,
  EditMerchItemRequest as IEditMerchItemRequest,
  CreateMerchItemOptionRequest as ICreateMerchItemOptionRequest,
  PlaceMerchOrderRequest as IPlaceMerchOrderRequest,
  FulfillMerchOrderRequest as IFulfillMerchOrderRequest,
  EditMerchOrderRequest as IEditMerchOrderRequest,
  CreateOrderPickupEventRequest as ICreateOrderPickupEventRequest,
  EditOrderPickupEventRequest as IEditOrderPickupEventRequest,
  MerchItemOptionAndQuantity as IMerchItemOptionAndQuantity,
  OrderItemFulfillmentUpdate as IOrderItemFulfillmentUpdate,
  MerchCollection as IMerchCollection,
  MerchCollectionEdit as IMerchCollectionEdit,
  MerchItem as IMerchItem,
  MerchItemEdit as IMerchItemEdit,
  MerchItemOption as IMerchItemOption,
  MerchItemOptionEdit as IMerchItemOptionEdit,
  MerchItemOptionMetadata as IMerchItemOptionMetadata,
  OrderStatus,
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

  @Min(0)
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
  picture?: string;

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
  picture?: string;

  @Allow()
  hidden?: boolean;

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
  fulfilled?: boolean;

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

export class PlaceMerchOrderRequest implements IPlaceMerchOrderRequest {
  @Type(() => MerchItemOptionAndQuantity)
  @ValidateNested()
  @IsDefined()
  order: MerchItemOptionAndQuantity[];

  @IsDefined()
  @IsUUID()
  pickupEvent: string;
}

export class FulfillMerchOrderRequest implements IFulfillMerchOrderRequest {
  @Type(() => OrderItemFulfillmentUpdate)
  @ValidateNested()
  @IsDefined()
  items: OrderItemFulfillmentUpdate[];
}

<<<<<<< HEAD
export class EditMerchOrderRequest implements IEditMerchOrderRequest {
  // TODO: add variables for handling store pickup date changes
  uuid: string;
  status?:OrderStatus;
}
=======
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
>>>>>>> master
