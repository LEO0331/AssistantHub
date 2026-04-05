import { faker } from '@faker-js/faker';

const BASE_SEED = 7331;
const MAX_GENERATED_ASSISTANTS = 5000;

export const TALENT_ROLES = [
  'Executive Assistant',
  'Project Coordinator',
  'Operations Specialist',
  'Marketing Assistant',
  'Customer Success Associate',
  'Research Assistant',
  'Virtual Office Manager',
  'Technical Support Assistant',
];

export const AVAILABILITY_OPTIONS = ['Available now', 'Open next week', 'Interviewing'];

const SKILLS = [
  'Calendar Management',
  'Travel Planning',
  'CRM Operations',
  'Content Scheduling',
  'Inbox Triage',
  'Client Onboarding',
  'Data Research',
  'Presentation Prep',
  'Workflow Automation',
  'Stakeholder Coordination',
];

const LANGUAGES = ['English', 'Mandarin', 'Spanish', 'Japanese', 'Korean', 'German', 'French'];

const clampCount = (count) => {
  const normalized = Number(count);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return 0;
  }
  return Math.min(Math.floor(normalized), MAX_GENERATED_ASSISTANTS);
};

const toCoordinate = (value) => Number.parseFloat(value.toFixed(6));

const createAssistant = (index) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const selectedRole = TALENT_ROLES[index % TALENT_ROLES.length];

  return {
    id: faker.string.uuid(),
    name: `${firstName} ${lastName}`,
    role: selectedRole,
    skills: faker.helpers.arrayElements(SKILLS, { min: 2, max: 4 }),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: faker.phone.number(),
    avatarUrl: faker.image.avatar(),
    country: faker.location.country(),
    hourlyRateUsd: faker.number.int({ min: 20, max: 90 }),
    yearsExperience: faker.number.int({ min: 1, max: 14 }),
    projectsCompleted: faker.number.int({ min: 8, max: 220 }),
    responseTimeHours: faker.number.int({ min: 1, max: 24 }),
    timezone: faker.location.timeZone(),
    languages: faker.helpers.arrayElements(LANGUAGES, { min: 1, max: 3 }),
    availability: faker.helpers.arrayElement(AVAILABILITY_OPTIONS),
    coordinates: {
      lat: toCoordinate(faker.location.latitude()),
      lng: toCoordinate(faker.location.longitude()),
    },
    likes: faker.number.int({ min: 0, max: 9 }),
    order: index,
  };
};

export const generateAssistants = (count, options = {}) => {
  const safeCount = clampCount(count);
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) : BASE_SEED;
  faker.seed(seed + safeCount * 97 + Number(options.seedOffset || 0));

  return Array.from({ length: safeCount }, (_, index) => createAssistant(index));
};

export { BASE_SEED };
