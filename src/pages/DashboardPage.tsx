import { useEffect, useState, type CSSProperties } from 'react'
import type { PageId } from '../types'
import { useStore } from '../store'
import { formatDateCN, toDateKey } from '../lib/date'
import { getDueCards } from '../lib/srs'
import {
  SCORE_DISCLAIMER,
  SCORE_TIERS,
  computeLibraryMastery,
  computeOtherAbilities,
  computeTargetAbilities,
  formatScore,
  getScoreTier,
  loadScoreInputs,
  parseScoreInput,
  saveScoreInputs,
  type ModuleAbility,
  type ScoreInputs,
} from '../lib/strategy'
import { Icon } from '../components/Icon'
import { SubjectBadge } from '../components/SubjectBadge'

interface DashboardPageProps {
  onNavigate: (page: PageId) => void
  onAdd: () => void
}

const STATUS_LABELS: Record<ModuleAbility['status'], string> = {
  'no-data': '待录入',
  weak: '薄弱',
  pass: '合格',
  excellent: '优秀',
  reference: '参考',
}

function abilityMessage(ability: ModuleAbility): string {
  if (ability.target === null) {
    return ability.total > 0 ? '暂无统一目标线，仅展示当前比例' : '暂无卡片'
  }
  if (ability.status === 'no-data') return '暂无卡片，先录入该模块的弱项'
  if (ability.status === 'weak') {
    return `还差 ${ability.target - ability.rate} 个百分点`
  }
  if (ability.status === 'excellent') {
    return `高于目标 ${ability.rate - ability.target} 个百分点`
  }
  return '已达到目标线'
}

export function DashboardPage({ onNavigate, onAdd }: DashboardPageProps) {
  const { cards } = useStore()
  const today = toDateKey()
  const dueCount = getDueCards(cards, today).length
  const targetAbilities = computeTargetAbilities(cards)
  const otherAbilities = computeOtherAbilities(cards)
  const library = computeLibraryMastery(cards)
  const qualifiedCount = targetAbilities.filter(
    (ability) => ability.status === 'pass' || ability.status === 'excellent',
  ).length
  const evaluatedModules = targetAbilities.filter((ability) => ability.total > 0).length
  const qualifiedPercent = Math.round((qualifiedCount / targetAbilities.length) * 100)

  const [scores, setScores] = useState<ScoreInputs>(() => loadScoreInputs())
  useEffect(() => {
    saveScoreInputs(scores)
  }, [scores])

  const xingceScore = parseScoreInput(scores.xingce)
  const shenlunScore = parseScoreInput(scores.shenlun)
  const xingceInvalid = scores.xingce.trim() !== '' && xingceScore === null
  const shenlunInvalid = scores.shenlun.trim() !== '' && shenlunScore === null
  const total =
    xingceScore !== null && shenlunScore !== null
      ? Math.round((xingceScore + shenlunScore) * 100) / 100
      : null
  const tier = total !== null ? getScoreTier(total) : null
  const tierIndex = tier ? SCORE_TIERS.findIndex((item) => item.id === tier.id) : -1

  const updateScore = (key: keyof ScoreInputs, value: string) => {
    setScores((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="page dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <span className="eyebrow">Strategy</span>
          <h1>战略仪表盘</h1>
          <p className="page-lead">看模块缺口，估总分位置，把时间投到最值钱的地方。</p>
        </div>
        <span className="dashboard-date">
          <Icon name="calendar" size={14} />
          数据截至 {formatDateCN(today, today)}
        </span>
      </header>

      <section className="strategy-hero">
        <div className="strategy-hero-copy">
          <span className="strategy-kicker">四川省考 · 模块作战图</span>
          <h2>把有限的时间，投到最薄的模块。</h2>
          <p>
            模块掌握率 = 掌握度 ≥ 4 的卡片数 ÷ 该模块卡片总数。目标线是经验基准，不是官方合格线；
            没有卡片的模块会显示「待录入」，不直接判红。
          </p>
          <div className="strategy-hero-stats">
            <div>
              <strong>{library.rate}%</strong>
              <span>全库掌握率</span>
            </div>
            <div>
              <strong>{library.mastered}</strong>
              <span>已掌握卡片</span>
            </div>
            <div>
              <strong>{dueCount}</strong>
              <span>今日待复习</span>
            </div>
            <div>
              <strong>
                {evaluatedModules}
                <small>/5</small>
              </strong>
              <span>已有数据模块</span>
            </div>
          </div>
        </div>

        <div
          className={`strategy-donut${qualifiedCount === targetAbilities.length ? ' is-full' : ''}`}
          style={{ '--ring-progress': `${qualifiedPercent}%` } as CSSProperties}
          role="img"
          aria-label={`五个基准模块中有 ${qualifiedCount} 个达标`}
        >
          <div className="strategy-donut-inner">
            <strong>
              {qualifiedCount}
              <small>/5</small>
            </strong>
            <span>模块达标</span>
          </div>
        </div>
      </section>

      {cards.length === 0 && (
        <div className="dashboard-empty">
          <span className="dashboard-empty-icon">
            <Icon name="target" size={21} />
          </span>
          <div>
            <strong>还没有弱项卡片，先建立你的第一块拼图。</strong>
            <p>录入卡片后，这里会自动按科目和模块计算掌握率。</p>
          </div>
          <button type="button" className="button button-primary button-small" onClick={onAdd}>
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
        </div>
      )}

      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Module readiness</span>
            <h2>模块能力评估</h2>
          </div>
          <span className="panel-note">红 = 低于经验目标线 · 绿 = 达标</span>
        </div>

        <div className="ability-grid">
          {targetAbilities.map((ability) => (
            <article
              key={ability.id}
              className={`ability-card ability-${ability.status}`}
            >
              <div className="ability-head">
                <div className="ability-title">
                  <h3>{ability.module}</h3>
                  <span className="ability-subject">行测</span>
                </div>
                <span className={`ability-status status-${ability.status}`}>
                  {STATUS_LABELS[ability.status]}
                </span>
              </div>

              <div className="ability-score-row">
                <div className="ability-rate">
                  <strong>{ability.total > 0 ? `${ability.rate}%` : '—'}</strong>
                  <span>当前掌握率</span>
                </div>
                <div className="ability-target">
                  <span>目标</span>
                  <strong>{ability.target}%</strong>
                </div>
              </div>

              <div
                className="ability-bar"
                role="progressbar"
                aria-label={`${ability.module}掌握率`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={ability.rate}
              >
                <span className="ability-fill" style={{ width: `${ability.rate}%` }} />
                <span
                  className="ability-target-tick"
                  style={{ left: `${ability.target ?? 0}%` }}
                  title={`目标 ${ability.target}%`}
                />
              </div>

              <div className="ability-foot">
                <span>
                  已掌握 {ability.mastered}/{ability.total}
                </span>
                <span className={`ability-message message-${ability.status}`}>
                  {abilityMessage(ability)}
                </span>
              </div>
            </article>
          ))}
        </div>

        <p className="dashboard-footnote">
          <Icon name="info" size={15} />
          目标线：资料分析 85%、判断推理 75%、言语理解 75%、数量关系 45%、常识判断 60%。
          达到目标线为「合格」，高于目标线 10 个百分点为「优秀」，无卡片为「待录入」。
          这是用于自我诊断的经验基准，不代表官方评分标准。
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Observation</span>
            <h2>申论 / 面试 / 其他模块</h2>
          </div>
          <span className="panel-note">暂无统一目标线，仅作观察</span>
        </div>

        {otherAbilities.length > 0 ? (
          <div className="other-ability-grid">
            {otherAbilities.map((ability) => (
              <article key={ability.id} className="other-ability">
                <div className="other-ability-head">
                  <div>
                    <SubjectBadge subject={ability.subject} />
                    <strong>{ability.module}</strong>
                  </div>
                  <span>{ability.rate}%</span>
                </div>
                <div className="other-ability-bar" aria-hidden>
                  <span style={{ width: `${ability.rate}%` }} />
                </div>
                <div className="other-ability-meta">
                  <span>
                    已掌握 {ability.mastered}/{ability.total}
                  </span>
                  <span>参考值 · 无目标线</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="other-empty">
            <Icon name="book" size={20} />
            <div>
              <strong>还没有申论、面试或其他自定义模块的卡片</strong>
              <p>新增这类弱项后，会在这里显示掌握率，但不参与行测五模块的红绿灯判断。</p>
            </div>
          </div>
        )}
      </section>

      <section className="dashboard-section score-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Score simulator</span>
            <h2>四川省考分数段模拟器</h2>
          </div>
          <span className="panel-note">纯前端实时计算 · 仅存本机</span>
        </div>

        <div className="score-simulator">
          <div className="score-top">
            <label className={`score-field${xingceInvalid ? ' has-error' : ''}`}>
              <span>行测估分</span>
              <div className="score-input-box">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  inputMode="decimal"
                  value={scores.xingce}
                  onChange={(event) => updateScore('xingce', event.target.value)}
                  placeholder="0–100"
                  aria-label="行测估分"
                  aria-invalid={xingceInvalid}
                />
                <span>分</span>
              </div>
              <small className="score-field-hint">
                {xingceInvalid ? '请输入 0–100 的分数' : '0–100'}
              </small>
            </label>

            <label className={`score-field${shenlunInvalid ? ' has-error' : ''}`}>
              <span>申论估分</span>
              <div className="score-input-box">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  inputMode="decimal"
                  value={scores.shenlun}
                  onChange={(event) => updateScore('shenlun', event.target.value)}
                  placeholder="0–100"
                  aria-label="申论估分"
                  aria-invalid={shenlunInvalid}
                />
                <span>分</span>
              </div>
              <small className="score-field-hint">
                {shenlunInvalid ? '请输入 0–100 的分数' : '0–100'}
              </small>
            </label>

            <div className={`score-total${tier ? ` tone-${tier.tone}` : ' is-empty'}`} aria-live="polite">
              <span>估算总分</span>
              <strong>{total === null ? '—' : formatScore(total)}</strong>
              <small>
                {total === null
                  ? '填入两科估分后自动求和'
                  : `行测 ${formatScore(xingceScore ?? 0)} + 申论 ${formatScore(shenlunScore ?? 0)}`}
              </small>
            </div>
          </div>

          <div className="score-meta-row">
            <span>
              <Icon name="info" size={15} />
              输入变化会实时更新段位，估分只保存在当前浏览器。
            </span>
            <button
              type="button"
              className="text-button"
              onClick={() => setScores({ xingce: '', shenlun: '' })}
              disabled={!scores.xingce && !scores.shenlun}
            >
              清空估分
            </button>
          </div>

          {tier ? (
            <div className={`tier-spotlight tone-${tier.tone}`} aria-live="polite">
              <div className="tier-spotlight-head">
                <span>当前段位 · 第 {tierIndex + 1} / {SCORE_TIERS.length} 段</span>
                <strong>{tier.rangeLabel}</strong>
              </div>
              <p>{tier.description}</p>
              <div className="tier-spotlight-meter" aria-hidden>
                {SCORE_TIERS.map((item, index) => (
                  <span
                    key={item.id}
                    className={index <= tierIndex ? 'is-filled' : ''}
                    data-tone={item.tone}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="tier-spotlight is-empty">
              <Icon name="target" size={24} />
              <div>
                <strong>填入行测、申论两科估分，显示你的分数段</strong>
                <p>计算完全在本地完成，不会上传估分，也不会调用任何接口。</p>
              </div>
            </div>
          )}

          <ol className="tier-ladder">
            {SCORE_TIERS.map((item, index) => {
              const active = tier?.id === item.id
              return (
                <li key={item.id} className={active ? 'is-active' : ''} data-tone={item.tone}>
                  <span className="tier-dot" aria-hidden>
                    {index + 1}
                  </span>
                  <div>
                    <span className="tier-range">{item.rangeLabel}</span>
                    <strong>{item.description}</strong>
                  </div>
                  {active && <span className="tier-current">当前</span>}
                </li>
              )
            })}
          </ol>

          <p className="score-disclaimer">{SCORE_DISCLAIMER}</p>
        </div>
      </section>
    </div>
  )
}
