import { generateAssistants } from '../data/assistantFactory';

export const TALENT_SOURCES = {
  LOCAL: 'local',
  MOCK_API: 'mock-api',
};

const adapters = {
  [TALENT_SOURCES.LOCAL]: async ({ count, seed }) => generateAssistants(count, { seed }),
  [TALENT_SOURCES.MOCK_API]: async ({ count, seed }) =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateAssistants(count, { seed, seedOffset: 997 }));
      }, count >= 500 ? 220 : 120);
    }),
};

export const loadTalentPool = async ({ count, seed, source = TALENT_SOURCES.LOCAL }) => {
  const adapter = adapters[source] || adapters[TALENT_SOURCES.LOCAL];
  return adapter({ count, seed });
};
