export enum UserErrors {
  MULTIPLE_MERCH_OPTION_TYPES = 'Item cannot have multiple option types',
  NO_ITEM_VARIANTS_ADD_OPTION = 'Cannot add option to item with no variants',
  NO_ITEM_VARIANTS_BUT_MULTIPLE_OPTIONS = 'Item with variants disabled cannot have multiple options',
  MERCH_COLLECTION_ORDERED_FROM = 'This collection has been ordered from, and thus cannot be deleted',
  MERCH_ITEM_ORDERED_FROM = 'This item has been ordered from, and thus cannot be deleted',
  MERCH_ITEM_OPTION_ORDERED_FROM = 'This item option has been ordered from, and thus cannot be deleted',
  MERCH_ORDER_DOUBLE_FULFILLMENT = 'At least one order item marked to be fulfilled has already been fulfilled',
  NOT_ENOUGH_CREDITS = 'You don\'t have enough credits for this order',
}

export enum NotFoundErrors {
  MERCH_COLLECTION = 'Merch collection not found',
  MERCH_ITEM = 'Merch item not found',
  MERCH_ITEM_OPTION = 'Merch item option not found',
  MERCH_ORDER = 'Merch order not found',
  MERCH_ORDER_ITEM_MISSING = 'Missing some order items',
}
