import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ISO週の開始日（月曜日）を計算する
 * @param date 基準日（省略時は現在日時）
 * @returns ISO週の開始日（月曜日）のDateオブジェクト
 */
export function getISOWeekStart(date: Date = new Date()): Date {
  const monday = new Date(date)
  // ISO週の開始日計算: 日曜日(0)を正しく前の週として扱う
  const dayOfWeek = (date.getDay() + 6) % 7
  monday.setDate(date.getDate() - dayOfWeek)
  return monday
}

/**
 * ISO週の日付範囲（月曜日〜金曜日）を文字列配列で取得する
 * @param date 基準日（省略時は現在日時）
 * @returns ISO週の日付文字列配列（YYYY-MM-DD形式、月曜〜金曜）
 */
export function getISOWeekDates(date: Date = new Date()): string[] {
  const monday = getISOWeekStart(date)
  const weekDates: string[] = []
  
  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(monday)
    currentDate.setDate(monday.getDate() + i)
    weekDates.push(currentDate.toISOString().split('T')[0])
  }
  
  return weekDates
}
