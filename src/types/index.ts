export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface IngredientEstimate {
  name: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: number
}

export interface VisionResult {
  food: string
  grams: number
  calories: number
  protein: number
  fat: number
  carbs: number
  mealType: MealType
  ingredients: IngredientEstimate[]
  portionBasis: string
  assumptions: string[]
  uncertaintyNotes: string[]
  identificationConfidence: number
  portionConfidence: number
  nutritionConfidence: number
  overallConfidence: number
  /** Alias of overallConfidence for backward compatibility */
  confidence: number
}

export interface Meal extends VisionResult {
  id: string
  imageThumb?: string
  createdAt: number
}

export interface DailyGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MacroTotals {
  calories: number
  protein: number
  fat: number
  carbs: number
}

export const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 120,
  carbs: 220,
  fat: 65,
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

export function confidenceLabel(value: number): string {
  if (value >= 0.75) return '높음'
  if (value >= 0.55) return '보통'
  return '낮음'
}

export function pct(value: number): string {
  return `${Math.round(clamp01(value) * 100)}%`
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/** Normalize older IndexedDB records that lack rich fields */
export function normalizeMealRecord(raw: Partial<Meal> & { id: string; createdAt: number }): Meal {
  const overall = clamp01(raw.overallConfidence ?? raw.confidence ?? 0.5)
  return {
    id: raw.id,
    createdAt: raw.createdAt,
    food: raw.food ?? '기록',
    grams: raw.grams ?? 0,
    calories: raw.calories ?? 0,
    protein: raw.protein ?? 0,
    fat: raw.fat ?? 0,
    carbs: raw.carbs ?? 0,
    mealType: raw.mealType ?? 'snack',
    imageThumb: raw.imageThumb,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    portionBasis: raw.portionBasis ?? '',
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
    uncertaintyNotes: Array.isArray(raw.uncertaintyNotes) ? raw.uncertaintyNotes : [],
    identificationConfidence: clamp01(raw.identificationConfidence ?? overall),
    portionConfidence: clamp01(raw.portionConfidence ?? overall),
    nutritionConfidence: clamp01(raw.nutritionConfidence ?? overall),
    overallConfidence: overall,
    confidence: overall,
  }
}
