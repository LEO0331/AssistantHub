// Only the exported CSV copy is neutralized; original shortlist values remain
// unchanged for on-screen display and JSON round trips.
const SPREADSHEET_FORMULA = /^[\u0000-\u0020\u007f\u00a0\u1680\u2000-\u200f\u2028\u2029\u202f\u205f\u2060\u3000\ufeff]*[=+\-@]/u;
const CSV_FIELDS = Object.freeze([
  'id', 'name', 'role', 'email', 'phone', 'country', 'hourlyRateUsd', 'hireStatus'
]);

export function escapeSpreadsheetCell(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '');
  // Prefix the ENTIRE value (before leading spaces/control characters), so
  // spreadsheet programs see text even if an attacker adds tabs or newlines.
  return SPREADSHEET_FORMULA.test(text) ? "'" + text : text;
}

export function safeShortlistCsvRows(shortlist) {
  return shortlist.map(talent => Object.fromEntries(
    CSV_FIELDS.map(key => [key, escapeSpreadsheetCell(talent[key])])
  ));
}
