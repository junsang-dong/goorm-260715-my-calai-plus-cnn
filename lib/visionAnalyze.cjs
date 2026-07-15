/**
 * Shared food-vision analysis (2-pass + Responses API with Chat Completions fallback).
 * Used by api/vision.js and scripts/dev-api.mjs
 */

const INGREDIENT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    grams: { type: 'number' },
    calories: { type: 'number' },
    protein: { type: 'number' },
    carbs: { type: 'number' },
    fat: { type: 'number' },
    confidence: { type: 'number' },
  },
  required: ['name', 'grams', 'calories', 'protein', 'carbs', 'fat', 'confidence'],
  additionalProperties: false,
}

const PASS1_SCHEMA = {
  type: 'object',
  properties: {
    food: { type: 'string' },
    mealType: {
      type: 'string',
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    },
    visibleItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          visualCue: { type: 'string' },
        },
        required: ['name', 'visualCue'],
        additionalProperties: false,
      },
    },
    plateContext: { type: 'string' },
    identificationConfidence: { type: 'number' },
  },
  required: [
    'food',
    'mealType',
    'visibleItems',
    'plateContext',
    'identificationConfidence',
  ],
  additionalProperties: false,
}

const PASS2_SCHEMA = {
  type: 'object',
  properties: {
    food: { type: 'string' },
    grams: { type: 'number' },
    calories: { type: 'number' },
    protein: { type: 'number' },
    fat: { type: 'number' },
    carbs: { type: 'number' },
    mealType: {
      type: 'string',
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    },
    ingredients: { type: 'array', items: INGREDIENT_SCHEMA },
    portionBasis: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
    uncertaintyNotes: { type: 'array', items: { type: 'string' } },
    identificationConfidence: { type: 'number' },
    portionConfidence: { type: 'number' },
    nutritionConfidence: { type: 'number' },
    overallConfidence: { type: 'number' },
  },
  required: [
    'food',
    'grams',
    'calories',
    'protein',
    'fat',
    'carbs',
    'mealType',
    'ingredients',
    'portionBasis',
    'assumptions',
    'uncertaintyNotes',
    'identificationConfidence',
    'portionConfidence',
    'nutritionConfidence',
    'overallConfidence',
  ],
  additionalProperties: false,
}

function clamp01(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return 0.5
  return Math.max(0, Math.min(1, x))
}

function normalizeResult(raw, pass1) {
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((ing) => ({
        name: String(ing.name || 'unknown'),
        grams: Number(ing.grams) || 0,
        calories: Number(ing.calories) || 0,
        protein: Number(ing.protein) || 0,
        carbs: Number(ing.carbs) || 0,
        fat: Number(ing.fat) || 0,
        confidence: clamp01(ing.confidence),
      }))
    : []

  const overall = clamp01(
    raw.overallConfidence ?? raw.nutritionConfidence ?? raw.portionConfidence ?? 0.5,
  )

  return {
    food: String(raw.food || pass1?.food || 'Unknown dish'),
    grams: Number(raw.grams) || 0,
    calories: Number(raw.calories) || 0,
    protein: Number(raw.protein) || 0,
    fat: Number(raw.fat) || 0,
    carbs: Number(raw.carbs) || 0,
    mealType: raw.mealType || pass1?.mealType || 'snack',
    ingredients,
    portionBasis: String(raw.portionBasis || ''),
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map(String) : [],
    uncertaintyNotes: Array.isArray(raw.uncertaintyNotes)
      ? raw.uncertaintyNotes.map(String)
      : [],
    identificationConfidence: clamp01(
      raw.identificationConfidence ?? pass1?.identificationConfidence ?? overall,
    ),
    portionConfidence: clamp01(raw.portionConfidence ?? overall),
    nutritionConfidence: clamp01(raw.nutritionConfidence ?? overall),
    overallConfidence: overall,
    confidence: overall,
  }
}

async function callResponses(apiKey, model, system, userParts, schema, schemaName) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: userParts.map((p) =>
            p.type === 'text'
              ? { type: 'input_text', text: p.text }
              : {
                  type: 'input_image',
                  image_url: p.image_url,
                  detail: p.detail || 'high',
                },
          ),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
      temperature: 0.2,
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    const err = new Error(payload?.error?.message || `Responses API ${response.status}`)
    err.status = response.status
    err.payload = payload
    throw err
  }

  let raw =
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content || [])
      ?.filter((c) => c.type === 'output_text')
      ?.map((c) => c.text)
      ?.join('') ||
    null

  if (!raw) {
    throw new Error('Responses API returned empty content')
  }

  return JSON.parse(raw)
}

async function callChatCompletions(apiKey, model, system, userParts, schema, schemaName) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: userParts.map((p) =>
            p.type === 'text'
              ? { type: 'text', text: p.text }
              : {
                  type: 'image_url',
                  image_url: { url: p.image_url, detail: p.detail || 'high' },
                },
          ),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
      temperature: 0.2,
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    const err = new Error(payload?.error?.message || `Chat Completions ${response.status}`)
    err.status = response.status
    err.payload = payload
    throw err
  }

  const raw = payload?.choices?.[0]?.message?.content
  if (!raw) throw new Error('Chat Completions returned empty content')
  return JSON.parse(raw)
}

async function structuredVision(apiKey, model, system, userParts, schema, schemaName) {
  try {
    return await callResponses(apiKey, model, system, userParts, schema, schemaName)
  } catch (primaryErr) {
    console.warn('[vision] Responses API failed, falling back to Chat Completions:', primaryErr.message)
    return callChatCompletions(apiKey, model, system, userParts, schema, schemaName)
  }
}

const PASS1_SYSTEM = `You are an expert food vision assistant (pass 1: identification only).
Identify the dish and each visible edible component.
Prefer Korean dish names when the food looks Korean.
Do NOT invent hidden ingredients you cannot see.
identificationConfidence must be 0..1 and honest: if lighting or blur is poor, keep it ≤ 0.6.
plateContext must mention plate/bowl size cues when visible.`

const PASS1_USER = `Pass 1 — Identify only.
Return every visible edible item with a short visualCue (color, shape, topping position).
Do not estimate calories yet.`

const PASS2_SYSTEM = `You are an expert nutrition vision assistant (pass 2: portion + macros).
Use the identification context AND the photo.
Estimate realistic grams and macros. Prefer Korean names when applicable.
REQUIRED:
- portionBasis: explain HOW you estimated weight (plate diameter cues, stack height, spoon size, etc.)
- assumptions: list explicit assumptions (oil amount, syrup thickness, cooking method…)
- uncertaintyNotes: what is uncertain and why
- field confidences 0..1: identificationConfidence, portionConfidence, nutritionConfidence, overallConfidence
Calibration rules:
- Do NOT output overallConfidence > 0.9 unless the portion is unusually clear.
- If syrup/sauce/oil amount is ambiguous, portionConfidence and nutritionConfidence should be ≤ 0.65.
- ingredients[].confidence is per-item recognition+portion certainty.
Totals (grams/calories/protein/carbs/fat) should approximately equal the sum of ingredients.`

/**
 * @param {string} apiKey
 * @param {string} imageDataUrl
 * @param {{ model?: string }} [opts]
 */
async function analyzeFoodImage(apiKey, imageDataUrl, opts = {}) {
  const model = opts.model || process.env.OPENAI_VISION_MODEL || 'gpt-4o'
  const imagePart = { type: 'image', image_url: imageDataUrl, detail: 'high' }

  const pass1 = await structuredVision(
    apiKey,
    model,
    PASS1_SYSTEM,
    [
      { type: 'text', text: PASS1_USER },
      imagePart,
    ],
    PASS1_SCHEMA,
    'food_identification',
  )

  const pass2User = `Pass 2 — Estimate nutrition for this meal.
Identification context (from pass 1):
${JSON.stringify(pass1)}

Using the photo + context above:
1) Estimate each ingredient grams + macros
2) Sum to dish totals
3) Always fill portionBasis, assumptions, uncertaintyNotes, and all confidence fields.`

  const pass2 = await structuredVision(
    apiKey,
    model,
    PASS2_SYSTEM,
    [
      { type: 'text', text: pass2User },
      imagePart,
    ],
    PASS2_SCHEMA,
    'food_nutrition_rich',
  )

  return {
    result: normalizeResult(pass2, pass1),
    meta: {
      model,
      pass: '2-pass',
      api: 'responses-with-chat-fallback',
    },
  }
}

module.exports = {
  analyzeFoodImage,
  PASS2_SCHEMA,
  normalizeResult,
}
