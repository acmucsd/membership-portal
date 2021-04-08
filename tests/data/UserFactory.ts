import * as faker from 'faker';
import * as moment from 'moment';
import { v4 as uuid } from 'uuid';
import { UserAccessType, UserState } from '../../types';
import { UserModel } from '../../models/UserModel';
import FactoryUtils from './FactoryUtils';

export class UserFactory {
  // hash of the string "password"
  private static readonly PASSWORD_HASH = '$2b$10$WNZRaGHvj3blWAtosHrSDeH4wuSkpwmEVq4obpKr4nujs4XavIgmG';

  private static readonly MAJORS = [
    'Computer Science',
    'Computer Engineering',
    'Data Science',
    'Cognitive Science',
    'Mathematics',
    'Electrical Engineering',
    'Bioinformatics',
    'Undeclared',
  ];

  public static create(n: number): UserModel[] {
    return FactoryUtils.create(n, UserFactory.fake);
  }

  public static with(...substitutes: Partial<UserModel>[]): UserModel[] {
    return substitutes.map((sub) => UserModel.merge(UserFactory.fake(), sub));
  }

  public static fake(): UserModel {
    return UserModel.create({
      uuid: uuid(),
      email: faker.internet.email(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      hash: UserFactory.PASSWORD_HASH,
      accessType: UserAccessType.STANDARD,
      state: UserState.ACTIVE,
      graduationYear: FactoryUtils.getRandomNumber(moment().year(), moment().year() + 6),
      major: FactoryUtils.pickRandomValue(UserFactory.MAJORS),
      points: 0,
      credits: 0,
    });
  }
}
