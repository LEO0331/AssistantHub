/* eslint-disable no-undef */
import { escapeSpreadsheetCell, safeShortlistCsvRows } from './csvExport';

describe('CSV spreadsheet-formula injection defense', () => {
  test.each([
    '=HYPERLINK("https://example.invalid","open")',
    '+SUM(1,2)',
    '-3+9',
    '@SUM(1,2)',
    '  =2+3',
    '\t=2+3',
    '\r\n@DANGEROUS',
    '\uFEFF=1+1',
    '\u200B+1',
    '\u0000-1'
  ])('neutralizes a formula-like value without deleting original text: %j', value => {
    expect(escapeSpreadsheetCell(value)).toBe("'" + value);
  });

  test.each([
    'Julie Ward', 'hello@example.test', '123-456', '  real text',
    "'=already-text", '0', '', null, undefined, 'a,b"c\nnew line'
  ])('preserves non-formula content: %j', value => {
    expect(escapeSpreadsheetCell(value)).toBe(String(value ?? ''));
  });

  test('keeps numeric values numeric', () => {
    expect(escapeSpreadsheetCell(75)).toBe(75);
    expect(escapeSpreadsheetCell(0)).toBe(0);
  });

  test('protects every text column, whitelists export schema, and never mutates originals', () => {
    const fields = ['id', 'name', 'role', 'email', 'phone', 'country', 'hireStatus'];
    const talent = {
      id: '=1', name: ' +2', role: '\t-3', email: '@4',
      phone: '\r\n=5', country: '\uFEFF+6', hireStatus: '-7',
      hourlyRateUsd: 38, injectedExtra: '=8'
    };
    const source = [talent];
    const rows = safeShortlistCsvRows(source);
    expect(rows).toHaveLength(1);
    for (const key of fields) {
      expect(rows[0][key]).toBe("'" + talent[key]);
      expect(talent[key]).not.toMatch(/^'/);
    }
    expect(rows[0].hourlyRateUsd).toBe(38);
    expect(Object.keys(rows[0])).toEqual([
      'id', 'name', 'role', 'email', 'phone', 'country', 'hourlyRateUsd', 'hireStatus'
    ]);
    expect(rows[0]).not.toHaveProperty('injectedExtra');
  });
});
