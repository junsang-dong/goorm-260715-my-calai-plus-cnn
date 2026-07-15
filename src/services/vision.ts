import type { VisionResult } from '@/types'
import { normalizeMealRecord } from '@/types'

export async function analyzeFoodImage(imageDataUrl: string): Promise<VisionResult> {
  const res = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl }),
  })

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string
    result?: VisionResult
  }

  if (!res.ok) {
    throw new Error(payload.error ?? `분석 실패 (${res.status})`)
  }

  if (!payload.result) {
    throw new Error('분석 결과가 비어 있습니다.')
  }

  return normalizeMealRecord({
    ...payload.result,
    id: 'temp',
    createdAt: Date.now(),
  })
}
