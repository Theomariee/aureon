export function Skeleton({ className }: { className?: string }): React.JSX.Element {
  return <div className={`skeleton ${className ?? ''}`} />
}

/** Loading placeholder that mirrors the dashboard layout. */
export function AppSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56 rounded-lg" />
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56" />
        ))}
      </div>
    </div>
  )
}
