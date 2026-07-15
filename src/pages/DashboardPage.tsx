import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MacroBar } from '@/components/MacroBar'
import { MealCard } from '@/components/MealCard'
import { useAppStore } from '@/store/appStore'

function ringStyle(pct: number) {
  const p = Math.max(0, Math.min(100, pct))
  return {
    background: `conic-gradient(var(--color-brand) ${p * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
  }
}

export function DashboardPage() {
  const { todayTotals, todayMeals, goals, loading, hydrate, removeMeal } = useAppStore()

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (loading) {
    return <p className="text-muted">불러오는 중…</p>
  }

  const remaining = Math.max(0, goals.calories - todayTotals.calories)
  const usedPct =
    goals.calories > 0 ? Math.min(100, Math.round((todayTotals.calories / goals.calories) * 100)) : 0

  return (
    <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 xl:gap-8">
      <div className="space-y-5">
        <section className="rounded-[28px] border border-border bg-surface p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-5 sm:gap-6">
            <div
              className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full sm:h-28 sm:w-28"
              style={ringStyle(usedPct)}
            >
              <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-surface text-center">
                <span className="text-xs text-muted">남음</span>
                <span className="font-display text-lg font-semibold text-brand sm:text-xl">
                  {Math.round(remaining)}
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted">오늘의 칼로리</p>
              <div className="mt-1 flex flex-wrap items-end gap-2">
                <span className="font-display text-4xl font-semibold tracking-tight text-calories sm:text-5xl">
                  {Math.round(todayTotals.calories)}
                </span>
                <span className="mb-1 text-muted">/ {goals.calories} kcal</span>
              </div>
              <p className="mt-2 text-sm text-brand">약 {Math.round(remaining)} kcal 남음</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-5">
            <MacroBar
              label="단백질"
              value={todayTotals.protein}
              goal={goals.protein}
              unit="g"
              colorClass="bg-protein"
            />
            <MacroBar
              label="탄수화물"
              value={todayTotals.carbs}
              goal={goals.carbs}
              unit="g"
              colorClass="bg-carbs"
            />
            <MacroBar
              label="지방"
              value={todayTotals.fat}
              goal={goals.fat}
              unit="g"
              colorClass="bg-fat"
            />
          </div>
        </section>

        <Link
          to="/scan"
          className="flex items-center justify-center rounded-[24px] bg-brand px-4 py-4 font-semibold text-bg shadow-card transition hover:bg-brand-dark"
        >
          음식 사진 스캔하기
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">오늘 기록</h2>
          <span className="text-xs text-muted">{todayMeals.length}건</span>
        </div>
        {todayMeals.length === 0 ? (
          <p className="rounded-[24px] border border-dashed border-border bg-surface/60 p-5 text-sm text-muted">
            아직 기록이 없습니다. 사진을 올려 AI가 재료·영양·신뢰도를 분석하게 해 보세요.
          </p>
        ) : (
          <div className="space-y-3">
            {todayMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onDelete={(id) => void removeMeal(id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
