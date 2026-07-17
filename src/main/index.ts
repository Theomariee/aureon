import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import JSZip from 'jszip'
import { archiveFilename, backupFilename, loadDatabase, saveDatabase } from './store'
import { generateReportHtml, renderPdf } from './report'
import * as security from './security'
import type { Database } from '../shared/types'

const BACKUP_ENTRY = 'aureon-sauvegarde.json'

/** Persist respecting the current security state (encrypted when unlocked with a key). */
async function persist(db: Database): Promise<void> {
  if (security.hasActiveKey()) await security.saveEncrypted(db)
  else await saveDatabase(db)
}

/** Serialise the DB for export: an encrypted envelope when a PIN is active, else plain JSON. */
async function backupPayload(db: Database): Promise<string> {
  if (security.hasActiveKey()) {
    return JSON.stringify(await security.buildExportEnvelope(db), null, 2)
  }
  return JSON.stringify(db, null, 2)
}

const isDev = !app.isPackaged
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    backgroundColor: '#0b0f1a',
    icon: isDev ? join(__dirname, '../../build/icon.ico') : undefined,
    autoHideMenuBar: true,
    // Frameless with a custom in-app title bar (like Discord). On macOS we keep
    // the native traffic lights but hide the bar background.
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 14, y: 13 } }
      : { frame: false }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  // Keep the custom title bar's maximize/restore icon in sync.
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false))

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── IPC ─────────────────────────────────────────────────────────────────────

function registerIpc(): void {
  ipcMain.handle('db:load', async () => {
    if (security.hasActiveKey()) return security.loadCurrent()
    // Locked but a PIN exists: don't touch plaintext — the renderer unlocks instead.
    if (await security.isPinConfigured()) return security.emptyDatabase()
    return loadDatabase()
  })

  ipcMain.handle('db:save', async (_e, db: Database) => {
    await persist(db)
    return true
  })

  ipcMain.handle('db:export', async (_e, db: Database) => {
    const res = await dialog.showSaveDialog({
      title: 'Exporter la sauvegarde complète',
      defaultPath: backupFilename(),
      filters: [{ name: 'Sauvegarde Aureon', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePath) return { ok: false }
    await fs.writeFile(res.filePath, await backupPayload(db), 'utf-8')
    return { ok: true, path: res.filePath, encrypted: security.hasActiveKey() }
  })

  ipcMain.handle('db:import', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Importer une sauvegarde Aureon',
      properties: ['openFile'],
      filters: [{ name: 'Sauvegarde Aureon', extensions: ['json', 'zip'] }]
    })
    if (res.canceled || res.filePaths.length === 0) return { ok: false }
    const buf = await fs.readFile(res.filePaths[0])
    let json: string
    // ZIP archives start with the "PK" magic bytes.
    if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
      const zip = await JSZip.loadAsync(buf)
      const file = zip.file(BACKUP_ENTRY) ?? zip.file(/\.json$/i)[0] ?? null
      if (!file) return { ok: false, error: 'Aucune sauvegarde .json trouvée dans le fichier.' }
      json = await file.async('string')
    } else {
      json = buf.toString('utf-8')
    }
    const parsed = JSON.parse(json) as unknown
    if (security.isExportEnvelope(parsed)) {
      // Encrypted export — the renderer must prompt for the PIN / recovery code.
      return { ok: false, encrypted: true, envelope: parsed }
    }
    const db = parsed as Database
    await persist(db)
    return { ok: true, db }
  })

  ipcMain.handle(
    'db:import-decrypt',
    async (_e, envelope: security.ExportEnvelope, secret: string, useRecovery: boolean) => {
      try {
        const db = security.decryptExport(envelope, secret, useRecovery)
        await persist(db)
        return { ok: true, db }
      } catch {
        return { ok: false, error: useRecovery ? 'Code de secours incorrect.' : 'Code PIN incorrect.' }
      }
    }
  )

  // ── Security / PIN ──
  ipcMain.handle('security:status', async () => security.securityStatus())
  ipcMain.handle('security:unlock', async (_e, pin: string) => security.unlockWithPin(pin))
  ipcMain.handle('security:unlock-recovery', async (_e, code: string) =>
    security.unlockWithRecovery(code)
  )
  ipcMain.handle('security:setup', async (_e, pin: string, db: Database) =>
    security.setupPin(pin, db)
  )
  ipcMain.handle('security:change-pin', async (_e, current: string, next: string) =>
    security.changePin(current, next)
  )
  ipcMain.handle('security:reset-pin', async (_e, next: string) => security.resetPin(next))
  ipcMain.handle('security:regenerate-recovery', async (_e, pin: string) =>
    security.regenerateRecovery(pin)
  )
  ipcMain.handle('security:disable', async (_e, pin: string) => security.disablePin(pin))

  // ── Reports / exports ──
  ipcMain.handle('report:open', async (_e, db: Database, period: string) => {
    const html = generateReportHtml(db, period)
    const preview = new BrowserWindow({
      width: 900,
      height: 1100,
      backgroundColor: '#0b0f1a',
      autoHideMenuBar: true,
      parent: mainWindow ?? undefined
    })
    await preview.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    return true
  })

  // Bundle the month's report + a re-importable backup into a single .zip
  // the user can drop onto any cloud (Drive/OneDrive/Dropbox…).
  ipcMain.handle('export:archive', async (_e, db: Database, period: string) => {
    const res = await dialog.showSaveDialog({
      title: 'Archiver le mois',
      defaultPath: archiveFilename(period),
      filters: [{ name: 'Archive Aureon', extensions: ['zip'] }]
    })
    if (res.canceled || !res.filePath) return { ok: false }

    const html = generateReportHtml(db, period)
    const pdf = await renderPdf(html)
    const zip = new JSZip()
    zip.file(`Aureon-rapport-${period}.pdf`, pdf)
    zip.file(`Aureon-rapport-${period}.html`, html)
    zip.file(BACKUP_ENTRY, await backupPayload(db))
    const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    await fs.writeFile(res.filePath, out)
    return { ok: true, path: res.filePath, encrypted: security.hasActiveKey() }
  })

  // ── Window controls (custom title bar) ──
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize-toggle', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

  ipcMain.handle('shell:show-item', async (_e, path: string) => {
    shell.showItemInFolder(path)
    return true
  })

  ipcMain.handle('shell:open-external', async (_e, url: string) => {
    await shell.openExternal(url)
    return true
  })
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
