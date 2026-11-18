import { defineModels } from './models.mjs';

// Synthetic, fixed records only: no applicant PII, network calls or random
// identities. Stable IDs and findOrCreate make repeating the seed non-destructive.
export const DEMO_COUNT = 6;
const date = new Date('2026-01-01T00:00:00.000Z');
const uuid = (value) => '00000000-0000-4000-8000-' + String(value).padStart(12, '0');

const people = [
  ['Demo Candidate 01', 'Project Coordinator', ['Scheduling', 'Stakeholder Coordination'], 'Available now', 40],
  ['Demo Candidate 02', 'Technical Support Assistant', ['Troubleshooting', 'Ticketing'], 'Open next week', 35],
  ['Demo Candidate 03', 'Executive Assistant', ['Inbox Triage', 'Calendar Management'], 'Available now', 50],
  ['Demo Candidate 04', 'Research Assistant', ['Data Research', 'Reporting'], 'Interviewing', 45],
  ['Demo Candidate 05', 'Operations Specialist', ['Operations', 'Documentation'], 'Available now', 55],
  ['Demo Candidate 06', 'Customer Success Associate', ['CRM Operations', 'Client Onboarding'], 'Open next week', 30]
];

export async function seedDatabase(sequelize) {
  const { Candidate, Application } = defineModels(sequelize);
  await sequelize.transaction(async (transaction) => {
    for (const [index, [name, role, skills, availability, rate]] of people.entries()) {
      const candidateId = uuid(index + 1);
      await Candidate.findOrCreate({
        where: { id: candidateId },
        defaults: { id: candidateId, name, role, skills, availability, hourly_rate_usd: rate, created_at: date, updated_at: date },
        transaction
      });
      const applicationId = uuid(index + 101);
      await Application.findOrCreate({
        where: { id: applicationId },
        defaults: { id: applicationId, candidate_id: candidateId, status: 'New', version: 1, created_at: date, updated_at: date },
        transaction
      });
    }
  });
  return { candidates: DEMO_COUNT, applications: DEMO_COUNT };
}
