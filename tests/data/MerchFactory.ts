import * as faker from 'faker';
import * as moment from 'moment';
import { v4 as uuid } from 'uuid';
import { MerchItemOptionMetadata, OrderPickupEventStatus } from '../../types';
import {
  OrderPickupEventModel,
  MerchandiseCollectionModel,
  MerchCollectionPhotoModel,
  MerchandiseItemModel,
  MerchandiseItemOptionModel,
  MerchandiseItemPhotoModel,
} from '../../models';
import { FactoryUtils } from '.';

export class MerchFactory {
  public static fakeCollection(substitute?: Partial<MerchandiseCollectionModel>): MerchandiseCollectionModel {
    const fake = MerchandiseCollectionModel.create({
      uuid: uuid(),
      title: faker.datatype.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      themeColorHex: faker.internet.color(),
      createdAt: faker.date.recent(),
    });

    // merging arrays returns a union of fake.items and substitute.items, so only create
    // fake.items if the substitute doesn't provide any
    if (!substitute?.items) {
      const numItems = FactoryUtils.getRandomNumber(1, 5);
      fake.items = FactoryUtils.create(numItems, () => MerchFactory.fakeItem({
        collection: fake,
        hidden: substitute?.archived,
      }));
    }

    if (!substitute?.collectionPhotos) {
      const numPhotos = FactoryUtils.getRandomNumber(1, 5);
      fake.collectionPhotos = MerchFactory
        .createCollectionPhotos(numPhotos)
        .map((collectionPhoto) => MerchCollectionPhotoModel.merge(collectionPhoto, { merchCollection: fake }));
    }

    return MerchandiseCollectionModel.merge(fake, substitute);
  }

  public static fakeItem(substitute?: Partial<MerchandiseItemModel>): MerchandiseItemModel {
    const hasVariantsEnabled = substitute?.hasVariantsEnabled ?? FactoryUtils.getRandomBoolean();
    const fake = MerchandiseItemModel.create({
      uuid: uuid(),
      itemName: faker.datatype.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      hasVariantsEnabled,
      monthlyLimit: FactoryUtils.getRandomNumber(1, 5),
      lifetimeLimit: FactoryUtils.getRandomNumber(6, 10),
      hidden: false,
    });
    // merging arrays returns a union of fake.options and substitute.options so only create
    // fake.options if the substitute doesn't provide any
    if (!substitute?.options) {
      const numOptions = hasVariantsEnabled ? FactoryUtils.getRandomNumber(3, 5) : 1;
      fake.options = MerchFactory
        .createOptions(numOptions)
        .map((option) => MerchandiseItemOptionModel.merge(option, { item: fake }));
    }
    if (!substitute?.merchPhotos) {
      const numPhotos = FactoryUtils.getRandomNumber(1, 5);
      fake.merchPhotos = MerchFactory
        .createPhotos(numPhotos)
        .map((merchPhoto) => MerchandiseItemPhotoModel.merge(merchPhoto, { merchItem: fake }));
    }
    return MerchandiseItemModel.merge(fake, substitute);
  }

  public static fakePhoto(substitute?: Partial<MerchandiseItemPhotoModel>): MerchandiseItemPhotoModel {
    const fake = MerchandiseItemPhotoModel.create({
      uuid: uuid(),
      position: 0,
      uploadedPhoto: FactoryUtils.getRandomImageUrl(),
      uploadedAt: faker.date.recent(),
    });
    return MerchandiseItemPhotoModel.merge(fake, substitute);
  }

  public static fakeCollectionPhoto(substitute?: Partial<MerchCollectionPhotoModel>): MerchCollectionPhotoModel {
    const fake = MerchCollectionPhotoModel.create({
      uuid: uuid(),
      position: 0,
      uploadedPhoto: 'https://www.fakepicture.com/',
      uploadedAt: faker.date.recent(),
    });
    return MerchCollectionPhotoModel.merge(fake, substitute);
  }

  private static createCollectionPhotos(n: number): MerchCollectionPhotoModel[] {
    return FactoryUtils
      .create(n, () => MerchFactory.fakeCollectionPhoto())
      .map((collectionPhoto, i) => MerchCollectionPhotoModel.merge(collectionPhoto, { position: i }));
  }

  public static fakeOption(substitute?: Partial<MerchandiseItemOptionModel>): MerchandiseItemOptionModel {
    const fake = MerchandiseItemOptionModel.create({
      uuid: uuid(),
      quantity: FactoryUtils.getRandomNumber(1, 25),
      price: MerchFactory.randomPrice(),
      discountPercentage: MerchFactory.randomDiscountPercentage(),
      metadata: null,
    });
    return MerchandiseItemOptionModel.merge(fake, substitute);
  }

  public static fakeOptionWithType(type: string) {
    return MerchFactory.fakeOption({
      metadata: MerchFactory.fakeOptionMetadata({ type }),
    });
  }

  public static fakeOptionMetadata(substitute?: Partial<MerchItemOptionMetadata>): MerchItemOptionMetadata {
    const fake = {
      type: faker.datatype.hexaDecimal(10),
      value: faker.datatype.hexaDecimal(10),
      position: FactoryUtils.getRandomNumber(1, 10),
    };
    const sub = substitute ?? {};
    return {
      ...fake,
      ...sub,
    };
  }

  public static fakeOrderPickupEvent(substitute?: Partial<OrderPickupEventModel>): OrderPickupEventModel {
    const [start, end] = FactoryUtils.getRandomTimeInterval();
    const fake = OrderPickupEventModel.create({
      uuid: uuid(),
      title: faker.datatype.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      start,
      end,
      orderLimit: FactoryUtils.getRandomNumber(1, 5),
      status: OrderPickupEventStatus.ACTIVE,
      orders: [],
      linkedEvent: null,
    });
    return OrderPickupEventModel.merge(fake, substitute);
  }

  public static fakeFutureOrderPickupEvent(substitute?: Partial<OrderPickupEventModel>): OrderPickupEventModel {
    // guarantee that start and end are 2 days after current time so that orders can be placed
    const daysAhead = FactoryUtils.getRandomNumber(3, 10);
    const duration = FactoryUtils.getRandomNumber(30, 180, 30);
    const start = moment().add(daysAhead, 'days').toDate();
    const end = moment(start).add(duration, 'minutes').toDate();
    return MerchFactory.fakeOrderPickupEvent({ start, end, ...substitute });
  }

  public static fakeOngoingOrderPickupEvent(substitute?: Partial<OrderPickupEventModel>): OrderPickupEventModel {
    const minutesPassed = FactoryUtils.getRandomNumber(30, 60, 15);
    const minutesRemaining = FactoryUtils.getRandomNumber(30, 60, 15);
    const start = moment().subtract(minutesPassed).toDate();
    const end = moment().add(minutesRemaining).toDate();
    return MerchFactory.fakeOrderPickupEvent({ start, end, ...substitute });
  }

  public static fakePastOrderPickupEvent(substitute?: Partial<OrderPickupEventModel>): OrderPickupEventModel {
    const daysBefore = FactoryUtils.getRandomNumber(3, 10);
    const duration = FactoryUtils.getRandomNumber(30, 180, 30);
    const start = moment().subtract(daysBefore, 'days').toDate();
    const end = moment(start).add(duration, 'minutes').toDate();
    return MerchFactory.fakeOrderPickupEvent({ start, end, ...substitute });
  }

  private static createOptions(n: number): MerchandiseItemOptionModel[] {
    if (n === 1) return [MerchFactory.fakeOption()];

    // create multiple options with consistent types
    const type = faker.datatype.hexaDecimal(10);
    return FactoryUtils.create(n, () => MerchFactory.fakeOptionWithType(type));
  }

  private static createPhotos(n: number): MerchandiseItemPhotoModel[] {
    return FactoryUtils
      .create(n, () => MerchFactory.fakePhoto())
      .map((merchPhoto, i) => MerchandiseItemPhotoModel.merge(merchPhoto, { position: i }));
  }

  private static randomPrice(): number {
    // some multiple of 50, min 250 and max 50_000
    return FactoryUtils.getRandomNumber(250, 50_000, 50);
  }

  private static randomDiscountPercentage(): number {
    // bias to no discount
    const discountPercentages = [0, 0, 0, 15, 25, 35];
    return FactoryUtils.pickRandomValue(discountPercentages);
  }
}
