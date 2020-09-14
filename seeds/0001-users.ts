import { MigrationInterface, QueryRunner } from 'typeorm';
import { UserAccessType, UserState } from '../types';
import { UserModel } from '../models/UserModel';

const users = [
  {
    uuid: '2bf4c870-80d3-4fe8-885c-85cc1925faf9',
    email: 's3bansal@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    state: UserState.ACTIVE,
    firstName: 'Sumeet',
    lastName: 'Bansal',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG',
    points: 125,
    graduationYear: 2020,
    major: 'Computer Science',
  }, {
    uuid: 'e0880a3b-f845-4f15-a9f9-c3315ccb0d77',
    email: 'stl005@ucsd.edu',
    accessType: UserAccessType.STAFF,
    state: UserState.ACTIVE,
    firstName: 'Stanley',
    lastName: 'Lee',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG',
    points: 55,
    graduationYear: 2022,
    major: 'Data Science',
  }, {
    uuid: 'bb063686-9579-4020-81fa-3c27b3c45b4c',
    email: 'stao@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    state: UserState.PENDING,
    firstName: 'Stone',
    lastName: 'Tao',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG',
    points: 425,
    graduationYear: 2021,
    major: 'Computer Science',
  }, {
    uuid: '72a16fb4-c3c8-4b22-b5a9-971589e1c624',
    email: 'jpan@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    state: UserState.ACTIVE,
    firstName: 'Paul',
    lastName: 'Pan',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG',
    points: 0,
    graduationYear: 2020,
    major: 'Mathematics - Computer Science',
  }, {
    uuid: '4bdab5fa-23e9-4a30-be0f-518a5c56009e',
    email: 'asudhart@ucsd.edu',
    accessType: UserAccessType.STANDARD,
    state: UserState.ACTIVE,
    firstName: 'Andrea',
    lastName: 'Sudharta',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG',
    points: 160,
    graduationYear: 2022,
    major: 'Computer Engineering',
  }, {
    uuid: '7dc03709-4a52-4ff1-b886-982a56d3d0de',
    email: 'smhariha@ucsd.edu',
    accessType: UserAccessType.ADMIN,
    state: UserState.ACTIVE,
    firstName: 'Shravan',
    lastName: 'Hariharan',
    hash: '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG',
    points: 750,
    graduationYear: 2023,
    major: 'Computer Science',
  },
];

export class Users1596168403394 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.getRepository(UserModel).save(users);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const uuids = users.map((user) => user.uuid);
    await queryRunner.manager.createQueryBuilder()
      .delete()
      .from(UserModel)
      .where('uuid IN (:...uuids)', { uuids })
      .execute();
  }
}
