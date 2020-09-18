import { Allow, IsNotEmpty, Min, Max, IsDefined, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateMerchCollectionRequest as ICreateMerchCollectionRequest,
  EditMerchCollectionRequest as IEditMerchCollectionRequest,
  CreateMerchItemRequest as ICreateMerchItemRequest,
  EditMerchItemRequest as IEditMerchItemRequest,
  PlaceMerchOrderRequest as IPlaceMerchOrderRequest,
  FulfillMerchOrderRequest as IFulfillMerchOrderRequest,
  MerchItemAndQuantity as IMerchItemAndQuantity,
  OrderItemFulfillmentUpdate as IOrderItemFulfillmentUpdate,
  MerchCollection as IMerchCollection,
  MerchCollectionEdit as IMerchCollectionEdit,
  MerchItem as IMerchItem,
  MerchItemEdit as IMerchItemEdit,
} from '../../types';

export class MerchCollection implements IMerchCollection {
  @IsDefined()
  @IsNotEmpty()
  title: string;

  @IsDefined()
  @IsNotEmpty()
  description: string;

  @Allow()
  archived?: boolean;
}

export class MerchCollectionEdit implements IMerchCollectionEdit {
  @IsNotEmpty()
  title?: string;

  @IsNotEmpty()
  description?: string;

  @Allow()
  archived?: boolean;

  @Min(0)
  @Max(100)
  discountPercentage?: number;
}

export class MerchItem implements IMerchItem {
  @IsDefined()
  @IsNotEmpty()
  itemName: string;

  @IsDefined()
  collection: string;

  @IsDefined()
  @Min(0)
  price: number;

  @IsDefined()
  @IsNotEmpty()
  description: string;

  @Allow()
  picture?: string;

  @Min(0)
  quantity?: number;

  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @Allow()
  hidden?: boolean;

  @Allow()
  metadata?: object;
}

export class MerchItemEdit implements IMerchItemEdit {
  @IsNotEmpty()
  itemName?: string;

  @Allow()
  collection?: string;

  @Min(0)
  price?: number;

  @IsNotEmpty()
  description?: string;

  @Allow()
  picture?: string;

  @Min(0)
  quantity?: number;

  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @Allow()
  hidden?: boolean;

  @Allow()
  metadata?: object;
}

export class MerchItemAndQuantity implements IMerchItemAndQuantity {
  @IsDefined()
  @IsUUID()
  item: string;

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

export class PlaceMerchOrderRequest implements IPlaceMerchOrderRequest {
  @Type(() => MerchItemAndQuantity)
  @ValidateNested()
  @IsDefined()
  order: MerchItemAndQuantity[];
}

export class FulfillMerchOrderRequest implements IFulfillMerchOrderRequest {
  @Type(() => OrderItemFulfillmentUpdate)
  @ValidateNested()
  @IsDefined()
  items: OrderItemFulfillmentUpdate[];
}
