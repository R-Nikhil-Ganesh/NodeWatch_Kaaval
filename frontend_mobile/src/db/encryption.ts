/**
 * src/db/encryption.ts
 *
 * Application-layer AES-256-GCM field encryption.
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
import { AESEncryptionKey, AESKeySize, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import { Buffer } from 'buffer';

// Algorithm: AES-256-GCM via expo-crypto's native AES module (authenticated
// encryption; Hermes has no Web Crypto `crypto.subtle`, and Node's `Buffer`
// global doesn't exist in React Native, hence the explicit import above).
//
// Stored format: "enc2:" + base64(iv | ciphertext | tag). Values without the
// prefix are legacy plaintext rows (the earlier implementation always failed
// and stored plaintext) and are returned unchanged by decrypt().

const KEY_STORE_ID = 'kaaval_field_enc_key_v1';
const PREFIX       = 'enc2:';

// Cache the key in module scope after first load to avoid repeated Keystore reads
let _cachedKey: AESEncryptionKey | null = null;

/**
 * Returns the AES-256 key, generating and persisting it (hex) in the secure
 * store on first call.
 */
export async function getEncryptionKey(): Promise<AESEncryptionKey> {
  if (_cachedKey) return _cachedKey;

  const stored = await SecureStore.getItemAsync(KEY_STORE_ID);
  if (stored) {
    _cachedKey = await AESEncryptionKey.import(stored, 'hex');
  } else {
    const key = await AESEncryptionKey.generate(AESKeySize.AES256);
    await SecureStore.setItemAsync(KEY_STORE_ID, await key.encoded('hex'), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    _cachedKey = key;
  }
  return _cachedKey;
}

/**
 * Encrypts a string value.
 * Returns "enc2:<base64>". Returns the value unchanged if null/undefined/empty.
 * On failure: plaintext fallback in dev builds only; throws in production so
 * sensitive data is never silently stored unencrypted.
 */
export async function encrypt(value: string | null | undefined): Promise<string> {
  if (!value) return value ?? '';
  try {
    const key = await getEncryptionKey();
    const plaintextB64 = Buffer.from(value, 'utf8').toString('base64');
    const sealed = await aesEncryptAsync(plaintextB64, key);
    return PREFIX + (await sealed.combined('base64'));
  } catch (e) {
    if (__DEV__) {
      console.warn('[encryption] encrypt failed, storing plaintext (dev only):', (e as Error).message);
      return value;
    }
    throw e;
  }
}

/**
 * Decrypts a value previously encrypted by encrypt().
 * Returns the value as-is if it is not in "enc2:" format (legacy plaintext).
 */
export async function decrypt(value: string | null | undefined): Promise<string> {
  if (!value || !value.startsWith(PREFIX)) return value ?? '';
  try {
    const key = await getEncryptionKey();
    const sealed = AESSealedData.fromCombined(value.slice(PREFIX.length));
    const b64 = await aesDecryptAsync(sealed, key, { output: 'base64' });
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch (e) {
    console.warn('[encryption] decrypt failed, returning raw value:', (e as Error).message);
    return value;
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
