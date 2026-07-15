const path = require('path')
const { analyzeFoodImage } = require(path.join(__dirname, '..', 'lib', 'visionAnalyze.cjs'))

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY가 설정되지 않았습니다. Vercel/로컬 환경변수를 확인하세요.',
    })
  }

  let body = {}
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {}
  } catch {
    return res.status(400).json({ error: '잘못된 JSON 본문입니다.' })
  }

  const image = body.image
  if (typeof image !== 'string' || !image.startsWith('data:image')) {
    return res.status(400).json({ error: 'data URL 형식의 이미지(image)가 필요합니다.' })
  }

  try {
    const { result, meta } = await analyzeFoodImage(apiKey, image, {
      model: body.model || process.env.OPENAI_VISION_MODEL || 'gpt-4o',
    })
    return res.status(200).json({ result, meta })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI 요청 실패'
    console.error('[api/vision]', message)
    return res.status(502).json({ error: message })
  }
}
