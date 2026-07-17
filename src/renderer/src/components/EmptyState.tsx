import { ReactNode } from 'react'

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
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-800 text-gold-500">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      {hint && <p className="max-w-md text-sm text-slate-400">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
