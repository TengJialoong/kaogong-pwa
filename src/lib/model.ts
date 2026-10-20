import type {
  AppData,
  AppSettings,
  Exercise,
  Mastery,
  Subject,
  WeaknessCard,
} from '../types'
import { SUBJECTS } from '../types'
import { addDays, coerceDateKey, coerceIso, isDateKey, toDateKey } from './date'
import { makeId } from './id'
import { clampMastery, initialNextReview } from './srs'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      return record[key]
    }
  }
  return undefined
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function sanitizeTags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,，、;；]/)
      : []
  const tags = raw
    .map((tag) => String(tag).trim().replace(/^#/, ''))
    .filter(Boolean)
  return Array.from(new Set(tags)).slice(0, 12)
}

export function normalizeExercise(value: unknown): Exercise | null {
  if (value === null || value === undefined || value === '') return null
  const record = asRecord(value)
  if (!record) return null
  const stem = text(pick(record, 'stem', '题干', 'question'))
  const answer = text(pick(record, 'answer', '答案', 'correctAnswer'))
  const explanation = text(pick(record, 'explanation', '解析', 'analysis'))
  const rawOptions = pick(record, 'options', '选项', 'choices')
  const options = Array.isArray(rawOptions)
    ? rawOptions.map((option) => String(option).trim()).filter(Boolean)
    : typeof rawOptions === 'string'
      ? rawOptions
          .split(/\r?\n/)
          .map((option) => option.trim())
          .filter(Boolean)
      : []
  if (!stem && options.length === 0 && !answer && !explanation) return null
  return { stem, options, answer, explanation }
}

export function normalizeCard(raw: unknown, index?: number): WeaknessCard {
  const label = index === undefined ? '卡片' : `第 ${index + 1} 条`
  const record = asRecord(raw)
  if (!record) throw new Error(`${label}不是有效的 JSON 对象`)

  const title = text(pick(record, 'title', '知识点标题', '标题', 'name'))
  if (!title) throw new Error(`${label}缺少知识点标题（title）`)

  const rawSubject = text(pick(record, 'subject', '科目'))
  if (!SUBJECTS.includes(rawSubject as Subject)) {
    throw new Error(`${label}的科目必须是「行测」「申论」「面试」之一`)
  }
  const subject = rawSubject as Subject
  const module = text(pick(record, 'module', '模块')) || '未分类'
  const mastery = clampMastery(Number(pick(record, 'mastery', '掌握度') ?? 0))
  const createdAt = coerceIso(pick(record, 'createdAt', '创建日期'), new Date().toISOString())
  const nextReviewRaw = pick(record, 'nextReviewAt', '下次复习日期', 'nextReview')
  const nextReviewAt =
    typeof nextReviewRaw === 'string' && isDateKey(nextReviewRaw)
      ? nextReviewRaw
      : coerceDateKey(nextReviewRaw, initialNextReview(mastery))
  const reviewCountRaw = Number(pick(record, 'reviewCount', '复习次数') ?? 0)
  const reviewCount = Number.isFinite(reviewCountRaw)
    ? Math.max(0, Math.floor(reviewCountRaw))
    : 0
  const lastReviewedRaw = pick(record, 'lastReviewedAt', '上次复习日期')
  let lastReviewedAt: string | null = null
  if (typeof lastReviewedRaw === 'string' && lastReviewedRaw.trim()) {
    const parsedLastReviewed = new Date(lastReviewedRaw.trim())
    lastReviewedAt = Number.isNaN(parsedLastReviewed.getTime())
      ? null
      : parsedLastReviewed.toISOString()
  }
  const id = text(pick(record, 'id', 'ID')) || makeId()

  return {
    id,
    subject,
    module,
    title,
    errorReason: text(pick(record, 'errorReason', '错误原因', '我的错误原因')),
    correctApproach: text(pick(record, 'correctApproach', '正确思路')),
    exercise: normalizeExercise(pick(record, 'exercise', '关联习题')),
    tags: sanitizeTags(pick(record, 'tags', '标签')),
    mastery,
    createdAt,
    nextReviewAt,
    reviewCount,
    lastReviewedAt,
    reviewNote: text(pick(record, 'reviewNote', '复盘笔记', 'notes', 'note')),
    updatedAt: coerceIso(pick(record, 'updatedAt', '更新日期'), createdAt),
  }
}

export interface CardDraft {
  subject: Subject
  module: string
  title: string
  errorReason: string
  correctApproach: string
  exercise: Exercise | null
  tags: string[]
  mastery: Mastery
  nextReviewAt: string
  reviewNote: string
}

export function emptyDraft(today = toDateKey()): CardDraft {
  return {
    subject: '行测',
    module: '言语理解',
    title: '',
    errorReason: '',
    correctApproach: '',
    exercise: null,
    tags: [],
    mastery: 1,
    nextReviewAt: initialNextReview(1, today),
    reviewNote: '',
  }
}

export function draftFromCard(card: WeaknessCard): CardDraft {
  return {
    subject: card.subject,
    module: card.module,
    title: card.title,
    errorReason: card.errorReason,
    correctApproach: card.correctApproach,
    exercise: card.exercise
      ? {
          stem: card.exercise.stem,
          options: [...card.exercise.options],
          answer: card.exercise.answer,
          explanation: card.exercise.explanation,
        }
      : null,
    tags: [...card.tags],
    mastery: card.mastery,
    nextReviewAt: card.nextReviewAt,
    reviewNote: card.reviewNote,
  }
}

export function saveDraft(
  draft: CardDraft,
  existing?: WeaknessCard,
  now = new Date(),
): WeaknessCard {
  const timestamp = now.toISOString()
  return {
    id: existing?.id ?? makeId(),
    subject: draft.subject,
    module: draft.module.trim() || '未分类',
    title: draft.title.trim(),
    errorReason: draft.errorReason.trim(),
    correctApproach: draft.correctApproach.trim(),
    exercise: normalizeExercise(draft.exercise),
    tags: sanitizeTags(draft.tags),
    mastery: clampMastery(draft.mastery),
    createdAt: existing?.createdAt ?? timestamp,
    nextReviewAt: isDateKey(draft.nextReviewAt)
      ? draft.nextReviewAt
      : initialNextReview(draft.mastery),
    reviewCount: existing?.reviewCount ?? 0,
    lastReviewedAt: existing?.lastReviewedAt ?? null,
    reviewNote: draft.reviewNote.trim(),
    updatedAt: timestamp,
  }
}

export function defaultSettings(today = toDateKey()): AppSettings {
  return {
    examDate: addDays(today, 90),
    lastImportAt: null,
  }
}

export function normalizeSettings(raw: unknown, today = toDateKey()): AppSettings {
  const record = asRecord(raw)
  if (!record) return defaultSettings(today)
  return {
    examDate: coerceDateKey(
      pick(record, 'examDate', '考试日期'),
      defaultSettings(today).examDate,
    ),
    lastImportAt:
      typeof record.lastImportAt === 'string' && record.lastImportAt.trim()
        ? coerceIso(record.lastImportAt)
        : null,
  }
}

export function createEmptyData(today = toDateKey()): AppData {
  return {
    schemaVersion: 1,
    cards: [],
    settings: defaultSettings(today),
  }
}

export function normalizeStoredData(raw: unknown): AppData {
  const today = toDateKey()
  const record = asRecord(raw)
  if (!record) return createEmptyData(today)
  const rawCards = Array.isArray(record.cards) ? record.cards : []
  const cards: WeaknessCard[] = []
  for (const rawCard of rawCards) {
    try {
      cards.push(normalizeCard(rawCard))
    } catch {
      // 单条损坏不阻塞整个本地数据读取。
    }
  }
  return {
    schemaVersion: 1,
    cards,
    settings: normalizeSettings(record.settings, today),
  }
}
