import type { Transition, Variants } from 'framer-motion'

/** Shared, restrained motion language (subtle & refined). */

export const easeOutQuint = [0.22, 1, 0.36, 1] as const

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.9
}

/** View / page transition — a gentle rise + fade. */
export const viewTransition: Transition = { duration: 0.32, ease: easeOutQuint }

/** Container that staggers its direct children on mount. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.02 }
  }
}

/** A single item that rises into place. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOutQuint } }
}
