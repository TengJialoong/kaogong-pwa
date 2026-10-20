import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { PageId, ReviewGrade } from '../types'
import { useStore } from '../store'
import { useAiConfig } from '../hooks/useAiConfig'
import { GRADE_META } from '../data/constants'
import {
  addDays,
  formatDateCN,
  formatRelativeDate,
  toDateKey,
} from '../lib/date'
import { generateVariant, isAiConfigured, type GeneratedVariant } from '../lib/ai'
import { sanitizeTags, type CardDraft } from '../lib/model'
import { getDueCards, getNextUpcoming, previewSchedule } from '../lib/srs'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { MasteryDots } from '../components/MasteryDots'
import { SubjectBadge } from '../components/SubjectBadge'

interface ReviewPageProps {
  onNavigate: (page: PageId) => void
  onAdd: () => void
  notify: (text: string, tone?: 'success' | 'error' | 'info') => void
}

export function ReviewPage({ onNavigate, onAdd, notify }: ReviewPageProps) {
  const { cards, reviewCard, saveReviewNote, addCard } = useStore()
  const { config: aiConfig } = useAiConfig()
  const today = toDateKey()
  // 只在进入页面时生成一次队列；复习过程中卡片会变成未到期。
  const [initialQueue] = useState(() => getDueCards(cards, today).map((card) => card.id))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [note, setNote] = useState('')
  const [aiVariant, setAiVariant] = useState<GeneratedVariant | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSaved, setAiSaved] = useState(false)
  const gradingRef = useRef(false)
  const aiAbortRef = useRef<AbortController | null>(null)
  const aiSaveRef = useRef(false)
  const aiConfigured = isAiConfigured(aiConfig)

  const currentId = initialQueue[index]
  const current = cards.find((card) => card.id === currentId) ?? null
  const completed = initialQueue.length > 0 && index >= initialQueue.length
  const nextUpcoming = getNextUpcoming(cards, today)

  useEffect(() => {
    gradingRef.current = false
    setRevealed(false)
    setNote(current?.reviewNote ?? '')
    aiAbortRef.current?.abort()
    aiAbortRef.current = null
    aiSaveRef.current = false
    setAiVariant(null)
    setAiError(null)
    setAiLoading(false)
    setAiSaved(false)
    // 仅切换到下一张卡时重置；保存笔记不应把答案重新藏起来。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  useEffect(
    () => () => {
      aiAbortRef.current?.abort()
    },
    [],
  )

  const handleReveal = () => {
    setRevealed(true)
    window.setTimeout(() => {
      document.getElementById('review-answer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  const handleGrade = (grade: ReviewGrade) => {
    if (!current || gradingRef.current) return
    gradingRef.current = true
    const preview = previewSchedule(current, grade, today)
    const reviewed = reviewCard(current.id, grade, note)
    if (!reviewed) {
      gradingRef.current = false
      notify('这张卡片已不存在，请刷新页面。', 'error')
      return
    }
    notify(
      `已记录「${GRADE_META[grade].label}」· 下次 ${formatDateCN(preview.nextReviewAt, today)}（${preview.intervalDays} 天后）`,
    )
    setIndex((value) => value + 1)
    setRevealed(false)
    setNote('')
  }

  const handleSaveNote = () => {
    if (!current) return
    saveReviewNote(current.id, note)
    notify('复盘笔记已保存')
  }

  const handleGenerateAiVariant = async () => {
    if (!current || aiLoading) return
    if (!aiConfigured) {
      setAiError('还没有配置 AI 接口。请先在设置里填写 Base URL、API Key 和模型名。')
      return
    }

    aiAbortRef.current?.abort()
    const controller = new AbortController()
    aiAbortRef.current = controller
    aiSaveRef.current = false
    setAiLoading(true)
    setAiError(null)
    setAiVariant(null)
    setAiSaved(false)

    try {
      const variant = await generateVariant(
        {
          subject: current.subject,
          module: current.module,
          title: current.title,
          correctApproach: current.correctApproach,
          originalStem: current.exercise?.stem ?? '',
        },
        aiConfig,
        controller.signal,
      )
      if (!controller.signal.aborted) setAiVariant(variant)
    } catch (error) {
      if (!controller.signal.aborted) {
        setAiError(error instanceof Error ? error.message : '生成变式题失败，请稍后重试。')
      }
    } finally {
      if (aiAbortRef.current === controller) {
        aiAbortRef.current = null
        setAiLoading(false)
      }
    }
  }

  const handleCancelAi = () => {
    aiAbortRef.current?.abort()
    aiAbortRef.current = null
    setAiLoading(false)
    setAiError(null)
  }

  const handleSaveAiVariant = () => {
    if (!current || !aiVariant || aiSaved || aiSaveRef.current) return
    aiSaveRef.current = true
    const draft: CardDraft = {
      subject: current.subject,
      module: current.module,
      title: `AI变式：${current.title}`.slice(0, 120),
      errorReason: `由「${current.title}」生成的同类变式题，先独立完成，再对照答案检查是否真正掌握。`,
      correctApproach: current.correctApproach,
      exercise: {
        stem: aiVariant.stem,
        options: [...aiVariant.options],
        answer: aiVariant.answer,
        explanation: aiVariant.explanation,
      },
      tags: sanitizeTags(['AI变式', ...current.tags]),
      mastery: 0,
      nextReviewAt: addDays(toDateKey(), 1),
      reviewNote: `AI 变式题；来源知识点：${current.title}`,
    }
    const saved = addCard(draft)
    setAiSaved(true)
    notify(`已保存为新弱项「${saved.title}」，明天到期`)
  }

  if (initialQueue.length === 0) {
    return (
      <div className="page review-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">Review</span>
            <h1>今日复习</h1>
            <p className="page-lead">少量、多次，把「看懂了」变成「做对了」。</p>
          </div>
        </header>
        <div className="review-empty-panel">
          <EmptyState
            icon="check"
            title="今天没有到期卡片"
            description={
              nextUpcoming
                ? `下一张「${nextUpcoming.title}」将在 ${formatRelativeDate(nextUpcoming.nextReviewAt, today)}到期。`
                : '弱项库还是空的。先记录一个真实的错点，复习队列会自动出现。'
            }
            action={
              <>
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={onAdd}
                >
                  <Icon name="plus" size={16} />
                  新增弱项
                </button>
                <button
                  type="button"
                  className="button button-ghost button-small"
                  onClick={() => onNavigate('library')}
                >
                  去弱项库
                </button>
              </>
            }
          />
          <div className="review-empty-note">
            <Icon name="info" size={17} />
            <p>复习队列按到期日期和掌握度排序。到期卡片会出现在首页和底部导航的角标里。</p>
          </div>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="page review-page">
        <div className="complete-panel">
          <span className="complete-icon">
            <Icon name="check" size={32} />
          </span>
          <span className="eyebrow">Done for today</span>
          <h1>今日复习完成</h1>
          <p>
            刚刚复盘了 <strong>{initialQueue.length}</strong> 张弱项。系统已根据你的判断调整了下次复习日期。
          </p>
          <div className="complete-stats">
            <div>
              <span>本轮复习</span>
              <strong>{initialQueue.length}</strong>
              <small>张</small>
            </div>
            <div>
              <span>全库弱项</span>
              <strong>{cards.length}</strong>
              <small>张</small>
            </div>
            <div>
              <span>下一张到期</span>
              <strong className="complete-next">
                {nextUpcoming ? formatDateCN(nextUpcoming.nextReviewAt, today) : '暂无'}
              </strong>
              <small>{nextUpcoming ? formatRelativeDate(nextUpcoming.nextReviewAt, today) : '再新增一张'}</small>
            </div>
          </div>
          <div className="complete-actions">
            <button type="button" className="button button-primary" onClick={() => onNavigate('home')}>
              回到首页
            </button>
            <button type="button" className="button button-ghost" onClick={() => onNavigate('library')}>
              查看弱项库
            </button>
            <button type="button" className="button button-ghost" onClick={onAdd}>
              <Icon name="plus" size={17} />
              再记一张
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="page review-page">
        <EmptyState
          icon="alert"
          title="卡片读取失败"
          description="这张卡片可能已被删除。返回首页重新进入复习即可。"
          action={
            <button type="button" className="button button-primary button-small" onClick={() => onNavigate('home')}>
              回到首页
            </button>
          }
        />
      </div>
    )
  }

  const progress = Math.round((index / initialQueue.length) * 100)

  return (
    <div className="page review-page">
      <header className="review-header">
        <div>
          <span className="eyebrow">Review session</span>
          <h1>今日复习</h1>
        </div>
        <div className="review-progress-copy">
          <strong>
            {index + 1} <span>/ {initialQueue.length}</span>
          </strong>
          <small>已复习 {index} 张</small>
        </div>
      </header>
      <div
        className="review-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={initialQueue.length}
        aria-valuenow={index}
        aria-label="复习进度"
      >
        <span style={{ width: `${Math.max(progress, 2)}%` }} />
      </div>

      <article className="review-card">
        <div className="review-card-top">
          <div className="review-badges">
            <SubjectBadge subject={current.subject} />
            <span className="module-chip">{current.module}</span>
            {current.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>
          <span className="review-count-label">
            <Icon name="refresh" size={14} />
            第 {current.reviewCount + 1} 次复习
          </span>
        </div>

        <h2 className="review-title">{current.title}</h2>
        <div className="review-mastery-line">
          <MasteryDots mastery={current.mastery} showLabel />
          <span className="review-due">
            到期：{formatRelativeDate(current.nextReviewAt, today)}
          </span>
        </div>

        <section className="review-prompt">
          <span className="review-section-label">
            <Icon name="alert" size={15} />
            我的错误原因
          </span>
          <p>{current.errorReason || '这张卡还没有写错误原因。复习后可以补上。'}</p>
        </section>

        {current.exercise && (
          <section className="review-prompt review-exercise">
            <span className="review-section-label">
              <Icon name="book" size={15} />
              关联习题
            </span>
            <p className="review-exercise-stem">{current.exercise.stem || '（未填写题干）'}</p>
            {current.exercise.options.length > 0 && (
              <ol className="exercise-options">
                {current.exercise.options.map((option, optionIndex) => {
                  const letter = String.fromCharCode(65 + optionIndex)
                  const normalized = option.replace(/^[A-Da-d][.、．:：]\s*/, '')
                  return (
                    <li key={`${letter}-${option}`}>
                      <span className="option-letter">{letter}</span>
                      <span>{normalized}</span>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        )}

        <section className={`ai-panel${aiLoading ? ' is-loading' : ''}`} aria-busy={aiLoading}>
          <div className="ai-panel-head">
            <span className="ai-panel-icon">
              <Icon name="spark" size={18} />
            </span>
            <div className="ai-panel-copy">
              <strong>AI 变式训练</strong>
              <p>
                用当前知识点、正确思路{current.exercise ? '和原题题干' : ''}，生成 1 道同类型变式题。
              </p>
            </div>
            <span className={`ai-model-chip${aiConfigured ? ' is-ready' : ''}`}>
              {aiConfigured ? aiConfig.model : '未配置'}
            </span>
          </div>

          {!aiConfigured && (
            <div className="ai-config-required">
              <span>先在设置里配置 AI 接口，才能调用模型出题。</span>
              <button type="button" className="text-button" onClick={() => onNavigate('settings')}>
                去设置接口
                <Icon name="arrow-right" size={14} />
              </button>
            </div>
          )}

          {!aiVariant && !aiLoading && (
            <div className="ai-generate-row">
              <button
                type="button"
                className="button button-primary ai-generate-button"
                onClick={handleGenerateAiVariant}
                disabled={!aiConfigured}
              >
                <Icon name="spark" size={17} />
                AI 生成同类题
              </button>
              <span className="ai-generate-hint">
                {current.exercise
                  ? '会消耗你的 API 额度，通常需要几秒到十几秒'
                  : '原卡未关联习题，将仅按知识点和思路命题'}
              </span>
            </div>
          )}

          {aiLoading && (
            <div className="ai-loading" role="status" aria-live="polite">
              <span className="ai-spinner" aria-hidden />
              <div>
                <strong>AI 正在出题…</strong>
                <small>正在调用 {aiConfig.model}，可能需要几秒到十几秒</small>
              </div>
              <button type="button" className="text-button" onClick={handleCancelAi}>
                取消
              </button>
            </div>
          )}

          {aiError && (
            <div className="ai-error" role="alert">
              <Icon name="alert" size={18} />
              <div>
                <strong>没有生成成功</strong>
                <p>{aiError}</p>
                <button type="button" className="text-button" onClick={() => onNavigate('settings')}>
                  去检查 AI 配置
                  <Icon name="arrow-right" size={14} />
                </button>
              </div>
            </div>
          )}

          {aiVariant && (
            <div className="ai-variant-card">
              <div className="ai-variant-head">
                <span className="ai-variant-label">
                  <Icon name="spark" size={15} />
                  AI 变式题
                </span>
                <span className="ai-variant-source">基于「{current.title}」</span>
              </div>

              <div className="ai-markdown ai-stem">
                <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>
                  {aiVariant.stem}
                </ReactMarkdown>
              </div>

              <ol className="ai-options">
                {aiVariant.options.map((option, optionIndex) => {
                  const letter = String.fromCharCode(65 + optionIndex)
                  const isAnswer = aiVariant.answer.trim().toUpperCase().startsWith(letter)
                  return (
                    <li key={`${letter}-${option}`} className={isAnswer ? 'is-answer' : undefined}>
                      <span className="option-letter">{letter}</span>
                      <div className="ai-markdown ai-option-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>
                          {option}
                        </ReactMarkdown>
                      </div>
                      {isAnswer && <span className="answer-flag">答案</span>}
                    </li>
                  )
                })}
              </ol>

              <div className="ai-answer-banner">
                <span>答案</span>
                <strong>{aiVariant.answer}</strong>
              </div>

              <div className="ai-explanation">
                <span className="review-section-label">解析</span>
                <div className="ai-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>
                    {aiVariant.explanation}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="ai-variant-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={handleSaveAiVariant}
                  disabled={aiSaved}
                >
                  <Icon name={aiSaved ? 'check' : 'plus'} size={16} />
                  {aiSaved ? '已保存为新弱项' : '保存为新弱项'}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={handleGenerateAiVariant}
                  disabled={aiLoading}
                >
                  <Icon name="refresh" size={14} />
                  重新生成
                </button>
                {aiSaved && <span className="ai-saved-note">明天到期 · 掌握度 0</span>}
              </div>
            </div>
          )}
        </section>

        {!revealed ? (
          <div className="reveal-zone">
            <p>先在脑子里过一遍：正确思路是什么？下次怎么避免同样的错？</p>
            <button type="button" className="button button-primary reveal-button" onClick={handleReveal}>
              <Icon name="eye" size={18} />
              显示正确思路与答案
            </button>
          </div>
        ) : (
          <div className="review-reveal" id="review-answer">
            <section className="review-correct">
              <span className="review-section-label">
                <Icon name="spark" size={15} />
                正确思路
              </span>
              <p>{current.correctApproach || '还没有写正确思路。建议在编辑里补成可执行的步骤。'}</p>
            </section>

            {current.exercise && (current.exercise.answer || current.exercise.explanation) && (
              <section className="review-exercise-answer">
                <div className="answer-banner">
                  <span>答案</span>
                  <strong>{current.exercise.answer || '未填写'}</strong>
                </div>
                {current.exercise.explanation && (
                  <div className="answer-explanation">
                    <span className="review-section-label">解析</span>
                    <p>{current.exercise.explanation}</p>
                  </div>
                )}
              </section>
            )}

            <section className="review-note-editor">
              <div className="review-note-head">
                <span className="review-section-label">
                  <Icon name="edit" size={15} />
                  复盘笔记
                </span>
                <button type="button" className="text-button" onClick={handleSaveNote}>
                  保存笔记
                </button>
              </div>
              <textarea
                className="textarea"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="这次复习发现了什么？例如：公式记住了，但单位换算还是慢。"
                maxLength={2000}
              />
            </section>

            <section className="grade-zone">
              <div className="grade-heading">
                <span className="review-section-label">这次掌握得怎么样？</span>
                <small>选择后会自动安排下次复习</small>
              </div>
              <div className="grade-buttons">
                {(Object.keys(GRADE_META) as ReviewGrade[]).map((grade) => {
                  const preview = previewSchedule(current, grade, today)
                  return (
                    <button
                      key={grade}
                      type="button"
                      className={`grade-button grade-${grade}`}
                      onClick={() => handleGrade(grade)}
                    >
                      <span className="grade-label">{GRADE_META[grade].label}</span>
                      <span className="grade-hint">{GRADE_META[grade].hint}</span>
                      <span className="grade-next">
                        {preview.intervalDays === 1 ? '明天' : `${preview.intervalDays} 天后`} · 掌握度{' '}
                        {preview.mastery}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </article>

      <div className="review-footnote">
        <Icon name="info" size={16} />
        <p>
          这不是考试判分。诚实选择「仍不会 / 模糊 / 已掌握」，间隔才会真的适合你。
        </p>
      </div>
    </div>
  )
}
