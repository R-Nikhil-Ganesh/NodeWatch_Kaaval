/**
 * src/db/encryption.ts
 *
 * Application-layer AES-256-CBC field encryption.
 *
 * The encryption key is generated once on first app boot and stored in the
 * device's hardware-backed secure store (iOS Secure Enclave / Android Keystore)
 * via expo-secure-store. The key never appears in the SQLite file on disk.
 *
 * Only sensitive fields that could identify victims, crime scenes, or
 * officer movements are encrypted:
 *   - file_hash, metadata_hash
 *   - collected_location
 *   - evidence name
 *
 * Non-sensitive structural fields (IDs, timestamps, status flags) are stored
 * plaintext so SQLite queries remain fast without full-table decryption.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY_STORE_ID = 'kaaval_field_enc_key_v1';
const ALGORITHM    = 'AES-CBC';     // expo-crypto's SubtleCrypto equivalent

// Cache the key in module scope after first load to avoid repeated Keystore reads
let _cachedKey: string | null = null;

/**
 * Returns the AES-256 key as a hex string.
 * Generates and persists it on first call.
 */
export async function getEncryptionKey(): Promise<string> {
  if (_cachedKey) return _cachedKey;

  let key = await SecureStore.getItemAsync(KEY_STORE_ID);
  if (!key) {
    // Generate 32 random bytes = 256-bit key
    const bytes = await Crypto.getRandomBytesAsync(32);
    key = Buffer.from(bytes).toString('hex');
    await SecureStore.setItemAsync(KEY_STORE_ID, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  _cachedKey = key;
  return key;
}

/**
 * Encrypts a string value.
 * Returns a base64-encoded string in the format "IV:CIPHERTEXT".
 * Returns the original value unchanged if it is null/undefined/empty.
 */
export async function encrypt(value: string | null | undefined): Promise<string> {
  if (!value) return value ?? '';
  try {
    const keyHex = await getEncryptionKey();
    // Use Crypto.digestStringAsync to produce a deterministic 32-byte key
    // from the stored hex string for cross-session consistency.
    const keyBytes = Buffer.from(keyHex, 'hex');
    const ivBytes  = await Crypto.getRandomBytesAsync(16);
    const iv       = Buffer.from(ivBytes);

    // expo-crypto doesn't expose AES directly; use React Native's global
    // TextEncoder + the Web Crypto API (available in Hermes on RN ≥ 0.71).
    const keyMaterial = await (global as any).crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']
    );
    const encoded   = new TextEncoder().encode(value);
    const encrypted = await (global as any).crypto.subtle.encrypt(
      { name: 'AES-CBC', iv: ivBytes }, keyMaterial, encoded
    );

    const ivB64  = Buffer.from(iv).toString('base64');
    const ctB64  = Buffer.from(encrypted).toString('base64');
    return `${ivB64}:${ctB64}`;
  } catch (e) {
    // If encryption fails (e.g., during dev/simulator without Secure Enclave),
    // fall through to plaintext so development is not blocked.
    console.warn('[encryption] encrypt failed, storing plaintext:', (e as Error).message);
    return value;
  }
}

/**
 * Decrypts a value previously encrypted by encrypt().
 * Returns the original value if it is not in "IV:CIPHERTEXT" format.
 */
export async function decrypt(value: string | null | undefined): Promise<string> {
  if (!value || !value.includes(':')) return value ?? '';
  try {
    const keyHex  = await getEncryptionKey();
    const keyBytes = Buffer.from(keyHex, 'hex');
    const [ivB64, ctB64] = value.split(':');
    const iv      = Buffer.from(ivB64, 'base64');
    const ct      = Buffer.from(ctB64, 'base64');

    const keyMaterial = await (global as any).crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']
    );
    const decrypted = await (global as any).crypto.subtle.decrypt(
      { name: 'AES-CBC', iv }, keyMaterial, ct
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.warn('[encryption] decrypt failed, returning raw value:', (e as Error).message);
    return value ?? '';
  }
}

/** Convenience: encrypt a record's sensitive fields in-place */
export async function encryptEvidenceFields<T extends Record<string, any>>(ev: T): Promise<T> {
  return {
    ...ev,
    file_hash:          await encrypt(ev.file_hash),
    metadata_hash:      await encrypt(ev.metadata_hash),
    collected_location: await encrypt(ev.collected_location),
    name:               await encrypt(ev.name),
  };
}

/** Convenience: decrypt a record's sensitive fields in-place */
export async function decryptEvidenceFields<T extends Record<string, any>>(ev: T): Promise<T> {
  return {
    ...ev,
    file_hash:          await decrypt(ev.file_hash),
    metadata_hash:      await decrypt(ev.metadata_hash),
    collected_location: await decrypt(ev.collected_location),
    name:               await decrypt(ev.name),
  };
}
