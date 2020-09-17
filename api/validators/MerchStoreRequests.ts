import { Allow, IsNotEmpty, Min, Max, IsDefined, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateMerchCollectionRequest as ICreateMerchCollectionRequest,
  EditMerchCollectionRequest as IEditMerchCollectionRequest,
  CreateMerchItemRequest as ICreateMerchItemRequest,
  EditMerchItemRequest as IEditMerchItemRequest,
  MerchItemAndQuantity as IMerchItemAndQuantity,
  PlaceOrderRequest as IPlaceOrderRequest,
  OrderItemFulfillmentUpdate as IOrderItemFulfillmentUpdate,
  FulfillMerchOrderRequest as IFulfillMerchOrderRequest,
} from '../../types';

export class CreateMerchCollectionRequest implements ICreateMerchCollectionRequest {
  @IsDefined()
  @IsNotEmpty()
  title: string;

  @IsDefined()
  @IsNotEmpty()
  description: string;

  @Allow()
  archived?: boolean;
}

export class EditMerchCollectionRequest implements IEditMerchCollectionRequest {
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

export class CreateMerchItemRequest implements ICreateMerchItemRequest {
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

export class EditMerchItemRequest implements IEditMerchItemRequest {
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

export class PlaceOrderRequest implements IPlaceOrderRequest {
  @Type(() => MerchItemAndQuantity)
  @IsDefined()
  @ValidateNested()
  order: MerchItemAndQuantity[];
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

export class FulfillMerchOrderRequest implements IFulfillMerchOrderRequest {
  @Type(() => OrderItemFulfillmentUpdate)
  @IsDefined()
  @ValidateNested()
  items: OrderItemFulfillmentUpdate[];
}
