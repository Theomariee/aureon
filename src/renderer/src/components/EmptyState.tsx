import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { easeOutQuint } from '../lib/motion'

export function EmptyState({
  icon,
  title,
  hint,
  action
}: {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}): React.JSX.Element {
  return (
    <motion.div
      className="card flex flex-col items-center gap-3 px-6 py-16 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOutQuint }}
    >
      <motion.div
        className="relative grid h-14 w-14 place-items-center rounded-2xl bg-ink-800 text-gold-500"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: easeOutQuint, delay: 0.08 }}
      >
        <span className="absolute inset-0 rounded-2xl bg-gold-500/10 blur-md" aria-hidden />
        <motion.span
          className="relative"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {icon}
        </motion.span>
      </motion.div>
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      {hint && <p className="max-w-md text-sm text-slate-400">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  )
}
