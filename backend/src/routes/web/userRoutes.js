import express from 'express';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

export const DESIGNATIONS = {
  ADMIN: ['System Administrator', 'IT Director', 'Database Manager'],
  POLICE: [
    'Director General of Police (DGP)',
    'Addl. Director General (ADGP)',
    'Inspector General (IGP)',
    'Superintendent of Police (SP)',
    'Dy. Superintendent (DSP)',
    'Inspector of Police',
    'Sub-Inspector (SI)',
    'Head Constable',
    'Grade I Constable',
  ],
  FORENSICS: [
    'Director',
    'Joint Director',
    'Deputy Director',
    'Assistant Director',
    'Senior Scientific Officer',
    'Junior Scientific Officer',
    'Scientific Assistant',
  ],
  LEGAL: [
    'High Court Judge',
    'District Judge',
    'Public Prosecutor',
    'Addl. Public Prosecutor',
    'Defense Counsel',
    'Registrar',
  ],
};

router.get('/designations', (req, res) => res.json(DESIGNATIONS));

router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT user_id, user_id AS id, username, email, name, role, designation, badge_number, org_msp, profile_image_url, is_active, created_at
       FROM users ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, designation, role, profileImage, actorId, actorRole } = req.body || {};

    const { rows } = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           designation = COALESCE($2, designation),
           role = COALESCE($3::user_role, role),
           profile_image_url = COALESCE($4, profile_image_url),
           updated_at = NOW()
       WHERE user_id = $5
       RETURNING user_id, user_id AS id, username, email, name, role, designation, badge_number, profile_image_url`,
      [name || null, designation || null, role || null, profileImage || null, id]
    );

    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    await auditService.log({
      userId: actorId || id,
      userRole: actorRole,
      action: 'UPDATE_USER',
      source: 'WEB',
      details: { title: `Updated profile for ${rows[0].name}` },
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
