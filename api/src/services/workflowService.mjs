import { randomUUID } from 'node:crypto';
import { literal, Transaction } from 'sequelize';
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
  const { Application, AuditEvent } = defineModels(db);

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

  async function transition(id, { toStatus, expectedVersion, reason }, actorId) {
    // No responses or audit writes occur until MySQL COMMIT succeeds.
    return db.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    }, async transaction => {
      const current = await Application.findByPk(id, {
        transaction,
        attributes: applicationFields
      });
      if (!current) throw notFound();
      if (current.version !== expectedVersion) throw conflict();
      if (!ALLOWED_TRANSITIONS[current.status]?.includes(toStatus)) throw invalidState();

      const now = new Date();
      // Compare-and-swap update: the database, not the client, increments version.
      // The literal is constant code; no client-controlled SQL is interpolated.
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
        reason,
        request_id: randomUUID(),
        occurred_at: now
      }, transaction);

      // Construct this response from server data; only return after COMMIT.
      return {
        application: {
          id: current.id,
          candidateId: current.candidate_id,
          status: toStatus,
          version: expectedVersion + 1,
          updatedAt: now.toISOString()
        },
        auditEventId: auditEvent.id
      };
    });
  }

  return { getApplication, auditHistory, transition };
}
