import { UserRegistration } from 'types';
import * as faker from 'faker';
import { FactoryUtils } from '.';
import { UserFactory } from '.';

export class UserRegistrationFactory {
  public static create(n: number) {
    return FactoryUtils.create(n, UserRegistrationFactory.fake);
  }

  public static fake(substitute?: Partial<UserRegistration>): UserRegistration {
    const fake: UserRegistration = {
      email: faker.internet.email(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      password: faker.datatype.string(10),
      graduationYear: UserFactory.graduationYear(),
      major: UserFactory.major(),
    };
    return { ...fake, ...substitute };
  }
}
