import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { defaultNature, emptyDatabase } from '../shared/domain'
import type { Database } from '../shared/types'

/**
 * Durable local persistence for the Aureon database.
 * Stored as JSON in Electron's userData directory, written atomically
 * (temp file + rename) with a rolling `.bak` copy to survive crashes.
 */

function dataDir(): string {
  return app.getPath('userData')
}

function dbPath(): string {
  return join(dataDir(), 'aureon-data.json')
}

function bakPath(): string {
  return join(dataDir(), 'aureon-data.bak.json')
}

export function plaintextDbPath(): string {
  return dbPath()
}
export function plaintextBakPath(): string {
  return bakPath()
}
/** Normalise/upgrade a raw parsed database (used after decrypting too). */
export function migrateDb(raw: unknown): Database {
  return migrate(raw as Database)
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function loadDatabase(): Promise<Database> {
  const primary = dbPath()
  if (await pathExists(primary)) {
    try {
      const raw = await fs.readFile(primary, 'utf-8')
      return migrate(JSON.parse(raw))
    } catch (err) {
      console.error('[store] primary read failed, trying backup', err)
    }
  }
  const bak = bakPath()
  if (await pathExists(bak)) {
    try {
      const raw = await fs.readFile(bak, 'utf-8')
      return migrate(JSON.parse(raw))
    } catch (err) {
      console.error('[store] backup read failed', err)
    }
  }
  const fresh = emptyDatabase()
  await saveDatabase(fresh)
  return fresh
}

export async function saveDatabase(db: Database): Promise<void> {
  const dir = dataDir()
  await fs.mkdir(dir, { recursive: true })
  const primary = dbPath()
  const tmp = join(dir, `aureon-data.${process.pid}.tmp`)
  const serialized = JSON.stringify(db, null, 2)

  // Keep the last good file as a backup before overwriting.
  if (await pathExists(primary)) {
    try {
      await fs.copyFile(primary, bakPath())
    } catch (err) {
      console.error('[store] backup copy failed', err)
    }
  }

  await fs.writeFile(tmp, serialized, 'utf-8')
  await fs.rename(tmp, primary)
}

/** Basic forward migration hook — bumps as the schema evolves. */
function migrate(db: Database): Database {
  if (!db || typeof db !== 'object') return emptyDatabase()
  if (!db.schemaVersion) db.schemaVersion = 1
  db.platforms ??= []
  db.products ??= []
  db.entries ??= []
  db.profile ??= emptyDatabase().profile
  // Ensure flow/gain defaults exist on legacy entries.
  for (const e of db.entries) {
    if (typeof e.flow !== 'number') e.flow = 0
    if (typeof e.gain !== 'number') e.gain = 0
  }
  // v1 → v2: assign a default "nature" to products that predate the field.
  for (const p of db.products) {
    if (p.nature !== 'cash' && p.nature !== 'growth') p.nature = defaultNature(p.category)
  }
  db.schemaVersion = 2
  return db
}

export function backupFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return `aureon-sauvegarde-${stamp}.json`
}

export function archiveFilename(period: string): string {
  return `Aureon-${period}.zip`
}
