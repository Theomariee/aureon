import type { ReactNode } from 'react'

interface Entry {
  name?: ReactNode
  value?: number | string
  color?: string
  dataKey?: ReactNode
}

/**
 * Signature tooltip for Recharts (used via `content={<ChartTooltip .../>}`).
 * Matches the app's card material instead of the default white box.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  labelFormatter
}: {
  active?: boolean
  payload?: Entry[]
  label?: ReactNode
  formatValue: (v: number, name?: ReactNode) => string
  labelFormatter?: (label: ReactNode) => ReactNode
}): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null
  const heading = labelFormatter ? labelFormatter(label) : label
  return (
    <div className="min-w-[9rem] rounded-xl border border-line bg-ink-800/95 px-3 py-2 text-xs shadow-card-hover backdrop-blur-sm">
      {heading != null && heading !== '' && (
        <div className="mb-1.5 border-b border-line/60 pb-1.5 font-medium text-slate-300">{heading}</div>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: p.color }} />
            <span className="text-slate-400">{p.name}</span>
            <span className="tabnum ml-auto pl-3 font-semibold text-slate-100">
              {formatValue(Number(p.value), p.name)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
