import { contextBridge, ipcRenderer } from 'electron'
import type { Database } from '../shared/types'
import type { AureonApi, EncryptedEnvelope } from '../shared/api'

const api: AureonApi = {
  loadDb: () => ipcRenderer.invoke('db:load'),
  saveDb: (db: Database) => ipcRenderer.invoke('db:save', db),
  exportBackup: (db: Database) => ipcRenderer.invoke('db:export', db),
  importBackup: () => ipcRenderer.invoke('db:import'),
  importDecrypt: (envelope: EncryptedEnvelope, secret: string, useRecovery: boolean) =>
    ipcRenderer.invoke('db:import-decrypt', envelope, secret, useRecovery),

  openReport: (db: Database, period: string) => ipcRenderer.invoke('report:open', db, period),
  exportArchive: (db: Database, period: string) =>
    ipcRenderer.invoke('export:archive', db, period),

  securityStatus: () => ipcRenderer.invoke('security:status'),
  securityUnlock: (pin: string) => ipcRenderer.invoke('security:unlock', pin),
  securityUnlockRecovery: (code: string) => ipcRenderer.invoke('security:unlock-recovery', code),
  securitySetup: (pin: string, db: Database) => ipcRenderer.invoke('security:setup', pin, db),
  securityChangePin: (current: string, next: string) =>
    ipcRenderer.invoke('security:change-pin', current, next),
  securityResetPin: (next: string) => ipcRenderer.invoke('security:reset-pin', next),
  securityRegenerateRecovery: (pin: string) =>
    ipcRenderer.invoke('security:regenerate-recovery', pin),
  securityDisable: (pin: string) => ipcRenderer.invoke('security:disable', pin),

  showItem: (path: string) => ipcRenderer.invoke('shell:show-item', path),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url)
}

contextBridge.exposeInMainWorld('api', api)
