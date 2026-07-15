import { useEffect, useState } from 'react'
import { MealCard } from '@/components/MealCard'
import { ConfidencePanel } from '@/components/ConfidencePanel'
import { useAppStore } from '@/store/appStore'
import type { Meal } from '@/types'

export function MealHistoryPage() {
  const { meals, loading, hydrate, removeMeal } = useAppStore()
  const [selected, setSelected] = useState<Meal | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    setSelected((current) => {
      if (!current) return null
      return meals.find((m) => m.id === current.id) ?? null
    })
  }, [meals])

  if (loading) {
    return <p className="text-muted">불러오는 중…</p>
  }

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6 xl:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Meal History</h2>
          <p className="mt-1 text-sm text-muted">
            IndexedDB에 로컬 저장된 식단입니다. 카드를 눌러 신뢰도·가정을 확인하세요.
          </p>
        </div>

        {meals.length === 0 ? (
          <p className="rounded-[24px] border border-dashed border-border bg-surface/60 p-5 text-sm text-muted">
            기록이 없습니다.
          </p>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {meals.map((meal) => (
              <div
                key={meal.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(meal)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelected(meal)
                }}
                className={[
                  'cursor-pointer rounded-3xl outline-none transition ring-offset-2 ring-offset-bg',
                  selected?.id === meal.id ? 'ring-2 ring-brand' : 'hover:opacity-95',
                ].join(' ')}
              >
                <MealCard
                  meal={meal}
                  onDelete={(id) => {
                    void removeMeal(id)
                    if (selected?.id === id) setSelected(null)
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        {selected ? (
          <ConfidencePanel
            identification={selected.identificationConfidence}
            portion={selected.portionConfidence}
            nutrition={selected.nutritionConfidence}
            overall={selected.overallConfidence}
            portionBasis={selected.portionBasis}
            assumptions={selected.assumptions}
            uncertaintyNotes={selected.uncertaintyNotes}
          />
        ) : (
          <p className="rounded-[24px] border border-border bg-surface p-5 text-sm text-muted">
            기록을 선택하면 상세 신뢰도가 여기에 표시됩니다.
          </p>
        )}
      </aside>

      {selected && (
        <div className="fixed inset-x-0 bottom-20 z-40 px-4 lg:hidden">
          <div className="mx-auto max-w-lg overflow-hidden rounded-[24px] border border-border bg-bg-elevated/95 shadow-card backdrop-blur">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium">{selected.food}</p>
              <button type="button" className="text-xs text-muted" onClick={() => setSelected(null)}>
                닫기
              </button>
            </div>
            <div className="max-h-[40vh] overflow-y-auto p-3">
              <ConfidencePanel
                identification={selected.identificationConfidence}
                portion={selected.portionConfidence}
                nutrition={selected.nutritionConfidence}
                overall={selected.overallConfidence}
                portionBasis={selected.portionBasis}
                assumptions={selected.assumptions}
                uncertaintyNotes={selected.uncertaintyNotes}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
