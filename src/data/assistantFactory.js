import { faker } from '@faker-js/faker';

const BASE_SEED = 7331;

const clampCount = (count) => {
  const normalized = Number(count);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return 0;
  }
  return Math.min(Math.floor(normalized), 10);
};

const toCoordinate = (value) => Number.parseFloat(value.toFixed(6));

const createAssistant = (index) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: faker.phone.number(),
    avatarUrl: faker.image.avatar(),
    country: faker.location.country(),
    coordinates: {
      lat: toCoordinate(faker.location.latitude()),
      lng: toCoordinate(faker.location.longitude()),
    },
    likes: faker.number.int({ min: 0, max: 9 }),
    order: index,
  };
};

export const generateAssistants = (count, seedOffset = 0) => {
  const safeCount = clampCount(count);
  faker.seed(BASE_SEED + safeCount * 97 + Number(seedOffset || 0));

  return Array.from({ length: safeCount }, (_, index) => createAssistant(index));
};

export { BASE_SEED };
