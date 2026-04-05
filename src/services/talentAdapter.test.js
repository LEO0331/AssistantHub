/* eslint-disable no-undef */
import { loadTalentPool, TALENT_SOURCES } from './talentAdapter';

describe('talentAdapter', () => {
  test('loads deterministic local talent data', async () => {
    const first = await loadTalentPool({ count: 3, seed: 42, source: TALENT_SOURCES.LOCAL });
    const second = await loadTalentPool({ count: 3, seed: 42, source: TALENT_SOURCES.LOCAL });

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
  });

  test('falls back to local adapter for unknown source', async () => {
    const data = await loadTalentPool({ count: 2, seed: 7, source: 'unknown' });
    expect(data).toHaveLength(2);
  });
});
