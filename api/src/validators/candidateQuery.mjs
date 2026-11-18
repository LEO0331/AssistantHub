const SORTS = new Set(['rateDesc', 'rateAsc', 'nameAsc']);
const RATES = new Set(['all', 'under40', '40to60', 'over60']);
const QUERY_KEYS = new Set(['q', 'role', 'availability', 'rate', 'sort', 'page', 'pageSize']);

export class CandidateQueryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CandidateQueryError';
  }
}

function textField(value, key, max) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new CandidateQueryError('Invalid ' + key + ' parameter');
  }
  return value.trim();
}
function intField(value, key, defaultValue, max) {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new CandidateQueryError('Invalid ' + key + ' parameter');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) {
    throw new CandidateQueryError('Invalid ' + key + ' parameter');
  }
  return parsed;
}

export function parseCandidateQuery(query) {
  if (!query || typeof query !== 'object') throw new CandidateQueryError('Invalid query');
  for (const key of Object.keys(query)) {
    if (!QUERY_KEYS.has(key)) throw new CandidateQueryError('Unknown query parameter');
  }
  const q = textField(query.q, 'q', 100);
  const role = textField(query.role, 'role', 80);
  const availability = textField(query.availability, 'availability', 40);
  const rate = textField(query.rate, 'rate', 16) || 'all';
  const sort = textField(query.sort, 'sort', 16) || 'nameAsc';
  if (!RATES.has(rate)) throw new CandidateQueryError('Invalid rate parameter');
  if (!SORTS.has(sort)) throw new CandidateQueryError('Invalid sort parameter');
  return {
    q,
    role: role === 'all' ? '' : role,
    availability: availability === 'all' ? '' : availability,
    rate,
    sort,
    page: intField(query.page, 'page', 1, 1000),
    pageSize: intField(query.pageSize, 'pageSize', 24, 96)
  };
}

export function parseCandidateId(value) {
  if (typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new CandidateQueryError('Invalid candidate ID');
  }
  return value;
}
