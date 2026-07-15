// ── Aureon shared domain types ─────────────────────────────────────────────
// Used by both the Electron main process and the React renderer.

export const SCHEMA_VERSION = 2

/**
 * How a product's monthly variations are interpreted by default:
 * - 'cash'   → variations are your own movements (deposits/withdrawals), not performance
 *              (livrets, comptes courants, fonds euros…). Interest is the rare exception.
 * - 'growth' → variations are market performance by default (PEA, UC/ETF, crypto…).
 *              A deposit/withdrawal is the rare exception.
 */
export type ProductNature = 'cash' | 'growth'

/** High-level product families the user wants to track. */
export type CategoryId =
  | 'compte_courant'
  | 'assurance_vie'
  | 'pea'
  | 'per'
  | 'pee'
  | 'livret'
  | 'crypto'
  | 'autre'

export interface CategoryMeta {
  id: CategoryId
  label: string
  /** Rough liquidity bucket, used for the "argent disponible" view. */
  liquidity: 'immediate' | 'court_terme' | 'long_terme'
  color: string
  hint: string
}

export interface Platform {
  id: string
  name: string
  /** Optional accent color for charts / badges. */
  color?: string
  createdAt: string
  archivedAt?: string | null
}

export interface Product {
  id: string
  name: string
  platformId: string
  category: CategoryId
  /** Free sub-type, e.g. "Fonds euros", "UC / ETF", "Actions", "MSCI World". */
  subtype?: string
  /** Default interpretation of monthly variations. */
  nature: ProductNature
  active: boolean
  createdAt: string
  archivedAt?: string | null
}

/** One monthly snapshot for a single product. */
export interface Entry {
  id: string
  productId: string
  /** "YYYY-MM" period key. */
  period: string
  /** Total value of the product at the end of the period, in the base currency. */
  value: number
  /** Explicitly declared net movements this period: +versement / −retrait. Default 0. */
  flow: number
  /** Explicitly declared latent gain this period (e.g. interest). Default 0. */
  gain?: number
  /** Optional justification note (e.g. "retrait pour achat voiture"). */
  note?: string
  createdAt: string
  updatedAt: string
}

export interface Profile {
  name: string
  currency: string
  locale: string
  createdAt: string
}

export interface Database {
  schemaVersion: number
  profile: Profile
  platforms: Platform[]
  products: Product[]
  entries: Entry[]
}

// ── Derived / analytics shapes ──────────────────────────────────────────────

export interface PeriodSummary {
  period: string
  total: number
  /** Sum of net flows across all products this period. */
  flow: number
  /** Change vs previous period in total value. */
  delta: number
  /** Real performance = delta − flow (latent gains, excluding contributions). */
  performance: number
  performancePct: number | null
}

export interface ProductMovement {
  productId: string
  productName: string
  platformName: string
  category: CategoryId
  value: number
  prevValue: number | null
  flow: number
  delta: number
  performance: number
  note?: string
}
