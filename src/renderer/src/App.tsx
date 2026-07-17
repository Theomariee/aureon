import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
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
import { springSoft, viewTransition } from './lib/motion'
import { Toasts } from './components/Toasts'
import { LockScreen } from './components/LockScreen'
import { Onboarding } from './components/Onboarding'
import { TitleBar } from './components/TitleBar'
import { Modal } from './components/Modal'
import { PinSetup } from './components/PinSetup'
import { AppSkeleton } from './components/Skeleton'
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

export default function App(): React.JSX.Element {
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
  const mainRef = useRef<HTMLElement>(null)

  // Reset scroll to the top whenever the view changes.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [view])

  useEffect(() => {
    void init()
  }, [init])

  // Propose a PIN on the very first launch (skippable, shown once).
  useEffect(() => {
    if (loaded && !locked && !pinSet && localStorage.getItem('aureon.pinPrompted') !== '1') {
      setOnboarding(true)
    }
  }, [loaded, locked, pinSet])

  // Keyboard navigation: 1–6 switch tabs (ignored while typing or locked).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (locked || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable))
        return
      const idx = Number(e.key) - 1
      if (idx >= 0 && idx < NAV.length) setView(NAV[idx].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [locked, setView])

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

            <LayoutGroup>
              <nav className="flex flex-col gap-1">
                {NAV.map((item, i) => {
                  const Icon = item.icon
                  const active = view === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setView(item.id)}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        active ? 'text-slate-50' : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-xl bg-ink-800 shadow-card"
                          transition={springSoft}
                        />
                      )}
                      <Icon
                        size={18}
                        className={`relative z-10 transition-colors ${active ? 'text-gold-500' : ''}`}
                      />
                      <span className="relative z-10">{item.label}</span>
                      <span className="relative z-10 ml-auto flex items-center">
                        {item.id === 'entry' && reminder.show ? (
                          <span
                            className={`h-2 w-2 rounded-full ${
                              reminder.state === 'overdue' ? 'bg-coral-400' : 'bg-gold-400'
                            }`}
                            title={reminder.state === 'overdue' ? 'Saisie en retard' : 'Saisie à faire'}
                          />
                        ) : (
                          <kbd className="kbd opacity-0 transition-opacity group-hover:opacity-100">{i + 1}</kbd>
                        )}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </LayoutGroup>

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
          <main
            ref={mainRef}
            className={`relative flex-1 overflow-y-auto ${privacy ? 'privacy' : ''}`}
          >
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
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={viewTransition}
                  >
                    {view === 'dashboard' && <Dashboard />}
                    {view === 'entry' && <MonthlyEntry />}
                    {view === 'products' && <Products />}
                    {view === 'history' && <HistoryPage />}
                    {view === 'reporting' && <Reporting />}
                    {view === 'settings' && <SettingsPage />}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <AppSkeleton />
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
