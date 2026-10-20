import type { Subject } from '../types'

const TONE: Record<Subject, string> = {
  行测: 'hangce',
  申论: 'shenlun',
  面试: 'mianshi',
}

export function SubjectBadge({ subject }: { subject: Subject }) {
  return <span className={`subject-badge subject-${TONE[subject]}`}>{subject}</span>
}
