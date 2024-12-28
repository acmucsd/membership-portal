import * as faker from 'faker';
import * as moment from 'moment';
import { v4 as uuid } from 'uuid';
import UserAccountService from '../../services/UserAccountService';
import { UserAccessType, UserState } from '../../types';
import { UserModel } from '../../models/UserModel';
import FactoryUtils from './FactoryUtils';
import { UserRepository } from '../../repositories';

export class UserFactory {
  public static readonly PASSWORD_RAW = 'password';

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

  public static fake(substitute?: Partial<UserModel>): UserModel {
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    const fake = UserRepository.create({
      uuid: uuid(),
      email: faker.internet.email(firstName, lastName, 'ucsd.edu'),
      firstName,
      lastName,
      hash: UserFactory.PASSWORD_HASH,
      accessType: UserAccessType.STANDARD,
      state: UserState.ACTIVE,
      graduationYear: UserFactory.graduationYear(),
      major: UserFactory.major(),
      points: 0,
      credits: 0,
      handle: UserAccountService.generateDefaultHandle(firstName, lastName),
      isAttendancePublic: true,
    });
    return UserRepository.merge(fake, substitute);
  }

  public static graduationYear(): number {
    return FactoryUtils.getRandomNumber(moment().year(), moment().year() + 6);
  }

  public static major(): string {
    return FactoryUtils.pickRandomValue(UserFactory.MAJORS);
  }
}
