import { query } from '../db/index.js';
import { hashingService } from './hashingService.js';

export const auditService = {
  /**
   * Log an audit event with deterministic tamper-evident metadata digest.
   * Gracefully handles unassociated or deleted case/evidence/user references.
   */
  async log({
    caseId = null,
    evidenceId = null,
    action,
    userId = null,
    userRole = null,
    userOrg = 'PoliceMSP',
    result = 'SUCCESS',
    source = 'WEB', // 'WEB' | 'MOBILE'
    details = {},
  }) {
    // 1. Sanitize incoming foreign key identifiers
    let validCaseId = caseId && typeof caseId === 'string' && caseId.trim() !== '' && caseId !== 'undefined' && caseId !== 'null' ? caseId.trim() : null;
    let validEvidenceId = evidenceId && typeof evidenceId === 'string' && evidenceId.trim() !== '' && evidenceId !== 'undefined' && evidenceId !== 'null' ? evidenceId.trim() : null;
    let validUserId = userId && typeof userId === 'string' && userId.trim() !== '' && userId !== 'undefined' && userId !== 'null' ? userId.trim() : null;

    // 2. Validate foreign key existence in PostgreSQL to avoid constraint violations
    if (validCaseId) {
      const { rows } = await query('SELECT 1 FROM cases WHERE case_id = $1', [validCaseId]).catch(() => ({ rows: [] }));
      if (!rows.length) validCaseId = null;
    }

    if (validEvidenceId) {
      const { rows } = await query('SELECT 1 FROM evidence WHERE evidence_id = $1', [validEvidenceId]).catch(() => ({ rows: [] }));
      if (!rows.length) validEvidenceId = null;
    }

    if (validUserId) {
      const { rows } = await query('SELECT 1 FROM users WHERE user_id = $1', [validUserId]).catch(() => ({ rows: [] }));
      if (!rows.length) validUserId = null;
    }

    // 3. Compute deterministic cryptographic metadata hash
    const metadataHash = hashingService.hashMetadata({
      caseId: validCaseId || caseId,
      evidenceId: validEvidenceId || evidenceId,
      action,
      userId: validUserId || userId,
      userRole,
      userOrg,
      result,
      source,
      ...details,
    });

    try {
      const { rows } = await query(
        `INSERT INTO audit_logs
           (case_id, evidence_id, action, user_id, user_role, user_org, result, source,
            detail_hash, detail_file_name, detail_file_type, detail_file_uri,
            detail_location, detail_title, detail_officer, detail_metadata_hash, metadata_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          validCaseId,
          validEvidenceId,
          action,
          validUserId,
          userRole,
          userOrg,
          result,
          source,
          details.hash || null,
          details.fileName || null,
          details.fileType || null,
          details.fileUri || null,
          details.location || null,
          details.title || null,
          details.officer || null,
          details.metadataHash || null,
          metadataHash,
        ]
      );
      return rows[0];
    } catch (err) {
      console.error('[auditService] Failed to insert audit log:', err.message);
    }
  }
};
