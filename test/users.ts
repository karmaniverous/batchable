import { faker } from '@faker-js/faker';

export interface User {
  created: number;
  firstName: string;
  lastName: string;
  phone?: string;
  updated: number;
  userId: string;
}

export const getUsers = (count = 1, daysFromNow = 0, forDays = 1) => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const users: User[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = faker.date
      .soon({ days: forDays, refDate: now + day * daysFromNow })
      .getTime();

    users.push({
      created: timestamp,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number({ style: 'international' }),
      updated: timestamp,
      userId: faker.string.nanoid(),
    });
  }

  return users;
};
