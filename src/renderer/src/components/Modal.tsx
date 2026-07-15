import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Modal({ open, title, onClose, children, footer, width = 520 }: Props): JSX.Element {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="card relative z-10 w-full overflow-hidden"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-base font-semibold text-slate-100">{title}</h3>
              <button className="btn-subtle -mr-2 h-8 w-8 !px-0" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-line bg-ink-900/40 px-5 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
