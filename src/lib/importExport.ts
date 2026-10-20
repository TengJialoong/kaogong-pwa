import type {
  AppData,
  AppSettings,
  ExportEnvelope,
  ImportSummary,
  WeaknessCard,
} from '../types'
import { addDays, toDateKey } from '../lib/date'
import { normalizeCard, normalizeSettings, sanitizeTags } from '../lib/model'

export const APP_EXPORT_ID = 'lizhi-kaogong-weakness'

export interface ParsedImport {
  cards: WeaknessCard[]
  settings: AppSettings | null
  exportedAt: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function parseImportPayload(rawText: string): ParsedImport {
  const text = rawText.replace(/^\uFEFF/, '').trim()
  if (!text) throw new Error('粘贴内容为空。请先粘贴 JSON 数组或导出的 JSON 文件内容。')

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : '格式错误'
    throw new Error(`JSON 解析失败：${detail}`)
  }

  let rawCards: unknown[]
  let rawSettings: unknown = null
  let exportedAt: string | null = null

  if (Array.isArray(parsed)) {
    rawCards = parsed
  } else {
    const envelope = asRecord(parsed)
    if (!envelope) throw new Error('JSON 顶层必须是数组，或包含 cards 数组的对象。')
    if (!Array.isArray(envelope.cards)) {
      throw new Error('没有找到 cards 数组。请使用弱项卡片数组或本应用导出的 JSON。')
    }
    rawCards = envelope.cards
    rawSettings = envelope.settings ?? null
    exportedAt = typeof envelope.exportedAt === 'string' ? envelope.exportedAt : null
  }

  if (rawCards.length === 0) {
    throw new Error('JSON 中没有卡片。若想清空数据，请到「设置」使用清空功能。')
  }

  const cards = rawCards.map((raw, index) => normalizeCard(raw, index))
  const uniqueCards = Array.from(new Map(cards.map((card) => [card.id, card])).values())

  return {
    cards: uniqueCards,
    settings: rawSettings ? normalizeSettings(rawSettings) : null,
    exportedAt,
  }
}

export type ImportMode = 'merge' | 'overwrite'

export interface ImportResult {
  data: AppData
  summary: ImportSummary
}

export function applyImport(
  current: AppData,
  parsed: ParsedImport,
  mode: ImportMode,
  now = new Date(),
): ImportResult {
  const nowIso = now.toISOString()

  if (mode === 'overwrite') {
    const settings = parsed.settings
      ? { ...parsed.settings, lastImportAt: nowIso }
      : { ...current.settings, lastImportAt: nowIso }
    return {
      data: {
        schemaVersion: 1,
        cards: parsed.cards,
        settings,
      },
      summary: {
        added: parsed.cards.length,
        updated: 0,
        skipped: 0,
        total: parsed.cards.length,
      },
    }
  }

  const existingById = new Map(current.cards.map((card) => [card.id, card]))
  let added = 0
  let updated = 0
  let skipped = 0

  for (const incoming of parsed.cards) {
    const existing = existingById.get(incoming.id)
    if (!existing) {
      existingById.set(incoming.id, incoming)
      added += 1
      continue
    }
    // 同一张卡以 updatedAt 更新的一方为准，避免旧设备覆盖新笔记。
    if (incoming.updatedAt > existing.updatedAt) {
      existingById.set(incoming.id, incoming)
      updated += 1
    } else {
      skipped += 1
    }
  }

  return {
    data: {
      schemaVersion: 1,
      cards: Array.from(existingById.values()),
      settings: {
        ...current.settings,
        examDate: parsed.settings?.examDate ?? current.settings.examDate,
        lastImportAt: nowIso,
      },
    },
    summary: {
      added,
      updated,
      skipped,
      total: parsed.cards.length,
    },
  }
}

export function buildExportEnvelope(data: AppData, now = new Date()): ExportEnvelope {
  return {
    app: APP_EXPORT_ID,
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    cards: data.cards,
    settings: data.settings,
  }
}

export function exportFileName(now = new Date()): string {
  return `lizhi-weakness-${toDateKey(now)}.json`
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  textarea.remove()
  if (!ok) throw new Error('当前浏览器不支持自动复制，请手动全选复制。')
}

export const JSON_TEMPLATE = `[
  {
    "subject": "行测",
    "module": "资料分析",
    "title": "知识点标题（必填）",
    "errorReason": "我的错误原因",
    "correctApproach": "正确思路 / 可复用的解题步骤",
    "exercise": {
      "stem": "题干……",
      "options": ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"],
      "answer": "B",
      "explanation": "解析……"
    },
    "tags": ["高频", "易错"],
    "mastery": 2,
    "createdAt": "2026-10-20T09:00:00.000Z",
    "nextReviewAt": "2026-10-21",
    "reviewCount": 0,
    "lastReviewedAt": null,
    "reviewNote": ""
  }
]`

export interface SampleCardInput {
  id: string
  subject: '行测' | '申论' | '面试'
  module: string
  title: string
  errorReason: string
  correctApproach: string
  exercise: {
    stem: string
    options: string[]
    answer: string
    explanation: string
  } | null
  tags: string[]
  mastery: number
  createdAt: string
  nextReviewAt: string
  reviewCount: number
  lastReviewedAt: string | null
  reviewNote: string
  updatedAt: string
}

export function buildSampleCards(today = toDateKey()): SampleCardInput[] {
  const createdAt = new Date(Date.now() - 5 * 86_400_000).toISOString()
  const recentReviewAt = new Date(Date.now() - 2 * 86_400_000).toISOString()
  return [
    {
      id: 'sample-yanyu-01',
      subject: '行测',
      module: '言语理解',
      title: '逻辑填空只看词语搭配，忽略上下文的解释照应',
      errorReason:
        '看到“提升”就选“提高”，没有回看横线后的解释句，忽略了文段在说“补齐短板”。',
      correctApproach:
        '先找横线附近的解释、并列或转折标志；再用“语境义优先于固定搭配”排除。最后把选项代回原句读一遍。',
      exercise: {
        stem: '公共文化服务不能只建“高大上”的地标，更要补齐基层的短板，让文化资源真正____到群众身边。',
        options: ['A. 集中', 'B. 下沉', 'C. 提升', 'D. 聚集'],
        answer: 'B',
        explanation:
          '横线前有“补齐基层短板”“到群众身边”，强调资源向基层流动；“下沉”最贴合语境。C 项“提升”与“到群众身边”不搭配。',
      },
      tags: ['高频', '语境照应', '易错'],
      mastery: 1,
      createdAt,
      nextReviewAt: today,
      reviewCount: 2,
      lastReviewedAt: recentReviewAt,
      reviewNote: '复盘时强制自己圈出横线后的解释句，再动选项。',
      updatedAt: createdAt,
    },
    {
      id: 'sample-shenlun-01',
      subject: '申论',
      module: '归纳概括',
      title: '要点合并过度，漏掉并列采分点',
      errorReason:
        '为了写得“简洁”，把“资金、人才、技术”三类问题合成一句“要素保障不足”，导致每个采分点都没展开。',
      correctApproach:
        '先按材料段落逐条列点，再合并同类项；合并时保留不同维度的关键词。每个要点尽量用“核心词 + 具体表现”表达。',
      exercise: null,
      tags: ['采分点', '归纳概括', '省考真题'],
      mastery: 2,
      createdAt,
      nextReviewAt: addDays(today, 2),
      reviewCount: 1,
      lastReviewedAt: createdAt,
      reviewNote: '',
      updatedAt: createdAt,
    },
    {
      id: 'sample-mianshi-01',
      subject: '面试',
      module: '综合分析',
      title: '消极社会现象只谈危害，缺少原因与对策',
      errorReason:
        '答题结构变成“表态 + 危害 + 结尾”，原因分析只有一句“监管不到位”，对策也很空。',
      correctApproach:
        '用“表态—影响—原因（思想/制度/监管/技术）—对策（主体 + 动作 + 目的）—升华”的五段式，每个原因后面跟一条对应措施。',
      exercise: null,
      tags: ['结构化面试', '答题结构'],
      mastery: 1,
      createdAt,
      nextReviewAt: addDays(today, 5),
      reviewCount: 0,
      lastReviewedAt: null,
      reviewNote: '',
      updatedAt: createdAt,
    },
  ]
}

export function buildSampleImport(today = toDateKey()): SampleCardInput[] {
  return buildSampleCards(today).map((card) => ({
    ...card,
    tags: sanitizeTags(card.tags),
  }))
}

export function sampleJson(today = toDateKey()): string {
  return JSON.stringify(buildSampleImport(today), null, 2)
}
