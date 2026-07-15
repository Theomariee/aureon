import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto'

/**
 * Cryptographic primitives for Aureon's local encryption.
 *
 * Design (envelope key hierarchy):
 *  - A random 256-bit Data Encryption Key (DEK) actually encrypts the data.
 *  - The DEK is "wrapped" (encrypted) twice: once with a key derived from the
 *    PIN, once with a key derived from the recovery code. So the PIN can be
 *    changed without re-encrypting data, and the recovery code is an independent
 *    way back in.
 *  - Secrets are stretched with scrypt (slow KDF) to make brute-forcing a short
 *    PIN costly. AES-256-GCM provides confidentiality + authentication.
 */

export interface KdfParams {
  N: number
  r: number
  p: number
}

export const DEFAULT_KDF: KdfParams = { N: 32768, r: 8, p: 1 }
const MAXMEM = 160 * 1024 * 1024

/** AES-256-GCM ciphertext bundle, all fields base64. */
export interface Enc {
  iv: string
  ct: string
  tag: string
}

/** A DEK wrapped by a secret-derived key. */
export interface KeyWrap {
  salt: string
  enc: Enc
}

export function deriveKey(secret: string, salt: Buffer, kdf: KdfParams = DEFAULT_KDF): Buffer {
  return scryptSync(Buffer.from(secret, 'utf-8'), salt, 32, {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
    maxmem: MAXMEM
  })
}

export function aesEncrypt(plaintext: Buffer, key: Buffer): Enc {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return { iv: iv.toString('base64'), ct: ct.toString('base64'), tag: tag.toString('base64') }
}

/** Throws if the key is wrong or data was tampered with (GCM auth failure). */
export function aesDecrypt(enc: Enc, key: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(enc.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(enc.tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(enc.ct, 'base64')), decipher.final()])
}

export function generateDek(): Buffer {
  return randomBytes(32)
}

/** Wrap a DEK with a key derived from `secret` (fresh random salt). */
export function wrapDek(dek: Buffer, secret: string, kdf: KdfParams = DEFAULT_KDF): KeyWrap {
  const salt = randomBytes(16)
  const kek = deriveKey(secret, salt, kdf)
  return { salt: salt.toString('base64'), enc: aesEncrypt(dek, kek) }
}

/** Recover the DEK from a wrap; throws if the secret is wrong. */
export function unwrapDek(wrap: KeyWrap, secret: string, kdf: KdfParams = DEFAULT_KDF): Buffer {
  const kek = deriveKey(secret, Buffer.from(wrap.salt, 'base64'), kdf)
  return aesDecrypt(wrap.enc, kek)
}

const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Crockford-ish, no ambiguous chars

/** 16-char grouped recovery code, e.g. "K3M9-QP2R-7XVA-ZB4C" (~80 bits). */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(16)
  let s = ''
  for (let i = 0; i < 16; i++) s += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length]
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`
}

/** Normalise a recovery code for key derivation (strip separators, upper-case). */
export function normalizeRecovery(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

export function encryptJson(value: unknown, key: Buffer): Enc {
  return aesEncrypt(Buffer.from(JSON.stringify(value), 'utf-8'), key)
}

export function decryptJson<T>(enc: Enc, key: Buffer): T {
  return JSON.parse(aesDecrypt(enc, key).toString('utf-8')) as T
}
