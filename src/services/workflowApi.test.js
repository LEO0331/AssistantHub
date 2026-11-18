/* eslint-disable no-undef */
import {
  fetchCandidateApplication, fetchApplicationAudit, postApplicationTransition,
  allowedNextStatuses, WorkflowApiError
} from './workflowApi';

const CAND = '00000000-0000-4000-8000-000000000001';
const APP = '00000000-0000-4000-8000-000000000101';
const ACTOR = '00000000-0000-4000-8000-000000000301';
const EVENT = '00000000-0000-4000-8000-000000000401';
const TOKEN = 'a_test_only_bearer_token_xyz';
const baseUrl = 'https://api.example.test';
const application = {
  id: APP, candidateId: CAND, status: 'New', version: 1,
  updatedAt: '2026-11-18T02:00:00.000Z'
};
const event = {
  id: EVENT, applicationId: APP, actorId: ACTOR,
  fromStatus: 'New', toStatus: 'Contacted',
  reason: 'Review completed', occurredAt: '2026-11-18T02:01:00.000Z',
  requestId: 'server_generated_test_request'
};
const ok = value => ({ ok: true, status: 200, json: async () => value });

describe('authenticated hiring workflow API client', () => {
  test('maps candidate ID to server-provided application ID without guessing it', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(ok(application));
    const controller = new AbortController();
    const result = await fetchCandidateApplication({
      baseUrl, candidateId: CAND, accessToken: TOKEN,
      signal: controller.signal, fetchImpl
    });
    expect(result.id).toBe(APP);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(baseUrl + '/api/candidates/' + CAND + '/application');
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe('Bearer ' + TOKEN);
    expect(options.credentials).toBe('omit');
    expect(options.cache).toBe('no-store');
    expect(options.redirect).toBe('error');
    expect(options.signal).toBe(controller.signal);
    expect(JSON.stringify(result)).not.toMatch(/password_hash/);
  });

  test('rejects mismatched candidate IDs and forged or malformed application objects', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(ok({ ...application, candidateId: ACTOR }));
    await expect(fetchCandidateApplication({
      baseUrl, candidateId: CAND, accessToken: TOKEN, fetchImpl
    })).rejects.toThrow(/response is invalid/);
    fetchImpl.mockResolvedValueOnce(ok({ ...application, version: -1 }));
    await expect(fetchCandidateApplication({
      baseUrl, candidateId: CAND, accessToken: TOKEN, fetchImpl
    })).rejects.toThrow(/response is invalid/);
    await expect(fetchCandidateApplication({
      baseUrl, candidateId: 'not-a-uuid', accessToken: TOKEN, fetchImpl
    })).rejects.toThrow(/Invalid candidate ID/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('fetches bounded chronological audit pages and rejects malformed events', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(ok({
      items: [event], page: 2, pageSize: 10, total: 11
    }));
    const result = await fetchApplicationAudit({
      baseUrl, applicationId: APP, accessToken: TOKEN, page: 2, pageSize: 10, fetchImpl
    });
    expect(result.total).toBe(11);
    expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('page')).toBe('2');
    fetchImpl.mockResolvedValueOnce(ok({
      items: [{ ...event, applicationId: CAND }], page: 2, pageSize: 10, total: 11
    }));
    await expect(fetchApplicationAudit({
      baseUrl, applicationId: APP, accessToken: TOKEN, page: 2, fetchImpl
    })).rejects.toThrow(/history response is invalid/);
    await expect(fetchApplicationAudit({
      baseUrl, applicationId: APP, accessToken: TOKEN, pageSize: 100, fetchImpl
    })).rejects.toThrow(/pagination/);
  });

  test('sends only state/version/reason and requires server confirmation to accept success', async () => {
    const next = { ...application, status: 'Contacted', version: 2 };
    const fetchImpl = jest.fn().mockResolvedValue(ok({
      application: next, auditEventId: EVENT
    }));
    const result = await postApplicationTransition({
      baseUrl, applicationId: APP, accessToken: TOKEN,
      toStatus: 'Contacted', expectedVersion: 1,
      reason: '  Review completed  ', fetchImpl
    });
    expect(result.application.version).toBe(2);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(baseUrl + '/api/applications/' + APP + '/transitions');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer ' + TOKEN);
    expect(JSON.parse(options.body)).toEqual({
      toStatus: 'Contacted', expectedVersion: 1, reason: 'Review completed'
    });
    expect(options.credentials).toBe('omit');
    fetchImpl.mockResolvedValueOnce(ok({
      application: { ...next, version: 1 }, auditEventId: EVENT
    }));
    await expect(postApplicationTransition({
      baseUrl, applicationId: APP, accessToken: TOKEN,
      toStatus: 'Contacted', expectedVersion: 1, fetchImpl
    })).rejects.toThrow(/verify the transition response/);
  });

  test('interprets 401, 403, 409, 422 without echoing untrusted response bodies', async () => {
    for (const code of [401, 403, 409, 422, 503]) {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: false, status: code, text: async () => 'db_password_should_not_echo'
      });
      try {
        await postApplicationTransition({
          baseUrl, applicationId: APP, accessToken: TOKEN,
          toStatus: 'Contacted', expectedVersion: 1, fetchImpl
        });
        throw new Error('Expected rejection');
      } catch (error) {
        expect(error).toBeInstanceOf(WorkflowApiError);
        expect(error.status).toBe(code);
        expect(error.message).not.toMatch(/db_password_should_not_echo/);
      }
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  test('network timeouts and invalid JSON are treated as unknown outcome, never auto retried', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('db_password_connection_string'));
    await expect(postApplicationTransition({
      baseUrl, applicationId: APP, accessToken: TOKEN,
      toStatus: 'Rejected', expectedVersion: 1, fetchImpl
    })).rejects.toThrow(/Cannot confirm the server outcome/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    fetchImpl.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('bad json'); } });
    await expect(postApplicationTransition({
      baseUrl, applicationId: APP, accessToken: TOKEN,
      toStatus: 'Rejected', expectedVersion: 1, fetchImpl
    })).rejects.toThrow(/invalid JSON/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('aborts propagate and mutation inputs are strictly validated before fetch', async () => {
    const aborted = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchImpl = jest.fn().mockRejectedValue(aborted);
    await expect(fetchCandidateApplication({
      baseUrl, candidateId: CAND, accessToken: TOKEN, fetchImpl
    })).rejects.toMatchObject({ name: 'AbortError' });
    await expect(postApplicationTransition({
      baseUrl, applicationId: APP, accessToken: TOKEN,
      toStatus: 'New', expectedVersion: 1, fetchImpl
    })).rejects.toThrow(/Invalid transition input/);
    await expect(postApplicationTransition({
      baseUrl, applicationId: APP, accessToken: TOKEN,
      toStatus: 'Hired', expectedVersion: 0, fetchImpl
    })).rejects.toThrow(/Invalid transition input/);
    await expect(postApplicationTransition({
      baseUrl, applicationId: APP, accessToken: TOKEN,
      toStatus: 'Hired', expectedVersion: 1, reason: 'x'.repeat(501), fetchImpl
    })).rejects.toThrow(/Invalid transition input/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('status transitions are a read-only UI hint; backend remains authority', () => {
    expect(allowedNextStatuses('New')).toEqual(['Contacted', 'Rejected']);
    expect(allowedNextStatuses('Contacted')).toEqual(['Interview', 'Rejected']);
    expect(allowedNextStatuses('Interview')).toEqual(['Hired', 'Rejected']);
    expect(allowedNextStatuses('Hired')).toEqual([]);
    expect(allowedNextStatuses('Rejected')).toEqual([]);
    expect(allowedNextStatuses('__proto__')).toEqual([]);
  });
});
