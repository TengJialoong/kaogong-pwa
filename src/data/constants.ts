import type { Subject } from '../types'

export const SUBJECT_MODULES: Record<Subject, string[]> = {
  行测: ['言语理解', '判断推理', '资料分析', '数量关系', '常识判断'],
  申论: ['申论小题', '归纳概括', '综合分析', '提出对策', '贯彻执行', '大作文'],
  面试: ['结构化面试', '无领导小组', '综合分析', '组织管理', '应急应变', '人际关系', '情景模拟'],
}

export const ALL_MODULES = Array.from(new Set(Object.values(SUBJECT_MODULES).flat()))

export const MASTERY_LABELS = [
  '完全不会',
  '很陌生',
  '有印象',
  '半掌握',
  '较熟练',
  '已掌握',
] as const

export const MASTERY_HINTS = [
  '看到题就发怵，先记最基础的思路。',
  '听过方法，但独立做仍然卡壳。',
  '能认出考点，需要提示才能做对。',
  '基本能做对，速度和稳定性还不够。',
  '稳定做对，偶尔在变式上出错。',
  '已经形成条件反射，定期保温即可。',
] as const

export const GRADE_META = {
  again: {
    label: '仍不会',
    short: '不会',
    hint: '降低掌握度，明天再见面',
    tone: 'again',
  },
  hard: {
    label: '模糊',
    short: '模糊',
    hint: '保持掌握度，缩短间隔',
    tone: 'hard',
  },
  good: {
    label: '已掌握',
    short: '掌握',
    hint: '提高掌握度，拉长间隔',
    tone: 'good',
  },
} as const

export const TAG_SUGGESTIONS = [
  '高频',
  '易错',
  '计算',
  '逻辑',
  '审题',
  '时间分配',
  '四川特色',
  '省考真题',
  '待回看',
]
