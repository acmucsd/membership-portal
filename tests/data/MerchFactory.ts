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

  public static fakeCollection(substitute?: Partial<MerchandiseCollectionModel>): MerchandiseCollectionModel {
    const fake = MerchandiseCollectionModel.create({
      uuid: uuid(),
      title: faker.datatype.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      items: MerchFactory.createItems(FactoryUtils.getRandomNumber(1, 5)),
    });
    return MerchandiseCollectionModel.merge(fake, substitute);
  }

  public static fakeItem(substitute?: Partial<MerchandiseItemModel>): MerchandiseItemModel {
    const fake = MerchandiseItemModel.create({
      uuid: uuid(),
      itemName: faker.datatype.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      options: MerchFactory.createOptions(FactoryUtils.getRandomNumber(1, 5)),
    });
    return MerchandiseItemModel.merge(fake, substitute);
  }

  public static fakeOption(substitute?: Partial<MerchandiseItemOptionModel>): MerchandiseItemOptionModel {
    const fake = MerchandiseItemOptionModel.create({
      uuid: uuid(),
      quantity: FactoryUtils.getRandomNumber(0, 25),
      price: MerchFactory.randomPrice(),
      discountPercentage: MerchFactory.randomDiscountPercentage(),
    });
    return MerchandiseItemOptionModel.merge(fake, substitute);
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
