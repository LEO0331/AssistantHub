import { createHash, randomUUID } from 'node:crypto';
import { literal, Transaction, UniqueConstraintError } from 'sequelize';
import { defineModels } from '../db/models.mjs';

export const ALLOWED_TRANSITIONS = Object.freeze({
  New: Object.freeze(['Contacted', 'Rejected']),
  Contacted: Object.freeze(['Interview', 'Rejected']),
  Interview: Object.freeze(['Hired', 'Rejected']),
  Hired: Object.freeze([]),
  Rejected: Object.freeze([])
});

export class WorkflowDomainError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'WorkflowDomainError';
    this.status = status;
    this.code = code;
  }
}

const notFound = () => new WorkflowDomainError(404, 'NOT_FOUND', 'Application not found');
const conflict = () => new WorkflowDomainError(409, 'VERSION_CONFLICT', 'Application was updated. Refresh before retrying.');
const invalidState = () => new WorkflowDomainError(422, 'INVALID_TRANSITION', 'Transition is not allowed from the current status');

const applicationFields = ['id', 'candidate_id', 'status', 'version', 'updated_at'];
const auditFields = ['id', 'application_id', 'actor_id', 'from_status', 'to_status', 'reason', 'request_id', 'occurred_at'];

function publicApplication(row) {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    status: row.status,
    version: row.version,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function publicEvent(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    actorId: row.actor_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    reason: row.reason ?? null,
    occurredAt: new Date(row.occurred_at).toISOString(),
    requestId: row.request_id
  };
}

const defaultWriteAudit = (AuditEvent, attributes, transaction) =>
  AuditEvent.create(attributes, { transaction });

export function createWorkflowService(db, { writeAudit = defaultWriteAudit } = {}) {
  const { Application, AuditEvent, IdempotencyRecord } = defineModels(db);

  async function getApplication(id) {
    const found = await Application.findByPk(id, { attributes: applicationFields });
    if (!found) throw notFound();
    return publicApplication(found);
  }

  async function auditHistory(id, { page, pageSize }) {
    // Return 404 rather than an empty history for a nonexistent application.
    const exists = await Application.findByPk(id, { attributes: ['id'] });
    if (!exists) throw notFound();
    const { count, rows } = await AuditEvent.findAndCountAll({
      where: { application_id: id },
      attributes: auditFields,
      order: [['occurred_at', 'ASC'], ['id', 'ASC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    return { items: rows.map(publicEvent), page, pageSize, total: count };
  }


  async function transition(id, { toStatus, expectedVersion, reason }, actorId,
    { idempotencyKey, requestId = randomUUID() } = {}) {
    // Store an actor-scoped operation key and the original success response in
    // the SAME transaction as optimistic update and audit insertion.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey || '')) {
      throw new WorkflowDomainError(428, 'IDEMPOTENCY_KEY_REQUIRED', 'A valid Idempotency-Key UUID is required');
    }
    const canonicalReason = reason?.trim() || null;
    const hash = createHash('sha256').update(JSON.stringify([
      id, toStatus, expectedVersion, canonicalReason
    ])).digest('hex');
    const time = new Date();
    const expiresAt = new Date(time.getTime() + 7 * 24 * 60 * 60 * 1000);
    const lookup = { actor_id: actorId, idempotency_key: idempotencyKey };

    try {
      const body = await db.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
      }, async transaction => {
        // InnoDB unique (actor_id, idempotency_key) is the claim. Concurrent
        // identical requests block on this insert, then observe its COMMIT.
        // Claims and completed responses never exist separately after commit.
        await IdempotencyRecord.create({
          id: randomUUID(),
          ...lookup,
          application_id: id,
          payload_hash: hash,
          response_body: null,
          request_id: requestId,
          completed_at: null,
          created_at: time,
          expires_at: expiresAt
        }, { transaction });

        const current = await Application.findByPk(id, {
          transaction, attributes: applicationFields
        });
        if (!current) throw notFound();
        if (current.version !== expectedVersion) throw conflict();
        if (!ALLOWED_TRANSITIONS[current.status]?.includes(toStatus)) throw invalidState();

        const now = new Date();
        const [affected] = await Application.update({
          status: toStatus,
          version: literal('version + 1'),
          updated_at: now
        }, {
          where: { id, status: current.status, version: expectedVersion },
          transaction
        });
        if (affected !== 1) throw conflict();

        const auditEvent = await writeAudit(AuditEvent, {
          id: randomUUID(),
          application_id: id,
          actor_id: actorId,
          from_status: current.status,
          to_status: toStatus,
          reason: canonicalReason,
          request_id: requestId,
          occurred_at: now
        }, transaction);

        const response = {
          application: {
            id: current.id,
            candidateId: current.candidate_id,
            status: toStatus,
            version: expectedVersion + 1,
            updatedAt: now.toISOString()
          },
          auditEventId: auditEvent.id
        };
        await IdempotencyRecord.update({
          response_body: response,
          completed_at: new Date()
        }, { where: lookup, transaction });
        return response;
      });
      return { body, replayed: false };
    } catch (error) {
      if (!(error instanceof UniqueConstraintError) ||
          error.parent?.code !== 'ER_DUP_ENTRY') throw error;

      // The first owner already committed before the unique-index insert
      // fails; read on a fresh connection/transaction (never within failed TX).
      const stored = await IdempotencyRecord.findOne({ where: lookup });
      if (!stored) throw new WorkflowDomainError(
        503, 'OUTCOME_UNAVAILABLE', 'Operation outcome unavailable. Retry with the same key later.'
      );
      if (stored.payload_hash !== hash || stored.application_id !== id) {
        throw new WorkflowDomainError(
          409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key was already used for a different request'
        );
      }
      if (!stored.completed_at || !stored.response_body) {
        throw new WorkflowDomainError(
          503, 'OUTCOME_UNAVAILABLE', 'Operation outcome unavailable. Retry with the same key later.'
        );
      }
      return { body: stored.response_body, replayed: true };
    }
  }

  return { getApplication, auditHistory, transition };
}
