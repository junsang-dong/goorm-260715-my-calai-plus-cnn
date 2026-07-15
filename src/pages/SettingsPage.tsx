import { useEffect, useState, type FormEvent } from 'react'
import { useAppStore } from '@/store/appStore'
import type { DailyGoals } from '@/types'

export function SettingsPage() {
  const { goals, hydrate, updateGoals } = useAppStore()
  const [form, setForm] = useState<DailyGoals>(goals)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    setForm(goals)
  }, [goals])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await updateGoals(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 lg:mx-0">
      <div>
        <h2 className="font-display text-lg font-semibold">일일 목표</h2>
        <p className="mt-1 text-sm text-muted">목표는 이 기기의 IndexedDB에만 저장됩니다.</p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-3 rounded-[28px] border border-border bg-surface p-5 shadow-card sm:p-6"
      >
        {(
          [
            ['calories', '칼로리 (kcal)'],
            ['protein', '단백질 (g)'],
            ['carbs', '탄수화물 (g)'],
            ['fat', '지방 (g)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="text-muted">{label}</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-2xl border border-border bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
            />
          </label>
        ))}

        <button
          type="submit"
          className="mt-2 w-full rounded-[24px] bg-brand py-3 font-semibold text-bg hover:bg-brand-dark"
        >
          저장
        </button>
        {saved && <p className="text-center text-sm text-brand">저장되었습니다.</p>}
      </form>

      <p className="text-xs leading-relaxed text-muted">
        Vision 모델은 서버 환경변수 <code className="text-ink">OPENAI_VISION_MODEL</code>(기본{' '}
        <code className="text-ink">gpt-4o</code>)로 전환할 수 있으며, API는 Responses → Chat
        Completions 폴백과 2-pass 분석을 사용합니다.
      </p>
    </div>
  )
}
