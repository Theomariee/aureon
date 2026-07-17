import { useEffect, useState } from 'react'
import { Gem, Minus, X, Square } from 'lucide-react'

/** Restore glyph (two offset squares), used when the window is maximized. */
function RestoreIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1">
      <rect x="1.5" y="3.3" width="6.2" height="6.2" rx="1" />
      <path d="M3.8 3.3 V1.6 H10.3 V8.1 H8.6" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Custom, frameless title bar (Discord-style). Draggable, with in-app
 * minimize / maximize-restore / close controls on Windows & Linux. On macOS the
 * native traffic lights are kept, so we only reserve space for them.
 */
export function TitleBar(): JSX.Element {
  const isMac = window.api.platform === 'darwin'
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void window.api.windowIsMaximized().then(setMaximized)
    return window.api.onMaximizeChange(setMaximized)
  }, [])

  return (
    <div className="app-drag flex h-9 shrink-0 select-none items-center justify-between border-b border-line bg-ink-950/90">
      <div className={`flex items-center gap-2 px-3 ${isMac ? 'pl-[74px]' : ''}`}>
        <div className="grid h-4 w-4 place-items-center rounded bg-gold-grad text-ink-950">
          <Gem size={11} />
        </div>
        <span className="text-xs font-medium tracking-wide text-slate-400">Aureon</span>
      </div>

      {!isMac && (
        <div className="no-drag flex h-full">
          <button
            className="grid h-full w-12 place-items-center text-slate-400 transition hover:bg-ink-700/70 hover:text-slate-100"
            onClick={() => window.api.windowMinimize()}
            title="Réduire"
          >
            <Minus size={16} />
          </button>
          <button
            className="grid h-full w-12 place-items-center text-slate-400 transition hover:bg-ink-700/70 hover:text-slate-100"
            onClick={() => window.api.windowMaximizeToggle()}
            title={maximized ? 'Restaurer' : 'Agrandir'}
          >
            {maximized ? <RestoreIcon /> : <Square size={13} />}
          </button>
          <button
            className="grid h-full w-12 place-items-center text-slate-400 transition hover:bg-[#e5484d] hover:text-white"
            onClick={() => window.api.windowClose()}
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
