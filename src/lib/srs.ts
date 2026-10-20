import type { Mastery, ReviewGrade, WeaknessCard } from '../types'
import { addDays, toDateKey } from './date'

/**
 * 简化版 SM-2（只保留“掌握度 + 复习次数”两个变量，便于理解和手动修正）：
 *
 * 1. 新卡按掌握度决定首次复习：0/1 → 今天，2 → 明天，3 → 2 天后，
 *    4 → 4 天后，5 → 7 天后。
 * 2. 复习时：
 *    - 仍不会：掌握度 -1，1 天后再见；
 *    - 模糊：掌握度不变，间隔 = 基础间隔 × 1.35^复习次数；
 *    - 已掌握：掌握度 +1，间隔 = 基础间隔 × 1.6^复习次数。
 * 3. 基础间隔由掌握度决定：[1, 2, 4, 7, 14, 30] 天；
 *    并设置掌握度对应的最长间隔 [3, 7, 15, 30, 60, 120] 天，避免一次跳太远。
 *
 * 这不是严格的 SM-2 ease factor 实现，但保留了“答得好就拉长、答得差就缩短”的
 * 核心行为，同时让用户可以直接看懂和调整掌握度。
 */
export const BASE_INTERVAL_BY_MASTERY = [1, 2, 4, 7, 14, 30] as const
export const MAX_INTERVAL_BY_MASTERY = [3, 7, 15, 30, 60, 120] as const
export const INITIAL_DELAY_BY_MASTERY = [0, 0, 1, 2, 4, 7] as const

export function clampMastery(value: number): Mastery {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(5, Math.round(value))) as Mastery
}

export function initialNextReview(mastery: Mastery, today = toDateKey()): string {
  return addDays(today, INITIAL_DELAY_BY_MASTERY[mastery])
}

export interface ScheduleResult {
  mastery: Mastery
  intervalDays: number
  nextReviewAt: string
}

export function intervalFor(
  mastery: Mastery,
  previousReviewCount: number,
  grade: ReviewGrade,
): number {
  if (grade === 'again') return 1
  const reps = Math.max(0, Math.min(previousReviewCount, 6))
  const base = BASE_INTERVAL_BY_MASTERY[mastery]
  const multiplier = grade === 'good' ? Math.pow(1.6, reps) : Math.pow(1.35, reps)
  const cap = MAX_INTERVAL_BY_MASTERY[mastery]
  return Math.max(1, Math.min(cap, Math.round(base * multiplier)))
}

export function previewSchedule(
  card: Pick<WeaknessCard, 'mastery' | 'reviewCount'>,
  grade: ReviewGrade,
  today = toDateKey(),
): ScheduleResult {
  const mastery =
    grade === 'good'
      ? clampMastery(card.mastery + 1)
      : grade === 'again'
        ? clampMastery(card.mastery - 1)
        : card.mastery
  const intervalDays = intervalFor(mastery, card.reviewCount, grade)
  return {
    mastery,
    intervalDays,
    nextReviewAt: addDays(today, intervalDays),
  }
}

export function scheduleReview(
  card: WeaknessCard,
  grade: ReviewGrade,
  today = toDateKey(),
  now = new Date(),
): WeaknessCard {
  const schedule = previewSchedule(card, grade, today)
  return {
    ...card,
    mastery: schedule.mastery,
    nextReviewAt: schedule.nextReviewAt,
    reviewCount: card.reviewCount + 1,
    lastReviewedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
}

export function isDue(card: WeaknessCard, today = toDateKey()): boolean {
  return card.nextReviewAt <= today
}

export function getDueCards(cards: WeaknessCard[], today = toDateKey()): WeaknessCard[] {
  return cards
    .filter((card) => isDue(card, today))
    .sort((a, b) => {
      if (a.nextReviewAt !== b.nextReviewAt) return a.nextReviewAt.localeCompare(b.nextReviewAt)
      if (a.mastery !== b.mastery) return a.mastery - b.mastery
      return a.createdAt.localeCompare(b.createdAt)
    })
}

export function getNextUpcoming(
  cards: WeaknessCard[],
  today = toDateKey(),
): WeaknessCard | null {
  const upcoming = cards
    .filter((card) => card.nextReviewAt > today)
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
  return upcoming[0] ?? null
}
