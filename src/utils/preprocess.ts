/**
 * CNN-inspired image preprocessing for OpenAI Vision.
 * Applies resize → contrast → Sobel edge enhancement → light denoise.
 */

const MAX_SIDE = 1024
const EDGE_BLEND = 0.28
const CONTRAST = 1.25

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v))
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
    img.src = src
  })
}

function drawResized(img: HTMLImageElement): HTMLCanvasElement {
  let { width, height } = img
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  width = Math.round(width * scale)
  height = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas를 지원하지 않는 환경입니다.')
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

function applyContrast(data: Uint8ClampedArray, factor: number): void {
  const mid = 128
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(mid + (data[i] - mid) * factor)
    data[i + 1] = clamp(mid + (data[i + 1] - mid) * factor)
    data[i + 2] = clamp(mid + (data[i + 2] - mid) * factor)
  }
}

function grayAt(src: Uint8ClampedArray, w: number, x: number, y: number, h: number): number {
  const cx = Math.max(0, Math.min(w - 1, x))
  const cy = Math.max(0, Math.min(h - 1, y))
  const i = (cy * w + cx) * 4
  return 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]
}

/** Sobel edge magnitude → blend into RGB to emphasize dish/food boundaries */
function enhanceEdges(
  src: Uint8ClampedArray,
  dest: Uint8ClampedArray,
  w: number,
  h: number,
  blend: number,
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx =
        -grayAt(src, w, x - 1, y - 1, h) +
        grayAt(src, w, x + 1, y - 1, h) +
        -2 * grayAt(src, w, x - 1, y, h) +
        2 * grayAt(src, w, x + 1, y, h) +
        -grayAt(src, w, x - 1, y + 1, h) +
        grayAt(src, w, x + 1, y + 1, h)

      const gy =
        -grayAt(src, w, x - 1, y - 1, h) -
        2 * grayAt(src, w, x, y - 1, h) -
        grayAt(src, w, x + 1, y - 1, h) +
        grayAt(src, w, x - 1, y + 1, h) +
        2 * grayAt(src, w, x, y + 1, h) +
        grayAt(src, w, x + 1, y + 1, h)

      const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy))
      const i = (y * w + x) * 4
      dest[i] = clamp(src[i] * (1 - blend) + mag * blend)
      dest[i + 1] = clamp(src[i + 1] * (1 - blend) + mag * blend)
      dest[i + 2] = clamp(src[i + 2] * (1 - blend) + mag * blend)
      dest[i + 3] = src[i + 3]
    }
  }
}

/** 3×3 box blur — light noise reduction (pooling-like smoothing) */
function boxBlur(
  src: Uint8ClampedArray,
  dest: Uint8ClampedArray,
  w: number,
  h: number,
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = Math.max(0, Math.min(w - 1, x + dx))
          const cy = Math.max(0, Math.min(h - 1, y + dy))
          const i = (cy * w + cx) * 4
          r += src[i]
          g += src[i + 1]
          b += src[i + 2]
          n++
        }
      }
      const i = (y * w + x) * 4
      dest[i] = r / n
      dest[i + 1] = g / n
      dest[i + 2] = b / n
      dest[i + 3] = src[i + 3]
    }
  }
}

export interface PreprocessResult {
  dataUrl: string
  width: number
  height: number
}

export async function preprocessImage(fileOrDataUrl: File | string): Promise<PreprocessResult> {
  const src =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('파일 읽기 실패'))
          reader.readAsDataURL(fileOrDataUrl)
        })

  const img = await loadImage(src)
  const canvas = drawResized(img)
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width, height } = imageData

  applyContrast(data, CONTRAST)

  const edged = new Uint8ClampedArray(data.length)
  enhanceEdges(data, edged, width, height, EDGE_BLEND)

  const denoised = new Uint8ClampedArray(data.length)
  boxBlur(edged, denoised, width, height)

  // Mild residual original to keep color fidelity for food recognition
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(denoised[i] * 0.75 + data[i] * 0.25)
    data[i + 1] = clamp(denoised[i + 1] * 0.75 + data[i + 1] * 0.25)
    data[i + 2] = clamp(denoised[i + 2] * 0.75 + data[i + 2] * 0.25)
  }

  ctx.putImageData(imageData, 0, 0)
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.88),
    width,
    height,
  }
}

export async function makeThumbnail(dataUrl: string, maxSide = 160): Promise<string> {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.7)
}
