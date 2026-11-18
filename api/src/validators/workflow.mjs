export class WorkflowInputError extends Error {
  constructor(message, status = 400, code = 'INVALID_REQUEST') {
    super(message);
    this.name = 'WorkflowInputError';
    this.status = status;
    this.code = code;
  }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSITION_TARGETS = new Set(['Contacted', 'Interview', 'Hired', 'Rejected']);

export function parseApplicationId(value) {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new WorkflowInputError('Invalid application ID');
  }
  return value;
}

function integer(value, name, fallback, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new WorkflowInputError('Invalid ' + name);
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > max) throw new WorkflowInputError('Invalid ' + name);
  return n;
}

export function parseAuditPagination(query) {
  if (!query || typeof query !== 'object' ||
      Object.keys(query).some(k => k !== 'page' && k !== 'pageSize')) {
    throw new WorkflowInputError('Invalid audit pagination parameters');
  }
  return {
    page: integer(query.page, 'page', 1, 1000),
    pageSize: integer(query.pageSize, 'pageSize', 20, 50)
  };
}

export function parseTransitionBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(k => !['toStatus', 'expectedVersion', 'reason'].includes(k))) {
    throw new WorkflowInputError('Invalid transition body');
  }
  if (typeof body.toStatus !== 'string' || !TRANSITION_TARGETS.has(body.toStatus)) {
    throw new WorkflowInputError('Invalid target status');
  }
  if (!Number.isSafeInteger(body.expectedVersion) ||
      body.expectedVersion < 1 || body.expectedVersion > 4294967294) {
    throw new WorkflowInputError('expectedVersion must be a positive integer');
  }
  let reason = null;
  if (body.reason !== undefined) {
    if (typeof body.reason !== 'string' || body.reason.length > 500 ||
        /[\u0000-\u001f\u007f]/.test(body.reason)) {
      throw new WorkflowInputError('Invalid transition reason');
    }
    reason = body.reason.trim() || null;
  }
  return { toStatus: body.toStatus, expectedVersion: body.expectedVersion, reason };
}


export function parseIdempotencyKey(value) {
  if (value === undefined || value === '') {
    throw new WorkflowInputError(
      'Idempotency-Key header is required', 428, 'IDEMPOTENCY_KEY_REQUIRED'
    );
  }
  if (typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new WorkflowInputError('Idempotency-Key must be a UUID v4');
  }
  return value.toLowerCase();
}
