import * as faker from 'faker';
import { v4 as uuid } from 'uuid';
import { MerchandiseCollectionModel } from '../../models/MerchandiseCollectionModel';
import { MerchandiseItemModel } from '../../models/MerchandiseItemModel';
import { MerchandiseItemOptionModel } from '../../models/MerchandiseItemOptionModel';
import FactoryUtils from './FactoryUtils';

export class MerchFactory {
  public static createCollections(n: number): MerchandiseCollectionModel[] {
    return FactoryUtils.create(n, MerchFactory.fakeCollection);
  }

  public static createItems(n: number): MerchandiseItemModel[] {
    return FactoryUtils.create(n, MerchFactory.fakeItem);
  }

  public static createOptions(n: number): MerchandiseItemOptionModel[] {
    return FactoryUtils.create(n, MerchFactory.fakeOption);
  }

  public static collectionsWith(...substitutes: Partial<MerchandiseCollectionModel>[]): MerchandiseCollectionModel[] {
    return substitutes.map((sub) => {
      const merged = MerchandiseCollectionModel.merge(MerchFactory.fakeCollection(), sub);
      if (sub.items) merged.items = sub.items;
      return merged;
    });
  }

  public static itemsWith(...substitutes: Partial<MerchandiseItemModel>[]): MerchandiseItemModel[] {
    return substitutes.map((sub) => {
      const merged = MerchandiseItemModel.merge(MerchFactory.fakeItem(), sub);
      if (sub.options) merged.options = sub.options;
      return merged;
    });
  }

  public static optionsWith(...substitutes: Partial<MerchandiseItemOptionModel>[]): MerchandiseItemOptionModel[] {
    return substitutes.map((sub) => MerchandiseItemOptionModel.merge(MerchFactory.fakeOption(), sub));
  }

  public static fakeCollection(): MerchandiseCollectionModel {
    return MerchandiseCollectionModel.create({
      uuid: uuid(),
      title: faker.random.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      items: MerchFactory.createItems(FactoryUtils.getRandomNumber(5, 1)),
    });
  }

  public static fakeItem(): MerchandiseItemModel {
    return MerchandiseItemModel.create({
      uuid: uuid(),
      itemName: faker.random.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      options: MerchFactory.createOptions(FactoryUtils.getRandomNumber(5, 1)),
    });
  }

  public static fakeOption(): MerchandiseItemOptionModel {
    return MerchandiseItemOptionModel.create({
      uuid: uuid(),
      quantity: FactoryUtils.getRandomNumber(25),
      price: MerchFactory.randomPrice(),
      discountPercentage: MerchFactory.randomDiscountPercentage(),
    });
  }

  private static randomPrice(): number {
    // some multiple of 50, min 250 and max 50_000
    return FactoryUtils.getRandomNumber(996, 250, 50);
  }

  private static randomDiscountPercentage(): number {
    // bias to no discount
    const discountPercentages = [0, 0, 0, 15, 25, 35];
    return FactoryUtils.pickRandomValue(discountPercentages);
  }
}
