import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfidencePanel } from '@/components/ConfidencePanel'
import { preprocessImage, makeThumbnail } from '@/utils/preprocess'
import { analyzeFoodImage } from '@/services/vision'
import { useAppStore } from '@/store/appStore'
import type { Meal, MealType, VisionResult } from '@/types'
import { MEAL_LABELS, pct } from '@/types'

type Step = 'idle' | 'processing' | 'analyzing' | 'result'

export function FoodScanPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const addMeal = useAppStore((s) => s.addMeal)

  const [step, setStep] = useState<Step>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<VisionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onFile(file: File) {
    setError(null)
    setResult(null)
    setStep('processing')
    let nextPreview: string | null = null
    try {
      const processed = await preprocessImage(file)
      nextPreview = processed.dataUrl
      setPreview(processed.dataUrl)
      setStep('analyzing')
      const vision = await analyzeFoodImage(processed.dataUrl)
      setResult(vision)
      setStep('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.')
      setStep(nextPreview ? 'result' : 'idle')
    }
  }

  function updateField<K extends keyof VisionResult>(key: K, value: VisionResult[K]) {
    if (!result) return
    setResult({ ...result, [key]: value })
  }

  async function save() {
    if (!result || !preview) return
    setSaving(true)
    try {
      const thumb = await makeThumbnail(preview)
      const meal: Meal = {
        ...result,
        confidence: result.overallConfidence,
        id: crypto.randomUUID(),
        imageThumb: thumb,
        createdAt: Date.now(),
      }
      await addMeal(meal)
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 lg:mx-0 lg:max-w-none lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 xl:gap-8">
      <div className="space-y-5">
        <section className="rounded-[28px] border border-border bg-surface p-5 shadow-card sm:p-6">
          <h2 className="font-display text-lg font-semibold">AI Food Scan</h2>
          <p className="mt-1 text-sm text-muted">
            CNN 전처리 후 2-pass Vision 분석(인식 → 영양)으로 재료·신뢰도·가정을 함께 추정합니다.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onFile(file)
              e.target.value = ''
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={step === 'processing' || step === 'analyzing'}
            className="mt-4 w-full rounded-[24px] bg-brand py-3.5 font-semibold text-bg hover:bg-brand-dark disabled:opacity-60"
          >
            {step === 'processing'
              ? '이미지 전처리 중…'
              : step === 'analyzing'
                ? '2-pass Vision 분석 중…'
                : '사진 촬영 / 업로드'}
          </button>
        </section>

        {error && (
          <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {preview && (
          <section className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-card">
            <div className="relative">
              <img src={preview} alt="전처리된 음식" className="max-h-80 w-full object-cover" />
              {result?.ingredients?.length ? (
                <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
                  {result.ingredients.slice(0, 4).map((ing) => (
                    <span
                      key={`${ing.name}-${ing.calories}`}
                      className="rounded-full bg-bg/80 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur"
                    >
                      {ing.name} {Math.round(ing.calories)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <p className="px-4 py-2 text-xs text-muted">전처리된 미리보기 · Vision 입력</p>
          </section>
        )}
      </div>

      <div className="space-y-5">
        {result && step === 'result' && (
          <>
            <section className="space-y-4 rounded-[28px] border border-border bg-surface p-5 shadow-card sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">분석 결과</h3>
                  <p className="mt-1 text-xs text-muted">
                    종합 신뢰도 {pct(result.overallConfidence)} · 필요 시 수정 후 저장
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Calories', value: Math.round(result.calories), color: 'text-calories' },
                  { label: 'Carbs', value: `${Math.round(result.carbs)}g`, color: 'text-carbs' },
                  { label: 'Protein', value: `${Math.round(result.protein)}g`, color: 'text-protein' },
                  { label: 'Fats', value: `${Math.round(result.fat)}g`, color: 'text-fat' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-border bg-surface-2 px-3 py-3 text-center"
                  >
                    <p className="text-[11px] text-muted">{item.label}</p>
                    <p className={`mt-1 font-display text-lg font-semibold ${item.color}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <label className="block text-sm">
                <span className="text-muted">음식명</span>
                <input
                  className="mt-1 w-full rounded-2xl border border-border bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
                  value={result.food}
                  onChange={(e) => updateField('food', e.target.value)}
                />
              </label>

              <label className="block text-sm">
                <span className="text-muted">식사 유형</span>
                <select
                  className="mt-1 w-full rounded-2xl border border-border bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
                  value={result.mealType}
                  onChange={(e) => updateField('mealType', e.target.value as MealType)}
                >
                  {(Object.keys(MEAL_LABELS) as MealType[]).map((k) => (
                    <option key={k} value={k}>
                      {MEAL_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['grams', '중량 (g)'],
                    ['calories', '칼로리'],
                    ['protein', '단백질 (g)'],
                    ['carbs', '탄수화물 (g)'],
                    ['fat', '지방 (g)'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="text-muted">{label}</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-2xl border border-border bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
                      value={result[key]}
                      onChange={(e) => updateField(key, Number(e.target.value))}
                    />
                  </label>
                ))}
              </div>

              {result.ingredients.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-ink">재료별 추정</p>
                  <div className="space-y-2">
                    {result.ingredients.map((ing) => (
                      <div
                        key={`${ing.name}-${ing.grams}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{ing.name}</p>
                          <p className="text-xs text-muted">
                            {Math.round(ing.grams)}g · 신뢰도 {pct(ing.confidence)}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold text-calories">
                          {Math.round(ing.calories)} kcal
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="w-full rounded-[24px] bg-ink py-3.5 font-semibold text-bg disabled:opacity-60"
              >
                {saving ? '저장 중…' : '기록에 저장'}
              </button>
            </section>

            <ConfidencePanel
              identification={result.identificationConfidence}
              portion={result.portionConfidence}
              nutrition={result.nutritionConfidence}
              overall={result.overallConfidence}
              portionBasis={result.portionBasis}
              assumptions={result.assumptions}
              uncertaintyNotes={result.uncertaintyNotes}
            />
          </>
        )}
      </div>
    </div>
  )
}
