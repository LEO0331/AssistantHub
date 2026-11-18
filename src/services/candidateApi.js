const META_NAME = 'assistanthub-api-base-url';

export function readCandidateApiBaseUrl(doc = document) {
  const raw = doc.querySelector('meta[name="' + META_NAME + '"]')?.getAttribute('content')?.trim() || '';
  if (!raw || raw.startsWith('%')) return '';
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return '';
    if (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return '';
    return url.origin;
  } catch {
    return '';
  }
}

function validCandidate(candidate) {
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate) &&
    typeof candidate.id === 'string' && candidate.id.length <= 80 &&
    typeof candidate.name === 'string' && candidate.name.length <= 120 &&
    typeof candidate.role === 'string' && candidate.role.length <= 80 &&
    typeof candidate.availability === 'string' && candidate.availability.length <= 40 &&
    Array.isArray(candidate.skills) && candidate.skills.length <= 30 &&
    candidate.skills.every(x => typeof x === 'string' && x.length <= 120) &&
    Number.isInteger(candidate.hourlyRateUsd) && candidate.hourlyRateUsd >= 0;
}

export async function fetchCandidatePage({
  baseUrl, q = '', role = '', availability = '', rate = 'all',
  sort = 'nameAsc', page = 1, pageSize = 12, signal, accessToken, fetchImpl = fetch
}) {
  if (!baseUrl) throw new Error('Candidate API is not configured.');
  if (typeof accessToken !== 'string' || accessToken.length < 10 || accessToken.length > 8192) {
    throw new Error('Sign in to access the candidate API.');
  }
  const url = new URL('/api/candidates', baseUrl);
  const fields = { q, role, availability, rate, sort, page, pageSize };
  Object.entries(fields).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  let response;
  try {
    response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + accessToken },
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('Candidate API could not be reached. Check that the backend is running.');
  }
  if (response.status === 401) {
    const error = new Error('Session expired or account access revoked. Sign in again.');
    error.status = 401;
    throw error;
  }
  if (!response.ok) throw new Error('Candidate API returned HTTP ' + response.status + '.');
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Candidate API returned invalid JSON.'); }
  if (!result || typeof result !== 'object' || !Array.isArray(result.items) ||
    result.items.length > pageSize || !result.items.every(validCandidate) ||
    !Number.isSafeInteger(result.total) || result.total < 0 ||
    result.page !== page || result.pageSize !== pageSize) {
    throw new Error('Candidate API returned an invalid response.');
  }
  return result;
}


export async function loginCandidateApi({ baseUrl, email, password, signal, fetchImpl = fetch }) {
  if (!baseUrl) throw new Error('Candidate API is not configured.');
  let response;
  try {
    response = await fetchImpl(new URL('/api/auth/login', baseUrl).toString(), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('Authentication service could not be reached.');
  }
  if (response.status === 429) throw new Error('Too many login attempts. Try again later.');
  if (response.status === 401) throw new Error('Invalid email or password.');
  if (!response.ok) throw new Error('Authentication service returned HTTP ' + response.status + '.');
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Authentication service returned invalid JSON.'); }
  if (!result || typeof result.accessToken !== 'string' || result.accessToken.length < 10 ||
    result.accessToken.length > 8192 || result.tokenType !== 'Bearer' ||
    !Number.isInteger(result.expiresIn) || result.expiresIn < 1 || result.expiresIn > 3600 ||
    !result.user || typeof result.user.id !== 'string' ||
    typeof result.user.email !== 'string' ||
    !['viewer', 'recruiter', 'admin'].includes(result.user.role)) {
    throw new Error('Authentication service returned an invalid response.');
  }
  return result;
}
