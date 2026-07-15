import { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Coins, LineChart as LineIcon, Sparkles, Wallet } from 'lucide-react'
import { useStore } from '../store'
import { useFmt } from '../lib/format'
import {
  categoryLabel,
  formatPeriod,
  natureLabel,
  productSeries,
  shortPeriod
} from '../../../shared/domain'

const COLORS = { value: '#e8c169', gain: '#4ade9a', flow: '#6db3f2' }

/** Reusable per-product analysis block: decomposition KPIs, triple curve, monthly detail. */
export function ProductAnalysis({ productId }: { productId: string }): JSX.Element {
  const db = useStore((s) => s.db)
  const fmt = useFmt()
  const locale = db.profile.locale

  const product = db.products.find((p) => p.id === productId)
  const platform = db.platforms.find((p) => p.id === product?.platformId)
  const series = useMemo(() => productSeries(db, productId), [db, productId])

  if (!product) {
    return <div className="card p-6 text-sm text-slate-500">Produit introuvable.</div>
  }

  if (series.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        Aucune saisie pour <span className="text-slate-300">{product.name}</span> pour l’instant.
      </div>
    )
  }

  const isCash = product.nature === 'cash'
  const last = series[series.length - 1]
  const base = series[0].value
  const currentValue = last.value
  const totalPerf = last.cumPerf
  const totalFlow = last.cumFlow
  const invested = base + totalFlow
  const perfPct = invested !== 0 ? (totalPerf / invested) * 100 : null

  const chartData = series.map((p) => ({
    label: shortPeriod(p.period, locale),
    Valeur: p.value,
    'Gains latents': p.cumPerf,
    Flux: p.cumFlow
  }))

  return (
    <div className="space-y-4">
      {/* Context chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: platform?.color ?? '#e8c169' }}
          />
          {platform?.name ?? '—'}
        </span>
        <span className="chip">{categoryLabel(product.category)}</span>
        {product.subtype && <span className="chip">{product.subtype}</span>}
        <span
          className={`chip ${
            isCash ? '!border-mint-500/30 !text-mint-400' : '!border-sky-500/30 !text-sky-400'
          }`}
        >
          {natureLabel(product.nature)}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Valeur actuelle" value={fmt.currency(currentValue)} icon={<Wallet size={18} />} accent />
        <Stat
          label="Gains latents cumulés"
          value={fmt.signed(totalPerf)}
          icon={<Sparkles size={18} />}
          tone={totalPerf > 0 ? 'pos' : totalPerf < 0 ? 'neg' : 'flat'}
        />
        <Stat
          label="Flux nets cumulés"
          value={totalFlow !== 0 ? fmt.signed(totalFlow) : '—'}
          icon={<Coins size={18} />}
        />
        <Stat
          label="Performance"
          value={perfPct != null ? fmt.pct(perfPct) : '—'}
          sub={`sur ${fmt.currency(invested)} investis`}
          icon={<LineIcon size={18} />}
          tone={totalPerf > 0 ? 'pos' : totalPerf < 0 ? 'neg' : 'flat'}
        />
      </div>

      {/* Triple curve */}
      <div className="card p-5">
        <p className="mb-3 text-xs text-slate-500">
          La valeur totale se décompose en <span className="text-mint-400">gains latents</span>{' '}
          (marché/intérêts) et <span className="text-sky-400">flux</span> (versements et retraits),
          cumulés depuis le début du suivi.
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232c40" vertical={false} />
              <XAxis dataKey="label" stroke="#5b6a86" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis
                stroke="#5b6a86"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={70}
                tickFormatter={(v) => fmt.currency(v as number)}
              />
              <Tooltip
                contentStyle={{
                  background: '#141a28',
                  border: '1px solid #232c40',
                  borderRadius: 12,
                  color: '#e8eefc'
                }}
                labelStyle={{ color: '#9fb0cc' }}
                formatter={(v: number, name: string) => [fmt.currency(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9fb0cc' }} iconType="plainline" />
              <Line type="monotone" dataKey="Valeur" stroke={COLORS.value} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Gains latents" stroke={COLORS.gain} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="Flux" stroke={COLORS.flow} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly detail */}
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-200">Détail mensuel</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">Mois</th>
                <th className="px-5 py-2 text-right font-medium">Valeur</th>
                <th className="px-5 py-2 text-right font-medium">Variation</th>
                <th className="px-5 py-2 text-right font-medium">Flux</th>
                <th className="px-5 py-2 text-right font-medium">Gain latent</th>
                <th className="px-5 py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {[...series].reverse().map((p, i, arr) => {
                const prev = arr[i + 1]
                const delta = prev ? p.value - prev.value : null
                return (
                  <tr key={p.period} className="hover:bg-ink-800/40">
                    <td className="px-5 py-3 font-medium text-slate-100">{formatPeriod(p.period, locale)}</td>
                    <td className="tabnum px-5 py-3 text-right text-slate-200">{fmt.currency(p.value)}</td>
                    <td
                      className={`tabnum px-5 py-3 text-right ${
                        delta === null
                          ? 'text-slate-500'
                          : delta > 0
                            ? 'text-mint-400'
                            : delta < 0
                              ? 'text-coral-400'
                              : 'text-slate-400'
                      }`}
                    >
                      {delta === null ? '—' : fmt.signed(delta)}
                    </td>
                    <td className="tabnum px-5 py-3 text-right text-sky-400/90">
                      {p.stepFlow !== 0 ? fmt.signed(p.stepFlow) : '—'}
                    </td>
                    <td
                      className={`tabnum px-5 py-3 text-right ${
                        p.stepPerf > 0 ? 'text-mint-400' : p.stepPerf < 0 ? 'text-coral-400' : 'text-slate-400'
                      }`}
                    >
                      {p.stepPerf !== 0 ? fmt.signed(p.stepPerf) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-400">{p.note ?? ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  icon,
  tone = 'flat',
  accent = false
}: {
  label: string
  value: string
  sub?: string
  icon?: JSX.Element
  tone?: 'pos' | 'neg' | 'flat'
  accent?: boolean
}): JSX.Element {
  const toneClass =
    tone === 'pos' ? 'text-mint-400' : tone === 'neg' ? 'text-coral-400' : 'text-slate-50'
  return (
    <div className={`card p-4 ${accent ? 'ring-1 ring-gold-500/20' : ''}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className={accent ? 'text-gold-500' : 'text-slate-500'}>{icon}</span>
      </div>
      <div className={`tabnum text-2xl font-bold ${toneClass}`}>{value}</div>
      {sub && <div className="tabnum mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}
