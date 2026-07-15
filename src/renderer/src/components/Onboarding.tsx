import { useState } from 'react'
import { EyeOff, Lock } from 'lucide-react'
import { Modal } from './Modal'
import { PinSetup } from './PinSetup'

/** First-launch proposal to protect the app with a PIN. Fully skippable. */
export function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const [step, setStep] = useState<'intro' | 'setup'>('intro')

  return (
    <Modal
      open={open}
      title={step === 'intro' ? 'Protéger tes données' : 'Créer un code PIN'}
      onClose={onClose}
      width={480}
    >
      {step === 'intro' ? (
        <div className="space-y-5">
          <p className="text-sm text-slate-300">
            Aureon garde tes données <b>uniquement sur ce PC</b>. Tu peux ajouter un code PIN pour :
          </p>
          <div className="space-y-3">
            <Feature icon={<Lock size={18} />} title="Verrouiller l'application">
              Le PIN est demandé au démarrage et <b>chiffre</b> tes données locales.
            </Feature>
            <Feature icon={<EyeOff size={18} />} title="Chiffrer tes sauvegardes">
              Tes exports déposés sur le cloud deviennent illisibles sans le PIN.
            </Feature>
          </div>
          <p className="rounded-xl border border-line bg-ink-900/60 p-3 text-xs text-slate-500">
            C'est optionnel — tu pourras l'activer ou le changer plus tard dans les Réglages.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Plus tard
            </button>
            <button className="btn-primary" onClick={() => setStep('setup')}>
              Configurer un code PIN
            </button>
          </div>
        </div>
      ) : (
        <PinSetup onComplete={onClose} />
      )}
    </Modal>
  )
}

function Feature({
  icon,
  title,
  children
}: {
  icon: JSX.Element
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-gold-500">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-slate-100">{title}</div>
        <div className="text-xs text-slate-400">{children}</div>
      </div>
    </div>
  )
}
