import type {
  CategoryId,
  CategoryMeta,
  Database,
  Entry,
  PeriodSummary,
  Product,
  ProductMovement,
  ProductNature
} from './types'

// ── Category catalogue ──────────────────────────────────────────────────────

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'compte_courant',
    label: 'Compte courant',
    liquidity: 'immediate',
    color: '#6db3f2',
    hint: 'Liquidités disponibles immédiatement'
  },
  {
    id: 'livret',
    label: "Livret d'épargne",
    liquidity: 'immediate',
    color: '#4ade9a',
    hint: 'Livret A, LDDS, Livret Jeune, LEP…'
  },
  {
    id: 'assurance_vie',
    label: 'Assurance vie',
    liquidity: 'court_terme',
    color: '#e8c169',
    hint: 'Fonds euros et unités de compte'
  },
  {
    id: 'pea',
    label: 'PEA',
    liquidity: 'long_terme',
    color: '#b18cf2',
    hint: "Plan d'épargne en actions"
  },
  {
    id: 'per',
    label: 'PER COL',
    liquidity: 'long_terme',
    color: '#f2a56d',
    hint: "Plan d'épargne retraite"
  },
  {
    id: 'pee',
    label: 'PEE',
    liquidity: 'long_terme',
    color: '#6ddcf2',
    hint: "Plan d'épargne entreprise"
  },
  {
    id: 'crypto',
    label: 'Crypto-monnaie',
    liquidity: 'court_terme',
    color: '#f4a94b',
    hint: 'Actifs numériques'
  },
  {
    id: 'autre',
    label: 'Autre',
    liquidity: 'court_terme',
    color: '#8fa0bd',
    hint: 'Tout autre placement'
  }
]

export const CATEGORY_MAP: Record<CategoryId, CategoryMeta> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c
    return acc
  },
  {} as Record<CategoryId, CategoryMeta>
)

export function categoryLabel(id: CategoryId): string {
  return CATEGORY_MAP[id]?.label ?? id
}

export function categoryColor(id: CategoryId): string {
  return CATEGORY_MAP[id]?.color ?? '#8fa0bd'
}

/** Suggested default nature for a category (the user can override per product). */
export function defaultNature(id: CategoryId): ProductNature {
  return id === 'compte_courant' || id === 'livret' ? 'cash' : 'growth'
}

export function natureLabel(nature: ProductNature): string {
  return nature === 'cash' ? 'Épargne' : 'Investissement'
}

// ── Period helpers ──────────────────────────────────────────────────────────

export function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function previousPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return currentPeriod(d)
}

export function nextPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() + 1)
  return currentPeriod(d)
}

export function formatPeriod(period: string, locale = 'fr-FR'): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const label = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function shortPeriod(period: string, locale = 'fr-FR'): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
}

/** All distinct periods present in the data, sorted ascending. */
export function allPeriods(db: Database): string[] {
  const set = new Set(db.entries.map((e) => e.period))
  return Array.from(set).sort()
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function formatCurrency(
  value: number,
  currency = 'EUR',
  locale = 'fr-FR',
  maximumFractionDigits = 0
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits
  }).format(value)
}

export function formatSigned(
  value: number,
  currency = 'EUR',
  locale = 'fr-FR'
): string {
  const sign = value > 0 ? '+' : ''
  return sign + formatCurrency(value, currency, locale)
}

export function formatPct(value: number | null, locale = 'fr-FR'): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return sign + new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value) + ' %'
}

// ── Analytics ───────────────────────────────────────────────────────────────

function entriesByPeriod(entries: Entry[], period: string): Entry[] {
  return entries.filter((e) => e.period === period)
}

/** Total portfolio value for a given period. */
export function totalForPeriod(db: Database, period: string): number {
  return entriesByPeriod(db.entries, period).reduce((s, e) => s + e.value, 0)
}

/** Value of a product in the most recent recorded period strictly before `period`. */
export function previousEntryValue(
  db: Database,
  productId: string,
  period: string
): number | null {
  const priors = db.entries
    .filter((e) => e.productId === productId && e.period < period)
    .sort((a, b) => (a.period < b.period ? 1 : -1))
  return priors.length ? priors[0].value : null
}

export interface EntryBreakdown {
  delta: number
  /** Total movements attributed to the period (declared + inferred remainder for cash). */
  flow: number
  /** Latent performance attributed to the period (gains/losses, excl. movements). */
  performance: number
}

/**
 * Splits a product's month-over-month change into "movements" vs "performance",
 * according to the product's nature. Invariant: flow + performance === delta.
 *
 * - cash   : declared gain counts as performance; everything else is a movement.
 * - growth : declared flow is a movement; everything else is performance.
 */
export function entryBreakdown(
  nature: ProductNature,
  value: number,
  prevValue: number | null,
  flow: number,
  gain: number
): EntryBreakdown {
  if (prevValue === null) return { delta: 0, flow: 0, performance: 0 }
  const delta = value - prevValue
  const F = flow || 0
  const G = gain || 0
  const remainder = delta - F - G
  if (nature === 'cash') {
    return { delta, flow: F + remainder, performance: G }
  }
  return { delta, flow: F, performance: G + remainder }
}

/** Build a chronological summary across every recorded period. */
export function buildTimeline(db: Database): PeriodSummary[] {
  const periods = allPeriods(db)
  const out: PeriodSummary[] = []
  let prevTotal: number | null = null
  for (const period of periods) {
    const total = totalForPeriod(db, period)
    let flow = 0
    let performance = 0
    for (const e of entriesByPeriod(db.entries, period)) {
      const product = db.products.find((p) => p.id === e.productId)
      if (!product) continue
      const prevValue = previousEntryValue(db, e.productId, period)
      const b = entryBreakdown(product.nature, e.value, prevValue, e.flow, e.gain ?? 0)
      flow += b.flow
      performance += b.performance
    }
    const delta = prevTotal === null ? 0 : total - prevTotal
    const performancePct =
      prevTotal && prevTotal !== 0 ? (performance / prevTotal) * 100 : null
    out.push({ period, total, flow, delta, performance, performancePct })
    prevTotal = total
  }
  return out
}

export interface AllocationSlice {
  key: string
  label: string
  value: number
  color: string
  pct: number
}

export function allocationByCategory(db: Database, period: string): AllocationSlice[] {
  const entries = entriesByPeriod(db.entries, period)
  const byCat = new Map<CategoryId, number>()
  for (const e of entries) {
    const product = db.products.find((p) => p.id === e.productId)
    if (!product) continue
    byCat.set(product.category, (byCat.get(product.category) ?? 0) + e.value)
  }
  const total = Array.from(byCat.values()).reduce((s, v) => s + v, 0) || 1
  return Array.from(byCat.entries())
    .map(([cat, value]) => ({
      key: cat,
      label: categoryLabel(cat),
      value,
      color: categoryColor(cat),
      pct: (value / total) * 100
    }))
    .sort((a, b) => b.value - a.value)
}

export function allocationByPlatform(db: Database, period: string): AllocationSlice[] {
  const entries = entriesByPeriod(db.entries, period)
  const byPlat = new Map<string, number>()
  for (const e of entries) {
    const product = db.products.find((p) => p.id === e.productId)
    if (!product) continue
    byPlat.set(product.platformId, (byPlat.get(product.platformId) ?? 0) + e.value)
  }
  const palette = ['#e8c169', '#6db3f2', '#4ade9a', '#b18cf2', '#f2a56d', '#6ddcf2', '#f4515f']
  const total = Array.from(byPlat.values()).reduce((s, v) => s + v, 0) || 1
  return Array.from(byPlat.entries())
    .map(([platId, value], i) => {
      const plat = db.platforms.find((p) => p.id === platId)
      return {
        key: platId,
        label: plat?.name ?? 'Inconnu',
        value,
        color: plat?.color ?? palette[i % palette.length],
        pct: (value / total) * 100
      }
    })
    .sort((a, b) => b.value - a.value)
}

export function allocationByLiquidity(db: Database, period: string): AllocationSlice[] {
  const entries = entriesByPeriod(db.entries, period)
  const buckets: Record<string, { label: string; color: string; value: number }> = {
    immediate: { label: 'Disponible', color: '#4ade9a', value: 0 },
    court_terme: { label: 'Court terme', color: '#e8c169', value: 0 },
    long_terme: { label: 'Long terme', color: '#b18cf2', value: 0 }
  }
  for (const e of entries) {
    const product = db.products.find((p) => p.id === e.productId)
    if (!product) continue
    const meta = CATEGORY_MAP[product.category]
    buckets[meta.liquidity].value += e.value
  }
  const total = Object.values(buckets).reduce((s, b) => s + b.value, 0) || 1
  return Object.entries(buckets).map(([key, b]) => ({
    key,
    label: b.label,
    value: b.value,
    color: b.color,
    pct: (b.value / total) * 100
  }))
}

/** Per-product movement detail for a given period vs its previous recorded value. */
export function movementsForPeriod(db: Database, period: string): ProductMovement[] {
  const out: ProductMovement[] = []
  for (const e of entriesByPeriod(db.entries, period)) {
    const product = db.products.find((p) => p.id === e.productId)
    if (!product) continue
    const platform = db.platforms.find((p) => p.id === product.platformId)
    const prevValue = previousEntryValue(db, e.productId, period)
    const b = entryBreakdown(product.nature, e.value, prevValue, e.flow, e.gain ?? 0)
    out.push({
      productId: product.id,
      productName: product.name,
      platformName: platform?.name ?? '—',
      category: product.category,
      value: e.value,
      prevValue,
      flow: b.flow,
      delta: b.delta,
      performance: b.performance,
      note: e.note
    })
  }
  return out.sort((a, b) => b.value - a.value)
}

export interface ProductPoint {
  period: string
  /** Total value at this period. */
  value: number
  /** Movement attributed to this step (declared + inferred). */
  stepFlow: number
  /** Latent performance attributed to this step. */
  stepPerf: number
  /** Cumulative net flows since the product's first tracked month. */
  cumFlow: number
  /** Cumulative latent performance since the product's first tracked month. */
  cumPerf: number
  note?: string
}

/**
 * Chronological, decomposed series for a single product.
 * Invariant at each point: value === firstValue + cumFlow + cumPerf.
 */
export function productSeries(db: Database, productId: string): ProductPoint[] {
  const product = db.products.find((p) => p.id === productId)
  if (!product) return []
  const entries = db.entries
    .filter((e) => e.productId === productId)
    .sort((a, b) => (a.period < b.period ? -1 : 1))
  const out: ProductPoint[] = []
  let cumFlow = 0
  let cumPerf = 0
  let prev: number | null = null
  for (const e of entries) {
    const b = entryBreakdown(product.nature, e.value, prev, e.flow, e.gain ?? 0)
    cumFlow += b.flow
    cumPerf += b.performance
    out.push({
      period: e.period,
      value: e.value,
      stepFlow: b.flow,
      stepPerf: b.performance,
      cumFlow,
      cumPerf,
      note: e.note
    })
    prev = e.value
  }
  return out
}

// ── Money-weighted return (TRI / XIRR) ──────────────────────────────────────

export interface Cashflow {
  date: Date
  amount: number
}

function periodToDate(period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

/**
 * Internal rate of return for dated cash flows (annualised, as a decimal).
 * Convention: money invested is negative, money returned is positive.
 * Robust solve: Newton-Raphson, then bisection fallback. Returns null if
 * there is no sign change (no meaningful rate) or too few flows.
 */
export function xirr(flows: Cashflow[]): number | null {
  if (flows.length < 2) return null
  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const t0 = sorted[0].date.getTime()
  const YEAR = 365 * 24 * 3600 * 1000
  const years = sorted.map((f) => (f.date.getTime() - t0) / YEAR)
  const amounts = sorted.map((f) => f.amount)

  if (years[years.length - 1] === 0) return null // all flows same date
  if (!amounts.some((a) => a > 0) || !amounts.some((a) => a < 0)) return null

  const npv = (r: number): number =>
    amounts.reduce((s, a, i) => s + a / Math.pow(1 + r, years[i]), 0)
  const dnpv = (r: number): number =>
    amounts.reduce((s, a, i) => s - (years[i] * a) / Math.pow(1 + r, years[i] + 1), 0)

  // Newton-Raphson
  let r = 0.1
  for (let i = 0; i < 60; i++) {
    const f = npv(r)
    const df = dnpv(r)
    if (!Number.isFinite(f) || !Number.isFinite(df) || df === 0) break
    const next = r - f / df
    if (!Number.isFinite(next) || next <= -0.9999) break
    if (Math.abs(next - r) < 1e-8) {
      return Math.abs(npv(next)) < 1e-3 ? next : bisectXirr(npv)
    }
    r = next
  }
  return bisectXirr(npv)
}

function bisectXirr(npv: (r: number) => number): number | null {
  let lo = -0.9999
  let hi = 100
  let flo = npv(lo)
  let fhi = npv(hi)
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fmid = npv(mid)
    if (Math.abs(fmid) < 1e-6) return mid
    if (flo * fmid < 0) {
      hi = mid
      fhi = fmid
    } else {
      lo = mid
      flo = fmid
    }
  }
  return (lo + hi) / 2
}

/** Cash flows for a single product: initial value in, movements, final value out. */
export function productCashflows(db: Database, productId: string): Cashflow[] {
  const s = productSeries(db, productId)
  if (s.length < 2) return []
  const flows: Cashflow[] = [{ date: periodToDate(s[0].period), amount: -s[0].value }]
  for (let i = 1; i < s.length; i++) {
    if (s[i].stepFlow !== 0) flows.push({ date: periodToDate(s[i].period), amount: -s[i].stepFlow })
  }
  flows.push({ date: periodToDate(s[s.length - 1].period), amount: s[s.length - 1].value })
  return flows
}

/** Normalise negative-zero / numerical dust to a clean 0. */
function clampRate(r: number | null): number | null {
  if (r === null) return null
  return Math.abs(r) < 5e-5 ? 0 : r
}

/** Annualised money-weighted return for a product (decimal), or null. */
export function productTri(db: Database, productId: string): number | null {
  return clampRate(xirr(productCashflows(db, productId)))
}

/** Annualised money-weighted return for the whole portfolio (decimal), or null. */
export function portfolioTri(db: Database): number | null {
  const flows: Cashflow[] = []
  for (const p of db.products) flows.push(...productCashflows(db, p.id))
  return clampRate(xirr(flows))
}

// ── Entry reminder (nudge to record a new month) ────────────────────────────

/** Number of days in the month of `d`. */
export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export interface EntryReminder {
  /** Whether to surface a call-to-action. */
  show: boolean
  /** 'window' = we're in the ideal end-of-month window; 'overdue' = a month was skipped. */
  state: 'none' | 'window' | 'overdue'
  /** The month the user is invited to record. */
  targetPeriod: string | null
  /** Most recent recorded period, if any. */
  lastPeriod: string | null
}

/** Days at each edge of the month that count as the "good" recording window. */
export const REMINDER_WINDOW_DAYS = 5

/**
 * Decides whether to nudge the user to record a month, following the
 * "end of month (or first days of the next)" recommendation.
 * - In the last ~5 days of a month → invite to record the current month.
 * - In the first ~5 days → invite to record the previous month.
 * - A fully-past unrecorded month is flagged as overdue at any time.
 * Returns show:false when there are no entries yet (handled by onboarding).
 */
export function entryReminder(db: Database, now = new Date()): EntryReminder {
  const periods = allPeriods(db)
  const lastPeriod = periods.length ? periods[periods.length - 1] : null
  const none: EntryReminder = { show: false, state: 'none', targetPeriod: null, lastPeriod }
  if (periods.length === 0) return none

  const firstPeriod = periods[0] // the user started tracking here
  const current = currentPeriod(now)
  const previous = previousPeriod(current)
  const saved = new Set(periods)
  const day = now.getDate()
  const inStart = day <= REMINDER_WINDOW_DAYS
  const inEnd = day >= daysInMonth(now) - (REMINDER_WINDOW_DAYS - 1)

  // Only months from the first recorded one onward are "expected" — months
  // before the user started tracking are never a gap.
  if (previous >= firstPeriod && !saved.has(previous)) {
    return {
      show: true,
      state: inStart ? 'window' : 'overdue',
      targetPeriod: previous,
      lastPeriod
    }
  }
  // Previous month done (or before start) — invite to record the current
  // month only near its end.
  if (!saved.has(current) && inEnd) {
    return { show: true, state: 'window', targetPeriod: current, lastPeriod }
  }
  return none
}

// ── Seed / empty database ───────────────────────────────────────────────────

export function emptyDatabase(now = new Date()): Database {
  return {
    schemaVersion: 1,
    profile: {
      name: '',
      currency: 'EUR',
      locale: 'fr-FR',
      createdAt: now.toISOString()
    },
    platforms: [],
    products: [],
    entries: []
  }
}
