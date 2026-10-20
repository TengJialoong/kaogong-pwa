import type { ReactNode } from 'react'
import type { WeaknessCard } from '../types'
import { formatDateCN, formatDateTime, formatRelativeDate, toDateKey } from '../lib/date'
import { MASTERY_LABELS } from '../data/constants'
import { Modal } from './Modal'
import { Icon } from './Icon'
import { MasteryDots } from './MasteryDots'
import { SubjectBadge } from './SubjectBadge'

interface CardDetailModalProps {
  card: WeaknessCard
  onClose: () => void
  onEdit: (card: WeaknessCard) => void
  onDelete: (card: WeaknessCard) => void
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: 'alert' | 'spark' | 'book' | 'edit'
  children: ReactNode
}) {
  return (
    <section className="detail-section">
      <h3 className="detail-section-title">
        <Icon name={icon} size={16} />
        {title}
      </h3>
      {children}
    </section>
  )
}

export function CardDetailModal({ card, onClose, onEdit, onDelete }: CardDetailModalProps) {
  const today = toDateKey()
  return (
    <Modal
      title={card.title}
      eyebrow={
        <span className="detail-eyebrow">
          <SubjectBadge subject={card.subject} />
          <span className="module-chip">{card.module}</span>
        </span>
      }
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="button button-danger-ghost" onClick={() => onDelete(card)}>
            <Icon name="trash" size={17} />
            删除
          </button>
          <span className="footer-spacer" />
          <button type="button" className="button button-ghost" onClick={onClose}>
            关闭
          </button>
          <button type="button" className="button button-primary" onClick={() => onEdit(card)}>
            <Icon name="edit" size={17} />
            编辑
          </button>
        </>
      }
    >
      <div className="detail-meta-grid">
        <div className="detail-meta">
          <span className="meta-label">掌握度</span>
          <MasteryDots mastery={card.mastery} showLabel />
          <span className="meta-hint">{MASTERY_LABELS[card.mastery]}</span>
        </div>
        <div className="detail-meta">
          <span className="meta-label">下次复习</span>
          <strong>{formatDateCN(card.nextReviewAt, today)}</strong>
          <span className={`meta-hint${card.nextReviewAt <= today ? ' text-accent' : ''}`}>
            {formatRelativeDate(card.nextReviewAt, today)}
          </span>
        </div>
        <div className="detail-meta">
          <span className="meta-label">复习次数</span>
          <strong>{card.reviewCount} 次</strong>
          <span className="meta-hint">
            {card.lastReviewedAt ? `上次 ${formatDateTime(card.lastReviewedAt)}` : '尚未复习'}
          </span>
        </div>
        <div className="detail-meta">
          <span className="meta-label">创建时间</span>
          <strong>{formatDateTime(card.createdAt)}</strong>
          <span className="meta-hint">更新于 {formatDateTime(card.updatedAt)}</span>
        </div>
      </div>

      {card.tags.length > 0 && (
        <div className="detail-tags">
          {card.tags.map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <Section title="我的错误原因" icon="alert">
        <p className={card.errorReason ? 'detail-text' : 'detail-text is-empty'}>
          {card.errorReason || '尚未填写。复盘时先写清楚：为什么会错？'}
        </p>
      </Section>

      <Section title="正确思路" icon="spark">
        <p className={card.correctApproach ? 'detail-text' : 'detail-text is-empty'}>
          {card.correctApproach || '尚未填写。写下可复用的步骤，而不是只记答案。'}
        </p>
      </Section>

      <Section title="关联习题" icon="book">
        {card.exercise ? (
          <div className="exercise-box">
            <p className="exercise-stem">{card.exercise.stem || '（未填写题干）'}</p>
            {card.exercise.options.length > 0 && (
              <ol className="exercise-options">
                {card.exercise.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index)
                  const normalized = option.replace(/^[A-Da-d][.、．:：]\s*/, '')
                  const isAnswer = card.exercise?.answer
                    ? card.exercise.answer.trim().toUpperCase().startsWith(letter)
                    : false
                  return (
                    <li key={`${letter}-${option}`} className={isAnswer ? 'is-answer' : undefined}>
                      <span className="option-letter">{letter}</span>
                      <span>{normalized}</span>
                      {isAnswer && <span className="answer-flag">答案</span>}
                    </li>
                  )
                })}
              </ol>
            )}
            <div className="exercise-answer-row">
              <span className="exercise-answer-label">答案</span>
              <span>{card.exercise.answer || '未填写'}</span>
            </div>
            {card.exercise.explanation && (
              <div className="exercise-explanation">
                <span className="exercise-answer-label">解析</span>
                <p>{card.exercise.explanation}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="detail-text is-empty">没有关联习题。可在编辑时补一道典型题。</p>
        )}
      </Section>

      <Section title="复盘笔记" icon="edit">
        <p className={card.reviewNote ? 'detail-text' : 'detail-text is-empty'}>
          {card.reviewNote || '暂无复盘笔记。复习页可以直接补充。'}
        </p>
      </Section>
    </Modal>
  )
}
