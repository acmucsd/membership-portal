import * as faker from 'faker';
import { MerchItemOptionMetadata } from 'types';
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

  public static createOptionMetadataOfSameType(n: number): MerchItemOptionMetadata[] {
    // metadata type has to be the same across all options by store behavior 
    const type = faker.datatype.hexaDecimal(10);
    const substitutes = Array(n).fill({ type });
    return MerchFactory.optionMetadataWith(...substitutes);
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

  public static optionMetadataWith(...substitutes: Partial<MerchItemOptionMetadata>[]): MerchItemOptionMetadata[] {
    return substitutes.map((sub) => {
      const metadata = MerchFactory.fakeOptionMetadata();
      return {
        type: sub.type ?? metadata.type,
        value: sub.value ?? metadata.value,
        position: sub.position ?? metadata.position,
      };
    });
  }

  public static fakeCollection(): MerchandiseCollectionModel {
    return MerchandiseCollectionModel.create({
      uuid: uuid(),
      title: faker.datatype.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      items: MerchFactory.createItems(FactoryUtils.getRandomNumber(1, 5)),
    });
  }

  public static fakeItem(): MerchandiseItemModel {
    const hasVariants = FactoryUtils.getRandomBoolean();
    const maxNumOptions = hasVariants ? 5 : 1;
    return MerchandiseItemModel.create({
      uuid: uuid(),
      itemName: faker.datatype.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      hasVariants,
      options: MerchFactory.createOptions(FactoryUtils.getRandomNumber(1, maxNumOptions)),
    });
  }

  public static fakeOption(): MerchandiseItemOptionModel {
    return MerchandiseItemOptionModel.create({
      uuid: uuid(),
      quantity: FactoryUtils.getRandomNumber(0, 25),
      price: MerchFactory.randomPrice(),
      discountPercentage: MerchFactory.randomDiscountPercentage(),
    });
  }

  public static fakeOptionMetadata(): MerchItemOptionMetadata {
    return {
      type: faker.datatype.hexaDecimal(10),
      value: faker.datatype.hexaDecimal(10),
      position: FactoryUtils.getRandomNumber(1, 10),
    };
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
