import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { BarChart3, Info, TrendingUp } from 'lucide-react'
import { useStore } from '../store'
import { useFmt } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import {
  allPeriods,
  formatPeriod,
  portfolioTri,
  productSeries,
  productTri
} from '../../../shared/domain'

const POS = '#4ade9a'
const NEG = '#ff7a85'

export function Reporting(): React.JSX.Element {
  const db = useStore((s) => s.db)
  const setView = useStore((s) => s.setView)
  const fmt = useFmt()
  const locale = db.profile.locale

  const periods = allPeriods(db)

  const stats = useMemo(() => {
    return db.products
      .filter((p) => db.entries.some((e) => e.productId === p.id))
      .map((p) => {
        const s = productSeries(db, p.id)
        const last = s[s.length - 1]
        const invested = s[0].value + last.cumFlow
        return {
          product: p,
          platform: db.platforms.find((pl) => pl.id === p.platformId),
          value: last.value,
          invested,
          latentGain: last.cumPerf,
          simplePct: invested !== 0 ? (last.cumPerf / invested) * 100 : null,
          tri: productTri(db, p.id),
          months: s.length
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [db])

  if (periods.length < 2) {
    return (
      <>
        <PageHeader title="Reporting" subtitle="Analyse de performance approfondie" />
        <EmptyState
          icon={<BarChart3 size={26} />}
          title="Il faut au moins 2 mois d'historique"
          hint="Le TRI (taux de rendement interne) mesure la performance en tenant compte de la date de tes versements. Il devient disponible dès ta deuxième saisie mensuelle."
          action={
            <button className="btn-primary" onClick={() => setView('entry')}>
              Faire une saisie
            </button>
          }
        />
      </>
    )
  }

  const totalValue = stats.reduce((s, x) => s + x.value, 0)
  const totalInvested = stats.reduce((s, x) => s + x.invested, 0)
  const totalLatent = stats.reduce((s, x) => s + x.latentGain, 0)
  const globalSimplePct = totalInvested !== 0 ? (totalLatent / totalInvested) * 100 : null
  const globalTri = portfolioTri(db)

  const barData = stats
    .filter((s) => s.tri !== null)
    .map((s) => ({ name: s.product.name, tri: (s.tri as number) * 100 }))

  const shortHistory = periods.length < 4

  return (
    <>
      <PageHeader
        title="Reporting"
        subtitle="Analyse de performance approfondie · rendement pondéré par les flux"
      />

      {/* Global performance */}
      <div className="card mb-5 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_2fr]">
          <div className="flex flex-col justify-center gap-1 border-b border-line p-6 md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <TrendingUp size={15} className="text-gold-500" /> TRI global annualisé
            </div>
            <div
              className={`tabnum text-4xl font-bold ${
                globalTri == null
                  ? 'text-slate-400'
                  : globalTri > 0
                    ? 'text-mint-400'
                    : globalTri < 0
                      ? 'text-coral-400'
                      : 'text-slate-100'
              }`}
            >
              {globalTri == null ? '—' : fmt.pct(globalTri * 100)}
            </div>
            <div className="text-xs text-slate-500">
              Sur {periods.length} mois · depuis {formatPeriod(periods[0], locale)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            <Mini label="Patrimoine" value={fmt.currency(totalValue)} />
            <Mini label="Investi net" value={fmt.currency(totalInvested)} />
            <Mini
              label="Gains latents"
              value={fmt.signed(totalLatent)}
              tone={totalLatent > 0 ? 'pos' : totalLatent < 0 ? 'neg' : 'flat'}
            />
            <Mini
              label="Perf. totale"
              value={globalSimplePct != null ? fmt.pct(globalSimplePct) : '—'}
              tone={totalLatent > 0 ? 'pos' : totalLatent < 0 ? 'neg' : 'flat'}
            />
          </div>
        </div>
      </div>

      {/* TRI per product bar chart */}
      {barData.length > 0 && (
        <div className="card mb-5 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">TRI annualisé par produit</h2>
          <div style={{ height: Math.max(160, barData.length * 44) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 40, top: 0, bottom: 0 }}>
                <XAxis
                  type="number"
                  stroke="#5b6a86"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9fb0cc"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={130}
                />
                <ReferenceLine x={0} stroke="#3a465e" />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    background: '#141a28',
                    border: '1px solid #232c40',
                    borderRadius: 12,
                    color: '#e8eefc'
                  }}
                  formatter={(v) => [`${Number(v).toFixed(2)} %`, 'TRI annualisé']}
                />
                <Bar dataKey="tri" radius={[0, 4, 4, 0]} barSize={20}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.tri >= 0 ? POS : NEG} />
                  ))}
                  <LabelList
                    dataKey="tri"
                    position="right"
                    formatter={(v) => {
                      const n = Number(v)
                      return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
                    }}
                    style={{ fill: '#9fb0cc', fontSize: 11 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed table */}
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-200">Détail par produit</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">Produit</th>
                <th className="px-5 py-2 text-right font-medium">Valeur</th>
                <th className="px-5 py-2 text-right font-medium">Investi net</th>
                <th className="px-5 py-2 text-right font-medium">Gains latents</th>
                <th className="px-5 py-2 text-right font-medium">Perf. totale</th>
                <th className="px-5 py-2 text-right font-medium">TRI annualisé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {stats.map((s) => (
                <tr key={s.product.id} className="hover:bg-ink-800/40">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-100">{s.product.name}</div>
                    <div className="text-[11px] text-slate-500">{s.platform?.name}</div>
                  </td>
                  <td className="tabnum px-5 py-3 text-right text-slate-200">{fmt.currency(s.value)}</td>
                  <td className="tabnum px-5 py-3 text-right text-slate-400">{fmt.currency(s.invested)}</td>
                  <td
                    className={`tabnum px-5 py-3 text-right ${
                      s.latentGain > 0 ? 'text-mint-400' : s.latentGain < 0 ? 'text-coral-400' : 'text-slate-400'
                    }`}
                  >
                    {s.latentGain !== 0 ? fmt.signed(s.latentGain) : '—'}
                  </td>
                  <td
                    className={`tabnum px-5 py-3 text-right ${
                      (s.simplePct ?? 0) > 0 ? 'text-mint-400' : (s.simplePct ?? 0) < 0 ? 'text-coral-400' : 'text-slate-400'
                    }`}
                  >
                    {s.simplePct != null ? fmt.pct(s.simplePct) : '—'}
                  </td>
                  <td
                    className={`tabnum px-5 py-3 text-right font-semibold ${
                      s.tri == null
                        ? 'text-slate-500'
                        : s.tri > 0
                          ? 'text-mint-400'
                          : s.tri < 0
                            ? 'text-coral-400'
                            : 'text-slate-300'
                    }`}
                  >
                    {s.tri == null ? '—' : fmt.pct(s.tri * 100)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-ink-900/40 font-semibold">
                <td className="px-5 py-3 text-slate-200">Total portefeuille</td>
                <td className="tabnum px-5 py-3 text-right text-slate-100">{fmt.currency(totalValue)}</td>
                <td className="tabnum px-5 py-3 text-right text-slate-300">{fmt.currency(totalInvested)}</td>
                <td
                  className={`tabnum px-5 py-3 text-right ${
                    totalLatent > 0 ? 'text-mint-400' : totalLatent < 0 ? 'text-coral-400' : 'text-slate-300'
                  }`}
                >
                  {fmt.signed(totalLatent)}
                </td>
                <td className="tabnum px-5 py-3 text-right text-slate-300">
                  {globalSimplePct != null ? fmt.pct(globalSimplePct) : '—'}
                </td>
                <td
                  className={`tabnum px-5 py-3 text-right ${
                    globalTri == null ? 'text-slate-500' : globalTri > 0 ? 'text-mint-400' : 'text-coral-400'
                  }`}
                >
                  {globalTri == null ? '—' : fmt.pct(globalTri * 100)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Explainer */}
      <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Le <b className="text-slate-400">TRI (taux de rendement interne)</b> est un rendement{' '}
          <b>annualisé</b> qui tient compte du <b>montant et de la date</b> de chaque versement /
          retrait — contrairement à la « perf. totale » qui rapporte simplement les gains au capital
          investi. C'est la mesure la plus juste de la performance réelle de tes placements.
          {shortHistory && (
            <>
              {' '}
              <span className="text-gold-400">
                Avec moins de 4 mois d'historique, le TRI annualisé est extrapolé et peut sembler
                exagéré ; il se stabilise au fil des saisies.
              </span>
            </>
          )}
        </p>
      </div>
    </>
  )
}

function Mini({
  label,
  value,
  tone = 'flat'
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'flat'
}): React.JSX.Element {
  const toneClass = tone === 'pos' ? 'text-mint-400' : tone === 'neg' ? 'text-coral-400' : 'text-slate-100'
  return (
    <div className="bg-ink-850 p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`tabnum mt-1 text-xl font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}
