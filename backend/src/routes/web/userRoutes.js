import express from 'express';
import multer from 'multer';
import path from 'path';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';
import { storageService } from '../../services/storageService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
    const resolved = await Promise.all(
      rows.map(async (u) => {
        if (u.profile_image_url && u.profile_image_url.startsWith('minio://')) {
          const key = u.profile_image_url.replace('minio://', '');
          const presigned = await storageService.getPresignedUrl(key).catch(() => u.profile_image_url);
          return { ...u, profile_image_url: presigned };
        }
        return u;
      })
    );
    res.json(resolved);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, designation, role, profileImage, phone, actorId, actorRole } = req.body || {};

    const { rows } = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           designation = COALESCE($2, designation),
           role = COALESCE($3::user_role, role),
           profile_image_url = COALESCE($4, profile_image_url),
           phone = COALESCE($5, phone),
           updated_at = NOW()
       WHERE user_id = $6
       RETURNING user_id, user_id AS id, username, email, name, role, designation,
                 badge_number, profile_image_url, phone, court, jurisdiction, bar_judicial_id`,
      [name || null, designation || null, role || null, profileImage || null, phone || null, id]
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

// Real profile picture upload. The previous flow stored a browser-only
// `URL.createObjectURL(...)` blob: URL as `profile_image_url` — valid only in
// the tab that created it, so every avatar broke on refresh or for anyone
// else viewing the profile.
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'An image file is required' });

    const { rows: existing } = await query('SELECT user_id FROM users WHERE user_id = $1', [id]);
    if (!existing.length) return res.status(404).json({ message: 'User not found' });

    const ext = path.extname(req.file.originalname) || '.jpg';
    const objectKey = `avatars/${id}${ext}`;
    await storageService.uploadFile({
      key: objectKey,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    const { rows } = await query(
      `UPDATE users SET profile_image_url = $1, updated_at = NOW() WHERE user_id = $2
       RETURNING user_id, user_id AS id, username, email, name, role, designation, badge_number, profile_image_url`,
      [`minio://${objectKey}`, id]
    );

    await auditService.log({
      userId: id,
      action: 'UPDATE_USER',
      source: 'WEB',
      details: { title: 'Profile picture updated' },
    });

    const presignedUrl = await storageService.getPresignedUrl(objectKey).catch(() => null);
    res.json({ ...rows[0], profileImageUri: presignedUrl });
  } catch (err) {
    console.error('[Avatar Upload Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
