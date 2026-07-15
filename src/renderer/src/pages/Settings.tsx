import { useState } from 'react'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FolderArchive,
  HardDriveDownload,
  Info,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Unlock
} from 'lucide-react'
import { useStore } from '../store'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/Modal'
import { PinInput } from '../components/PinInput'
import { PinSetup } from '../components/PinSetup'
import type { EncryptedEnvelope } from '../../../shared/api'

export function SettingsPage(): JSX.Element {
  const db = useStore((s) => s.db)
  const setProfile = useStore((s) => s.setProfile)
  const replaceDb = useStore((s) => s.replaceDb)
  const toast = useStore((s) => s.toast)
  const setView = useStore((s) => s.setView)
  const pinSet = useStore((s) => s.pinSet)
  const markPinSet = useStore((s) => s.markPinSet)

  // Modals
  const [setupOpen, setSetupOpen] = useState(false)
  const [changeOpen, setChangeOpen] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)

  // Change PIN
  const [curPin, setCurPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confPin, setConfPin] = useState('')
  const [changeErr, setChangeErr] = useState('')

  // Regenerate recovery
  const [regenPin, setRegenPin] = useState('')
  const [regenErr, setRegenErr] = useState('')
  const [regenCode, setRegenCode] = useState('')
  const [copied, setCopied] = useState(false)

  // Disable
  const [disPin, setDisPin] = useState('')
  const [disErr, setDisErr] = useState('')

  // Encrypted import
  const [importEnv, setImportEnv] = useState<EncryptedEnvelope | null>(null)
  const [impSecret, setImpSecret] = useState('')
  const [impMode, setImpMode] = useState<'pin' | 'recovery'>('pin')
  const [impErr, setImpErr] = useState('')

  const exportBackup = async (): Promise<void> => {
    const res = await window.api.exportBackup(db)
    if (res.ok) {
      toast(res.encrypted ? 'Sauvegarde chiffrée exportée' : 'Sauvegarde exportée', 'success')
      if (res.path) void window.api.showItem(res.path)
    }
  }

  const importBackup = async (): Promise<void> => {
    const res = await window.api.importBackup()
    if (res.ok && res.db) {
      await replaceDb(res.db)
      toast('Sauvegarde importée ✔', 'success')
    } else if (res.encrypted && res.envelope) {
      setImportEnv(res.envelope)
      setImpSecret('')
      setImpMode('pin')
      setImpErr('')
    } else if (res.error) {
      toast(res.error, 'error')
    }
  }

  const submitImport = async (): Promise<void> => {
    if (!importEnv) return
    const res = await window.api.importDecrypt(importEnv, impSecret.trim(), impMode === 'recovery')
    if (res.ok && res.db) {
      await replaceDb(res.db)
      setImportEnv(null)
      toast('Sauvegarde importée ✔', 'success')
    } else {
      setImpErr(res.error ?? 'Déchiffrement impossible.')
    }
  }

  const submitChange = async (): Promise<void> => {
    if (newPin.length !== 6) return setChangeErr('Le nouveau code doit faire 6 chiffres.')
    if (newPin !== confPin) return setChangeErr('Les nouveaux codes ne correspondent pas.')
    const res = await window.api.securityChangePin(curPin, newPin)
    if (res.ok) {
      setChangeOpen(false)
      setCurPin('')
      setNewPin('')
      setConfPin('')
      setChangeErr('')
      toast('Code PIN modifié ✔', 'success')
    } else {
      setChangeErr(res.error ?? 'Échec.')
    }
  }

  const submitRegen = async (): Promise<void> => {
    const res = await window.api.securityRegenerateRecovery(regenPin)
    if (res.ok && res.recoveryCode) {
      setRegenCode(res.recoveryCode)
      setRegenErr('')
    } else {
      setRegenErr(res.error ?? 'Échec.')
    }
  }

  const submitDisable = async (): Promise<void> => {
    const res = await window.api.securityDisable(disPin)
    if (res.ok) {
      markPinSet(false)
      setDisableOpen(false)
      setDisPin('')
      setDisErr('')
      toast('Code PIN désactivé — données déchiffrées', 'info')
    } else {
      setDisErr(res.error ?? 'Code PIN incorrect.')
    }
  }

  const copyRegen = async (): Promise<void> => {
    await navigator.clipboard.writeText(regenCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const closeRegen = (): void => {
    setRegenOpen(false)
    setRegenPin('')
    setRegenCode('')
    setRegenErr('')
  }

  return (
    <>
      <PageHeader title="Réglages" subtitle="Profil, sécurité et sauvegarde de tes données." />

      {/* Profile */}
      <section className="card mb-5 p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Profil</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Nom / titre</label>
            <input
              className="field"
              placeholder="Mon patrimoine"
              value={db.profile.name}
              onChange={(e) => setProfile({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Devise</label>
            <select
              className="field"
              value={db.profile.currency}
              onChange={(e) => setProfile({ currency: e.target.value })}
            >
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar US ($)</option>
              <option value="CHF">Franc suisse (CHF)</option>
              <option value="GBP">Livre sterling (£)</option>
            </select>
          </div>
          <div>
            <label className="label">Format régional</label>
            <select
              className="field"
              value={db.profile.locale}
              onChange={(e) => setProfile({ locale: e.target.value })}
            >
              <option value="fr-FR">Français (fr-FR)</option>
              <option value="en-US">English (en-US)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="card mb-5 p-5">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-200">Sécurité & confidentialité</h2>
          {pinSet ? (
            <span className="chip !border-mint-500/30 !text-mint-400">
              <Lock size={12} /> PIN activé
            </span>
          ) : (
            <span className="chip">Non protégé</span>
          )}
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Un code PIN à 6 chiffres verrouille l’application au démarrage, chiffre tes données
          locales et tes sauvegardes exportées.
        </p>

        {!pinSet ? (
          <button className="btn-primary" onClick={() => setSetupOpen(true)}>
            <KeyRound size={16} /> Configurer un code PIN
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => setChangeOpen(true)}>
              <KeyRound size={16} /> Changer le code PIN
            </button>
            <button className="btn-ghost" onClick={() => setRegenOpen(true)}>
              <RefreshCw size={16} /> Régénérer le code de secours
            </button>
            <button className="btn-danger" onClick={() => setDisableOpen(true)}>
              <Unlock size={16} /> Désactiver
            </button>
          </div>
        )}
      </section>

      {/* Backup & archive */}
      <section className="card mb-5 p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-200">Sauvegarde & archivage</h2>
        <p className="mb-4 text-xs text-slate-500">
          Tes données restent sur ton PC. Pour les mettre « au chaud », exporte-les et dépose le
          fichier sur ton cloud (Google Drive, OneDrive, Dropbox…).
          {pinSet && ' Avec un PIN actif, la sauvegarde exportée est chiffrée.'}
        </p>

        <div className="mb-4 rounded-xl border border-line bg-ink-900/50 p-4">
          <div className="flex items-start gap-3">
            <FolderArchive size={18} className="mt-0.5 text-gold-500" />
            <div className="text-sm text-slate-300">
              <div className="font-medium text-slate-100">Archiver un mois</div>
              <p className="mt-0.5 text-xs text-slate-500">
                Depuis l’écran <b>Saisie mensuelle</b>, le bouton « Archiver ce mois » crée un seul
                fichier <code>Aureon-AAAA-MM.zip</code> (rapport PDF + sauvegarde réimportable) à
                glisser sur ton cloud.
              </p>
              <button
                className="btn-subtle mt-2 h-8 !px-2 text-xs text-gold-500"
                onClick={() => setView('entry')}
              >
                Aller à la saisie <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={exportBackup}>
            <Download size={16} /> Exporter la base (.json)
          </button>
          <button className="btn-ghost" onClick={importBackup}>
            <HardDriveDownload size={16} /> Importer une sauvegarde (.json / .zip)
          </button>
          <button
            className="btn-subtle"
            onClick={() => window.api.openExternal('https://drive.google.com/')}
          >
            <ExternalLink size={16} /> Ouvrir Google Drive
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-xs text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            <b className="text-slate-400">Restauration :</b> clique « Importer une sauvegarde » et
            choisis ton dernier <code>.zip</code> ou <code>.json</code>. Si le fichier est chiffré,
            ton code PIN (ou code de secours) te sera demandé.
          </p>
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <p>Aureon ne se connecte à aucun serveur et n’envoie aucune donnée.</p>
        </div>
      </section>

      {/* ── Modals ── */}
      <Modal open={setupOpen} title="Créer un code PIN" onClose={() => setSetupOpen(false)} width={480}>
        <PinSetup
          onComplete={() => {
            setSetupOpen(false)
            toast('Code PIN activé ✔', 'success')
          }}
        />
      </Modal>

      <Modal
        open={changeOpen}
        title="Changer le code PIN"
        onClose={() => setChangeOpen(false)}
        width={420}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setChangeOpen(false)}>
              Annuler
            </button>
            <button className="btn-primary" onClick={submitChange}>
              Valider
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label text-center">Code PIN actuel</label>
            <PinInput value={curPin} onChange={setCurPin} autoFocus />
          </div>
          <div>
            <label className="label text-center">Nouveau code</label>
            <PinInput value={newPin} onChange={setNewPin} />
          </div>
          <div>
            <label className="label text-center">Confirme le nouveau code</label>
            <PinInput value={confPin} onChange={setConfPin} />
          </div>
          {changeErr && <p className="text-center text-sm text-coral-400">{changeErr}</p>}
        </div>
      </Modal>

      <Modal open={regenOpen} title="Régénérer le code de secours" onClose={closeRegen} width={440}>
        {regenCode ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3">
              <ShieldAlert size={18} className="mt-0.5 shrink-0 text-gold-400" />
              <p className="text-xs leading-relaxed text-slate-300">
                Nouveau code de secours. L’ancien n’est plus valide. Note-le en lieu sûr.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-900/80 px-4 py-3">
              <span className="font-mono text-lg tracking-widest text-slate-100">{regenCode}</span>
              <button className="btn-subtle h-8 !px-2 text-xs" onClick={copyRegen}>
                {copied ? <Check size={14} className="text-mint-400" /> : <Copy size={14} />}
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <button className="btn-primary w-full" onClick={closeRegen}>
              J’ai noté mon nouveau code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-400">
              Confirme ton code PIN pour générer un nouveau code de secours.
            </p>
            <PinInput value={regenPin} onChange={setRegenPin} autoFocus />
            {regenErr && <p className="text-center text-sm text-coral-400">{regenErr}</p>}
            <button className="btn-primary w-full" onClick={submitRegen} disabled={regenPin.length !== 6}>
              Générer
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={disableOpen}
        title="Désactiver le code PIN"
        onClose={() => setDisableOpen(false)}
        width={420}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDisableOpen(false)}>
              Annuler
            </button>
            <button className="btn-danger" onClick={submitDisable} disabled={disPin.length !== 6}>
              <Unlock size={16} /> Désactiver
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-coral-500/30 bg-coral-500/10 p-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-coral-400" />
            <p className="text-xs leading-relaxed text-slate-300">
              Tes données locales seront <b>déchiffrées</b> et l’application ne sera plus verrouillée
              au démarrage. Confirme avec ton code PIN.
            </p>
          </div>
          <PinInput value={disPin} onChange={setDisPin} autoFocus />
          {disErr && <p className="text-center text-sm text-coral-400">{disErr}</p>}
        </div>
      </Modal>

      {/* Encrypted import prompt */}
      <Modal
        open={importEnv !== null}
        title="Sauvegarde chiffrée"
        onClose={() => setImportEnv(null)}
        width={440}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setImportEnv(null)}>
              Annuler
            </button>
            <button className="btn-primary" onClick={submitImport}>
              Déchiffrer et importer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Ce fichier est chiffré. Saisis le code PIN qui l’a protégé, ou ton code de secours.
          </p>
          <div className="flex gap-1 rounded-xl border border-line bg-ink-800/60 p-1 text-sm">
            <button
              className={`flex-1 rounded-lg py-1.5 ${impMode === 'pin' ? 'bg-ink-700 text-slate-100' : 'text-slate-400'}`}
              onClick={() => {
                setImpMode('pin')
                setImpSecret('')
                setImpErr('')
              }}
            >
              Code PIN
            </button>
            <button
              className={`flex-1 rounded-lg py-1.5 ${impMode === 'recovery' ? 'bg-ink-700 text-slate-100' : 'text-slate-400'}`}
              onClick={() => {
                setImpMode('recovery')
                setImpSecret('')
                setImpErr('')
              }}
            >
              Code de secours
            </button>
          </div>
          {impMode === 'pin' ? (
            <PinInput value={impSecret} onChange={setImpSecret} autoFocus />
          ) : (
            <input
              className="field text-center font-mono tracking-widest"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={impSecret}
              autoFocus
              onChange={(e) => setImpSecret(e.target.value)}
            />
          )}
          {impErr && <p className="text-center text-sm text-coral-400">{impErr}</p>}
        </div>
      </Modal>
    </>
  )
}
