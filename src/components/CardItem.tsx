import type { WeaknessCard } from '../types'
import { formatRelativeDate, toDateKey } from '../lib/date'
import { MasteryDots } from './MasteryDots'
import { SubjectBadge } from './SubjectBadge'
import { Icon } from './Icon'

interface CardItemProps {
  card: WeaknessCard
  onOpen: (card: WeaknessCard) => void
  today?: string
}

export function CardItem({ card, onOpen, today = toDateKey() }: CardItemProps) {
  const isDue = card.nextReviewAt <= today
  const isOverdue = card.nextReviewAt < today
  const reason = card.errorReason || '还没有记录错误原因，点开补充复盘。'

  return (
    <article
      className={`weak-card${isDue ? ' is-due' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(card)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(card)
        }
      }}
      aria-label={`查看弱项：${card.title}`}
    >
      <div className="weak-card-top">
        <span className="weak-card-badges">
          <SubjectBadge subject={card.subject} />
          <span className="module-chip">{card.module}</span>
        </span>
        <span className={`review-pill${isDue ? ' is-due' : ''}${isOverdue ? ' is-overdue' : ''}`}>
          <Icon name="calendar" size={13} />
          {formatRelativeDate(card.nextReviewAt, today)}
        </span>
      </div>

      <h3 className="weak-card-title">{card.title}</h3>
      <p className="weak-card-reason">{reason}</p>

      {card.tags.length > 0 && (
        <div className="weak-card-tags">
          {card.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
          {card.tags.length > 4 && <span className="tag tag-more">+{card.tags.length - 4}</span>}
        </div>
      )}

      <div className="weak-card-foot">
        <MasteryDots mastery={card.mastery} size="sm" />
        <span className="weak-card-meta">
          复习 {card.reviewCount} 次
          {card.exercise ? ' · 含习题' : ''}
        </span>
      </div>
    </article>
  )
}
