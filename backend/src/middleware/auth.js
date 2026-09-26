import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Verifies the Bearer JWT issued at login and attaches its payload
// ({ userId, role, org, designation }) to req.auth. No route in this
// codebase enforced this before — everything trusted client-supplied
// actorId/actorRole fields — so this is opt-in per route, not global,
// to avoid breaking the existing unauthenticated read endpoints.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  try {
    req.auth = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

// Must run after requireAuth. Restricts to LEGAL-role users carrying the
// Registrar designation — the only legal-portal user meant to modify case
// content rather than just view it.
export function requireRegistrar(req, res, next) {
  const { role, designation } = req.auth || {};
  if (role !== 'LEGAL' || designation !== 'Registrar') {
    return res.status(403).json({ message: 'Court Registrar privileges required' });
  }
  next();
}
