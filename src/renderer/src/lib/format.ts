import { formatCurrency, formatPct, formatSigned } from '../../../shared/domain'
import { useStore } from '../store'

/** Currency/locale-bound formatting helpers pulled from the active profile. */
export function useFmt(): {
  currency: (v: number, digits?: number) => string
  signed: (v: number) => string
  pct: (v: number | null) => string
  locale: string
  cur: string
} {
  const { currency, locale } = useStore((s) => s.db.profile)
  return {
    currency: (v: number, digits = 0) => formatCurrency(v, currency, locale, digits),
    signed: (v: number) => formatSigned(v, currency, locale),
    pct: (v: number | null) => formatPct(v, locale),
    locale,
    cur: currency
  }
}
