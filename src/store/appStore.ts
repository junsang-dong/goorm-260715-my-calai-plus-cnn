import { create } from 'zustand'
import type { DailyGoals, MacroTotals, Meal } from '@/types'
import { DEFAULT_GOALS } from '@/types'
import * as db from '@/services/db'

function sumMeals(meals: Meal[]): MacroTotals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  )
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

interface AppState {
  meals: Meal[]
  todayMeals: Meal[]
  todayTotals: MacroTotals
  goals: DailyGoals
  loading: boolean
  hydrate: () => Promise<void>
  addMeal: (meal: Meal) => Promise<void>
  removeMeal: (id: string) => Promise<void>
  updateGoals: (goals: DailyGoals) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  meals: [],
  todayMeals: [],
  todayTotals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
  goals: { ...DEFAULT_GOALS },
  loading: true,

  hydrate: async () => {
    set({ loading: true })
    const [meals, goals] = await Promise.all([db.getAllMeals(), db.getGoals()])
    const start = startOfToday()
    const todayMeals = meals.filter((m) => m.createdAt >= start)
    set({
      meals,
      todayMeals,
      todayTotals: sumMeals(todayMeals),
      goals,
      loading: false,
    })
  },

  addMeal: async (meal) => {
    await db.addMeal(meal)
    await get().hydrate()
  },

  removeMeal: async (id) => {
    await db.deleteMeal(id)
    await get().hydrate()
  },

  updateGoals: async (goals) => {
    await db.saveGoals(goals)
    set({ goals })
  },
}))
