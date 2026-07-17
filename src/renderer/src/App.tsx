import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  PencilLine,
  Boxes,
  History,
  BarChart3,
  Settings,
  Gem,
  Eye,
  EyeOff,
  KeyRound,
  X
} from 'lucide-react'
import { useStore } from './store'
import { entryReminder } from '../../shared/domain'
import { Toasts } from './components/Toasts'
import { LockScreen } from './components/LockScreen'
import { Onboarding } from './components/Onboarding'
import { TitleBar } from './components/TitleBar'
import { Modal } from './components/Modal'
import { PinSetup } from './components/PinSetup'
import { Dashboard } from './pages/Dashboard'
import { MonthlyEntry } from './pages/MonthlyEntry'
import { Products } from './pages/Products'
import { HistoryPage } from './pages/History'
import { Reporting } from './pages/Reporting'
import { SettingsPage } from './pages/Settings'

const NAV = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'entry', label: 'Saisie mensuelle', icon: PencilLine },
  { id: 'products', label: 'Produits', icon: Boxes },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'reporting', label: 'Reporting', icon: BarChart3 },
  { id: 'settings', label: 'Réglages', icon: Settings }
] as const

export default function App(): JSX.Element {
  const {
    db,
    view,
    setView,
    init,
    loaded,
    locked,
    pinSet,
    privacy,
    togglePrivacy,
    recoveredViaCode,
    clearRecoveryFlag
  } = useStore((s) => ({
    db: s.db,
    view: s.view,
    setView: s.setView,
    init: s.init,
    loaded: s.loaded,
    locked: s.locked,
    pinSet: s.pinSet,
    privacy: s.privacy,
    togglePrivacy: s.togglePrivacy,
    recoveredViaCode: s.recoveredViaCode,
    clearRecoveryFlag: s.clearRecoveryFlag
  }))

  const reminder = entryReminder(db)

  const [onboarding, setOnboarding] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    void init()
  }, [init])

  // Propose a PIN on the very first launch (skippable, shown once).
  useEffect(() => {
    if (loaded && !locked && !pinSet && localStorage.getItem('aureon.pinPrompted') !== '1') {
      setOnboarding(true)
    }
  }, [loaded, locked, pinSet])

  const closeOnboarding = (): void => {
    localStorage.setItem('aureon.pinPrompted', '1')
    setOnboarding(false)
  }

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      {loaded && locked ? (
        <div className="min-h-0 flex-1">
          <LockScreen />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-line bg-ink-900/60 px-3 py-5">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-grad text-ink-950 shadow-glow">
            <Gem size={20} />
          </div>
          <div>
            <div className="text-lg font-bold leading-none tracking-tight">Aureon</div>
            <div className="text-[11px] text-slate-500">Suivi de patrimoine</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <div
                key={item.id}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => setView(item.id)}
              >
                <Icon size={18} className={active ? 'text-gold-500' : ''} />
                {item.label}
                {item.id === 'entry' && reminder.show && (
                  <span
                    className={`ml-auto h-2 w-2 rounded-full ${
                      reminder.state === 'overdue' ? 'bg-coral-400' : 'bg-gold-400'
                    }`}
                    title={reminder.state === 'overdue' ? 'Saisie en retard' : 'Saisie à faire'}
                  />
                )}
              </div>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-ink-800/50 hover:text-slate-300"
            onClick={togglePrivacy}
            title="Masquer / afficher les montants"
          >
            {privacy ? <Eye size={15} /> : <EyeOff size={15} />}
            {privacy ? 'Afficher les montants' : 'Masquer les montants'}
          </button>
          <div className="px-2 text-[11px] leading-relaxed text-slate-600">
            Données stockées localement.<br />Aucun serveur distant.
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className={`relative flex-1 overflow-y-auto ${privacy ? 'privacy' : ''}`}>
        <div className="mx-auto max-w-6xl px-8 py-8">
          {recoveredViaCode && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3">
              <KeyRound size={18} className="shrink-0 text-gold-400" />
              <div className="flex-1 text-sm text-slate-200">
                <b>Tu es entré avec ton code de secours.</b>
                <span className="text-slate-400">
                  {' '}
                  Définis un nouveau code PIN pour re-sécuriser ton accès.
                </span>
              </div>
              <button className="btn-primary h-8 !px-3 text-xs" onClick={() => setResetOpen(true)}>
                Définir un nouveau PIN
              </button>
              <button
                className="btn-subtle h-8 w-8 !px-0"
                onClick={clearRecoveryFlag}
                title="Plus tard"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loaded ? (
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {view === 'dashboard' && <Dashboard />}
              {view === 'entry' && <MonthlyEntry />}
              {view === 'products' && <Products />}
              {view === 'history' && <HistoryPage />}
              {view === 'reporting' && <Reporting />}
              {view === 'settings' && <SettingsPage />}
            </motion.div>
          ) : (
            <div className="grid h-[60vh] place-items-center text-slate-500">Chargement…</div>
          )}
        </div>
      </main>
        </div>
      )}

      <Onboarding open={onboarding} onClose={closeOnboarding} />
      <Modal
        open={resetOpen}
        title="Réinitialiser le code PIN"
        onClose={() => setResetOpen(false)}
        width={480}
      >
        <PinSetup
          variant="reset"
          onComplete={() => {
            setResetOpen(false)
            clearRecoveryFlag()
          }}
        />
      </Modal>
      <Toasts />
    </div>
  )
}
