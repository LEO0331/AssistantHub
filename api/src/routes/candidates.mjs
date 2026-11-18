import { Router } from 'express';
import { createCandidateService } from '../services/candidateService.mjs';
import { CandidateQueryError, parseCandidateQuery, parseCandidateId } from '../validators/candidateQuery.mjs';

const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };

function requestHandler(work) {
  return async (req, res) => {
    try {
      await work(req, res);
    } catch (error) {
      if (error instanceof CandidateQueryError) {
        return res.status(400).json({ error: { code: 'INVALID_QUERY', message: error.message } });
      }
      // Database failures are deliberately not shown to the browser.
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Candidate service temporarily unavailable' }
      });
    }
  };
}

export function createCandidateRouter({ db }) {
  // Initialize models only on candidate requests. Health-check stubs need not
  // emulate Sequelize; production still uses the real DB and auth boundary.
  let service;
  const getService = () => { service ||= createCandidateService(db); return service; };
  const router = Router();
  router.use(noStore);
  router.get('/', requestHandler(async (req, res) => {
    const query = parseCandidateQuery(req.query);
    return res.status(200).json(await getService().list(query));
  }));
  router.get('/:id', requestHandler(async (req, res) => {
    const id = parseCandidateId(req.params.id);
    const candidate = await getService().detail(id);
    if (!candidate) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Candidate not found' } });
    return res.status(200).json(candidate);
  }));
  return router;
}
