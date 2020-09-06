import { MigrationInterface, QueryRunner } from 'typeorm';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';

export class MerchandiseCollections1598593350442 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.getRepository(MerchandiseCollectionModel).save([
      {
        uuid: '0de9ad9d-fb30-4b27-8321-05cae445a66b',
        title: 'The Hack School Collection',
        description: 'Do you like to code? Tell the world with this Hack School inspired collection.',
        items: [
          {
            uuid: 'b9b66f4d-0be5-4aca-a85c-87ca1b0e20a7',
            itemName: 'Unisex Hack School Anorak',
            picture: '',
            price: 22500,
            quantity: 5,
            description: 'San Diego has an average annual precipitation less than 12 inches,'
              + 'but that doesn\'t mean you don\'t need one of these.',
            discountPercentage: 0,
            monthlyLimit: 1,
            lifetimeLimit: 1,
            hidden: false,
          }, {
            uuid: '6b65bec1-4bff-4334-bf64-792b83ed426a',
            itemName: 'Hack School Sticker Pack (4)',
            picture: '',
            price: 1500,
            quantity: 120,
            description: 'Make space on your laptop cover for these 2 in x 2 in stickers. Pack of 4.',
            discountPercentage: 15,
            monthlyLimit: 5,
            lifetimeLimit: 25,
            hidden: false,
          }, {
            uuid: '1b6cc4e9-ccf2-4975-8424-7ff43c13d722',
            itemName: 'Unisex Raccoon Print Shell Jacket - M',
            picture: '',
            price: 19500,
            quantity: 10,
            description: 'Self-explanatory.',
            discountPercentage: 0,
            monthlyLimit: 1,
            lifetimeLimit: 2,
            hidden: false,
          }, {
            uuid: '5b9b68d6-60ef-4a4a-a897-6a13db3d70af',
            itemName: 'Unisex Raccoon Print Shell Jacket - L',
            picture: '',
            price: 19500,
            quantity: 10,
            description: 'Self-explanatory',
            discountPercentage: 0,
            monthlyLimit: 1,
            lifetimeLimit: 2,
            hidden: false,
          },
        ],
      }, {
        uuid: '45ed524f-0b1b-46ee-b591-f721dfb06a67',
        title: 'Fall 2001',
        description: 'Celebrate the opening of Sixth College in style, featuring raccoon print jackets.',
        items: [
          {
            uuid: '7db259b2-b791-4c50-b7d5-a0554ed06fe8',
            itemName: 'Camp Snoopy Snapback',
            picture: '',
            price: 8000,
            quantity: 15,
            description: 'Guaranteed 2x return on Grailed.',
            discountPercentage: 5,
            monthlyLimit: 2,
            lifetimeLimit: 5,
            hidden: false,
          }, {
            uuid: 'c512b45f-1133-4cd3-af8e-d7aac326fe51',
            itemName: 'Salt & Pepper (Canyon) Shakers',
            picture: '',
            price: 2000,
            quantity: 10,
            description: 'Salt and pepper not included.',
            discountPercentage: 20,
            monthlyLimit: 3,
            lifetimeLimit: 10,
            hidden: false,
          },
        ],
      },
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.createQueryBuilder().delete().from(MerchandiseCollectionModel).execute();
  }
}
