import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useStore } from '../store'

const icons = {
  success: <CheckCircle2 size={18} className="text-mint-400" />,
  error: <XCircle size={18} className="text-coral-400" />,
  info: <Info size={18} className="text-sky-400" />
}

export function Toasts(): React.JSX.Element {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => dismiss(t.id)}
            className="card pointer-events-auto flex max-w-sm cursor-pointer items-center gap-3 px-4 py-3 text-sm"
          >
            {icons[t.tone]}
            <span className="text-slate-200">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
