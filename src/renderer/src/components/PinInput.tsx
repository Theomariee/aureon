import { useRef } from 'react'

/** Six-cell numeric PIN entry. `value` is the current string (0–6 digits). */
export function PinInput({
  value,
  onChange,
  autoFocus,
  disabled
}: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  disabled?: boolean
}): JSX.Element {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setDigit = (i: number, d: string): void => {
    const digit = d.replace(/\D/g, '').slice(-1)
    const chars = value.split('')
    chars[i] = digit
    const next = chars.join('').slice(0, 6)
    onChange(next)
    if (digit && i < 5) refs.current[i + 1]?.focus()
  }

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  const onPaste = (e: React.ClipboardEvent): void => {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(digits)
    refs.current[Math.min(digits.length, 5)]?.focus()
  }

  return (
    <div className="flex justify-center gap-2" onPaste={onPaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={value[i] ?? ''}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-14 w-12 rounded-xl border border-line bg-ink-900/80 text-center text-2xl font-semibold text-slate-100 outline-none transition focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20 disabled:opacity-50"
        />
      ))}
    </div>
  )
}
