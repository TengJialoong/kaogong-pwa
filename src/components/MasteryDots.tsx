import { MASTERY_LABELS } from '../data/constants'
import type { Mastery } from '../types'
import { cx } from '../lib/cx'

interface MasteryDotsProps {
  mastery: Mastery
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function MasteryDots({ mastery, showLabel = false, size = 'md' }: MasteryDotsProps) {
  return (
    <span className={cx('mastery', `mastery-${size}`)} title={`掌握度 ${mastery}/5`}>
      <span className="mastery-dots" data-level={mastery} aria-hidden>
        {[0, 1, 2, 3, 4].map((index) => (
          <span key={index} className={cx('mastery-dot', index < mastery && 'is-filled')} />
        ))}
      </span>
      {showLabel && (
        <span className="mastery-label">
          {mastery}/5 · {MASTERY_LABELS[mastery]}
        </span>
      )}
    </span>
  )
}
