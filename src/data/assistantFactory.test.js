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
      email: expect.any(String),
      phone: expect.any(String),
      avatarUrl: expect.any(String),
      country: expect.any(String),
      coordinates: {
        lat: expect.any(Number),
        lng: expect.any(Number),
      },
      likes: expect.any(Number),
      order: expect.any(Number),
    });
  });

  test('clamps to 10 assistants', () => {
    const assistants = generateAssistants(99);
    expect(assistants).toHaveLength(10);
  });
});
