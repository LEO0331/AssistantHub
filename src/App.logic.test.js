/* eslint-disable no-undef */
import { RATE_FILTERS } from './state/uiReducer';

jest.mock('./ProfileCards', () => () => null);
jest.mock('react-chatbot-kit', () => ({
  __esModule: true,
  default: () => null,
  createChatBotMessage: (text) => ({ message: text }),
}));
jest.mock('react-qr-code', () => () => null);
jest.mock('react-copy-to-clipboard', () => ({
  CopyToClipboard: ({ children }) => children,
}));
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => children,
  TileLayer: () => null,
  Marker: ({ children }) => children,
  Popup: ({ children }) => children,
}));
jest.mock('react-csv', () => ({
  CSVLink: ({ children }) => children,
}));

import {
  DEFAULT_IMPORT_MAX_BYTES,
  getNextStatus,
  HIRE_STATUSES,
  isRateMatch,
  readJsonFile,
  validateDemoImportFile,
  validateImportedDemoData,
} from './App';

describe('App logic helpers', () => {
  test('isRateMatch handles all rate filter branches', () => {
    expect(isRateMatch(35, RATE_FILTERS.UNDER_40)).toBe(true);
    expect(isRateMatch(45, RATE_FILTERS.UNDER_40)).toBe(false);

    expect(isRateMatch(40, RATE_FILTERS.BETWEEN_40_60)).toBe(true);
    expect(isRateMatch(60, RATE_FILTERS.BETWEEN_40_60)).toBe(true);
    expect(isRateMatch(61, RATE_FILTERS.BETWEEN_40_60)).toBe(false);

    expect(isRateMatch(65, RATE_FILTERS.OVER_60)).toBe(true);
    expect(isRateMatch(60, RATE_FILTERS.OVER_60)).toBe(false);

    expect(isRateMatch(999, RATE_FILTERS.ALL)).toBe(true);
  });

  test('getNextStatus cycles through pipeline and resets at end/unknown', () => {
    expect(getNextStatus(HIRE_STATUSES[0])).toBe(HIRE_STATUSES[1]);
    expect(getNextStatus(HIRE_STATUSES[1])).toBe(HIRE_STATUSES[2]);
    expect(getNextStatus(HIRE_STATUSES[2])).toBe(HIRE_STATUSES[3]);
    expect(getNextStatus(HIRE_STATUSES[3])).toBe(HIRE_STATUSES[0]);
    expect(getNextStatus('Unknown')).toBe(HIRE_STATUSES[0]);
  });

  test('readJsonFile uses file.text when available', async () => {
    const text = await readJsonFile({ text: () => Promise.resolve('{"x":1}') });
    expect(text).toBe('{"x":1}');
  });

  test('readJsonFile falls back to FileReader path', async () => {
    const original = global.FileReader;

    class MockFileReader {
      readAsText() {
        this.result = 'fallback-data';
        this.onload();
      }
    }

    global.FileReader = MockFileReader;

    const text = await readJsonFile({});
    expect(text).toBe('fallback-data');

    global.FileReader = original;
  });

  test('validateImportedDemoData validates schema and sanitizes values', () => {
    const valid = validateImportedDemoData({
      seed: 111,
      shortlist: [
        {
          id: 'a1',
          name: 'A',
          role: 'Ops',
          email: 'a@example.com',
          phone: '123',
          country: 'US',
          hourlyRateUsd: 50,
          hireStatus: 'Interview',
        },
      ],
      inquiries: [{ name: 'B', email: 'b@example.com', phone: '456', message: 'hello' }],
    });

    expect(valid.ok).toBe(true);
    expect(valid.value.seed).toBe(111);
    expect(valid.value.shortlist).toHaveLength(1);
    expect(valid.value.shortlist[0].hireStatus).toBe('Interview');

    const invalid = validateImportedDemoData({ seed: 1, shortlist: 'bad', inquiries: [] });
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toMatch(/shortlist/i);
  });

  test('validateDemoImportFile enforces json type and max file size', () => {
    const tooLarge = validateDemoImportFile({
      size: DEFAULT_IMPORT_MAX_BYTES + 1,
      type: 'application/json',
      name: 'big.json',
    });
    expect(tooLarge.ok).toBe(false);
    expect(tooLarge.error).toMatch(/File exceeds/i);

    const wrongType = validateDemoImportFile({
      size: 100,
      type: 'text/plain',
      name: 'data.txt',
    });
    expect(wrongType.ok).toBe(false);
    expect(wrongType.error).toMatch(/JSON/i);

    const valid = validateDemoImportFile({
      size: 100,
      type: 'application/json',
      name: 'demo.json',
    });
    expect(valid.ok).toBe(true);
  });
});
