import * as faker from 'faker';
import * as moment from 'moment';
import { UserAccessType, UserState } from '../../types';
import { UserModel } from '../../models/UserModel';

export class UserFactory {
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
    return Array(n).fill(null).map(() => UserFactory.fake());
  }

  public static with(...substitutes: Partial<UserModel>[]): UserModel[] {
    return substitutes.map((sub) => UserModel.merge(UserFactory.fake(), sub));
  }

  private static fake(): UserModel {
    return UserModel.create({
      email: faker.internet.email(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      hash: UserFactory.PASSWORD_HASH,
      accessType: UserAccessType.STANDARD,
      state: UserState.ACTIVE,
      graduationYear: UserFactory.randomGraduationYear(),
      major: UserFactory.randomMajor(),
    });
  }

  private static randomGraduationYear(): number {
    const offset = Math.floor(Math.random() * 6);
    return moment().year() + offset;
  }

  private static randomMajor(): string {
    const i = Math.floor(Math.random() * UserFactory.MAJORS.length);
    return UserFactory.MAJORS[i];
  }
}
