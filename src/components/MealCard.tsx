import type { Meal } from '@/types'
import { MEAL_LABELS, pct } from '@/types'

interface MealCardProps {
  meal: Meal
  onDelete?: (id: string) => void
  compact?: boolean
}

export function MealCard({ meal, onDelete, compact }: MealCardProps) {
  const time = new Date(meal.createdAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <article className="flex gap-3 rounded-3xl border border-border bg-surface p-3 shadow-card sm:p-4">
      {meal.imageThumb ? (
        <img
          src={meal.imageThumb}
          alt={meal.food}
          className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-xs font-semibold text-brand">
          AI
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{meal.food}</p>
            <p className="text-xs text-muted">
              {MEAL_LABELS[meal.mealType]} · {time} · {meal.grams}g
              {!compact && (
                <span className="text-brand"> · 신뢰도 {pct(meal.overallConfidence)}</span>
              )}
            </p>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(meal.id)
              }}
              className="shrink-0 text-xs text-muted hover:text-danger"
            >
              삭제
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-calories">{Math.round(meal.calories)} kcal</span>
          <span className="text-muted">
            P {Math.round(meal.protein)} · C {Math.round(meal.carbs)} · F {Math.round(meal.fat)}
          </span>
        </div>
      </div>
    </article>
  )
}
