import { Allow, IsNotEmpty, Min, Max, IsDefined, IsUUID, ValidateNested, IsHexColor } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateMerchCollectionRequest as ICreateMerchCollectionRequest,
  EditMerchCollectionRequest as IEditMerchCollectionRequest,
  CreateMerchItemRequest as ICreateMerchItemRequest,
  EditMerchItemRequest as IEditMerchItemRequest,
  CreateMerchItemOptionRequest as ICreateMerchItemOptionRequest,
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
  MerchItemOptionMetadata as IMerchItemOptionMetadata,
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

  @Allow()
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

  @Allow()
  position?: number;
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
  quantity?: number;

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
}

export class FulfillMerchOrderRequest implements IFulfillMerchOrderRequest {
  @Type(() => OrderItemFulfillmentUpdate)
  @ValidateNested()
  @IsDefined()
  items: OrderItemFulfillmentUpdate[];
}
