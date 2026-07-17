import { useMemo } from 'react'
import { Clock, FileText, History as HistoryIcon } from 'lucide-react'
import { useStore } from '../store'
import { useFmt } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { allPeriods, buildTimeline, formatPeriod, shortPeriod } from '../../../shared/domain'

export function HistoryPage(): React.JSX.Element {
  const db = useStore((s) => s.db)
  const setView = useStore((s) => s.setView)
  const fmt = useFmt()
  const locale = db.profile.locale

  const timeline = useMemo(() => [...buildTimeline(db)].reverse(), [db])
  const periods = allPeriods(db)

  if (db.entries.length === 0) {
    return (
      <>
        <PageHeader title="Historique" />
        <EmptyState
          icon={<HistoryIcon size={26} />}
          title="Pas encore d'historique"
          hint="Ton historique se construira au fil de tes saisies mensuelles."
          action={
            <button className="btn-primary" onClick={() => setView('entry')}>
              Faire une saisie
            </button>
          }
        />
      </>
    )
  }

  const openReport = (period: string): void => {
    void window.api.openReport(db, period)
  }

  // Exact recording date of a month (shown on hover), from the entries' timestamps.
  const fmtDateTime = (iso: string): string =>
    new Date(iso).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' })
  const saisieTitle = (period: string): string => {
    const es = db.entries.filter((e) => e.period === period && e.createdAt)
    if (es.length === 0) return ''
    const created = es.reduce((m, e) => (e.createdAt < m ? e.createdAt : m), es[0].createdAt)
    const updated = es.reduce((m, e) => {
      const u = e.updatedAt ?? e.createdAt
      return u > m ? u : m
    }, es[0].updatedAt ?? es[0].createdAt)
    let s = `Saisi le ${fmtDateTime(created)}`
    if (new Date(updated).getTime() - new Date(created).getTime() > 5 * 60 * 1000) {
      s += `\nDernière modification le ${fmtDateTime(updated)}`
    }
    return s
  }

  // Product history matrix (values per period).
  const activeProducts = db.products
  const valueAt = (productId: string, period: string): number | null => {
    const e = db.entries.find((x) => x.productId === productId && x.period === period)
    return e ? e.value : null
  }

  return (
    <>
      <PageHeader title="Historique" subtitle="Toutes tes situations mensuelles enregistrées." />

      {/* Timeline summary */}
      <div className="card mb-6 overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-200">Synthèse mensuelle</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">Mois</th>
                <th className="px-5 py-2 text-right font-medium">Patrimoine</th>
                <th className="px-5 py-2 text-right font-medium">Variation</th>
                <th className="px-5 py-2 text-right font-medium">Flux</th>
                <th className="px-5 py-2 text-right font-medium">Perf. réelle</th>
                <th className="px-5 py-2 text-right font-medium">%</th>
                <th className="px-5 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {timeline.map((t) => (
                <tr key={t.period} className="hover:bg-ink-800/40">
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex cursor-help items-center gap-1.5 font-medium text-slate-100"
                      title={saisieTitle(t.period)}
                    >
                      {formatPeriod(t.period, locale)}
                      <Clock size={12} className="text-slate-500" />
                    </span>
                  </td>
                  <td className="tabnum px-5 py-3 text-right text-slate-200">
                    {fmt.currency(t.total)}
                  </td>
                  <td
                    className={`tabnum px-5 py-3 text-right ${
                      t.delta > 0 ? 'text-mint-400' : t.delta < 0 ? 'text-coral-400' : 'text-slate-400'
                    }`}
                  >
                    {t.delta === 0 ? '—' : fmt.signed(t.delta)}
                  </td>
                  <td className="tabnum px-5 py-3 text-right text-slate-400">
                    {t.flow !== 0 ? fmt.signed(t.flow) : '—'}
                  </td>
                  <td
                    className={`tabnum px-5 py-3 text-right ${
                      t.performance > 0
                        ? 'text-mint-400'
                        : t.performance < 0
                          ? 'text-coral-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {t.performance === 0 ? '—' : fmt.signed(t.performance)}
                  </td>
                  <td className="tabnum px-5 py-3 text-right text-slate-400">
                    {t.performancePct != null ? fmt.pct(t.performancePct) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="btn-subtle h-8 !px-2 text-xs"
                      onClick={() => openReport(t.period)}
                    >
                      <FileText size={14} /> Rapport
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product matrix */}
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-200">Détail par produit</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="sticky left-0 bg-ink-850 px-5 py-2 text-left font-medium">Produit</th>
                {periods.map((p) => (
                  <th key={p} className="px-4 py-2 text-right font-medium">
                    {shortPeriod(p, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {activeProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-ink-800/40">
                  <td className="sticky left-0 bg-ink-850 px-5 py-2.5 text-left">
                    <div className="font-medium text-slate-100">{prod.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {db.platforms.find((pl) => pl.id === prod.platformId)?.name}
                    </div>
                  </td>
                  {periods.map((p) => {
                    const v = valueAt(prod.id, p)
                    return (
                      <td
                        key={p}
                        className="tabnum whitespace-nowrap px-4 py-2.5 text-right text-slate-300"
                      >
                        {v !== null ? fmt.currency(v) : <span className="text-slate-600">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
