// ---------------------------------------------------------------------------
// Browser-side cryptographic hashing for evidence integrity.
//
// These must produce the same digests as the backend's hashingService, since
// the value computed here is what later integrity checks compare against.
// Never substitute a random or placeholder value: a fabricated hash makes
// every downstream verification meaningless while still looking legitimate.
// ---------------------------------------------------------------------------

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/** SHA-256 of a file's actual bytes. */
export async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return toHex(await crypto.subtle.digest('SHA-256', buffer));
}

/**
 * Deterministic hash of a metadata object: keys are sorted and empty values
 * dropped so the same logical payload always yields the same digest,
 * regardless of property order.
 */
export async function computeMetadataHash(payload: Record<string, any>): Promise<string> {
  const ordered = Object.fromEntries(
    Object.entries(payload)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b))
  );
  const data = new TextEncoder().encode(JSON.stringify(ordered));
  return toHex(await crypto.subtle.digest('SHA-256', data));
}
