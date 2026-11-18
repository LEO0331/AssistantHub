import { Router } from 'express';
import { createWorkflowService, WorkflowDomainError } from '../services/workflowService.mjs';
import {
  WorkflowInputError, parseApplicationId, parseAuditPagination, parseTransitionBody, parseIdempotencyKey
} from '../validators/workflow.mjs';

function respondWithError(error, res) {
  if (error instanceof WorkflowInputError || error instanceof WorkflowDomainError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message }
    });
  }
  // No SQL statements, connection strings, actor emails, secrets or stack traces.
  return res.status(503).json({
    error: { code: 'SERVICE_UNAVAILABLE', message: 'Hiring workflow service temporarily unavailable' }
  });
}

function handler(callback) {
  return async (req, res) => {
    try { await callback(req, res); }
    catch (error) { respondWithError(error, res); }
  };
}

export function createApplicationRouter({ db, requireRole }) {
  const router = Router();
  // Define Sequelize models lazily, consistent with the candidate API,
  // so standalone health checks need not supply a full MySQL model provider.
  let service;
  const getService = () => { service ||= createWorkflowService(db); return service; };
  router.get('/:id', handler(async (req, res) => {
    const id = parseApplicationId(req.params.id);
    res.status(200).json(await getService().getApplication(id));
  }));
  router.get('/:id/audit-events', handler(async (req, res) => {
    const id = parseApplicationId(req.params.id);
    const pagination = parseAuditPagination(req.query);
    res.status(200).json(await getService().auditHistory(id, pagination));
  }));
  router.post('/:id/transitions', requireRole('recruiter', 'admin'), handler(async (req, res) => {
    const id = parseApplicationId(req.params.id);
    const input = parseTransitionBody(req.body);
    const idempotencyKey = parseIdempotencyKey(req.get('Idempotency-Key'));
    const result = await getService().transition(id, input, req.authUser.id, {
      idempotencyKey, requestId: req.requestId
    });
    res.locals.operationOutcome = result.replayed ? 'replay' : 'committed';
    res.set('Idempotency-Replayed', result.replayed ? 'true' : 'false');
    res.status(200).json(result.body);
  }));
  return router;
}
