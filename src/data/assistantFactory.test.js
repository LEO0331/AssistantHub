/* eslint-disable no-undef */
import { generateAssistants } from './assistantFactory';

describe('assistantFactory', () => {
  test('generates deterministic assistants for same count', () => {
    const first = generateAssistants(3);
    const second = generateAssistants(3);

    expect(second).toEqual(first);
  });

  test('returns normalized assistant shape', () => {
    const [assistant] = generateAssistants(1);

    expect(assistant).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      role: expect.any(String),
      skills: expect.any(Array),
      email: expect.any(String),
      phone: expect.any(String),
      avatarUrl: expect.any(String),
      country: expect.any(String),
      hourlyRateUsd: expect.any(Number),
      availability: expect.any(String),
      coordinates: {
        lat: expect.any(Number),
        lng: expect.any(Number),
      },
      likes: expect.any(Number),
      order: expect.any(Number),
    });
    expect(assistant.skills.length).toBeGreaterThanOrEqual(2);
  });

  test('supports large pool size and clamps at 5000 assistants', () => {
    const assistants = generateAssistants(5001);
    expect(assistants).toHaveLength(5000);
  });

  test('supports deterministic custom seed', () => {
    const first = generateAssistants(2, { seed: 9001 });
    const second = generateAssistants(2, { seed: 9001 });
    const third = generateAssistants(2, { seed: 9002 });

    expect(first).toEqual(second);
    expect(first[0].name).not.toBe(third[0].name);
  });
});
