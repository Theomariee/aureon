import type { Database } from './types'

/** Opaque encrypted-export envelope (round-tripped between import steps). */
export type EncryptedEnvelope = { aureonEncrypted: true } & Record<string, unknown>

export interface SecurityStatus {
  pinSet: boolean
  unlocked: boolean
}

export interface ImportResult {
  ok: boolean
  db?: Database
  error?: string
  /** Set when the picked file is an encrypted export needing a PIN / recovery code. */
  encrypted?: boolean
  envelope?: EncryptedEnvelope
}

/** Surface exposed to the renderer via the preload contextBridge. */
export interface AureonApi {
  loadDb(): Promise<Database>
  saveDb(db: Database): Promise<boolean>
  exportBackup(db: Database): Promise<{ ok: boolean; path?: string; encrypted?: boolean }>
  importBackup(): Promise<ImportResult>
  importDecrypt(
    envelope: EncryptedEnvelope,
    secret: string,
    useRecovery: boolean
  ): Promise<{ ok: boolean; db?: Database; error?: string }>

  openReport(db: Database, period: string): Promise<boolean>
  exportArchive(
    db: Database,
    period: string
  ): Promise<{ ok: boolean; path?: string; encrypted?: boolean }>

  // Security / PIN
  securityStatus(): Promise<SecurityStatus>
  securityUnlock(pin: string): Promise<{ ok: boolean; db?: Database; error?: string }>
  securityUnlockRecovery(code: string): Promise<{ ok: boolean; db?: Database; error?: string }>
  securitySetup(pin: string, db: Database): Promise<{ recoveryCode: string }>
  securityChangePin(current: string, next: string): Promise<{ ok: boolean; error?: string }>
  /** Reset the PIN without the old one (only valid right after a recovery unlock). */
  securityResetPin(
    next: string
  ): Promise<{ ok: boolean; recoveryCode?: string; error?: string }>
  securityRegenerateRecovery(
    pin: string
  ): Promise<{ ok: boolean; recoveryCode?: string; error?: string }>
  securityDisable(pin: string): Promise<{ ok: boolean; error?: string }>

  showItem(path: string): Promise<boolean>
  openExternal(url: string): Promise<boolean>

  // Window controls (custom title bar)
  platform: string
  windowMinimize(): Promise<void>
  windowMaximizeToggle(): Promise<void>
  windowClose(): Promise<void>
  windowIsMaximized(): Promise<boolean>
  /** Subscribe to maximize/unmaximize; returns an unsubscribe function. */
  onMaximizeChange(cb: (maximized: boolean) => void): () => void
}
