import { UserRegistration } from 'types';
import { faker } from '@faker-js/faker';
import FactoryUtils from './FactoryUtils';
import { UserFactory } from './UserFactory';

export class UserRegistrationFactory {
  public static create(n: number) {
    return FactoryUtils.create(n, UserRegistrationFactory.fake);
  }

  public static fake(substitute?: Partial<UserRegistration>): UserRegistration {
    const fake: UserRegistration = {
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password: faker.string.alphanumeric(10),
      graduationYear: UserFactory.graduationYear(),
      major: UserFactory.major(),
    };
    return { ...fake, ...substitute };
  }
}
