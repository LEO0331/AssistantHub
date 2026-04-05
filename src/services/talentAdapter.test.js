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

  test('mock-api adapter resolves after simulated network delay', async () => {
    jest.useFakeTimers();

    const promise = loadTalentPool({ count: 600, seed: 17, source: TALENT_SOURCES.MOCK_API });

    let resolved = false;
    promise.then(() => {
      resolved = true;
    });

    jest.advanceTimersByTime(200);
    await Promise.resolve();
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(20);
    const data = await promise;
    expect(data).toHaveLength(600);

    jest.useRealTimers();
  });
});
