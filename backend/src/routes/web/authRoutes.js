import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';
import { config } from '../../config/index.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    const identifier = (email || username || '').toLowerCase().trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/email and password required' });
    }

    const { rows } = await query(
      `SELECT * FROM users WHERE (LOWER(username) = $1 OR LOWER(email) = $1) AND is_active = TRUE`,
      [identifier]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.user_id, role: user.role, org: user.org_msp },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry }
    );

    await auditService.log({
      userId: user.user_id,
      userRole: user.role,
      userOrg: user.org_msp,
      action: 'LOGIN',
      source: 'WEB',
      details: { title: 'User logged in' },
    });

    const { password_hash, ...safeUser } = user;
    res.json({
      user: {
        id: safeUser.user_id,
        ...safeUser,
      },
      token,
    });
  } catch (err) {
    console.error('[WebAuth Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (userId) {
      const { rows } = await query(`SELECT role, org_msp FROM users WHERE user_id = $1`, [userId]);
      if (rows.length) {
        await auditService.log({
          userId,
          userRole: rows[0].role,
          userOrg: rows[0].org_msp,
          action: 'LOGOUT',
          source: 'WEB',
          details: { title: 'User logged out' },
        });
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
