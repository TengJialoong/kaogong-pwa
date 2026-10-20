import type { Subject, WeaknessCard } from '../types'

export interface ModuleTarget {
  id: string
  name: string
  target: number
  aliases: string[]
}

/** 四川省考行测各模块的经验目标线。申论/面试暂无统一合格线。 */
export const MODULE_TARGETS: ModuleTarget[] = [
  { id: 'ziliao', name: '资料分析', target: 85, aliases: ['资料分析', '资料'] },
  { id: 'panduan', name: '判断推理', target: 75, aliases: ['判断推理', '判断'] },
  { id: 'yanyu', name: '言语理解', target: 75, aliases: ['言语理解', '言语'] },
  { id: 'shuliang', name: '数量关系', target: 45, aliases: ['数量关系', '数量'] },
  { id: 'changshi', name: '常识判断', target: 60, aliases: ['常识判断', '常识'] },
]

export type AbilityStatus = 'no-data' | 'weak' | 'pass' | 'excellent' | 'reference'

export interface ModuleAbility {
  id: string
  subject: Subject
  module: string
  target: number | null
  total: number
  mastered: number
  rate: number
  status: AbilityStatus
}

function normalizeModuleName(name: string): string {
  return name.trim().replace(/\s+/g, '').replace(/[（(].*?[)）]/g, '')
}

export function matchModuleTarget(moduleName: string): ModuleTarget | null {
  const normalized = normalizeModuleName(moduleName)
  if (!normalized) return null

  // 先做全量精确匹配，避免「常识判断」因为结尾是「判断」而被误归到判断推理。
  const exact = MODULE_TARGETS.find((target) =>
    target.aliases.some((alias) => normalized === alias),
  )
  if (exact) return exact

  return (
    MODULE_TARGETS.find((target) =>
      target.aliases.some((alias) => normalized.startsWith(alias)),
    ) ?? null
  )
}

function statusFor(rate: number, target: number, total: number): AbilityStatus {
  if (total === 0) return 'no-data'
  if (rate < target) return 'weak'
  if (rate >= Math.min(100, target + 10)) return 'excellent'
  return 'pass'
}

export function computeTargetAbilities(cards: WeaknessCard[]): ModuleAbility[] {
  return MODULE_TARGETS.map((target) => {
    const moduleCards = cards.filter(
      (card) => card.subject === '行测' && matchModuleTarget(card.module)?.id === target.id,
    )
    const total = moduleCards.length
    const mastered = moduleCards.filter((card) => card.mastery >= 4).length
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 0
    return {
      id: target.id,
      subject: '行测' as const,
      module: target.name,
      target: target.target,
      total,
      mastered,
      rate,
      status: statusFor(rate, target.target, total),
    }
  })
}

/** 申论、面试，以及不在五个基准模块里的自定义行测模块。 */
export function computeOtherAbilities(cards: WeaknessCard[]): ModuleAbility[] {
  const groups = new Map<string, { subject: Subject; module: string; total: number; mastered: number }>()
  for (const card of cards) {
    const isTarget = card.subject === '行测' && Boolean(matchModuleTarget(card.module))
    if (isTarget) continue
    const key = `${card.subject}||${card.module}`
    const group = groups.get(key) ?? {
      subject: card.subject,
      module: card.module,
      total: 0,
      mastered: 0,
    }
    group.total += 1
    if (card.mastery >= 4) group.mastered += 1
    groups.set(key, group)
  }

  const subjectOrder: Record<Subject, number> = { 行测: 0, 申论: 1, 面试: 2 }
  return Array.from(groups.entries())
    .map(([key, group]) => ({
      id: key,
      subject: group.subject,
      module: group.module,
      target: null,
      total: group.total,
      mastered: group.mastered,
      rate: group.total > 0 ? Math.round((group.mastered / group.total) * 100) : 0,
      status: 'reference' as const,
    }))
    .sort((a, b) => {
      if (a.subject !== b.subject) return subjectOrder[a.subject] - subjectOrder[b.subject]
      if (a.rate !== b.rate) return a.rate - b.rate
      return b.total - a.total
    })
}

export interface LibraryMastery {
  total: number
  mastered: number
  rate: number
}

export function computeLibraryMastery(cards: WeaknessCard[]): LibraryMastery {
  const total = cards.length
  const mastered = cards.filter((card) => card.mastery >= 4).length
  return {
    total,
    mastered,
    rate: total > 0 ? Math.round((mastered / total) * 100) : 0,
  }
}

export interface ScoreTier {
  id: string
  min: number
  max: number | null
  rangeLabel: string
  description: string
  tone: 'red' | 'orange' | 'gold' | 'sage' | 'green' | 'deep'
}

export const SCORE_TIERS: ScoreTier[] = [
  {
    id: 'below-105',
    min: 0,
    max: 105,
    rangeLabel: '< 105 分',
    description: '未达基本门槛',
    tone: 'red',
  },
  {
    id: '105-120',
    min: 105,
    max: 120,
    rangeLabel: '105–120 分',
    description: '处于全省后段，竞争力较弱',
    tone: 'orange',
  },
  {
    id: '120-130',
    min: 120,
    max: 130,
    rangeLabel: '120–130 分',
    description: '接近平均进面线',
    tone: 'gold',
  },
  {
    id: '130-138',
    min: 130,
    max: 138,
    rangeLabel: '130–138 分',
    description: '达到平均进面线，普通岗位有力竞争者',
    tone: 'sage',
  },
  {
    id: '138-145',
    min: 138,
    max: 145,
    rangeLabel: '138–145 分',
    description: '全省前段，热门岗位突围区',
    tone: 'green',
  },
  {
    id: '145-plus',
    min: 145,
    max: null,
    rangeLabel: '145 分及以上',
    description: '全省顶尖，绝大多数岗位的安全区',
    tone: 'deep',
  },
]

export function getScoreTier(total: number): ScoreTier {
  return (
    SCORE_TIERS.find(
      (tier) => total >= tier.min && (tier.max === null || total < tier.max),
    ) ?? SCORE_TIERS[0]
  )
}

export const SCORE_DISCLAIMER =
  '数据基于四川省考历年平均进面分及竞争比估算，仅供参考。实际分数线受岗位限制、地区、报考人数影响巨大，请以官方公布为准。'

export const SCORE_INPUTS_STORAGE_KEY = 'lizhi.kaogong.scores.v1'

export interface ScoreInputs {
  xingce: string
  shenlun: string
}

export const EMPTY_SCORE_INPUTS: ScoreInputs = { xingce: '', shenlun: '' }

function inputString(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') return value.trim()
  return ''
}

export function loadScoreInputs(): ScoreInputs {
  try {
    const raw = localStorage.getItem(SCORE_INPUTS_STORAGE_KEY)
    if (!raw) return { ...EMPTY_SCORE_INPUTS }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      xingce: inputString(parsed.xingce),
      shenlun: inputString(parsed.shenlun),
    }
  } catch {
    return { ...EMPTY_SCORE_INPUTS }
  }
}

export function saveScoreInputs(inputs: ScoreInputs): void {
  try {
    localStorage.setItem(SCORE_INPUTS_STORAGE_KEY, JSON.stringify(inputs))
  } catch {
    // 估分只是辅助输入，不阻塞页面。
  }
}

export function parseScoreInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const score = Number(trimmed)
  if (!Number.isFinite(score) || score < 0 || score > 100) return null
  return score
}

export function formatScore(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
