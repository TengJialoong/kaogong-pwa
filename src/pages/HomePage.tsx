import type { PageId, Subject } from '../types'
import { SUBJECTS } from '../types'
import { useStore } from '../store'
import { daysBetween, formatDateCN, formatRelativeDate, toDateKey } from '../lib/date'
import { getDueCards, getNextUpcoming } from '../lib/srs'
import { EmptyState } from '../components/EmptyState'
import { Icon, type IconName } from '../components/Icon'
import { MasteryDots } from '../components/MasteryDots'
import { SubjectBadge } from '../components/SubjectBadge'

const LOOP_STEPS: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'alert', title: '错误原因', text: '诚实记录当时的卡点' },
  { icon: 'spark', title: '正确思路', text: '写成下次能照着做的步骤' },
  { icon: 'book', title: '关联习题', text: '一道典型题即可，可选' },
  { icon: 'edit', title: '复盘笔记', text: '复习后继续修正' },
]

interface HomePageProps {
  onNavigate: (page: PageId) => void
  onAdd: () => void
  notify: (text: string, tone?: 'success' | 'error' | 'info') => void
}

export function HomePage({ onNavigate, onAdd, notify }: HomePageProps) {
  const { cards, settings, loadSamples } = useStore()
  const today = toDateKey()
  const dueCards = getDueCards(cards, today)
  const nextUpcoming = getNextUpcoming(cards, today)
  const lowMastery = cards.filter((card) => card.mastery <= 2)
  const totalReviews = cards.reduce((total, card) => total + card.reviewCount, 0)
  const examDays = daysBetween(today, settings.examDate)
  const examPassed = examDays < 0

  const subjectStats = SUBJECTS.map((subject) => {
    const subjectCards = cards.filter((card) => card.subject === subject)
    return {
      subject,
      total: subjectCards.length,
      weak: subjectCards.filter((card) => card.mastery <= 2).length,
    }
  })
  const maxSubjectCount = Math.max(1, ...subjectStats.map((item) => item.total))

  const moduleMap = new Map<string, { subject: Subject; count: number; weakness: number }>()
  for (const card of cards) {
    const key = `${card.subject}·${card.module}`
    const current = moduleMap.get(key) ?? { subject: card.subject, count: 0, weakness: 0 }
    current.count += 1
    if (card.mastery <= 2) current.weakness += 1
    moduleMap.set(key, current)
  }
  const topModules = Array.from(moduleMap.entries())
    .sort((a, b) => {
      if (b[1].weakness !== a[1].weakness) return b[1].weakness - a[1].weakness
      return b[1].count - a[1].count
    })
    .slice(0, 4)

  const handleLoadSamples = () => {
    const count = loadSamples()
    notify(count > 0 ? `已加入 ${count} 张示例卡片，可以开始体验` : '示例卡片已经在库里了')
  }

  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="hero-dot" />
            四川省考 · 三个月备考
          </div>
          <h1>
            今天，补上 <em>{dueCards.length}</em> 个漏洞。
          </h1>
          <p className="hero-sub">
            {cards.length === 0
              ? '把错题拆成「错误原因 → 正确思路」，再用间隔复习一遍遍磨掉它。'
              : dueCards.length > 0
                ? `先复习最不熟的 ${Math.min(dueCards.length, 3)} 张，再去看新内容。少量、多次、可完成。`
                : '今天没有到期卡片。可以整理新弱项，或者去弱项库回看一张。'}
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="button button-on-dark"
              onClick={() => onNavigate(dueCards.length > 0 ? 'review' : 'library')}
            >
              {dueCards.length > 0 ? `开始复习 · ${dueCards.length}` : '去弱项库'}
              <Icon name="arrow-right" size={17} />
            </button>
            <button type="button" className="button button-ghost-on-dark" onClick={onAdd}>
              <Icon name="plus" size={17} />
              记录一个漏洞
            </button>
          </div>
          <div className="hero-foot">
            <span>
              <Icon name="target" size={15} />
              {examPassed
                ? '考试日期已过，记得在设置里更新'
                : `目标考试：${formatDateCN(settings.examDate, today)}`}
            </span>
            <span>
              <Icon name="clock" size={15} />
              每日 20–40 分钟即可
            </span>
          </div>
        </div>

        <div className={`countdown-seal${examPassed ? ' is-past' : ''}`} aria-label="距离考试天数">
          <span className="countdown-label">距考试</span>
          <strong>{examPassed ? '—' : examDays}</strong>
          <span className="countdown-unit">天</span>
          <span className="countdown-date">
            {examPassed
              ? '请更新考试日期'
              : examDays === 0
                ? '今天考试'
                : `${Math.max(1, Math.ceil(examDays / 7))} 周`}
          </span>
        </div>
      </section>

      <div className="stat-strip">
        <div className="stat-cell">
          <span>全库弱项</span>
          <strong>{cards.length}</strong>
          <small>张卡片</small>
        </div>
        <div className="stat-cell stat-accent">
          <span>今日待复习</span>
          <strong>{dueCards.length}</strong>
          <small>{dueCards.length > 0 ? '先吃掉最难的' : '今日已清空'}</small>
        </div>
        <div className="stat-cell">
          <span>低掌握度</span>
          <strong>{lowMastery.length}</strong>
          <small>掌握度 0–2</small>
        </div>
        <div className="stat-cell">
          <span>累计复习</span>
          <strong>{totalReviews}</strong>
          <small>次点击</small>
        </div>
      </div>

      {cards.length === 0 && (
        <section className="onboarding-panel">
          <div className="onboarding-copy">
            <span className="eyebrow">从第一张开始</span>
            <h2>先记录一个你真的错过的点</h2>
            <p>
              不需要整理整本错题集。今天只写一张：我为什么错、正确思路是什么、下次怎么避免。
            </p>
            <div className="onboarding-actions">
              <button type="button" className="button button-primary" onClick={onAdd}>
                <Icon name="plus" size={17} />
                新增第一张弱项
              </button>
              <button type="button" className="button button-ghost" onClick={handleLoadSamples}>
                <Icon name="spark" size={17} />
                载入示例看看
              </button>
              <button type="button" className="text-button" onClick={() => onNavigate('data')}>
                用 JSON 批量导入
              </button>
            </div>
          </div>
          <div className="onboarding-steps">
            {[
              ['01', '错因', '我当时卡在哪'],
              ['02', '思路', '下次怎么做'],
              ['03', '习题', '放一道典型题'],
              ['04', '复盘', '复习后补笔记'],
            ].map(([index, title, text]) => (
              <div key={index} className="onboarding-step">
                <span>{index}</span>
                <strong>{title}</strong>
                <small>{text}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Today</span>
            <h2>今天该复习的弱项</h2>
          </div>
          <button type="button" className="text-button" onClick={() => onNavigate('review')}>
            进入复习
            <Icon name="arrow-right" size={16} />
          </button>
        </div>

        {dueCards.length > 0 ? (
          <div className="due-list">
            {dueCards.slice(0, 5).map((card, index) => (
              <button
                key={card.id}
                type="button"
                className="due-row"
                onClick={() => onNavigate('review')}
              >
                <span className="due-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="due-main">
                  <span className="due-badges">
                    <SubjectBadge subject={card.subject} />
                    <span className="module-chip">{card.module}</span>
                    <span className="due-date">{formatRelativeDate(card.nextReviewAt, today)}</span>
                  </span>
                  <span className="due-title">{card.title}</span>
                  <span className="due-reason">{card.errorReason || '还没写错误原因，复习时补上。'}</span>
                </span>
                <span className="due-side">
                  <MasteryDots mastery={card.mastery} size="sm" />
                  <Icon name="arrow-right" size={17} />
                </span>
              </button>
            ))}
            {dueCards.length > 5 && (
              <button
                type="button"
                className="due-more"
                onClick={() => onNavigate('review')}
              >
                还有 {dueCards.length - 5} 张到期，进入复习队列
                <Icon name="arrow-right" size={16} />
              </button>
            )}
          </div>
        ) : (
          <EmptyState
            icon="check"
            title="今天没有到期卡片"
            description={
              nextUpcoming
                ? `下一张「${nextUpcoming.title}」将在 ${formatRelativeDate(nextUpcoming.nextReviewAt, today)}到期。`
                : '弱项库还是空的，先记录一个真实的错点吧。'
            }
            action={
              <button type="button" className="button button-primary button-small" onClick={onAdd}>
                <Icon name="plus" size={16} />
                新增弱项
              </button>
            }
          />
        )}
      </section>

      <div className="home-columns">
        <section className="panel subject-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Distribution</span>
              <h2>弱项分布</h2>
            </div>
            <span className="panel-note">按科目</span>
          </div>
          <div className="subject-bars">
            {subjectStats.map(({ subject, total, weak }) => (
              <div className="subject-bar-row" key={subject}>
                <div className="subject-bar-label">
                  <SubjectBadge subject={subject} />
                  <span>{total} 张</span>
                  {weak > 0 && <small>{weak} 张薄弱</small>}
                </div>
                <div className="bar-track" aria-hidden>
                  <span
                    className={`bar-fill subject-${subject === '行测' ? 'hangce' : subject === '申论' ? 'shenlun' : 'mianshi'}`}
                    style={{ width: `${(total / maxSubjectCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {topModules.length > 0 && (
            <div className="module-ranking">
              <span className="meta-label">最需要补的模块</span>
              {topModules.map(([key, value], index) => (
                <div key={key} className="module-rank-row">
                  <span className="rank-index">{index + 1}</span>
                  <span>{key.replace('·', ' / ')}</span>
                  <span className="rank-count">
                    {value.weakness > 0 ? `${value.weakness} 张薄弱` : `${value.count} 张`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel loop-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Loop</span>
              <h2>一张卡片的闭环</h2>
            </div>
            <span className="panel-note">复盘比刷新题重要</span>
          </div>
          <div className="loop-steps">
            {LOOP_STEPS.map(({ icon, title, text }, index) => (
              <div key={title} className="loop-step">
                <span className="loop-icon">
                  <Icon name={icon} size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </div>
                {index < LOOP_STEPS.length - 1 && (
                  <Icon name="arrow-right" size={15} className="loop-arrow" />
                )}
              </div>
            ))}
          </div>
          <button type="button" className="button button-ghost button-small loop-action" onClick={onAdd}>
            按这个结构新增一张
            <Icon name="arrow-right" size={16} />
          </button>
        </section>
      </div>

      <footer className="page-foot">
        <span>砺知 · 数据只保存在本机浏览器</span>
        <button type="button" className="text-button" onClick={() => onNavigate('data')}>
          备份与同步
        </button>
      </footer>
    </div>
  )
}
