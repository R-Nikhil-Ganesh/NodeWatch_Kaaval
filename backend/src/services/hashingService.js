import crypto from 'crypto';

export const hashingService = {
  /**
   * Compute SHA-256 hash of a file buffer
   */
  computeBufferHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  },

  /**
   * Compute deterministic SHA-256 hash of a JSON payload (sorted keys)
   */
  hashMetadata(payload) {
    if (!payload || typeof payload !== 'object') return '';
    const ordered = Object.fromEntries(
      Object.entries(payload)
        .filter(([_, v]) => v !== undefined && v !== null)
        .sort(([a], [b]) => a.localeCompare(b))
    );
    return crypto.createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
  },

  /**
   * Verify whether two hashes match
   */
  compareHashes(hashA, hashB) {
    if (!hashA || !hashB) return false;
    return hashA.trim().toLowerCase() === hashB.trim().toLowerCase();
  }
};
