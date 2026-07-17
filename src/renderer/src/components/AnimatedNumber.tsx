import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number toward `value` on change (and on mount), formatting every
 * frame. Restrained easing (~650ms easeOutCubic) — feels alive, not flashy.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  duration = 650
}: {
  value: number
  format: (n: number) => string
  className?: string
  duration?: number
}): React.JSX.Element {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to || !Number.isFinite(to)) {
      setDisplay(to)
      fromRef.current = to
      return
    }
    const start = performance.now()
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <span className={className}>{format(display)}</span>
}
