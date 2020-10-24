import * as faker from 'faker';
import { v4 as uuid } from 'uuid';
import { MerchandiseCollectionModel } from '../../models/MerchandiseCollectionModel';
import { MerchandiseItemModel } from '../../models/MerchandiseItemModel';
import { MerchandiseItemOptionModel } from '../../models/MerchandiseItemOptionModel';

export class MerchFactory {
  public static createCollections(n: number): MerchandiseCollectionModel[] {
    return Array(n).fill(null).map(() => MerchFactory.fakeCollection());
  }

  public static createItems(n: number): MerchandiseItemModel[] {
    return Array(n).fill(null).map(() => MerchFactory.fakeItem());
  }

  public static createOptions(n: number): MerchandiseItemOptionModel[] {
    return Array(n).fill(null).map(() => MerchFactory.fakeOption());
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
      items: MerchFactory.createItems(Math.floor(Math.random() * 5) + 1),
    });
  }

  public static fakeItem(): MerchandiseItemModel {
    return MerchandiseItemModel.create({
      uuid: uuid(),
      itemName: faker.random.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      options: MerchFactory.createOptions(Math.floor(Math.random() * 5) + 1),
    });
  }

  public static fakeOption(): MerchandiseItemOptionModel {
    return MerchandiseItemOptionModel.create({
      uuid: uuid(),
      quantity: Math.floor(Math.random() * 25),
      price: MerchFactory.randomPrice(),
      discountPercentage: MerchFactory.randomDiscountPercentage(),
    });
  }

  private static randomPrice(): number {
    return 250 + (Math.floor(Math.random() * 1_000) * 50);
  }

  private static randomDiscountPercentage(): number {
    const values = [0, 0, 0, 15, 25, 35];
    const i = Math.floor(Math.random() * values.length);
    return values[i];
  }
}
