import { create } from 'zustand'
import { defaultNature, emptyDatabase } from '../../shared/domain'
import type {
  CategoryId,
  Database,
  Entry,
  Platform,
  Product,
  ProductNature
} from '../../shared/types'

type View = 'dashboard' | 'entry' | 'products' | 'history' | 'reporting' | 'settings'

interface Toast {
  id: string
  message: string
  tone: 'success' | 'error' | 'info'
}

interface State {
  db: Database
  loaded: boolean
  view: View
  toasts: Toast[]
  // Security / privacy
  pinSet: boolean
  locked: boolean
  privacy: boolean
  /** True when the current session was unlocked via the recovery code (offers PIN reset). */
  recoveredViaCode: boolean

  init: () => Promise<void>
  unlock: (pin: string) => Promise<{ ok: boolean; error?: string }>
  unlockRecovery: (code: string) => Promise<{ ok: boolean; error?: string }>
  clearRecoveryFlag: () => void
  markPinSet: (v: boolean) => void
  togglePrivacy: () => void
  setView: (v: View) => void
  toast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  replaceDb: (db: Database) => Promise<void>

  // platforms
  addPlatform: (name: string, color?: string) => string
  updatePlatform: (id: string, patch: Partial<Platform>) => void
  removePlatform: (id: string) => void

  // products
  addProduct: (input: {
    name: string
    platformId: string
    category: CategoryId
    subtype?: string
    nature: ProductNature
  }) => string
  updateProduct: (id: string, patch: Partial<Product>) => void
  archiveProduct: (id: string, archived: boolean) => void
  removeProduct: (id: string) => void

  // entries
  upsertEntry: (
    productId: string,
    period: string,
    data: { value: number; flow: number; gain: number; note?: string }
  ) => void
  removeEntry: (productId: string, period: string) => void
  setProfile: (patch: Partial<Database['profile']>) => void
}

function now(): string {
  return new Date().toISOString()
}

function uid(): string {
  return crypto.randomUUID()
}

async function persist(db: Database): Promise<void> {
  try {
    await window.api.saveDb(db)
  } catch (err) {
    console.error('[store] persist failed', err)
  }
}

export const useStore = create<State>((set, get) => {
  /** Apply a pure mutation to db, persist, and update state. */
  const mutate = (fn: (db: Database) => Database): Database => {
    const next = fn(structuredClone(get().db))
    set({ db: next })
    void persist(next)
    return next
  }

  return {
    db: emptyDatabase(),
    loaded: false,
    view: 'dashboard',
    toasts: [],
    pinSet: false,
    locked: false,
    privacy: localStorage.getItem('aureon.privacy') === '1',
    recoveredViaCode: false,

    init: async () => {
      const status = await window.api.securityStatus()
      if (status.pinSet && !status.unlocked) {
        // Locked: wait for the lock screen to unlock before loading data.
        set({ pinSet: true, locked: true, loaded: true })
        return
      }
      const db = await window.api.loadDb()
      set({ db, loaded: true, pinSet: status.pinSet, locked: false })
    },

    unlock: async (pin) => {
      const res = await window.api.securityUnlock(pin)
      if (res.ok && res.db) set({ db: res.db, locked: false })
      return { ok: res.ok, error: res.error }
    },
    unlockRecovery: async (code) => {
      const res = await window.api.securityUnlockRecovery(code)
      if (res.ok && res.db) set({ db: res.db, locked: false, recoveredViaCode: true })
      return { ok: res.ok, error: res.error }
    },
    clearRecoveryFlag: () => set({ recoveredViaCode: false }),
    markPinSet: (v) => set({ pinSet: v }),
    togglePrivacy: () =>
      set((s) => {
        const privacy = !s.privacy
        localStorage.setItem('aureon.privacy', privacy ? '1' : '0')
        return { privacy }
      }),

    setView: (view) => set({ view }),

    toast: (message, tone = 'info') => {
      const id = uid()
      set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
      setTimeout(() => get().dismissToast(id), 4200)
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    replaceDb: async (db) => {
      set({ db })
      await persist(db)
    },

    addPlatform: (name, color) => {
      const id = uid()
      mutate((db) => {
        db.platforms.push({ id, name, color, createdAt: now() })
        return db
      })
      return id
    },
    updatePlatform: (id, patch) =>
      mutate((db) => {
        const p = db.platforms.find((x) => x.id === id)
        if (p) Object.assign(p, patch)
        return db
      }),
    removePlatform: (id) =>
      mutate((db) => {
        const productIds = db.products.filter((p) => p.platformId === id).map((p) => p.id)
        db.products = db.products.filter((p) => p.platformId !== id)
        db.entries = db.entries.filter((e) => !productIds.includes(e.productId))
        db.platforms = db.platforms.filter((p) => p.id !== id)
        return db
      }),

    addProduct: (input) => {
      const id = uid()
      mutate((db) => {
        const product: Product = {
          id,
          name: input.name,
          platformId: input.platformId,
          category: input.category,
          subtype: input.subtype,
          nature: input.nature ?? defaultNature(input.category),
          active: true,
          createdAt: now()
        }
        db.products.push(product)
        return db
      })
      return id
    },
    updateProduct: (id, patch) =>
      mutate((db) => {
        const p = db.products.find((x) => x.id === id)
        if (p) Object.assign(p, patch)
        return db
      }),
    archiveProduct: (id, archived) =>
      mutate((db) => {
        const p = db.products.find((x) => x.id === id)
        if (p) {
          p.active = !archived
          p.archivedAt = archived ? now() : null
        }
        return db
      }),
    removeProduct: (id) =>
      mutate((db) => {
        db.products = db.products.filter((p) => p.id !== id)
        db.entries = db.entries.filter((e) => e.productId !== id)
        return db
      }),

    upsertEntry: (productId, period, data) =>
      mutate((db) => {
        const existing = db.entries.find((e) => e.productId === productId && e.period === period)
        if (existing) {
          existing.value = data.value
          existing.flow = data.flow
          existing.gain = data.gain
          existing.note = data.note
          existing.updatedAt = now()
        } else {
          const entry: Entry = {
            id: uid(),
            productId,
            period,
            value: data.value,
            flow: data.flow,
            gain: data.gain,
            note: data.note,
            createdAt: now(),
            updatedAt: now()
          }
          db.entries.push(entry)
        }
        return db
      }),
    removeEntry: (productId, period) =>
      mutate((db) => {
        db.entries = db.entries.filter(
          (e) => !(e.productId === productId && e.period === period)
        )
        return db
      }),

    setProfile: (patch) =>
      mutate((db) => {
        Object.assign(db.profile, patch)
        return db
      })
  }
})
