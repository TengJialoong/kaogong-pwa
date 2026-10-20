export const SUBJECTS = ['行测', '申论', '面试'] as const
export type Subject = (typeof SUBJECTS)[number]

export type Mastery = 0 | 1 | 2 | 3 | 4 | 5

export type ReviewGrade = 'again' | 'hard' | 'good'

export interface Exercise {
  stem: string
  options: string[]
  answer: string
  explanation: string
}

export interface WeaknessCard {
  id: string
  subject: Subject
  module: string
  title: string
  /** 我的错误原因 */
  errorReason: string
  /** 正确思路 */
  correctApproach: string
  /** 关联习题，可为空 */
  exercise: Exercise | null
  tags: string[]
  mastery: Mastery
  /** ISO 时间戳 */
  createdAt: string
  /** 本地日期 YYYY-MM-DD */
  nextReviewAt: string
  reviewCount: number
  lastReviewedAt: string | null
  /** 复盘笔记 */
  reviewNote: string
  /** ISO 时间戳，用于合并时判断新旧 */
  updatedAt: string
}

export interface AppSettings {
  /** 本地日期 YYYY-MM-DD */
  examDate: string
  lastImportAt: string | null
}

export interface AppData {
  schemaVersion: 1
  cards: WeaknessCard[]
  settings: AppSettings
}

export interface ExportEnvelope extends AppData {
  app: 'lizhi-kaogong-weakness'
  exportedAt: string
}

export interface ImportSummary {
  added: number
  updated: number
  skipped: number
  total: number
}

export type PageId = 'home' | 'dashboard' | 'library' | 'review' | 'data' | 'settings'
