export const HIRING_TRANSITIONS = Object.freeze({
  New: Object.freeze(['Contacted', 'Rejected']),
  Contacted: Object.freeze(['Interview', 'Rejected']),
  Interview: Object.freeze(['Hired', 'Rejected']),
  Hired: Object.freeze([]),
  Rejected: Object.freeze([])
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class WorkflowApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'WorkflowApiError';
    this.status = status;
  }
}

function validApplication(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    UUID.test(value.id) && UUID.test(value.candidateId) &&
    Object.prototype.hasOwnProperty.call(HIRING_TRANSITIONS, value.status) &&
    Number.isSafeInteger(value.version) && value.version >= 1 &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt));
}

function validAuditEvent(value, applicationId) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    UUID.test(value.id) && value.applicationId === applicationId &&
    UUID.test(value.actorId) &&
    Object.prototype.hasOwnProperty.call(HIRING_TRANSITIONS, value.fromStatus) &&
    Object.prototype.hasOwnProperty.call(HIRING_TRANSITIONS, value.toStatus) &&
    (value.reason === null || (typeof value.reason === 'string' && value.reason.length <= 500)) &&
    typeof value.occurredAt === 'string' &&
    Number.isFinite(Date.parse(value.occurredAt)) &&
    typeof value.requestId === 'string' && value.requestId.length > 0 && value.requestId.length <= 80;
}

function assertUuid(id, field) {
  if (typeof id !== 'string' || !UUID.test(id)) throw new Error('Invalid ' + field + '.');
}

function errorFromStatus(status) {
  if (status === 401) return new WorkflowApiError(401, 'Your API session has expired or has been revoked. Please sign in again.');
  if (status === 403) return new WorkflowApiError(403, 'Your role does not allow this action. Sign in again if your access changed.');
  if (status === 404) return new WorkflowApiError(404, 'The requested candidate application was not found.');
  if (status === 409) return new WorkflowApiError(409, 'Another user updated this application. Refresh server state before deciding what to do next.');
  if (status === 422) return new WorkflowApiError(422, 'This status transition is no longer permitted. Refresh server state.');
  if (status === 400) return new WorkflowApiError(400, 'The workflow request was rejected. Review the selected status and reason.');
  return new WorkflowApiError(status, 'Hiring workflow API is currently unavailable. Refresh server state before retrying.');
}

async function workflowRequest({ baseUrl, path, accessToken, method = 'GET', body, signal, fetchImpl = fetch }) {
  if (!baseUrl) throw new Error('Hiring workflow API is not configured.');
  if (typeof accessToken !== 'string' || accessToken.length < 10 || accessToken.length > 8192) {
    throw new WorkflowApiError(401, 'Sign in to access hiring workflow data.');
  }
  let response;
  try {
    response = await fetchImpl(new URL(path, baseUrl).toString(), {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + accessToken,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new WorkflowApiError(null, 'Cannot confirm the server outcome. Refresh application state and audit history before any retry.');
  }
  if (!response.ok) throw errorFromStatus(response.status);
  let data;
  try { data = await response.json(); }
  catch { throw new WorkflowApiError(null, 'Hiring workflow API returned invalid JSON. Refresh server state.'); }
  return data;
}

export function allowedNextStatuses(status) {
  return HIRING_TRANSITIONS[status] || [];
}

export async function fetchCandidateApplication({ baseUrl, candidateId, accessToken, signal, fetchImpl }) {
  assertUuid(candidateId, 'candidate ID');
  const data = await workflowRequest({
    baseUrl, path: '/api/candidates/' + encodeURIComponent(candidateId) + '/application',
    accessToken, signal, fetchImpl
  });
  if (!validApplication(data) || data.candidateId !== candidateId) {
    throw new Error('Candidate application response is invalid.');
  }
  return data;
}

export async function fetchApplicationAudit({ baseUrl, applicationId, accessToken,
  page = 1, pageSize = 10, signal, fetchImpl }) {
  assertUuid(applicationId, 'application ID');
  if (!Number.isInteger(page) || page < 1 || page > 1000 ||
    !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new Error('Invalid audit pagination.');
  }
  const url = '/api/applications/' + encodeURIComponent(applicationId) + '/audit-events?' +
    new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
  const result = await workflowRequest({ baseUrl, path: url, accessToken, signal, fetchImpl });
  if (!result || !Array.isArray(result.items) || result.items.length > pageSize ||
    !result.items.every(item => validAuditEvent(item, applicationId)) ||
    !Number.isSafeInteger(result.total) || result.total < 0 ||
    result.page !== page || result.pageSize !== pageSize) {
    throw new Error('Application audit history response is invalid.');
  }
  return result;
}

export async function postApplicationTransition({ baseUrl, applicationId, accessToken,
  toStatus, expectedVersion, reason = '', signal, fetchImpl }) {
  assertUuid(applicationId, 'application ID');
  if (!Object.values(HIRING_TRANSITIONS).some(values => values.includes(toStatus)) ||
    !Number.isSafeInteger(expectedVersion) || expectedVersion < 1 ||
    expectedVersion > 4294967294 || typeof reason !== 'string' ||
    reason.length > 500 || /[\u0000-\u001f\u007f]/.test(reason)) {
    throw new Error('Invalid transition input.');
  }
  const response = await workflowRequest({
    baseUrl,
    path: '/api/applications/' + encodeURIComponent(applicationId) + '/transitions',
    accessToken, method: 'POST', body: { toStatus, expectedVersion, reason: reason.trim() },
    signal, fetchImpl
  });
  if (!response || !validApplication(response.application) ||
    response.application.id !== applicationId ||
    response.application.status !== toStatus ||
    response.application.version !== expectedVersion + 1 ||
    !UUID.test(response.auditEventId)) {
    throw new WorkflowApiError(null, 'Cannot verify the transition response. Refresh server state before retrying.');
  }
  return response;
}
