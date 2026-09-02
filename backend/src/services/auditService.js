import { query } from '../db/index.js';
import { hashingService } from './hashingService.js';

export const auditService = {
  /**
   * Log an audit event with deterministic tamper-evident metadata digest
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
    const metadataHash = hashingService.hashMetadata({
      caseId,
      evidenceId,
      action,
      userId,
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
          caseId,
          evidenceId,
          action,
          userId,
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
