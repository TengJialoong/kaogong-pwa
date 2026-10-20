import { useId, useMemo, useState, type FormEvent } from 'react'
import type { Exercise, Mastery, Subject, WeaknessCard } from '../types'
import { SUBJECTS } from '../types'
import {
  MASTERY_HINTS,
  MASTERY_LABELS,
  SUBJECT_MODULES,
  TAG_SUGGESTIONS,
} from '../data/constants'
import {
  draftFromCard,
  emptyDraft,
  sanitizeTags,
  type CardDraft,
} from '../lib/model'
import { initialNextReview } from '../lib/srs'
import { toDateKey } from '../lib/date'
import { Modal } from './Modal'
import { Icon } from './Icon'
import { useStore } from '../store'

interface CardEditorModalProps {
  card: WeaknessCard | null
  onClose: () => void
  onSaved: (card: WeaknessCard, isNew: boolean) => void
}

const BLANK_EXERCISE: Exercise = { stem: '', options: [], answer: '', explanation: '' }

export function CardEditorModal({ card, onClose, onSaved }: CardEditorModalProps) {
  const { addCard, updateCard } = useStore()
  const today = toDateKey()
  const moduleListId = useId()
  const [draft, setDraft] = useState<CardDraft>(() =>
    card ? draftFromCard(card) : emptyDraft(today),
  )
  const [tagsText, setTagsText] = useState(() => (card ? card.tags.join('，') : ''))
  const [exerciseEnabled, setExerciseEnabled] = useState(Boolean(card?.exercise))
  const [error, setError] = useState<string | null>(null)

  const moduleOptions = useMemo(() => SUBJECT_MODULES[draft.subject], [draft.subject])

  const patch = (partial: Partial<CardDraft>) => {
    setDraft((current) => ({ ...current, ...partial }))
    setError(null)
  }

  const changeSubject = (subject: Subject) => {
    setDraft((current) => {
      const modules = SUBJECT_MODULES[subject]
      return {
        ...current,
        subject,
        module: modules.includes(current.module) ? current.module : modules[0],
      }
    })
    setError(null)
  }

  const toggleExercise = (enabled: boolean) => {
    setExerciseEnabled(enabled)
    patch({
      exercise: enabled ? draft.exercise ?? { ...BLANK_EXERCISE, options: [] } : null,
    })
  }

  const patchExercise = (partial: Partial<Exercise>) => {
    setDraft((current) => ({
      ...current,
      exercise: { ...(current.exercise ?? BLANK_EXERCISE), ...partial },
    }))
    setError(null)
  }

  const addTag = (tag: string) => {
    const next = sanitizeTags([...sanitizeTags(tagsText), tag])
    setTagsText(next.join('，'))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      setError('请先填写知识点标题。')
      return
    }
    const payload: CardDraft = {
      ...draft,
      title: draft.title.trim(),
      tags: sanitizeTags(tagsText),
      exercise: exerciseEnabled ? draft.exercise : null,
    }
    const saved = card ? updateCard(card.id, payload) : addCard(payload)
    if (!saved) {
      setError('保存失败：没有找到要编辑的卡片。')
      return
    }
    onSaved(saved, !card)
  }

  return (
    <Modal
      title={card ? '编辑弱项' : '新增弱项'}
      eyebrow={card ? '把这道错题拆成可复习的卡片' : '记录一个具体的漏洞'}
      onClose={onClose}
      size="lg"
      className="editor-modal"
      footer={
        <>
          <button type="button" className="button button-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="card-editor-form" className="button button-primary">
            <Icon name="check" size={17} />
            {card ? '保存修改' : '加入弱项库'}
          </button>
        </>
      }
    >
      <form id="card-editor-form" className="editor-form" onSubmit={handleSubmit}>
        {error && (
          <div className="form-error" role="alert">
            <Icon name="alert" size={17} />
            {error}
          </div>
        )}

        <section className="form-section">
          <div className="form-section-heading">
            <span className="step-index">01</span>
            <div>
              <h3>定位漏洞</h3>
              <p>先写清楚是哪个科目、哪个模块的哪一个知识点。</p>
            </div>
          </div>

          <div className="field">
            <span className="field-label">科目</span>
            <div className="segmented" role="group" aria-label="选择科目">
              {SUBJECTS.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  className={`segment${draft.subject === subject ? ' is-active' : ''}`}
                  onClick={() => changeSubject(subject)}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>

          <div className="field-grid">
            <label className="field">
              <span className="field-label">模块</span>
              <input
                className="input"
                value={draft.module}
                onChange={(event) => patch({ module: event.target.value })}
                list={moduleListId}
                placeholder="选择或输入模块"
                maxLength={30}
              />
              <datalist id={moduleListId}>
                {moduleOptions.map((module) => (
                  <option key={module} value={module} />
                ))}
              </datalist>
              <span className="field-hint">可直接输入自定义模块</span>
            </label>

            <label className="field">
              <span className="field-label">
                知识点标题 <em>必填</em>
              </span>
              <input
                className="input"
                value={draft.title}
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="例如：基期比重计算把现期当基期"
                maxLength={120}
                autoFocus
                required
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">标签</span>
            <input
              className="input"
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="用逗号分隔，例如：高频，计算，易错"
              maxLength={160}
            />
            <span className="field-hint">标签会用于弱项库筛选，最多保留 12 个。</span>
            <span className="tag-suggestions">
              {TAG_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="tag-suggestion"
                  onClick={() => addTag(tag)}
                >
                  + {tag}
                </button>
              ))}
            </span>
          </label>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <span className="step-index">02</span>
            <div>
              <h3>复盘闭环</h3>
              <p>错误原因 → 正确思路。先写自己的卡点，再写可复用的步骤。</p>
            </div>
          </div>

          <label className="field">
            <span className="field-label">我的错误原因</span>
            <textarea
              className="textarea"
              rows={3}
              value={draft.errorReason}
              onChange={(event) => patch({ errorReason: event.target.value })}
              placeholder="我当时为什么错？是审题、公式、计算、还是思路方向？"
              maxLength={1000}
            />
          </label>

          <label className="field">
            <span className="field-label">正确思路</span>
            <textarea
              className="textarea"
              rows={4}
              value={draft.correctApproach}
              onChange={(event) => patch({ correctApproach: event.target.value })}
              placeholder="下次遇到同类题，按什么步骤做？只写能复用的动作。"
              maxLength={2000}
            />
          </label>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <span className="step-index">03</span>
            <div>
              <h3>关联习题</h3>
              <p>可选。建议放一道最典型的题，不要堆题。</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={exerciseEnabled}
                onChange={(event) => toggleExercise(event.target.checked)}
              />
              <span className="switch-track" aria-hidden />
              <span>{exerciseEnabled ? '已添加' : '添加'}</span>
            </label>
          </div>

          {exerciseEnabled ? (
            <div className="exercise-editor">
              <label className="field">
                <span className="field-label">题干</span>
                <textarea
                  className="textarea"
                  rows={3}
                  value={draft.exercise?.stem ?? ''}
                  onChange={(event) => patchExercise({ stem: event.target.value })}
                  placeholder="粘贴题干，保留关键条件即可。"
                  maxLength={2000}
                />
              </label>

              <label className="field">
                <span className="field-label">选项</span>
                <textarea
                  className="textarea textarea-mono"
                  rows={4}
                  value={(draft.exercise?.options ?? []).join('\n')}
                  onChange={(event) =>
                    patchExercise({
                      options: event.target.value.split(/\r?\n/).map((line) => line.trim()),
                    })
                  }
                  placeholder={'每行一个选项，例如：\nA. 集中\nB. 下沉\nC. 提升\nD. 聚集'}
                />
                <span className="field-hint">每行一个选项；留空则不显示选项。</span>
              </label>

              <div className="field-grid">
                <label className="field">
                  <span className="field-label">答案</span>
                  <input
                    className="input"
                    value={draft.exercise?.answer ?? ''}
                    onChange={(event) => patchExercise({ answer: event.target.value })}
                    placeholder="例如：B"
                    maxLength={200}
                  />
                </label>
                <label className="field">
                  <span className="field-label">解析</span>
                  <textarea
                    className="textarea"
                    rows={2}
                    value={draft.exercise?.explanation ?? ''}
                    onChange={(event) => patchExercise({ explanation: event.target.value })}
                    placeholder="为什么选它？其他选项错在哪？"
                    maxLength={2000}
                  />
                </label>
              </div>
            </div>
          ) : (
            <p className="field-hint no-exercise-hint">
              不给卡片关联习题也完全可以，复习时仍会走「错误原因 → 正确思路」。
            </p>
          )}
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <span className="step-index">04</span>
            <div>
              <h3>安排复习</h3>
              <p>掌握度越低，间隔越短。系统会按你的复习结果自动调整。</p>
            </div>
          </div>

          <div className="field">
            <span className="field-label">当前掌握度</span>
            <div className="mastery-picker" role="group" aria-label="选择掌握度">
              {MASTERY_LABELS.map((label, index) => {
                const value = index as Mastery
                return (
                  <button
                    key={label}
                    type="button"
                    className={`mastery-option${draft.mastery === value ? ' is-active' : ''}`}
                    data-level={value}
                    onClick={() => patch({ mastery: value })}
                  >
                    <span className="mastery-option-value">{value}</span>
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
            <span className="field-hint">{MASTERY_HINTS[draft.mastery]}</span>
          </div>

          <div className="field-grid">
            <label className="field">
              <span className="field-label">下次复习日期</span>
              <div className="input-with-action">
                <input
                  type="date"
                  className="input"
                  value={draft.nextReviewAt}
                  onChange={(event) => patch({ nextReviewAt: event.target.value })}
                  required
                />
                <button
                  type="button"
                  className="button button-small button-ghost"
                  onClick={() => patch({ nextReviewAt: initialNextReview(draft.mastery, today) })}
                >
                  重算
                </button>
              </div>
              <span className="field-hint">按掌握度推荐：{initialNextReview(draft.mastery, today)}</span>
            </label>

            <label className="field">
              <span className="field-label">复盘笔记</span>
              <textarea
                className="textarea"
                rows={3}
                value={draft.reviewNote}
                onChange={(event) => patch({ reviewNote: event.target.value })}
                placeholder="复习时可以继续补充，例如：第二次仍然错在单位换算。"
                maxLength={2000}
              />
            </label>
          </div>
        </section>
      </form>
    </Modal>
  )
}
