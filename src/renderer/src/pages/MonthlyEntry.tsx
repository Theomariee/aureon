import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  FolderArchive,
  HelpCircle,
  Info,
  Save,
  SlidersHorizontal,
  X
} from 'lucide-react'
import { useStore } from '../store'
import { useFmt } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import {
  categoryLabel,
  currentPeriod,
  entryBreakdown,
  formatPeriod,
  natureLabel,
  nextPeriod,
  previousEntryValue,
  previousPeriod
} from '../../../shared/domain'
import type { Product } from '../../../shared/types'

interface Draft {
  value: string
  /** Contextual extra amount: interest/gain for cash, deposit/withdrawal for growth. */
  extra: string
  note: string
}

function parseNum(s: string): number {
  if (!s.trim()) return 0
  const n = Number(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function MonthlyEntry(): React.JSX.Element {
  const db = useStore((s) => s.db)
  const upsertEntry = useStore((s) => s.upsertEntry)
  const setView = useStore((s) => s.setView)
  const toast = useStore((s) => s.toast)
  const fmt = useFmt()
  const locale = db.profile.locale

  const [period, setPeriod] = useState<string>(
    () => useStore.getState().entryPeriodHint ?? currentPeriod()
  )
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState<boolean>(db.entries.length === 0)

  // Consume the period hint set by a reminder CTA, then clear it.
  useEffect(() => {
    if (useStore.getState().entryPeriodHint) useStore.setState({ entryPeriodHint: null })
  }, [])

  const activeProducts = useMemo(() => db.products.filter((p) => p.active), [db.products])

  const prevValueFor = (productId: string): number | null =>
    previousEntryValue(db, productId, period)

  // Seed drafts from stored entries whenever the period changes.
  useEffect(() => {
    const nextDrafts: Record<string, Draft> = {}
    const nextExpanded: Record<string, boolean> = {}
    for (const p of activeProducts) {
      const e = db.entries.find((x) => x.productId === p.id && x.period === period)
      const extraVal = e ? (p.nature === 'cash' ? e.gain ?? 0 : e.flow) : 0
      nextDrafts[p.id] = {
        value: e ? String(e.value) : '',
        extra: extraVal ? String(extraVal) : '',
        note: e?.note ?? ''
      }
      if (extraVal || e?.note) nextExpanded[p.id] = true
    }
    setDrafts(nextDrafts)
    setExpanded(nextExpanded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, activeProducts.length])

  const liveTotal = activeProducts.reduce((s, p) => s + parseNum(drafts[p.id]?.value ?? ''), 0)
  const prevTotal = activeProducts.reduce((s, p) => s + (prevValueFor(p.id) ?? 0), 0)
  const liveDelta = liveTotal - prevTotal

  const setDraft = (id: string, patch: Partial<Draft>): void =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const commit = (product: Product): void => {
    const d = drafts[product.id]
    if (!d) return
    if (!d.value.trim()) {
      useStore.getState().removeEntry(product.id, period)
      return
    }
    const extra = parseNum(d.extra)
    upsertEntry(product.id, period, {
      value: parseNum(d.value),
      flow: product.nature === 'growth' ? extra : 0,
      gain: product.nature === 'cash' ? extra : 0,
      note: d.note.trim() || undefined
    })
  }

  const carryForward = (): void => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const p of activeProducts) {
        const pv = prevValueFor(p.id)
        if (pv !== null && !(next[p.id]?.value ?? '').trim()) {
          next[p.id] = { ...next[p.id], value: String(pv) }
        }
      }
      return next
    })
    toast('Valeurs du mois précédent reprises — ajuste ce qui a changé', 'info')
  }

  const saveAll = (): void => {
    activeProducts.forEach(commit)
    toast('Saisie enregistrée', 'success')
  }

  const doArchive = async (): Promise<void> => {
    activeProducts.forEach(commit)
    setBusy('archive')
    try {
      const res = await window.api.exportArchive(useStore.getState().db, period)
      if (res.ok) {
        toast('Archive du mois créée ✔ — dépose-la sur ton cloud', 'success')
        if (res.path) void window.api.showItem(res.path)
      }
    } catch (err) {
      toast('Échec de l’archivage : ' + (err as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const openReport = async (): Promise<void> => {
    activeProducts.forEach(commit)
    await window.api.openReport(useStore.getState().db, period)
  }

  if (activeProducts.length === 0) {
    return (
      <>
        <PageHeader title="Saisie mensuelle" />
        <EmptyState
          icon={<Info size={26} />}
          title="Aucun produit actif"
          hint="Crée d'abord au moins une plateforme et un produit à suivre."
          action={
            <button className="btn-primary" onClick={() => setView('products')}>
              Gérer mes produits
            </button>
          }
        />
      </>
    )
  }

  const byPlatform = db.platforms
    .map((plat) => ({
      platform: plat,
      products: activeProducts.filter((p) => p.platformId === plat.id)
    }))
    .filter((g) => g.products.length > 0)

  return (
    <>
      <PageHeader
        title="Saisie mensuelle"
        subtitle="Saisis la valeur actuelle de chaque produit. Le reste est optionnel."
        actions={
          <div className="flex items-center gap-2">
            <button
              className={`btn-subtle h-9 w-9 !px-0 ${showHelp ? 'text-gold-500' : ''}`}
              onClick={() => setShowHelp((v) => !v)}
              title="Conseils de saisie"
            >
              <HelpCircle size={18} />
            </button>
            <div className="flex items-center gap-1 rounded-xl border border-line bg-ink-800/60 p-1">
              <button
                className="btn-subtle h-8 w-8 !px-0"
                onClick={() => setPeriod(previousPeriod(period))}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-[140px] text-center text-sm font-semibold text-slate-100">
                {formatPeriod(period, locale)}
              </span>
              <button
                className="btn-subtle h-8 w-8 !px-0"
                onClick={() => setPeriod(nextPeriod(period))}
                disabled={period >= currentPeriod()}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        }
      />

      {/* First-entry guidance (recommended periods + why regularity matters) */}
      {showHelp && (
        <div className="card mb-4 border-gold-500/20 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-gold-500">
              <CalendarClock size={18} />
            </div>
            <div className="flex-1 space-y-2 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Bien réussir tes saisies mensuelles</div>
              <p>
                <b className="text-slate-200">Quand ?</b> Idéalement en <b>fin de mois</b> (ou dans
                les tout premiers jours du mois suivant).
              </p>
              <p>
                <b className="text-slate-200">Le plus important : la régularité.</b> Aureon calcule
                variations, performance et TRI en comparant deux mois consécutifs. En mesurant ton
                patrimoine <b>au même moment chaque mois</b>, tu évites les faux écarts (ex. avant /
                après ta paie) et tes analyses restent fiables.
              </p>
              <p className="text-slate-500">
                Astuce : mets un rappel récurrent dans ton agenda — Aureon t’invitera aussi à saisir
                quand ce sera le bon moment.
              </p>
            </div>
            <button
              className="btn-subtle h-8 w-8 shrink-0 !px-0"
              onClick={() => setShowHelp(false)}
              title="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Live summary */}
      <div className="card mb-4 flex items-center justify-between p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Total saisi</div>
          <div className="tabnum text-3xl font-bold text-slate-50">{fmt.currency(liveTotal)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Variation vs {formatPeriod(previousPeriod(period), locale)}
          </div>
          <div
            className={`tabnum text-2xl font-bold ${
              liveDelta > 0 ? 'text-mint-400' : liveDelta < 0 ? 'text-coral-400' : 'text-slate-300'
            }`}
          >
            {prevTotal === 0 ? '—' : fmt.signed(liveDelta)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Info size={13} /> Un seul champ requis : la valeur. « Préciser » sert aux exceptions
          (intérêts, versement…).
        </span>
        <button className="btn-ghost h-8 text-xs" onClick={carryForward}>
          <Copy size={14} /> Reprendre le mois précédent
        </button>
      </div>

      {/* Entry groups */}
      <div className="space-y-5">
        {byPlatform.map(({ platform, products }) => (
          <div key={platform.id} className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-5 py-3">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: platform.color ?? '#e8c169' }}
              />
              <h3 className="text-sm font-semibold text-slate-100">{platform.name}</h3>
              <span className="chip ml-auto">{products.length} produit(s)</span>
            </div>

            <div className="divide-y divide-line/60">
              {products.map((p) => {
                const d = drafts[p.id] ?? { value: '', extra: '', note: '' }
                const pv = prevValueFor(p.id)
                const value = parseNum(d.value)
                const extra = parseNum(d.extra)
                const b = entryBreakdown(
                  p.nature,
                  value,
                  pv,
                  p.nature === 'growth' ? extra : 0,
                  p.nature === 'cash' ? extra : 0
                )
                const isCash = p.nature === 'cash'
                const isOpen = expanded[p.id] ?? false
                const hasValue = d.value.trim() !== ''

                return (
                  <div key={p.id} className="px-5 py-3">
                    <div className="grid grid-cols-[1.7fr_1.1fr_1.5fr_auto] items-center gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-100">
                            {p.name}
                          </span>
                          <span
                            className={`chip shrink-0 ${
                              isCash
                                ? '!border-mint-500/30 !text-mint-400'
                                : '!border-sky-500/30 !text-sky-400'
                            }`}
                          >
                            {natureLabel(p.nature)}
                          </span>
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {categoryLabel(p.category)}
                          {p.subtype ? ` · ${p.subtype}` : ''}
                        </div>
                      </div>

                      <input
                        className="field tabnum"
                        inputMode="decimal"
                        placeholder={pv !== null ? String(pv) : '0'}
                        value={d.value}
                        onChange={(e) => setDraft(p.id, { value: e.target.value })}
                        onBlur={() => commit(p)}
                      />

                      {/* Live analysis */}
                      <div className="text-xs">
                        {pv === null ? (
                          <span className="text-slate-500">Première saisie</span>
                        ) : !hasValue ? (
                          <span className="text-slate-600">—</span>
                        ) : (
                          <span className="tabnum">
                            <span
                              className={
                                b.delta > 0
                                  ? 'text-mint-400'
                                  : b.delta < 0
                                    ? 'text-coral-400'
                                    : 'text-slate-400'
                              }
                            >
                              {fmt.signed(b.delta)}
                            </span>
                            {b.performance !== 0 && (
                              <span className="text-slate-500">
                                {' · perf '}
                                <span
                                  className={
                                    b.performance > 0 ? 'text-mint-400' : 'text-coral-400'
                                  }
                                >
                                  {fmt.signed(b.performance)}
                                </span>
                              </span>
                            )}
                            {b.flow !== 0 && (
                              <span className="text-slate-500">
                                {' · mouvement '}
                                {fmt.signed(b.flow)}
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      <button
                        className={`btn-subtle h-8 gap-1 !px-2 text-xs ${
                          isOpen ? 'text-gold-500' : ''
                        }`}
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                        }
                      >
                        <SlidersHorizontal size={13} />
                        Préciser
                        <ChevronDown
                          size={13}
                          className={`transition ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-3 grid grid-cols-[1fr_1.6fr] gap-3 rounded-xl border border-line bg-ink-900/50 p-3">
                        <div>
                          <label className="label">
                            {isCash
                              ? 'Dont intérêts / gain'
                              : 'Dont versement (+) / retrait (−)'}
                          </label>
                          <input
                            className="field tabnum"
                            inputMode="decimal"
                            placeholder="0"
                            value={d.extra}
                            onChange={(e) => setDraft(p.id, { extra: e.target.value })}
                            onBlur={() => commit(p)}
                          />
                          <p className="mt-1 text-[11px] leading-snug text-slate-500">
                            {isCash
                              ? 'Ex : versement d’intérêts annuel. Sinon la variation est vue comme un mouvement.'
                              : 'Ex : argent que tu as investi ou retiré. Le reste est vu comme de la performance.'}
                          </p>
                        </div>
                        <div>
                          <label className="label">Note / justification</label>
                          <input
                            className="field"
                            placeholder="ex : retrait pour travaux, versement mensuel…"
                            value={d.note}
                            onChange={(e) => setDraft(p.id, { note: e.target.value })}
                            onBlur={() => commit(p)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={saveAll}>
          <Save size={16} /> Enregistrer la saisie
        </button>
        <button className="btn-ghost" onClick={openReport}>
          <FileText size={16} /> Aperçu du rapport
        </button>
        <button className="btn-ghost" onClick={doArchive} disabled={busy === 'archive'}>
          <FolderArchive size={16} />
          {busy === 'archive' ? 'Création…' : 'Archiver ce mois (.zip)'}
        </button>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <Info size={13} /> Enregistrement automatique en quittant chaque champ.
        </span>
      </div>
    </>
  )
}
