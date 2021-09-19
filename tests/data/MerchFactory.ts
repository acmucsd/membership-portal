import * as faker from 'faker';
import { MerchItemOptionMetadata } from 'types';
import { v4 as uuid } from 'uuid';
import { MerchandiseCollectionModel } from '../../models/MerchandiseCollectionModel';
import { MerchandiseItemModel } from '../../models/MerchandiseItemModel';
import { MerchandiseItemOptionModel } from '../../models/MerchandiseItemOptionModel';
import FactoryUtils from './FactoryUtils';

export class MerchFactory {
  public static fakeCollection(substitute?: Partial<MerchandiseCollectionModel>): MerchandiseCollectionModel {
    const fake = MerchandiseCollectionModel.create({
      uuid: uuid(),
      title: faker.datatype.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      themeColorHex: faker.internet.color(),
    });

    // merging arrays returns a union of fake.items and substitute.items, so only create
    // fake.items if the substitute doesn't provide any
    if (!substitute?.items) {
      const numItems = FactoryUtils.getRandomNumber(1, 5);
      fake.items = FactoryUtils.create(numItems, () => MerchFactory.fakeItem({ collection: fake }));
    }
    return MerchandiseCollectionModel.merge(fake, substitute);
  }

  public static fakeItem(substitute?: Partial<MerchandiseItemModel>): MerchandiseItemModel {
    const hasVariantsEnabled = substitute?.hasVariantsEnabled ?? FactoryUtils.getRandomBoolean();
    const fake = MerchandiseItemModel.create({
      uuid: uuid(),
      itemName: faker.datatype.hexaDecimal(10),
      picture: faker.image.cats(),
      description: faker.lorem.sentences(2),
      hasVariantsEnabled,
    });

    // merging arrays returns a union of fake.items and substitute.items so only create
    // fake.options if the substitute doesn't provide any
    if (!substitute?.options) {
      const numOptions = hasVariantsEnabled ? FactoryUtils.getRandomNumber(3, 5) : 1;
      fake.options = MerchFactory
        .createOptions(numOptions)
        .map((option) => MerchandiseItemOptionModel.merge(option, { item: fake }));
    }
    return MerchandiseItemModel.merge(fake, substitute);
  }

  public static fakeOption(substitute?: Partial<MerchandiseItemOptionModel>): MerchandiseItemOptionModel {
    const fake = MerchandiseItemOptionModel.create({
      uuid: uuid(),
      quantity: FactoryUtils.getRandomNumber(0, 25),
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

  private static createOptions(n: number): MerchandiseItemOptionModel[] {
    if (n === 1) return [MerchFactory.fakeOption()];

    // create multiple options with consistent types
    const type = faker.datatype.hexaDecimal(10);
    return FactoryUtils.create(n, () => MerchFactory.fakeOptionWithType(type));
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
