export interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export const AI_CONFIG_STORAGE_KEY = 'lizhi.kaogong.ai.v1'
export const AI_CONFIG_EVENT = 'lizhi:ai-config-updated'

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-flash',
}

export interface VariantSource {
  subject: string
  module: string
  title: string
  correctApproach: string
  originalStem: string
}

export interface GeneratedVariant {
  stem: string
  options: string[]
  answer: string
  explanation: string
}

export type AiErrorCode = 'config' | 'network' | 'http' | 'parse' | 'timeout' | 'cancelled'

export class AiRequestError extends Error {
  readonly code: AiErrorCode
  readonly status?: number

  constructor(message: string, code: AiErrorCode, status?: number) {
    super(message)
    this.name = 'AiRequestError'
    this.code = code
    this.status = status
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      return record[key]
    }
  }
  return undefined
}

export function normalizeAiConfig(raw: unknown): AiConfig {
  const record = asRecord(raw)
  if (!record) return { ...DEFAULT_AI_CONFIG }
  const baseUrl = text(record.baseUrl).replace(/\/+$/, '') || DEFAULT_AI_CONFIG.baseUrl
  const model = text(record.model) || DEFAULT_AI_CONFIG.model
  const apiKey = typeof record.apiKey === 'string' ? record.apiKey.trim() : ''
  return { baseUrl, apiKey, model }
}

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_AI_CONFIG }
    return normalizeAiConfig(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_AI_CONFIG }
  }
}

export function saveAiConfig(config: AiConfig): void {
  localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(normalizeAiConfig(config)))
  window.dispatchEvent(new Event(AI_CONFIG_EVENT))
}

export function clearAiConfig(): void {
  try {
    localStorage.removeItem(AI_CONFIG_STORAGE_KEY)
  } catch {
    // 即使浏览器禁止写入 localStorage，也重置当前页面里的 AI 配置。
  } finally {
    window.dispatchEvent(new Event(AI_CONFIG_EVENT))
  }
}

export function isAiConfigured(config: AiConfig): boolean {
  return Boolean(config.baseUrl.trim() && config.apiKey.trim() && config.model.trim())
}

/** 返回给用户看的配置错误；合法时返回 null。API Key 可以为空，但无法生成。 */
export function validateAiConfig(config: AiConfig): string | null {
  const baseUrl = config.baseUrl.trim()
  if (!baseUrl) return '请填写 API Base URL。'
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return 'API Base URL 格式不正确，需要以 http:// 或 https:// 开头。'
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return 'API Base URL 只支持 http:// 或 https://。'
  }
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    url.protocol === 'http:' &&
    !['localhost', '127.0.0.1'].includes(url.hostname)
  ) {
    return '当前页面是 HTTPS，不能请求 HTTP 接口。请使用 HTTPS 的 Base URL。'
  }
  if (!config.model.trim()) return '请填写模型名称，例如 deepseek-flash。'
  return null
}

export function chatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
  if (/\/chat\/completions$/i.test(base)) return base
  return `${base}/chat/completions`
}

const SYSTEM_PROMPT =
  '你是一位资深四川省考命题老师，擅长根据考生的薄弱点命制同类型、同考点的高质量变式题。' +
  '你只能输出一个严格合法的 JSON 对象，不能输出 Markdown 代码围栏、解释性开场白或其他多余文字。'

export function buildVariantPrompt(source: VariantSource): string {
  const originalStem =
    source.originalStem.trim() ||
    '（原卡未关联习题，请根据知识点标题和正确思路自主命题。）'
  const approach = source.correctApproach.trim() || '（原卡未填写正确思路，请按该考点常规解法命题。）'
  return [
    '请基于下面这张考公弱项卡片，命制 1 道同类型变式题。',
    '',
    `科目：${source.subject}`,
    `模块：${source.module}`,
    `知识点标题：${source.title}`,
    `正确思路：${approach}`,
    `原题题干：${originalStem}`,
    '',
    '命题要求：',
    '1. 保持原题的考点、题型和解题思路，但必须更换情境、数字、材料或设问方式，不能照抄原题。',
    '2. 难度接近四川省考真题，题干完整，选项有干扰性，答案唯一且明确。',
    '3. 只返回 1 道题，不要返回多道题。',
    '4. 题干、选项和解析可以使用 Markdown（例如加粗、列表），但必须作为 JSON 字符串内容返回。',
    '5. 严格只输出下面结构的 JSON 对象，不要加代码围栏：',
    '{"stem":"题干","options":["选项A内容","选项B内容","选项C内容","选项D内容"],"answer":"B","explanation":"详细解析"}',
  ].join('\n')
}

function timeoutError(): AiRequestError {
  return new AiRequestError('请求超时（60 秒）。请检查网络，或换一个响应更快的模型。', 'timeout')
}

function retryableNetworkError(): AiRequestError {
  return new AiRequestError(
    '无法连接 AI 接口。请检查网络和 Base URL；如果浏览器控制台提示 CORS，说明该接口不允许网页跨域调用，需要换用支持 CORS 的接口或代理。',
    'network',
  )
}

function statusMessage(status: number, serverMessage: string): string {
  const base: Record<number, string> = {
    400: '请求参数有误，请检查模型名称和 Base URL',
    401: 'API Key 无效或已过期',
    402: '账户余额不足',
    403: '无权访问该模型，请检查 API Key 或模型权限',
    404: '接口路径或模型不存在，请检查 Base URL 是否包含 /v1',
    408: '接口请求超时',
    409: '接口请求冲突，请稍后重试',
    429: '请求过于频繁或额度受限，请稍后再试',
    500: 'AI 接口服务异常',
    502: 'AI 接口网关异常',
    503: 'AI 接口暂时不可用',
    504: 'AI 接口网关超时',
  }
  const label = base[status] ?? `接口返回 HTTP ${status}`
  const detail = serverMessage.trim().slice(0, 360)
  return detail ? `${label}：${detail}` : label
}

function extractMessageContent(payload: unknown): string {
  const root = asRecord(payload)
  if (!root) return ''
  const outputText = text(root.output_text)
  if (outputText) return outputText

  const choices = Array.isArray(root.choices) ? root.choices : []
  const firstChoice = asRecord(choices[0])
  if (!firstChoice) return ''
  const message = asRecord(firstChoice.message)
  if (!message) return text(firstChoice.text)

  const content = message.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        const record = asRecord(part)
        if (!record) return ''
        return text(record.text) || text(record.content)
      })
      .join('')
      .trim()
  }
  return ''
}

function extractJsonObject(raw: string): string {
  const textValue = raw.replace(/^\uFEFF/, '').trim()
  const fenced = textValue.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : textValue
  const start = candidate.indexOf('{')
  if (start < 0) throw new AiRequestError('模型没有返回 JSON 对象，请重试。', 'parse')

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < candidate.length; index += 1) {
    const char = candidate[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return candidate.slice(start, index + 1)
    }
  }
  throw new AiRequestError('模型返回的 JSON 不完整，请重试。', 'parse')
}

function cleanOption(value: string): string {
  return value
    .trim()
    .replace(/^[A-Fa-f][.、．:：)）]\s*/, '')
    .replace(/^["“]|["”]$/g, '')
    .trim()
}

function normalizeOptions(raw: unknown): string[] {
  let list: unknown[] = []
  if (Array.isArray(raw)) list = raw
  else if (typeof raw === 'string') list = raw.split(/\r?\n/)
  else if (asRecord(raw)) {
    list = Object.entries(asRecord(raw) ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
  } else {
    return []
  }
  return list
    .map((option) => {
      if (typeof option === 'string') return cleanOption(option)
      const record = asRecord(option)
      if (!record) return ''
      return cleanOption(text(pick(record, 'text', 'content', 'label')) || String(option))
    })
    .filter(Boolean)
    .slice(0, 8)
}

function normalizeAnswer(raw: unknown, options: string[]): string {
  const rawAnswer = text(raw).trim()
  if (!rawAnswer) return ''
  const direct = rawAnswer.match(/^([A-Fa-f])(?:[.、．:：)）\s]|$)/)
  if (direct) return direct[1].toUpperCase()
  const index = options.findIndex(
    (option) => option === rawAnswer || option.includes(rawAnswer) || rawAnswer.includes(option),
  )
  if (index >= 0) return String.fromCharCode(65 + index)
  return rawAnswer.slice(0, 30)
}

export function parseVariantContent(content: string): GeneratedVariant {
  const jsonText = extractJsonObject(content)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new AiRequestError('模型返回的内容不是有效 JSON，请重试。', 'parse')
  }
  const record = Array.isArray(parsed) ? asRecord(parsed[0]) : asRecord(parsed)
  if (!record) throw new AiRequestError('模型返回的 JSON 结构不正确。', 'parse')

  const stem = text(pick(record, 'stem', 'question', '题干', '题目')).slice(0, 6000)
  if (!stem) throw new AiRequestError('模型返回的变式题缺少题干。', 'parse')
  const options = normalizeOptions(pick(record, 'options', 'choices', '选项'))
  if (options.length < 2) throw new AiRequestError('模型返回的变式题缺少选项。', 'parse')
  const answer = normalizeAnswer(pick(record, 'answer', 'correctAnswer', '答案'), options)
  if (!answer) throw new AiRequestError('模型返回的变式题缺少答案。', 'parse')
  const explanation =
    text(pick(record, 'explanation', 'analysis', '解析')).slice(0, 6000) ||
    '（模型未提供解析，建议自己补全。）'

  return { stem, options, answer, explanation }
}

export async function generateVariant(
  source: VariantSource,
  config: AiConfig,
  signal?: AbortSignal,
): Promise<GeneratedVariant> {
  const validation = validateAiConfig(config)
  if (validation) throw new AiRequestError(validation, 'config')
  if (!config.apiKey.trim()) throw new AiRequestError('还没有填写 API Key。', 'config')
  if (signal?.aborted) throw new AiRequestError('已取消生成。', 'cancelled')

  const endpoint = chatCompletionsUrl(config.baseUrl)
  let endpointUrl: URL
  try {
    endpointUrl = new URL(endpoint)
  } catch {
    throw new AiRequestError('API 地址格式不正确。', 'config')
  }
  if (!['https:', 'http:'].includes(endpointUrl.protocol)) {
    throw new AiRequestError('API 地址只支持 http/https。', 'config')
  }

  const controller = new AbortController()
  let timedOut = false
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 60_000)
  const onExternalAbort = () => controller.abort()
  signal?.addEventListener('abort', onExternalAbort, { once: true })

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model.trim(),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildVariantPrompt(source) },
        ],
        temperature: 0.8,
        max_tokens: 1600,
        stream: false,
      }),
      signal: controller.signal,
    })

    const responseText = await response.text()
    if (!response.ok) {
      let serverMessage = ''
      try {
        const errorPayload = JSON.parse(responseText) as Record<string, unknown>
        const errorRecord = asRecord(errorPayload.error)
        serverMessage =
          text(errorRecord?.message) ||
          text(errorRecord?.type) ||
          text(errorPayload.message) ||
          responseText
      } catch {
        serverMessage = responseText
      }
      throw new AiRequestError(statusMessage(response.status, serverMessage), 'http', response.status)
    }

    let payload: unknown
    try {
      payload = JSON.parse(responseText)
    } catch {
      throw new AiRequestError('接口返回的内容不是有效 JSON。', 'parse')
    }
    const content = extractMessageContent(payload)
    if (!content) {
      throw new AiRequestError('模型返回了空内容，请重试或更换模型。', 'parse')
    }
    return parseVariantContent(content)
  } catch (error) {
    if (error instanceof AiRequestError) throw error
    if (timedOut) throw timeoutError()
    if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new AiRequestError('已取消生成。', 'cancelled')
    }
    throw retryableNetworkError()
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', onExternalAbort)
  }
}
