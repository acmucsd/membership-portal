export interface CreateMilestoneRequest {
  name: string;
  points?: number;
}

export interface CreateBonusRequest {
  description: string;
  users: string[]
  points: number;
}

// MERCH STORE

export interface CreateMerchCollectionRequest {
  title: string;
  description: string;
  archived?: boolean;
}

export interface EditMerchCollectionRequest extends Partial<CreateMerchCollectionRequest> {
  discountPercentage?: number;
}

export interface CreateMerchItemRequest {
  itemName: string;
  collection: string;
  price: number;
  description: string;
  picture?: string;
  quantity?: number;
  discountPercentage?: number;
  hidden?: boolean;
  metadata?: object;
}

export interface EditMerchItemRequest extends Partial<CreateMerchItemRequest> {}

export interface MerchItemAndQuantity {
  item: string;
  quantity: number;
}

export interface PlaceOrderRequest {
  order: MerchItemAndQuantity[];
}

export interface OrderItemFulfillmentUpdate {
  uuid: string;
  fulfilled?: boolean;
  notes?: string;
}

export interface FulfillMerchOrderRequest {
  items: OrderItemFulfillmentUpdate[];
}
