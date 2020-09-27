import { Allow, IsNotEmpty, Min, Max, IsDefined, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateMerchCollectionRequest as ICreateMerchCollectionRequest,
  EditMerchCollectionRequest as IEditMerchCollectionRequest,
  CreateMerchItemRequest as ICreateMerchItemRequest,
  EditMerchItemRequest as IEditMerchItemRequest,
  PlaceMerchOrderRequest as IPlaceMerchOrderRequest,
  FulfillMerchOrderRequest as IFulfillMerchOrderRequest,
  MerchItemOptionAndQuantity as IMerchItemOptionAndQuantity,
  OrderItemFulfillmentUpdate as IOrderItemFulfillmentUpdate,
  MerchCollection as IMerchCollection,
  MerchCollectionEdit as IMerchCollectionEdit,
  MerchItem as IMerchItem,
  MerchItemEdit as IMerchItemEdit,
  MerchItemOption as IMerchItemOption,
  MerchItemOptionEdit as IMerchItemOptionEdit,
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
}

export class MerchItemOptionEdit implements IMerchItemOptionEdit {
  @IsDefined()
  @IsUUID()
  uuid: string;

  @Min(0)
  quantity?: number;

  @Min(0)
  price?: number;

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
  @IsNotEmpty()
  description: string;

  @Allow()
  picture?: string;

  @Min(0)
  quantity?: number;

  @Allow()
  hidden?: boolean;

  @Allow()
  metadata?: object;

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
  metadata?: object;

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
