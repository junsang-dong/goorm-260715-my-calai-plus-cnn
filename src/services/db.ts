import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DailyGoals, Meal } from '@/types'
import { DEFAULT_GOALS, normalizeMealRecord } from '@/types'

interface CalAISchema extends DBSchema {
  meals: {
    key: string
    value: Meal
    indexes: { 'by-createdAt': number }
  }
  settings: {
    key: string
    value: DailyGoals
  }
}

const DB_NAME = 'my-cal-ai-plus'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<CalAISchema>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<CalAISchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meals')) {
          const store = db.createObjectStore('meals', { keyPath: 'id' })
          store.createIndex('by-createdAt', 'createdAt')
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings')
        }
      },
    })
  }
  return dbPromise
}

export async function addMeal(meal: Meal): Promise<void> {
  const db = await getDb()
  await db.put('meals', meal)
}

export async function deleteMeal(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('meals', id)
}

export async function getAllMeals(): Promise<Meal[]> {
  const db = await getDb()
  const meals = await db.getAllFromIndex('meals', 'by-createdAt')
  return meals.reverse().map((m) => normalizeMealRecord(m))
}

export async function getMealsForDay(day = new Date()): Promise<Meal[]> {
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(day)
  end.setHours(23, 59, 59, 999)
  const all = await getAllMeals()
  return all.filter((m) => m.createdAt >= start.getTime() && m.createdAt <= end.getTime())
}

export async function getGoals(): Promise<DailyGoals> {
  const db = await getDb()
  const goals = await db.get('settings', 'goals')
  return goals ?? { ...DEFAULT_GOALS }
}

export async function saveGoals(goals: DailyGoals): Promise<void> {
  const db = await getDb()
  await db.put('settings', goals, 'goals')
}
