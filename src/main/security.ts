import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import {
  DEFAULT_KDF,
  Enc,
  KeyWrap,
  KdfParams,
  aesDecrypt,
  aesEncrypt,
  decryptJson,
  encryptJson,
  generateDek,
  generateRecoveryCode,
  normalizeRecovery,
  unwrapDek,
  wrapDek
} from './crypto'
import { migrateDb, plaintextBakPath, plaintextDbPath } from './store'
import { emptyDatabase } from '../shared/domain'
import type { Database } from '../shared/types'

interface Keystore {
  v: number
  kdf: KdfParams
  pin: KeyWrap
  recovery: KeyWrap
}

interface DataEnvelope {
  v: number
  enc: Enc
}

/** Self-contained encrypted export: DEK wrapped by both PIN and recovery code. */
export interface ExportEnvelope {
  aureonEncrypted: true
  v: number
  kdf: KdfParams
  pin: KeyWrap
  recovery: KeyWrap
  enc: Enc
}

// In-memory data key, present only while the app is unlocked.
let dek: Buffer | null = null

function ksPath(): string {
  return join(app.getPath('userData'), 'aureon-keystore.json')
}
function encPath(): string {
  return join(app.getPath('userData'), 'aureon-data.enc')
}
function encBakPath(): string {
  return join(app.getPath('userData'), 'aureon-data.enc.bak')
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function readKeystore(): Promise<Keystore | null> {
  if (!(await exists(ksPath()))) return null
  try {
    return JSON.parse(await fs.readFile(ksPath(), 'utf-8')) as Keystore
  } catch {
    return null
  }
}

export async function isPinConfigured(): Promise<boolean> {
  return exists(ksPath())
}

export function isUnlocked(): boolean {
  return dek !== null
}

/** True when data must be persisted encrypted (unlocked with an active key). */
export function hasActiveKey(): boolean {
  return dek !== null
}

export async function securityStatus(): Promise<{ pinSet: boolean; unlocked: boolean }> {
  return { pinSet: await isPinConfigured(), unlocked: isUnlocked() }
}

// ── Encrypted persistence ───────────────────────────────────────────────────

export async function saveEncrypted(db: Database): Promise<void> {
  if (!dek) throw new Error('Coffre verrouillé.')
  const dir = app.getPath('userData')
  await fs.mkdir(dir, { recursive: true })
  const envelope: DataEnvelope = { v: 1, enc: encryptJson(db, dek) }
  const tmp = join(dir, `aureon-data.${process.pid}.enc.tmp`)
  if (await exists(encPath())) {
    try {
      await fs.copyFile(encPath(), encBakPath())
    } catch {
      /* noop */
    }
  }
  await fs.writeFile(tmp, JSON.stringify(envelope), 'utf-8')
  await fs.rename(tmp, encPath())
}

async function readEncrypted(key: Buffer): Promise<Database> {
  const raw = JSON.parse(await fs.readFile(encPath(), 'utf-8')) as DataEnvelope
  return migrateDb(decryptJson<Database>(raw.enc, key))
}

/** Read the current encrypted database (requires the vault to be unlocked). */
export async function loadCurrent(): Promise<Database> {
  if (!dek) throw new Error('Coffre verrouillé.')
  return readEncrypted(dek)
}

// ── Unlock ──────────────────────────────────────────────────────────────────

export async function unlockWithPin(
  pin: string
): Promise<{ ok: boolean; db?: Database; error?: string }> {
  const ks = await readKeystore()
  if (!ks) return { ok: false, error: 'Aucun code PIN configuré.' }
  try {
    const key = unwrapDek(ks.pin, pin, ks.kdf)
    dek = key
    return { ok: true, db: await readEncrypted(key) }
  } catch {
    return { ok: false, error: 'Code PIN incorrect.' }
  }
}

export async function unlockWithRecovery(
  code: string
): Promise<{ ok: boolean; db?: Database; error?: string }> {
  const ks = await readKeystore()
  if (!ks) return { ok: false, error: 'Aucun code PIN configuré.' }
  try {
    const key = unwrapDek(ks.recovery, normalizeRecovery(code), ks.kdf)
    dek = key
    return { ok: true, db: await readEncrypted(key) }
  } catch {
    return { ok: false, error: 'Code de secours incorrect.' }
  }
}

export function lock(): void {
  dek = null
}

// ── Setup / change / disable ────────────────────────────────────────────────

/** Enable PIN protection on the current data. Returns the recovery code (shown once). */
export async function setupPin(pin: string, currentDb: Database): Promise<{ recoveryCode: string }> {
  const recoveryCode = generateRecoveryCode()
  const newDek = generateDek()
  const kdf = DEFAULT_KDF
  const ks: Keystore = {
    v: 1,
    kdf,
    pin: wrapDek(newDek, pin, kdf),
    recovery: wrapDek(newDek, normalizeRecovery(recoveryCode), kdf)
  }
  await fs.writeFile(ksPath(), JSON.stringify(ks, null, 2), 'utf-8')
  dek = newDek
  await saveEncrypted(currentDb)
  // Remove any lingering plaintext copies.
  await fs.rm(plaintextDbPath(), { force: true })
  await fs.rm(plaintextBakPath(), { force: true })
  return { recoveryCode }
}

export async function changePin(
  current: string,
  next: string
): Promise<{ ok: boolean; error?: string }> {
  const ks = await readKeystore()
  if (!ks) return { ok: false, error: 'Aucun code PIN configuré.' }
  let key: Buffer
  try {
    key = unwrapDek(ks.pin, current, ks.kdf)
  } catch {
    return { ok: false, error: 'Code PIN actuel incorrect.' }
  }
  ks.pin = wrapDek(key, next, ks.kdf)
  await fs.writeFile(ksPath(), JSON.stringify(ks, null, 2), 'utf-8')
  return { ok: true }
}

export async function regenerateRecovery(
  pin: string
): Promise<{ ok: boolean; recoveryCode?: string; error?: string }> {
  const ks = await readKeystore()
  if (!ks) return { ok: false, error: 'Aucun code PIN configuré.' }
  let key: Buffer
  try {
    key = unwrapDek(ks.pin, pin, ks.kdf)
  } catch {
    return { ok: false, error: 'Code PIN incorrect.' }
  }
  const recoveryCode = generateRecoveryCode()
  ks.recovery = wrapDek(key, normalizeRecovery(recoveryCode), ks.kdf)
  await fs.writeFile(ksPath(), JSON.stringify(ks, null, 2), 'utf-8')
  return { ok: true, recoveryCode }
}

/**
 * Reset the PIN without knowing the old one — only valid while the vault is
 * unlocked (e.g. just after a recovery-code unlock). Re-wraps the in-memory DEK
 * with a new PIN and issues a fresh recovery code.
 */
export async function resetPin(
  newPin: string
): Promise<{ ok: boolean; recoveryCode?: string; error?: string }> {
  if (!dek) return { ok: false, error: 'Coffre verrouillé.' }
  const existing = await readKeystore()
  const kdf = existing?.kdf ?? DEFAULT_KDF
  const recoveryCode = generateRecoveryCode()
  const ks: Keystore = {
    v: 1,
    kdf,
    pin: wrapDek(dek, newPin, kdf),
    recovery: wrapDek(dek, normalizeRecovery(recoveryCode), kdf)
  }
  await fs.writeFile(ksPath(), JSON.stringify(ks, null, 2), 'utf-8')
  return { ok: true, recoveryCode }
}

/** Turn off encryption: decrypt back to plaintext and remove the keystore. */
export async function disablePin(pin: string): Promise<{ ok: boolean; error?: string }> {
  const ks = await readKeystore()
  if (!ks) return { ok: false, error: 'Aucun code PIN configuré.' }
  let key: Buffer
  try {
    key = unwrapDek(ks.pin, pin, ks.kdf)
  } catch {
    return { ok: false, error: 'Code PIN incorrect.' }
  }
  const db = await readEncrypted(key)
  await fs.writeFile(plaintextDbPath(), JSON.stringify(db, null, 2), 'utf-8')
  await fs.rm(ksPath(), { force: true })
  await fs.rm(encPath(), { force: true })
  await fs.rm(encBakPath(), { force: true })
  dek = null
  return { ok: true }
}

// ── Export / import envelopes ───────────────────────────────────────────────

/** Build a self-contained encrypted export of `db` (decryptable by PIN or recovery). */
export async function buildExportEnvelope(db: Database): Promise<ExportEnvelope> {
  const ks = await readKeystore()
  if (!ks || !dek) throw new Error('Coffre verrouillé.')
  return {
    aureonEncrypted: true,
    v: 1,
    kdf: ks.kdf,
    pin: ks.pin,
    recovery: ks.recovery,
    enc: encryptJson(db, dek)
  }
}

export function isExportEnvelope(obj: unknown): obj is ExportEnvelope {
  return Boolean(obj && typeof obj === 'object' && (obj as ExportEnvelope).aureonEncrypted === true)
}

/** Decrypt an imported encrypted export using a PIN or a recovery code. */
export function decryptExport(
  envelope: ExportEnvelope,
  secret: string,
  useRecovery: boolean
): Database {
  const wrap = useRecovery ? envelope.recovery : envelope.pin
  const key = unwrapDek(wrap, useRecovery ? normalizeRecovery(secret) : secret, envelope.kdf)
  return migrateDb(decryptJson<Database>(envelope.enc, key))
}

// Re-export for convenience.
export { aesEncrypt, aesDecrypt, emptyDatabase }
