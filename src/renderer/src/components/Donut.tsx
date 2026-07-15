import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { AllocationSlice } from '../../../shared/domain'
import { useFmt } from '../lib/format'

export function Donut({
  data,
  centerLabel,
  centerValue
}: {
  data: AllocationSlice[]
  centerLabel?: string
  centerValue?: string
}): JSX.Element {
  const fmt = useFmt()
  const total = data.reduce((s, d) => s + d.value, 0)
  const slices = data.filter((d) => d.value > 0)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices.length ? slices : [{ value: 1, color: '#26304480' }]}
              dataKey="value"
              innerRadius={44}
              outerRadius={62}
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {(slices.length ? slices : [{ color: '#26304480' } as AllocationSlice]).map(
                (s, i) => (
                  <Cell key={i} fill={s.color} />
                )
              )}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            {centerLabel ?? 'Total'}
          </span>
          <span className="tabnum text-[13px] font-semibold text-slate-100">
            {centerValue ?? fmt.currency(total)}
          </span>
        </div>
      </div>

      <div className="w-full space-y-1.5">
        {slices.length === 0 && <div className="text-sm text-slate-500">Aucune donnée</div>}
        {slices.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-300" title={s.label}>
              {s.label}
            </span>
            <span className="tabnum shrink-0 text-xs text-slate-500">{s.pct.toFixed(0)}%</span>
            <span className="tabnum w-20 shrink-0 text-right font-medium text-slate-100">
              {fmt.currency(s.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
