/* eslint-disable no-undef */
import { fetchCandidatePage, readCandidateApiBaseUrl } from './candidateApi';

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
      q: 'project&role', role: 'Project Coordinator', signal: controller.signal, fetchImpl
    });
    expect(result.total).toBe(13);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(new URL(url).searchParams.get('q')).toBe('project&role');
    expect(new URL(url).searchParams.get('page')).toBe('2');
    expect(options.signal).toBe(controller.signal);
    expect(options.credentials).toBe('omit');
    expect(options.redirect).toBe('error');
  });

  test('rejects malformed server responses and sanitizes network failures', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ items: [{ ...candidate, skills: 'bad' }], page: 1, pageSize: 12, total: 1 })
    });
    await expect(fetchCandidatePage({ baseUrl: 'https://api.example.com', fetchImpl }))
      .rejects.toThrow(/invalid response/);
    fetchImpl.mockRejectedValueOnce(new Error('password=secret'));
    await expect(fetchCandidatePage({ baseUrl: 'https://api.example.com', fetchImpl }))
      .rejects.toThrow(/could not be reached/);
    fetchImpl.mockRejectedValueOnce(Object.assign(new Error('cancelled'), { name: 'AbortError' }));
    await expect(fetchCandidatePage({ baseUrl: 'https://api.example.com', fetchImpl }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });

  test('never silently substitutes generated candidates in API mode', async () => {
    const { loadTalentPool, TALENT_SOURCES } = require('./talentAdapter');
    await expect(loadTalentPool({ count: 6, seed: 7, source: TALENT_SOURCES.API }))
      .rejects.toThrow(/fetchCandidatePage/);
  });
});
