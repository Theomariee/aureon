import { useState } from 'react'
import { Check, Copy, KeyRound, ShieldAlert } from 'lucide-react'
import { useStore } from '../store'
import { PinInput } from './PinInput'

/**
 * Two-step PIN creation flow: choose a 6-digit PIN, then save the one-time
 * recovery code. Calls `onComplete` once the user has acknowledged the code.
 */
export function PinSetup({
  onComplete,
  variant = 'setup'
}: {
  onComplete: () => void
  variant?: 'setup' | 'reset'
}): JSX.Element {
  const db = useStore((s) => s.db)
  const markPinSet = useStore((s) => s.markPinSet)

  const [step, setStep] = useState<'enter' | 'recovery'>('enter')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const create = async (): Promise<void> => {
    if (pin.length !== 6) {
      setError('Le code doit comporter 6 chiffres.')
      return
    }
    if (pin !== confirm) {
      setError('Les deux codes ne correspondent pas.')
      setConfirm('')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (variant === 'reset') {
        const res = await window.api.securityResetPin(pin)
        if (!res.ok || !res.recoveryCode) {
          setError(res.error ?? 'Échec de la réinitialisation.')
          return
        }
        setRecoveryCode(res.recoveryCode)
      } else {
        const res = await window.api.securitySetup(pin, db)
        setRecoveryCode(res.recoveryCode)
        markPinSet(true)
      }
      setStep('recovery')
    } catch (e) {
      setError('Échec : ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(recoveryCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (step === 'recovery') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-gold-400" />
          <p className="text-xs leading-relaxed text-slate-300">
            <b className="text-gold-400">Note ce code maintenant.</b> C'est le <b>seul</b> moyen de
            récupérer tes sauvegardes si tu oublies ton PIN. Il ne sera plus jamais affiché. Range-le
            dans un endroit sûr (gestionnaire de mots de passe, papier).
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-900/80 px-4 py-3">
          <span className="font-mono text-lg tracking-widest text-slate-100">{recoveryCode}</span>
          <button className="btn-subtle h-8 !px-2 text-xs" onClick={copy}>
            {copied ? <Check size={14} className="text-mint-400" /> : <Copy size={14} />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-gold-500"
          />
          J'ai noté mon code de secours en lieu sûr.
        </label>
        <button className="btn-primary w-full" disabled={!saved} onClick={onComplete}>
          Terminer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 text-sm text-slate-400">
        <KeyRound size={18} className="mt-0.5 shrink-0 text-gold-500" />
        <p>
          Choisis un {variant === 'reset' ? 'nouveau ' : ''}code PIN à{' '}
          <b className="text-slate-200">6 chiffres</b>. Il sera demandé au démarrage et servira à
          chiffrer tes données et tes exports.
          {variant === 'reset' && ' Un nouveau code de secours sera généré.'}
        </p>
      </div>
      <div>
        <label className="label text-center">Nouveau code PIN</label>
        <PinInput value={pin} onChange={setPin} autoFocus />
      </div>
      <div>
        <label className="label text-center">Confirme le code</label>
        <PinInput value={confirm} onChange={setConfirm} />
      </div>
      {error && <p className="text-center text-sm text-coral-400">{error}</p>}
      <button className="btn-primary w-full" onClick={create} disabled={busy}>
        {busy ? 'Enregistrement…' : variant === 'reset' ? 'Réinitialiser le code PIN' : 'Créer le code PIN'}
      </button>
    </div>
  )
}
