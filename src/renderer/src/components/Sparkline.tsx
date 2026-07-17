/** Tiny inline-SVG area sparkline for KPI tiles. Purely decorative context. */
export function Sparkline({
  data,
  color = '#e8c169',
  className,
  height = 34
}: {
  data: number[]
  color?: string
  className?: string
  height?: number
}): React.JSX.Element | null {
  if (data.length < 2) return null
  const w = 120
  const h = height
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / range) * (h - 6) - 3
    return [x, y] as const
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const id = `spk-${Math.round(color.split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`

  return (
    <svg
      className={className}
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
