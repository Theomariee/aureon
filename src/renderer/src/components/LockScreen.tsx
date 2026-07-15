import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gem, KeyRound, ShieldCheck } from 'lucide-react'
import { useStore } from '../store'
import { PinInput } from './PinInput'

export function LockScreen(): JSX.Element {
  const unlock = useStore((s) => s.unlock)
  const unlockRecovery = useStore((s) => s.unlockRecovery)
  const [pin, setPin] = useState('')
  const [recovery, setRecovery] = useState('')
  const [mode, setMode] = useState<'pin' | 'recovery'>('pin')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submitPin = async (): Promise<void> => {
    if (pin.length !== 6) return
    setBusy(true)
    setError('')
    const res = await unlock(pin)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Code PIN incorrect.')
      setPin('')
    }
  }

  const submitRecovery = async (): Promise<void> => {
    if (!recovery.trim()) return
    setBusy(true)
    setError('')
    const res = await unlockRecovery(recovery.trim())
    setBusy(false)
    if (!res.ok) setError(res.error ?? 'Code de secours incorrect.')
  }

  return (
    <div className="grid h-full place-items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="card w-full max-w-sm p-8 text-center"
      >
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gold-grad text-ink-950 shadow-glow">
          <Gem size={26} />
        </div>
        <h1 className="text-xl font-bold text-slate-50">Aureon est verrouillé</h1>

        {mode === 'pin' ? (
          <>
            <p className="mb-6 mt-1 text-sm text-slate-400">Saisis ton code PIN pour continuer.</p>
            <div className="mb-4">
              <PinRow value={pin} onChange={setPin} onEnter={submitPin} disabled={busy} />
            </div>
            {error && <p className="mb-3 text-sm text-coral-400">{error}</p>}
            <button className="btn-primary w-full" onClick={submitPin} disabled={pin.length !== 6 || busy}>
              {busy ? 'Vérification…' : 'Déverrouiller'}
            </button>
            <button
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-gold-400"
              onClick={() => {
                setMode('recovery')
                setError('')
              }}
            >
              <KeyRound size={13} /> PIN oublié ? Utiliser le code de secours
            </button>
          </>
        ) : (
          <>
            <p className="mb-5 mt-1 text-sm text-slate-400">
              Saisis ton code de secours (16 caractères).
            </p>
            <input
              className="field mb-3 text-center font-mono tracking-widest"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={recovery}
              autoFocus
              onChange={(e) => setRecovery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitRecovery()}
            />
            {error && <p className="mb-3 text-sm text-coral-400">{error}</p>}
            <button className="btn-primary w-full" onClick={submitRecovery} disabled={busy}>
              {busy ? 'Vérification…' : 'Déverrouiller avec le code de secours'}
            </button>
            <button
              className="mt-4 text-xs text-slate-500 hover:text-gold-400"
              onClick={() => {
                setMode('pin')
                setError('')
              }}
            >
              ← Revenir au code PIN
            </button>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-line pt-4 text-[11px] text-slate-600">
          <ShieldCheck size={12} /> Données chiffrées localement · aucun serveur
        </div>
      </motion.div>
    </div>
  )
}

// Local wrapper to submit via Enter, reusing PinInput.
function PinRow({
  value,
  onChange,
  onEnter,
  disabled
}: {
  value: string
  onChange: (v: string) => void
  onEnter: () => void
  disabled?: boolean
}): JSX.Element {
  return (
    <div onKeyDown={(e) => e.key === 'Enter' && onEnter()}>
      <PinInput value={value} onChange={onChange} autoFocus disabled={disabled} />
    </div>
  )
}
