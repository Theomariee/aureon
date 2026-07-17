import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, CalendarClock, Coins, Sparkles, Wallet } from 'lucide-react'
import { useStore } from '../store'
import { useFmt } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Donut } from '../components/Donut'
import { ProductAnalysis } from '../components/ProductAnalysis'
import {
  allPeriods,
  allocationByCategory,
  allocationByLiquidity,
  allocationByPlatform,
  buildTimeline,
  currentPeriod,
  entryReminder,
  formatPeriod,
  movementsForPeriod,
  shortPeriod
} from '../../../shared/domain'

export function Dashboard(): JSX.Element {
  const db = useStore((s) => s.db)
  const setView = useStore((s) => s.setView)
  const openEntry = useStore((s) => s.openEntry)
  const fmt = useFmt()
  const locale = db.profile.locale
  const [analysisId, setAnalysisId] = useState<string>('')
  const reminder = entryReminder(db)

  const periods = allPeriods(db)
  const period = periods.length ? periods[periods.length - 1] : currentPeriod()
  const timeline = useMemo(() => buildTimeline(db), [db])
  const current = timeline.find((t) => t.period === period)

  if (db.entries.length === 0) {
    return (
      <>
        <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de ton patrimoine" />
        <EmptyState
          icon={<Sparkles size={26} />}
          title="Bienvenue sur Aureon"
          hint="Commence par créer tes plateformes et tes produits, puis effectue ta première saisie mensuelle pour voir ton patrimoine prendre vie."
          action={
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setView('products')}>
                Configurer mes produits
              </button>
              <button className="btn-primary" onClick={() => setView('entry')}>
                Première saisie
              </button>
            </div>
          }
        />
      </>
    )
  }

  const total = current?.total ?? 0
  const delta = current?.delta ?? 0
  const flow = current?.flow ?? 0
  const perf = current?.performance ?? 0

  const chartData = timeline.map((t) => ({
    period: t.period,
    label: shortPeriod(t.period, locale),
    total: t.total
  }))

  const cats = allocationByCategory(db, period)
  const plats = allocationByPlatform(db, period)
  const liq = allocationByLiquidity(db, period)
  const movements = movementsForPeriod(db, period)
  const movers = [...movements]
    .filter((m) => m.prevValue !== null)
    .sort((a, b) => Math.abs(b.performance) - Math.abs(a.performance))
    .slice(0, 5)

  // Products that have at least one entry — selectable for the analysis section.
  const analysisProducts = db.products.filter((p) =>
    db.entries.some((e) => e.productId === p.id)
  )
  const defaultAnalysisId = movements[0]?.productId ?? analysisProducts[0]?.id ?? ''
  const selectedAnalysisId = analysisProducts.some((p) => p.id === analysisId)
    ? analysisId
    : defaultAnalysisId

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={`Dernière situation · ${formatPeriod(period, locale)}`}
        actions={
          <button className="btn-primary" onClick={() => setView('entry')}>
            <PencilIcon /> Nouvelle saisie
          </button>
        }
      />

      {/* Monthly entry reminder */}
      {reminder.show && reminder.targetPeriod && (
        <div
          className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 ${
            reminder.state === 'overdue'
              ? 'border-coral-500/30 bg-coral-500/10'
              : 'border-gold-500/30 bg-gold-500/10'
          }`}
        >
          <CalendarClock
            size={18}
            className={`shrink-0 ${reminder.state === 'overdue' ? 'text-coral-400' : 'text-gold-400'}`}
          />
          <div className="flex-1 text-sm text-slate-200">
            {reminder.state === 'overdue' ? (
              <>
                <b>Saisie de {formatPeriod(reminder.targetPeriod, locale)} en retard.</b>{' '}
                <span className="text-slate-400">
                  Fais-la pour garder un historique sans trou — c’est lui qui fiabilise tes courbes.
                </span>
              </>
            ) : (
              <>
                <b>C’est le bon moment pour saisir {formatPeriod(reminder.targetPeriod, locale)}.</b>{' '}
                <span className="text-slate-400">
                  Mesurer au même moment chaque mois rend tes variations comparables.
                </span>
              </>
            )}
          </div>
          <button
            className="btn-primary h-8 shrink-0 !px-3 text-xs"
            onClick={() => openEntry(reminder.targetPeriod ?? undefined)}
          >
            Saisir {shortPeriod(reminder.targetPeriod, locale)}
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="mb-5 grid grid-cols-4 gap-4">
        <Stat
          label="Patrimoine total"
          value={fmt.currency(total)}
          icon={<Wallet size={18} />}
          accent
        />
        <Stat
          label="Variation du mois"
          value={fmt.signed(delta)}
          tone={delta > 0 ? 'pos' : delta < 0 ? 'neg' : 'flat'}
          icon={delta >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
        />
        <Stat
          label="Apports / retraits"
          value={flow !== 0 ? fmt.signed(flow) : '—'}
          icon={<Coins size={18} />}
        />
        <Stat
          label="Performance réelle"
          value={fmt.signed(perf)}
          sub={current?.performancePct != null ? fmt.pct(current.performancePct) : undefined}
          tone={perf > 0 ? 'pos' : perf < 0 ? 'neg' : 'flat'}
          icon={<Sparkles size={18} />}
        />
      </div>

      {/* Evolution chart */}
      <div className="card mb-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Évolution du patrimoine</h2>
          <span className="chip">{chartData.length} mois</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8c169" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#e8c169" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#232c40" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#5b6a86"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
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
                formatter={(v: number) => [fmt.currency(v), 'Patrimoine']}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#e8c169"
                strokeWidth={2.5}
                fill="url(#grad)"
                dot={{ r: 2.5, fill: '#e8c169' }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Allocations */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Par catégorie</h2>
          <Donut data={cats} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Par plateforme</h2>
          <Donut data={plats} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Disponibilité</h2>
          <Donut data={liq} centerLabel="Dispo." centerValue={dispoPct(liq)} />
        </div>
      </div>

      {/* Movers */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Mouvements marquants du mois</h2>
        {movers.length === 0 ? (
          <p className="text-sm text-slate-500">
            Pas encore de comparaison possible (première saisie).
          </p>
        ) : (
          <div className="divide-y divide-line/60">
            {movers.map((m) => (
              <div key={m.productId} className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-100">{m.productName}</div>
                  <div className="text-xs text-slate-500">
                    {m.platformName}
                    {m.note ? ` · ${m.note}` : ''}
                  </div>
                </div>
                {m.flow !== 0 && (
                  <span className="chip text-slate-400">flux {fmt.signed(m.flow)}</span>
                )}
                <div
                  className={`tabnum w-28 text-right text-sm font-semibold ${
                    m.performance > 0
                      ? 'text-mint-400'
                      : m.performance < 0
                        ? 'text-coral-400'
                        : 'text-slate-400'
                  }`}
                >
                  {fmt.signed(m.performance)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-product analysis */}
      {analysisProducts.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Analyse par produit</h2>
              <p className="text-sm text-slate-400">
                Sélectionne un produit pour voir son évolution et distinguer gains latents et flux.
              </p>
            </div>
            <select
              className="field max-w-xs"
              value={selectedAnalysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
            >
              {db.platforms.map((plat) => {
                const prods = analysisProducts.filter((p) => p.platformId === plat.id)
                if (prods.length === 0) return null
                return (
                  <optgroup key={plat.id} label={plat.name}>
                    {prods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.subtype ? ` · ${p.subtype}` : ''}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>
          <ProductAnalysis productId={selectedAnalysisId} />
        </div>
      )}
    </>
  )
}

function dispoPct(liq: ReturnType<typeof allocationByLiquidity>): string {
  const d = liq.find((l) => l.key === 'immediate')
  return d ? `${d.pct.toFixed(0)}%` : '0%'
}

function PencilIcon(): JSX.Element {
  return <Sparkles size={16} />
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
