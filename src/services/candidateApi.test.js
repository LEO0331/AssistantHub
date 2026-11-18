/* eslint-disable no-undef */
import { fetchCandidatePage, loginCandidateApi, readCandidateApiBaseUrl } from './candidateApi';

const candidate = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Demo Candidate 01',
  role: 'Project Coordinator',
  skills: ['Scheduling'],
  availability: 'Available now',
  hourlyRateUsd: 40
};

describe('candidate API adapter', () => {
  test('reads only an explicitly configured secure or local-only API origin', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'assistanthub-api-base-url');
    document.head.appendChild(meta);
    try {
      meta.setAttribute('content', '%VITE_ASSISTANTHUB_API_BASE_URL%');
      expect(readCandidateApiBaseUrl()).toBe('');
      meta.setAttribute('content', 'http://127.0.0.1:3100');
      expect(readCandidateApiBaseUrl()).toBe('http://127.0.0.1:3100');
      meta.setAttribute('content', 'http://api.example.com');
      expect(readCandidateApiBaseUrl()).toBe('');
      meta.setAttribute('content', 'https://example.com/api?token=secret');
      expect(readCandidateApiBaseUrl()).toBe('');
      meta.setAttribute('content', 'https://api.example.com');
      expect(readCandidateApiBaseUrl()).toBe('https://api.example.com');
    } finally {
      meta.remove();
    }
  });

  test('makes bounded server-paginated request, forwards cancellation, and validates result', async () => {
    const controller = new AbortController();
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [candidate], page: 2, pageSize: 12, total: 13 })
    });
    const result = await fetchCandidatePage({
      baseUrl: 'https://api.example.com', page: 2, pageSize: 12,
      q: 'project&role', role: 'Project Coordinator', signal: controller.signal,
      accessToken: 'test_token_long_enough_for_adapter', fetchImpl
    });
    expect(result.total).toBe(13);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(new URL(url).searchParams.get('q')).toBe('project&role');
    expect(new URL(url).searchParams.get('page')).toBe('2');
    expect(options.signal).toBe(controller.signal);
    expect(options.credentials).toBe('omit');
    expect(options.headers.Authorization).toBe('Bearer test_token_long_enough_for_adapter');
    expect(options.redirect).toBe('error');
  });

  test('rejects malformed server responses and sanitizes network failures', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ items: [{ ...candidate, skills: 'bad' }], page: 1, pageSize: 12, total: 1 })
    });
    await expect(fetchCandidatePage({ baseUrl: 'https://api.example.com', accessToken: 'test_token_long_enough_for_adapter', fetchImpl }))
      .rejects.toThrow(/invalid response/);
    fetchImpl.mockRejectedValueOnce(new Error('password=secret'));
    await expect(fetchCandidatePage({ baseUrl: 'https://api.example.com', fetchImpl }))
      .rejects.toThrow(/could not be reached/);
    fetchImpl.mockRejectedValueOnce(Object.assign(new Error('cancelled'), { name: 'AbortError' }));
    await expect(fetchCandidatePage({ baseUrl: 'https://api.example.com', fetchImpl }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });


  test('an unauthorized API response signals session expiration instead of falling back to mock data', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(fetchCandidatePage({
      baseUrl: 'https://api.example.com', accessToken: 'test_token_long_enough_for_adapter', fetchImpl
    })).rejects.toMatchObject({ status: 401 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('login sends credentials only to configured auth endpoint and validates token response', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({
        accessToken: 'signed_fake_test_only_token',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: { id: 'user-id', email: 'demo@test.example', role: 'viewer' }
      })
    });
    const data = await loginCandidateApi({
      baseUrl: 'https://api.example.com', email: 'demo@test.example', password: 'Test-Password-Only',
      fetchImpl
    });
    expect(data.expiresIn).toBe(900);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/auth/login');
    expect(JSON.parse(options.body)).toEqual({
      email: 'demo@test.example', password: 'Test-Password-Only'
    });
    expect(options.credentials).toBe('omit');
    expect(options.cache).toBe('no-store');
    expect(options.headers.Authorization).toBeUndefined();
    fetchImpl.mockResolvedValueOnce({ ok: true, status: 200,
      json: async () => ({ accessToken: 'invalid', tokenType: 'Bearer', expiresIn: 900, user: { role: 'admin' } })
    });
    await expect(loginCandidateApi({
      baseUrl: 'https://api.example.com', email: 'demo@test.example',
      password: 'Test-Password-Only', fetchImpl
    })).rejects.toThrow(/invalid response/);
  });

  test('never silently substitutes generated candidates in API mode', async () => {
    const { loadTalentPool, TALENT_SOURCES } = require('./talentAdapter');
    await expect(loadTalentPool({ count: 6, seed: 7, source: TALENT_SOURCES.API }))
      .rejects.toThrow(/fetchCandidatePage/);
  });
});
