import { confidenceLabel, pct } from '@/types'

interface ConfidencePanelProps {
  identification: number
  portion: number
  nutrition: number
  overall: number
  portionBasis?: string
  assumptions?: string[]
  uncertaintyNotes?: string[]
}

function Meter({ label, value }: { label: string; value: number }) {
  const width = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-ink">
          {pct(value)} · {confidenceLabel(value)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function ConfidencePanel({
  identification,
  portion,
  nutrition,
  overall,
  portionBasis,
  assumptions = [],
  uncertaintyNotes = [],
}: ConfidencePanelProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-border bg-surface-2 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold sm:text-base">분석 신뢰도</h3>
        <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
          종합 {pct(overall)}
        </span>
      </div>

      <div className="space-y-3">
        <Meter label="음식 인식" value={identification} />
        <Meter label="중량 추정" value={portion} />
        <Meter label="영양 추정" value={nutrition} />
      </div>

      {portionBasis && (
        <div>
          <p className="text-xs font-medium text-muted">추정 근거</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/90">{portionBasis}</p>
        </div>
      )}

      {assumptions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-warn">가정</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink/85">
            {assumptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {uncertaintyNotes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-danger">주의 / 불확실성</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink/85">
            {uncertaintyNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
