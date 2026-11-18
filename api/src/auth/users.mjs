import { randomUUID } from 'node:crypto';
import { hashPassword } from './passwords.mjs';

export const ROLES = ['viewer', 'recruiter', 'admin'];

export function normalizeEmail(value) {
  if (typeof value !== 'string') throw new Error('Invalid email');
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
  return email;
}

export async function provisionUser({ User, email, password, role }) {
  const normalized = normalizeEmail(email);
  if (!ROLES.includes(role)) throw new Error('Role must be viewer, recruiter, or admin');
  const passwordHash = await hashPassword(password);
  const now = new Date();
  // Never overwrite an existing password, role, or disabled flag.
  return User.create({
    id: randomUUID(),
    email: normalized,
    password_hash: passwordHash,
    role,
    is_active: true,
    created_at: now,
    updated_at: now
  });
}
