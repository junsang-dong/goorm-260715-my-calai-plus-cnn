import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const require = createRequire(import.meta.url)
const { analyzeFoodImage } = require(resolve(root, 'lib/visionAnalyze.cjs'))

function loadEnv() {
  const envPath = resolve(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    const key = trimmed.slice(0, i).trim()
    let value = trimmed.slice(i + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

function sendJson(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(body)
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}

async function handleVision(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return sendJson(res, 500, {
      error: 'OPENAI_API_KEY가 설정되지 않았습니다. .env를 확인하세요.',
    })
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    return sendJson(res, 400, { error: '잘못된 JSON 본문입니다.' })
  }

  const image = body.image
  if (typeof image !== 'string' || !image.startsWith('data:image')) {
    return sendJson(res, 400, { error: 'data URL 형식의 이미지(image)가 필요합니다.' })
  }

  try {
    const { result, meta } = await analyzeFoodImage(apiKey, image, {
      model: body.model || process.env.OPENAI_VISION_MODEL || 'gpt-4o',
    })
    return sendJson(res, 200, { result, meta })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI 요청 실패'
    console.error('[dev-api/vision]', message)
    return sendJson(res, 502, { error: message })
  }
}

const port = Number(process.env.API_PORT || 3000)

const server = createServer(async (req, res) => {
  const url = req.url?.split('?')[0]
  if (url === '/api/vision') {
    return handleVision(req, res)
  }
  sendJson(res, 404, { error: 'Not Found' })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`[dev-api] listening on http://127.0.0.1:${port}`)
})
