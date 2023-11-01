import * as faker from 'faker';
import { ForbiddenError, NotFoundError } from 'routing-controllers';
import { zip } from 'underscore';
import { anything, instance, verify, mock, when } from 'ts-mockito';
import { OrderModel } from '../models/OrderModel';
import { MerchandiseItemOptionModel } from '../models/MerchandiseItemOptionModel';
import { MediaType, MerchItemEdit, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, MerchFactory, PortalState, UserFactory } from './data';
import EmailService from '../services/EmailService';
import { FileFactory } from './data/FileFactory';
import { Config } from '../config';
import Mocks from './mocks/MockFactory';

beforeAll(async () => {
  await DatabaseConnection.connect();
});

beforeEach(async () => {
  await DatabaseConnection.clear();
});

afterAll(async () => {
  await DatabaseConnection.clear();
  await DatabaseConnection.close();
});

describe('merch store permissions', () => {
  test('members can only access store with a valid acm or ucsd email', async () => {
    const conn = await DatabaseConnection.get();
    const UCSDMember = UserFactory.fake({ credits: 10000 });
    const ACMBoardMember = UserFactory.fake({
      email: 'random@acmucsd.org',
      credits: 10000,
    });
    const invalidMember = UserFactory.fake({
      email: 'random@gmail.com',
      credits: 10000,
    });

    const affordableOption1 = MerchFactory.fakeOption({
      quantity: 5,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(ACMBoardMember, UCSDMember, invalidMember)
      .createMerchItemOptions(affordableOption1)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const merchStoreController = await ControllerFactory.merchStore(conn);

    const ACMBoardMemberResponse = await merchStoreController.getAllMerchCollections(ACMBoardMember);
    expect(ACMBoardMemberResponse.error).toBe(null);

    const UCSDMemberResponse = await merchStoreController.getAllMerchCollections(UCSDMember);
    expect(UCSDMemberResponse.error).toBe(null);

    await expect(merchStoreController.getAllMerchCollections(invalidMember)).rejects.toThrow(ForbiddenError);
  });

  test('archived collections are hidden from members, but not for store managers', async () => {
    const conn = await DatabaseConnection.get();
    const storeManager = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_MANAGER });
    const member = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const archivedCollection = MerchFactory.fakeCollection({
      archived: true,
    });
    const unarchivedCollection = MerchFactory.fakeCollection({
      archived: false,
    });

    await new PortalState()
      .createUsers(storeManager, member)
      .createMerchCollections(archivedCollection, unarchivedCollection)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);

    const collectionsVisibleByManager = await merchStoreController.getAllMerchCollections(storeManager);
    expect(collectionsVisibleByManager.collections.map((c) => c.uuid)).toEqual(
      expect.arrayContaining([archivedCollection.uuid, unarchivedCollection.uuid]),
    );

    const collectionsVisibleByMember = await merchStoreController.getAllMerchCollections(member);
    expect(collectionsVisibleByMember.collections.map((c) => c.uuid)).toEqual(
      expect.arrayContaining([unarchivedCollection.uuid]),
    );
  });

  test('hidden items are hidden from members, but not for store managers', async () => {
    const conn = await DatabaseConnection.get();
    const storeManager = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_MANAGER });
    const member = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const hiddenItem = MerchFactory.fakeItem({
      hidden: true,
    });
    const visibleItem = MerchFactory.fakeItem({
      hidden: false,
    });
    const collection = MerchFactory.fakeCollection({
      items: [hiddenItem, visibleItem],
    });

    await new PortalState()
      .createUsers(storeManager, member)
      .createMerchCollections(collection)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);

    const collectionsForManagerResponse = await merchStoreController.getAllMerchCollections(storeManager);
    const itemsForManager = collectionsForManagerResponse.collections[0].items.map((i) => i.uuid);
    expect(itemsForManager).toEqual(expect.arrayContaining([visibleItem.uuid, hiddenItem.uuid]));

    const collectionsForMemberResponse = await merchStoreController.getAllMerchCollections(storeManager);
    const itemsForMember = collectionsForMemberResponse.collections[0].items.map((i) => i.uuid);
    expect(itemsForMember).toEqual(expect.arrayContaining([visibleItem.uuid]));
  });
});

describe('creating merch collections', () => {
  test('getting created collections returns them in reverse order of creation', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const firstCollectionToBeMade = MerchFactory.fakeCollection({
      createdAt: faker.date.past(),
      archived: true,
    });
    const secondCollectionToBeMade = MerchFactory.fakeCollection({
      createdAt: new Date(),
      archived: false,
    });
    const thirdCollectionToBeMade = MerchFactory.fakeCollection({
      createdAt: faker.date.future(),
      archived: false,
    });

    await new PortalState()
      .createUsers(admin, member)
      .createMerchCollections(firstCollectionToBeMade, secondCollectionToBeMade, thirdCollectionToBeMade)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);

    const expectedCollectionOrder = [thirdCollectionToBeMade, secondCollectionToBeMade]
      .map((coll) => coll.uuid);

    const collectionsVisibleByAdmin = await merchStoreController.getAllMerchCollections(admin);

    expect(collectionsVisibleByAdmin.collections.map((collection) => collection.uuid))
      .toEqual(expectedCollectionOrder.concat(firstCollectionToBeMade.uuid));

    const collectionsVisibleByMember = await merchStoreController.getAllMerchCollections(member);

    expect(collectionsVisibleByMember.collections.map((collection) => collection.uuid))
      .toEqual(expectedCollectionOrder);
  });
});

describe('editing merch collections', () => {
  test('only admins can edit merch collections', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const collection = MerchFactory.fakeCollection();

    await new PortalState()
      .createUsers(admin, member)
      .createMerchCollections(collection)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: collection.uuid };
    const editMerchCollectionRequest = { collection: { title: faker.datatype.hexaDecimal(10) } };

    await expect(merchStoreController.editMerchCollection(params, editMerchCollectionRequest, member))
      .rejects.toThrow(ForbiddenError);

    const editMerchCollectionResponse = await merchStoreController
      .editMerchCollection(params, editMerchCollectionRequest, admin);
    expect(editMerchCollectionResponse.collection.uuid).toEqual(collection.uuid);
    expect(editMerchCollectionResponse.collection.title).toEqual(editMerchCollectionRequest.collection.title);
  });
});


describe('merch collection photos', () => {
  const folderLocation = 'https://s3.amazonaws.com/upload-photo/';

  test('can create a collection with up to 5 pictures', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const photo1 = MerchFactory.fakeCollectionPhoto();
    const collection = MerchFactory.fakeCollection({ collectionPhotos: [photo1] });

    await new PortalState()
      .createUsers(admin)
      .createMerchCollections(collection)
      .write();

    const image2 = FileFactory.image(Config.file.MAX_MERCH_PHOTO_FILE_SIZE / 2);
    const image3 = FileFactory.image(Config.file.MAX_MERCH_PHOTO_FILE_SIZE / 2);
    const image4 = FileFactory.image(Config.file.MAX_MERCH_PHOTO_FILE_SIZE / 2);
    const image5 = FileFactory.image(Config.file.MAX_MERCH_PHOTO_FILE_SIZE / 2);
    const imageExtra = FileFactory.image(Config.file.MAX_MERCH_PHOTO_FILE_SIZE / 2);
    const storageService = Mocks.storage(folderLocation);

    const merchStoreController = ControllerFactory.merchStore(
      conn,
      undefined,
      instance(storageService),
    );

    const params = { uuid: collection.uuid };

    const response2 = await merchStoreController.createMerchCollectionPhoto(image2, params, { position: '1' }, admin);
    const response3 = await merchStoreController.createMerchCollectionPhoto(image3, params, { position: '2' }, admin);
    const response4 = await merchStoreController.createMerchCollectionPhoto(image4, params, { position: '3' }, admin);
    const response5 = await merchStoreController.createMerchCollectionPhoto(image5, params, { position: '4' }, admin);

    // checking no error is thrown and storage is correctly modified
    // enough to check first and last response
    expect(response2.error).toBe(null);
    expect(response5.error).toBe(null);
    verify(
      storageService.uploadToFolder(
        image2,
        MediaType.MERCH_PHOTO,
        anything(),
        anything(),
      ),
    ).called();
    verify(
      storageService.uploadToFolder(
        image5,
        MediaType.MERCH_PHOTO,
        anything(),
        anything(),
      ),
    ).called();

    const photo2 = response2.collectionPhoto;
    const photo3 = response3.collectionPhoto;
    const photo4 = response4.collectionPhoto;
    const photo5 = response5.collectionPhoto;

    // 0 index
    expect(photo2.position).toBe(1);
    expect(photo3.position).toBe(2);
    expect(photo4.position).toBe(3);
    expect(photo5.position).toBe(4);

    const photos = [photo1, photo2, photo3, photo4, photo5];
    expect((await merchStoreController.getOneMerchCollection(params, admin)).collection.collectionPhotos)
      .toEqual(photos);

    expect(merchStoreController.createMerchCollectionPhoto(imageExtra, params, { position: '5' }, admin))
      .rejects.toThrow('Merch items cannot have more than 5 pictures');
  });

  test('can remap the picture of a collection to different orders', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const photo1 = MerchFactory.fakeCollectionPhoto({ position: 0 });
    const photo2 = MerchFactory.fakeCollectionPhoto({ position: 1 });
    const photo3 = MerchFactory.fakeCollectionPhoto({ position: 2 });
    const photo4 = MerchFactory.fakeCollectionPhoto({ position: 3 });
    const photo5 = MerchFactory.fakeCollectionPhoto({ position: 4 });
    const collectionPhotos = [photo1, photo2, photo3, photo4, photo5];
    const collection = MerchFactory.fakeCollection({ collectionPhotos });

    await new PortalState()
      .createUsers(admin)
      .createMerchCollections(collection)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: collection.uuid };

    // check before remap whether photos are correctly positioned
    expect((await merchStoreController.getOneMerchCollection(params, admin)).collection.collectionPhotos).toEqual(collectionPhotos);

    // reversing the order of the photos
    const editMerchCollectionRequest = { collection: {
      collectionPhotos: [
        { uuid: photo5.uuid, position: 0 },
        { uuid: photo4.uuid, position: 1 },
        { uuid: photo3.uuid, position: 2 },
        { uuid: photo2.uuid, position: 3 },
        { uuid: photo1.uuid, position: 4 },
      ],
    } };

    await merchStoreController.editMerchCollection(params, editMerchCollectionRequest, admin);

    const newPhotos = (await merchStoreController.getOneMerchCollection(params, admin)).collection.collectionPhotos;
    const newPhotosUuids = newPhotos.map((photo) => photo.uuid);
    const expectedPhotosUuids = [photo5.uuid, photo4.uuid, photo3.uuid, photo2.uuid, photo1.uuid];
    expect(newPhotosUuids).toStrictEqual(expectedPhotosUuids);
  });

  test('can delete photo until 1 photo left except merch collection is deleted', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const photo1 = MerchFactory.fakeCollectionPhoto({ position: 0 });
    const photo2 = MerchFactory.fakeCollectionPhoto({ position: 1 });
    const collectionPhotos = [photo1, photo2];
    const collection = MerchFactory.fakeCollection({ collectionPhotos });

    await new PortalState()
      .createUsers(admin)
      .createMerchCollections(collection)
      .write();

    const storageService = Mocks.storage();
    const merchStoreController = ControllerFactory.merchStore(
      conn,
      undefined,
      instance(storageService),
    );
    const params = { uuid: collection.uuid };

    // verify before deleting, the photos all exist
    const collectionInDatabase = (await merchStoreController.getOneMerchCollection(params, admin)).collection;
    expect(collectionInDatabase.collectionPhotos).toEqual(collectionPhotos);

    const deleteMerchCollectionPhotoParam1 = { uuid: photo1.uuid };
    const deleteMerchCollectionPhotoParam2 = { uuid: photo2.uuid };

    // verify deletion delete correctly
    await merchStoreController.deleteMerchCollectionPhoto(deleteMerchCollectionPhotoParam1, admin);
    const expectedUrl = collectionInDatabase.collectionPhotos[0].uploadedPhoto;
    verify(storageService.deleteAtUrl(expectedUrl)).called();

    const newPhotos = (await merchStoreController.getOneMerchCollection(params, admin)).collection.collectionPhotos;

    expect(newPhotos).toHaveLength(1);
    expect(newPhotos[0].uuid).toEqual(photo2.uuid);
    expect(newPhotos[0].position).toEqual(1);

    // verify visible item photo limitation
    expect(merchStoreController.deleteMerchCollectionPhoto(deleteMerchCollectionPhotoParam2, admin))
      .rejects.toThrow('Cannot delete the only photo for a collection');

    // check cascade
    await merchStoreController.deleteMerchCollection(params, admin);
    expect(merchStoreController.deleteMerchCollectionPhoto(deleteMerchCollectionPhotoParam2, admin))
      .rejects.toThrow(NotFoundError);
  });
});

describe('archived merch collections', () => {
  test('only admins can view archived collections', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const collection = MerchFactory.fakeCollection({ archived: true });

    await new PortalState()
      .createUsers(admin, member)
      .createMerchCollections(collection)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: collection.uuid };

    await expect(merchStoreController.getOneMerchCollection(params, member))
      .rejects.toThrow(ForbiddenError);

    const getMerchCollectionResponse = await merchStoreController.getOneMerchCollection(params, admin);
    expect(getMerchCollectionResponse.collection.uuid).toEqual(collection.uuid);
  });
});

describe('merch items with options', () => {
  test('monthly and lifetime remaining values are properly set when ordering different item options', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const optionMetadataType = faker.datatype.hexaDecimal(10);
    const option1 = MerchFactory.fakeOptionWithType(optionMetadataType);
    const option2 = MerchFactory.fakeOptionWithType(optionMetadataType);
    const option3 = MerchFactory.fakeOptionWithType(optionMetadataType);
    const unorderedOption = MerchFactory.fakeOption();
    const item = MerchFactory.fakeItem({
      options: [option1, option2, option3],
      monthlyLimit: 5,
      lifetimeLimit: 10,
    });
    const unorderedItem = MerchFactory.fakeItem({
      options: [unorderedOption],
      hasVariantsEnabled: false,
      monthlyLimit: 5,
      lifetimeLimit: 10,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .createMerchItem(unorderedItem)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member, [
        { option: option1, quantity: 1 },
        { option: option2, quantity: 1 },
        { option: option3, quantity: 1 },
      ], pickupEvent)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const orderedItemParams = { uuid: item.uuid };
    const getOrderedItemResponse = await merchStoreController.getOneMerchItem(orderedItemParams, member);
    const updatedItem = getOrderedItemResponse.item;

    // make sure the ordered item's remaining counts got updated
    expect(updatedItem.monthlyRemaining).toEqual(2);
    expect(updatedItem.lifetimeRemaining).toEqual(7);

    const unorderedItemParams = { uuid: unorderedItem.uuid };
    const getUnorderedItemResponse = await merchStoreController.getOneMerchItem(unorderedItemParams, member);
    const unchangedItem = getUnorderedItemResponse.item;

    // make sure the un-ordered item's remaining counts didn't change
    expect(unchangedItem.monthlyRemaining).toEqual(5);
    expect(unchangedItem.lifetimeRemaining).toEqual(10);
  });

  test('monthly and lifetime remaining values are reset when an order is cancelled', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const option = MerchFactory.fakeOption();
    const item = MerchFactory.fakeItem({
      options: [option],
      monthlyLimit: 5,
      lifetimeLimit: 10,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member, [
        { option, quantity: 1 },
      ], pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderCancellation(member.email, member.firstName, anything()))
      .thenResolve();

    // make sure the item's remaining counts got updated
    const merchStoreController = ControllerFactory.merchStore(conn, instance(emailService));
    const orderedItemParams = { uuid: item.uuid };
    const getOrderedItemResponse = await merchStoreController.getOneMerchItem(orderedItemParams, member);
    const updatedItem = getOrderedItemResponse.item;
    expect(updatedItem.monthlyRemaining).toEqual(4);
    expect(updatedItem.lifetimeRemaining).toEqual(9);

    // cancel order
    const order = await conn.manager.findOne(OrderModel, { user: member });
    const cancelOrderParams = { uuid: order.uuid };
    await merchStoreController.cancelMerchOrder(cancelOrderParams, member);

    // make sure the item's remaining counts got reset
    const getCancelledItemResponse = await merchStoreController.getOneMerchItem(orderedItemParams, member);
    const cancelledItem = getCancelledItemResponse.item;
    expect(cancelledItem.monthlyRemaining).toEqual(5);
    expect(cancelledItem.lifetimeRemaining).toEqual(10);
  });

  test('if monthly or lifetime limits are reached, then the item cannot be ordered', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 100000 });
    const option1 = MerchFactory.fakeOption();
    const option2 = MerchFactory.fakeOption();
    const item = MerchFactory.fakeItem({
      options: [option1, option2],
      monthlyLimit: 1,
      lifetimeLimit: 1,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({
      orderLimit: 2,
    });

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member, [
        { option: option1, quantity: 1 },
      ], pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();

    // placing order fails
    const merchController = ControllerFactory.merchStore(conn);
    const order = [{ option: option2.uuid, quantity: 1 }];
    const placeOrderParams = { order, pickupEvent: pickupEvent.uuid };
    await expect(merchController.placeMerchOrder(placeOrderParams, member))
      .rejects.toThrow(`This order exceeds the lifetime limit for ${item.itemName}`);
  });
});

describe('merch items with no options', () => {
  test('can delete all item options and add back options if the item is hidden', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const collection = MerchFactory.fakeCollection();
    const item = MerchFactory.fakeItem({ hidden: true, collection });
    collection.items = [item]

    await new PortalState()
      .createUsers(admin)
      .createMerchCollections(collection)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);

    // delete all options from the merch item
    for (let i = 0; i < item.options.length; i += 1) {
      const optionParams = { uuid: item.options[i].uuid };
      await merchStoreController.deleteMerchItemOption(optionParams, admin);
    }

    const itemParams = { uuid: item.uuid };
    let getMerchItemResponse = await merchStoreController.getOneMerchItem(itemParams, admin);
    expect(getMerchItemResponse.item.options).toHaveLength(0);

    // add back the same options
    for (let i = 0; i < item.options.length; i += 1) {
      const createMerchItemOptionRequest = { option: item.options[i] };
      await merchStoreController.createMerchItemOption(itemParams, createMerchItemOptionRequest, admin);
    }

    getMerchItemResponse = await merchStoreController.getOneMerchItem(itemParams, admin);
    expect(getMerchItemResponse.item.options).toHaveLength(item.options.length);
  });

  test('cannot delete all item options if the item is visible', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hidden: false });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);

    // delete all but one options from the merch item
    for (let i = 1; i < item.options.length; i += 1) {
      const optionParams = { uuid: item.options[i].uuid };
      await merchStoreController.deleteMerchItemOption(optionParams, admin);
    }

    // should fail to delete the only remaining option
    await expect(merchStoreController.deleteMerchItemOption({ uuid: item.options[0].uuid }, admin))
      .rejects.toThrow('Cannot delete the only option for a visible merch item');

    const itemParams = { uuid: item.uuid };
    const getMerchItemResponse = await merchStoreController.getOneMerchItem(itemParams, admin);
    expect(getMerchItemResponse.item.options).toHaveLength(1);
  });

  test('cannot update an item with no options to be visible', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({
      hidden: true,
      hasVariantsEnabled: true,
      options: [],
    });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const params = { uuid: item.uuid };
    const editMerchItemRequest = { merchandise: { hidden: false } };
    await expect(ControllerFactory.merchStore(conn).editMerchItem(params, editMerchItemRequest, admin))
      .rejects.toThrow('Item cannot be set to visible if it has 0 options.');
  });
});

describe('merch item edits', () => {
  test('merch item fields can be updated', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem();

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // update the description and increment the purchase limits
    const merchItemEdits: MerchItemEdit = {
      description: faker.datatype.hexaDecimal(10),
      monthlyLimit: item.monthlyLimit + 1,
      lifetimeLimit: item.lifetimeLimit + 1,
    };
    const editMerchItemRequest = { merchandise: merchItemEdits };
    await merchStoreController.editMerchItem(params, editMerchItemRequest, admin);

    const getMerchItemResponse = await merchStoreController.getOneMerchItem(params, admin);
    expect(getMerchItemResponse.item.description).toEqual(merchItemEdits.description);
    expect(getMerchItemResponse.item.monthlyLimit).toEqual(merchItemEdits.monthlyLimit);
    expect(getMerchItemResponse.item.lifetimeLimit).toEqual(merchItemEdits.lifetimeLimit);
  });

  test('merch item option fields can be updated', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // make small updates to all the options in an item
    const optionUpdates = item.options.map((o) => ({
      uuid: o.uuid,
      price: o.price + 50,
      quantityToAdd: 5,
      discountPercentage: o.discountPercentage + 5,
    }));

    const editMerchItemRequest = { merchandise: { options: optionUpdates } };
    await merchStoreController.editMerchItem(params, editMerchItemRequest, admin);

    // combine the original options and their updates
    const updatedOptions = zip(item.options, optionUpdates).map(([original, update]) => ({
      uuid: original.uuid,
      quantity: original.quantity + update.quantityToAdd,
      price: update.price,
      discountPercentage: update.discountPercentage,
      metadata: original.metadata,
    }));

    const getMerchItemResponse = await merchStoreController.getOneMerchItem(params, admin);
    expect(getMerchItemResponse.item.options)
      .toEqual(expect.arrayContaining(updatedOptions));
  });

  test('merch item option quantity can be incremented and decremented', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const option = MerchFactory.fakeOption({
      quantity: 10,
    });
    const item = MerchFactory.fakeItem({
      hasVariantsEnabled: false,
      options: [option],
    });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // increment quantity from 10 to 15
    const incrementOptionUpdates = [{
      uuid: option.uuid,
      quantityToAdd: 5,
    }];
    const incrementQuantityRequest = { merchandise: { options: incrementOptionUpdates } };
    await merchStoreController.editMerchItem(params, incrementQuantityRequest, admin);

    // verify it got incremented
    const incrementedQuantityResponse = await merchStoreController.getOneMerchItem(params, admin);
    const incrementedOption = incrementedQuantityResponse.item.options[0];
    expect(incrementedOption.quantity).toEqual(15);

    // decrement quantity from 15 to 10
    const decrementOptionUpdates = [{
      uuid: option.uuid,
      quantityToAdd: -5,
    }];
    const decrementQuantityRequest = { merchandise: { options: decrementOptionUpdates } };
    await merchStoreController.editMerchItem(params, decrementQuantityRequest, admin);

    // verify it got decremented
    const decrementedQuantityResponse = await merchStoreController.getOneMerchItem(params, admin);
    const decrementedOption = decrementedQuantityResponse.item.options[0];
    expect(decrementedOption.quantity).toEqual(10);
  });

  test('merch item option quantity cannot be decremented to below 0', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const option = MerchFactory.fakeOption({
      quantity: 5,
    });
    const item = MerchFactory.fakeItem({
      hasVariantsEnabled: false,
      options: [option],
    });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // decrement quantity by 10 when the current quantity is 5
    const decrementOptionUpdates = [{
      uuid: option.uuid,
      quantityToAdd: -10,
    }];
    const decrementQuantityRequest = { merchandise: { options: decrementOptionUpdates } };
    await expect(merchStoreController.editMerchItem(params, decrementQuantityRequest, admin))
      .rejects.toThrow(`Cannot decrement option quantity below 0 for option: ${option.uuid}`);
  });

  test('items cannot be updated to have multiple options with different types', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    // change only one option's type to a different one
    item.options[0].metadata.type = faker.datatype.hexaDecimal(10);

    const params = { uuid: item.uuid };
    const editMerchItemRequest = { merchandise: { options: item.options } };
    await expect(ControllerFactory.merchStore(conn).editMerchItem(params, editMerchItemRequest, admin))
      .rejects.toThrow('Merch items cannot have multiple option types');
  });

  test('items can have their options\' types updated as long as its the same type for all options', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // change every option's type to a different but consistent one
    const type = faker.datatype.hexaDecimal(10);
    const updatedOptions = item.options.map((o) => MerchandiseItemOptionModel.merge(o, {
      metadata: {
        type,
        position: o.metadata.position,
        value: o.metadata.value,
      },
    }));

    const editMerchItemRequest = { merchandise: { options: updatedOptions } };
    await merchStoreController.editMerchItem(params, editMerchItemRequest, admin);
    const merchItemResponse = await merchStoreController.getOneMerchItem(params, admin);

    const publicUpdatedOptions = updatedOptions.map((o) => o.getPublicMerchItemOption());
    expect(merchItemResponse.item.options)
      .toEqual(expect.arrayContaining(publicUpdatedOptions));
  });
});

describe('merch item option variants', () => {
  test('items cannot have variants disabled and have multiple options', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const params = { uuid: item.uuid };
    const editMerchItemRequest = { merchandise: { hasVariantsEnabled: false } };
    await expect(ControllerFactory.merchStore(conn).editMerchItem(params, editMerchItemRequest, admin))
      .rejects.toThrow('Merch items with variants disabled cannot have multiple options');
  });

  test('items cannot have variants enabled and have null metadata for an option', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: false });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    const editMerchItemRequest = { merchandise: { hasVariantsEnabled: true } };
    await expect(merchStoreController.editMerchItem(params, editMerchItemRequest, admin))
      .rejects.toThrow('Merch options for items with variants enabled must have valid metadata');
  });
});

describe('merch item options', () => {
  test('can add options with some type to an item with variants enabled and options of the same type', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // create and add option with same type as existing options
    const optionWithSameType = MerchFactory.fakeOptionWithType(item.options[0].metadata.type);
    const createMerchOptionRequest = { option: optionWithSameType };
    await merchStoreController.createMerchItemOption(params, createMerchOptionRequest, admin);

    const merchItemResponse = await merchStoreController.getOneMerchItem(params, admin);

    // verify that option was added
    const existingPublicOptions = item.options.map((o) => o.getPublicMerchItemOption());
    const allOptions = [
      ...existingPublicOptions,
      optionWithSameType.getPublicMerchItemOption(),
    ];
    expect(merchItemResponse.item.options).toEqual(expect.arrayContaining(allOptions));
  });

  test('cannot add options with some type to an item with variants enabled but options of another type', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const optionWithDifferentType = MerchFactory.fakeOptionWithType(faker.datatype.hexaDecimal(10));

    const params = { uuid: item.uuid };
    const createMerchOptionRequest = { option: optionWithDifferentType };
    await expect(ControllerFactory.merchStore(conn).createMerchItemOption(params, createMerchOptionRequest, admin))
      .rejects.toThrow('Merch items cannot have multiple option types');
  });

  test('can delete option of some type from item with variants disabled and add option of another type', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({
      hasVariantsEnabled: false,
      hidden: true,
    });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const optionParams = { uuid: item.options[0].uuid };
    const itemParams = { uuid: item.uuid };

    // delete original option from item
    await merchStoreController.deleteMerchItemOption(optionParams, admin);

    // add option of another type
    const optionWithDifferentType = MerchFactory.fakeOptionWithType(faker.datatype.hexaDecimal(10));
    const createMerchOptionRequest = { option: optionWithDifferentType };
    await merchStoreController.createMerchItemOption(itemParams, createMerchOptionRequest, admin);

    const merchItemResponse = await merchStoreController.getOneMerchItem(itemParams, admin);
    expect(merchItemResponse.item.options).toHaveLength(1);
    expect(merchItemResponse.item.options[0])
      .toStrictEqual(optionWithDifferentType.getPublicMerchItemOption());
  });

  test('cannot add option to an item with variants disabled and an option', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: false });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    const createMerchOptionRequest = { option: MerchFactory.fakeOption() };
    await expect(merchStoreController.createMerchItemOption(params, createMerchOptionRequest, admin))
      .rejects.toThrow('Merch items with variants disabled cannot have multiple options');

    const getMerchItemResponse = await merchStoreController.getOneMerchItem(params, admin);
    expect(getMerchItemResponse.item.options).toHaveLength(1);
    expect(getMerchItemResponse.item.options[0])
      .toStrictEqual(item.options[0].getPublicMerchItemOption());
  });
});

describe('checkout cart', () => {
  test('passing in valid item option uuids returns the full options and their items', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const option1 = MerchFactory.fakeOption();
    const option2 = MerchFactory.fakeOption();
    const option3 = MerchFactory.fakeOption();
    const options = [option1, option2, option3];

    const itemForOptions1And2 = MerchFactory.fakeItem({ options: [option1, option2] });
    const itemForOption3 = MerchFactory.fakeItem({ options: [option3] });

    // need to explicitly set option.item after calling fakeItem(),
    // so that the item.options elements don't have circular references to
    // the item, but the singular option objects here do
    // (so that option.getPublicCartMerchItemOption() doesn't throw for undefined item)
    option1.item = itemForOptions1And2;
    option2.item = itemForOptions1And2;
    option3.item = itemForOption3;

    await new PortalState()
      .createUsers(member)
      .createMerchItem(itemForOptions1And2)
      .createMerchItem(itemForOption3)
      .write();

    const params = { items: options.map((o) => o.uuid) };
    const merchStoreController = ControllerFactory.merchStore(conn);
    const getCartResponse = await merchStoreController.getCartItems(params, member);

    const { cart } = getCartResponse;

    expect(cart).toHaveLength(3);
    expect(cart[0]).toStrictEqual(option1.getPublicOrderMerchItemOption());
    expect(cart[1]).toStrictEqual(option2.getPublicOrderMerchItemOption());
    expect(cart[2]).toStrictEqual(option3.getPublicOrderMerchItemOption());
  });

  test('passing in item option uuids that do not exist throws an error', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const option1 = MerchFactory.fakeOption();
    const option2 = MerchFactory.fakeOption();
    const options = [option1, option2];

    const item = MerchFactory.fakeItem({ options: [option1, option2] });

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .write();

    const validOptionUuids = options.map((o) => o.uuid);
    const invalidOptionUuid = faker.datatype.uuid();
    const params = { items: [...validOptionUuids, invalidOptionUuid] };
    const merchStoreController = ControllerFactory.merchStore(conn);
    await expect(merchStoreController.getCartItems(params, member))
      .rejects.toThrow(`The following items were not found: ${[invalidOptionUuid]}`);
  });
});
