import { MigrationInterface, QueryRunner } from 'typeorm';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';

const merchandise = [
  {
    uuid: '0de9ad9d-fb30-4b27-8321-05cae445a66b',
    title: 'The Hack School Collection',
    description: 'Do you like to code? Tell the world with this Hack School inspired collection.',
    items: [
      {
        uuid: 'b9b66f4d-0be5-4aca-a85c-87ca1b0e20a7',
        itemName: 'Unisex Hack School Anorak',
        picture: '',
        description: 'San Diego has an average annual precipitation less than 12 inches,'
          + 'but that doesn\'t mean you don\'t need one of these.',
        monthlyLimit: 1,
        lifetimeLimit: 1,
        hidden: false,
        options: [
          {
            uuid: '09739cd2-25ca-40d2-ace3-d012a1c1769c',
            quantity: 5,
            price: 22500,
            discountPercentage: 0,
            metadata: {
              size: 'XL',
            },
          },
        ],
      }, {
        uuid: '6b65bec1-4bff-4334-bf64-792b83ed426a',
        itemName: 'Hack School Sticker Pack (4)',
        picture: '',
        description: 'Make space on your laptop cover for these stickers. Pack of 4, size in inches.',
        monthlyLimit: 5,
        lifetimeLimit: 25,
        hidden: false,
        options: [
          {
            uuid: 'fdcc9e16-4d19-4436-84e7-b46ef9666b50',
            quantity: 35,
            price: 1500,
            discountPercentage: 15,
            metadata: {
              color: 'CYAN',
              size: '4x4',
            },
          },
          {
            uuid: 'a506894a-078b-46c5-8a46-d869c0bbaa87',
            quantity: 20,
            price: 1500,
            discountPercentage: 5,
            metadata: {
              color: 'LIGHT PINK',
              size: '2x2',
            },
          },
          {
            uuid: '999ac157-7557-4f4f-b3d8-044e573b33da',
            quantity: 80,
            price: 1500,
            discountPercentage: 55,
            metadata: {
              color: 'SEA GREEN',
              size: '3x3',
            },
          },
        ],
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
        description: 'Guaranteed 2x return on Grailed.',
        monthlyLimit: 2,
        lifetimeLimit: 5,
        hidden: false,
        options: [
          {
            uuid: 'bce24df4-cf8d-41c1-98d4-bc67f12fdb4e',
            quantity: 1,
            price: 8000,
            discountPercentage: 5,
          },
        ],
      }, {
        uuid: 'c512b45f-1133-4cd3-af8e-d7aac326fe51',
        itemName: 'Salt & Pepper (Canyon) Shakers',
        picture: '',
        description: 'Salt and pepper not included.',
        monthlyLimit: 3,
        lifetimeLimit: 10,
        hidden: false,
        options: [
          {
            uuid: '79757093-1965-4657-baae-252484939d92',
            quantity: 10,
            price: 2000,
            discountPercentage: 20,
          },
        ],
      }, {
        uuid: '1b6cc4e9-ccf2-4975-8424-7ff43c13d722',
        itemName: 'Unisex Raccoon Print Shell Jacket',
        picture: '',
        description: 'Self-explanatory.',
        monthlyLimit: 1,
        lifetimeLimit: 2,
        hidden: false,
        options: [
          {
            uuid: '6558f269-a449-4f94-8002-67ed39aa65c8',
            quantity: 10,
            price: 19500,
            discountPercentage: 0,
            metadata: {
              size: 'M',
            },
          },
          {
            uuid: 'b1549e26-a1ea-40fa-adba-05b3f66535e5',
            quantity: 10,
            price: 20500,
            discountPercentage: 0,
            metadata: {
              size: 'L',
            },
          },
        ],
      },
    ],
  },
];

export class Merch1598593350442 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.getRepository(MerchandiseCollectionModel).save(merchandise);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.createQueryBuilder()
      .delete()
      .from(MerchandiseCollectionModel)
      .execute();
  }
}
