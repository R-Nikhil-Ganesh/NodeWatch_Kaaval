import express from 'express';
import { query } from '../../db/index.js';
import { auditService } from '../../services/auditService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const { caseId, evidenceId } = req.query;

    let sql = `SELECT l.*, u.name AS user_name, u.designation AS user_designation FROM audit_logs l LEFT JOIN users u ON l.user_id = u.user_id WHERE 1=1`;
    const params = [];
    if (caseId) {
      params.push(caseId);
      sql += ` AND l.case_id = $${params.length}`;
    }
    if (evidenceId) {
      params.push(evidenceId);
      sql += ` AND l.evidence_id = $${params.length}`;
    }
    params.push(limit);
    sql += ` ORDER BY l.timestamp DESC LIMIT $${params.length}`;

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { caseId, evidenceId, action, accessedBy, role, details, result } = req.body || {};
    await auditService.log({
      caseId,
      evidenceId,
      action,
      userId: accessedBy,
      userRole: role,
      result,
      source: 'WEB',
      details: { title: details },
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
