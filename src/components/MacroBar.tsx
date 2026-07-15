interface MacroBarProps {
  label: string
  value: number
  goal: number
  unit: string
  colorClass: string
}

export function MacroBar({ label, value, goal, unit, colorClass }: MacroBarProps) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-sm text-muted">
          {Math.round(value)}
          <span className="text-muted/70">
            {' '}
            / {goal}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
