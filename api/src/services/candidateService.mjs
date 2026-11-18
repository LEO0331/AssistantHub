import { Op, fn, col, cast, where as sqlWhere } from 'sequelize';
import { defineModels } from '../db/models.mjs';

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function publicCandidate(candidate) {
  const row = candidate.get({ plain: true });
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    skills: row.skills,
    availability: row.availability,
    hourlyRateUsd: row.hourly_rate_usd
  };
}

const SORT_ORDERS = {
  rateDesc: [['hourly_rate_usd', 'DESC'], ['id', 'ASC']],
  rateAsc: [['hourly_rate_usd', 'ASC'], ['id', 'ASC']],
  nameAsc: [['name', 'ASC'], ['id', 'ASC']]
};

export function createCandidateService(db) {
  const { Candidate } = defineModels(db);
  return {
    async list(query) {
      const conditions = {};
      if (query.role) conditions.role = query.role;
      if (query.availability) conditions.availability = query.availability;
      if (query.rate === 'under40') conditions.hourly_rate_usd = { [Op.lt]: 40 };
      if (query.rate === '40to60') conditions.hourly_rate_usd = { [Op.between]: [40, 60] };
      if (query.rate === 'over60') conditions.hourly_rate_usd = { [Op.gt]: 60 };
      if (query.q) {
        const term = '%' + escapeLike(query.q.toLowerCase()) + '%';
        conditions[Op.or] = ['name', 'role', 'skills'].map(field =>
          sqlWhere(fn('LOWER', field === 'skills' ? cast(col(field), 'CHAR') : col(field)),
            { [Op.like]: term })
        );
      }
      const { rows, count } = await Candidate.findAndCountAll({
        where: conditions,
        order: SORT_ORDERS[query.sort],
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
        attributes: ['id', 'name', 'role', 'skills', 'availability', 'hourly_rate_usd']
      });
      return {
        items: rows.map(publicCandidate),
        page: query.page,
        pageSize: query.pageSize,
        total: count
      };
    },
    async detail(id) {
      const candidate = await Candidate.findByPk(id, {
        attributes: ['id', 'name', 'role', 'skills', 'availability', 'hourly_rate_usd']
      });
      return candidate ? publicCandidate(candidate) : null;
    }
  };
}
