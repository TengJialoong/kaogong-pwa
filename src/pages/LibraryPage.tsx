import { useMemo, useState } from 'react'
import type { WeaknessCard } from '../types'
import { SUBJECTS } from '../types'
import { useStore } from '../store'
import { MASTERY_LABELS } from '../data/constants'
import { toDateKey } from '../lib/date'
import { CardItem } from '../components/CardItem'
import { CardDetailModal } from '../components/CardDetailModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { cx } from '../lib/cx'

type SortKey = 'due' | 'created' | 'mastery' | 'reviews'

interface LibraryPageProps {
  onAdd: () => void
  onEdit: (card: WeaknessCard) => void
  notify: (text: string, tone?: 'success' | 'error' | 'info') => void
}

export function LibraryPage({ onAdd, onEdit, notify }: LibraryPageProps) {
  const { cards, deleteCard } = useStore()
  const today = toDateKey()
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('全部')
  const [module, setModule] = useState('全部')
  const [mastery, setMastery] = useState('全部')
  const [tag, setTag] = useState('全部')
  const [sort, setSort] = useState<SortKey>('due')
  const [detailCard, setDetailCard] = useState<WeaknessCard | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WeaknessCard | null>(null)

  const modules = useMemo(
    () => Array.from(new Set(cards.map((card) => card.module))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [cards],
  )
  const tags = useMemo(
    () =>
      Array.from(new Set(cards.flatMap((card) => card.tags))).sort((a, b) =>
        a.localeCompare(b, 'zh-CN'),
      ),
    [cards],
  )

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = cards.filter((card) => {
      if (subject !== '全部' && card.subject !== subject) return false
      if (module !== '全部' && card.module !== module) return false
      if (mastery !== '全部' && String(card.mastery) !== mastery) return false
      if (tag !== '全部' && !card.tags.includes(tag)) return false
      if (!query) return true
      const haystack = [
        card.title,
        card.errorReason,
        card.correctApproach,
        card.reviewNote,
        card.module,
        card.subject,
        card.tags.join(' '),
        card.exercise?.stem ?? '',
        card.exercise?.answer ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })

    return list.sort((a, b) => {
      switch (sort) {
        case 'created':
          return b.createdAt.localeCompare(a.createdAt)
        case 'mastery':
          if (a.mastery !== b.mastery) return a.mastery - b.mastery
          return a.nextReviewAt.localeCompare(b.nextReviewAt)
        case 'reviews':
          if (a.reviewCount !== b.reviewCount) return b.reviewCount - a.reviewCount
          return a.mastery - b.mastery
        case 'due':
        default:
          return a.nextReviewAt.localeCompare(b.nextReviewAt)
      }
    })
  }, [cards, search, subject, module, mastery, tag, sort])

  const hasFilters =
    search.trim() !== '' ||
    subject !== '全部' ||
    module !== '全部' ||
    mastery !== '全部' ||
    tag !== '全部'

  const resetFilters = () => {
    setSearch('')
    setSubject('全部')
    setModule('全部')
    setMastery('全部')
    setTag('全部')
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteCard(deleteTarget.id)
    setDetailCard(null)
    setDeleteTarget(null)
    notify('弱项已删除')
  }

  return (
    <div className="page library-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Library</span>
          <h1>弱项库</h1>
          <p className="page-lead">把每一个漏洞写成以后能直接照做的动作。</p>
        </div>
        <button type="button" className="button button-ghost" onClick={onAdd}>
          <Icon name="plus" size={18} />
          新增弱项
        </button>
      </header>

      <section className="filter-panel" aria-label="筛选弱项">
        <div className="search-box">
          <Icon name="search" size={19} />
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索标题、错因、思路、标签或习题…"
            aria-label="搜索弱项"
          />
          {search && (
            <button type="button" className="search-clear" onClick={() => setSearch('')} aria-label="清空搜索">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div className="filter-chips" role="group" aria-label="按科目筛选">
          {['全部', ...SUBJECTS].map((item) => (
            <button
              key={item}
              type="button"
              className={cx('filter-chip', subject === item && 'is-active')}
              onClick={() => setSubject(item)}
            >
              {item}
            </button>
          ))}
          {hasFilters && (
            <button type="button" className="filter-reset" onClick={resetFilters}>
              <Icon name="refresh" size={14} />
              重置
            </button>
          )}
        </div>

        <div className="filter-grid">
          <label className="compact-field">
            <span>模块</span>
            <select value={module} onChange={(event) => setModule(event.target.value)}>
              <option value="全部">全部模块</option>
              {modules.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="compact-field">
            <span>掌握度</span>
            <select value={mastery} onChange={(event) => setMastery(event.target.value)}>
              <option value="全部">全部掌握度</option>
              {MASTERY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {index} · {label}
                </option>
              ))}
            </select>
          </label>
          <label className="compact-field">
            <span>标签</span>
            <select value={tag} onChange={(event) => setTag(event.target.value)}>
              <option value="全部">全部标签</option>
              {tags.map((item) => (
                <option key={item} value={item}>
                  #{item}
                </option>
              ))}
            </select>
          </label>
          <label className="compact-field">
            <span>排序</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="due">复习日期优先</option>
              <option value="mastery">掌握度从低到高</option>
              <option value="reviews">复习次数从多到少</option>
              <option value="created">最近创建优先</option>
            </select>
          </label>
        </div>
      </section>

      <div className="list-meta">
        <span>
          共 <strong>{cards.length}</strong> 张
          {hasFilters && (
            <>
              ，筛选出 <strong>{filteredCards.length}</strong> 张
            </>
          )}
        </span>
        <span className="list-hint">点击卡片查看完整复盘</span>
      </div>

      {filteredCards.length > 0 ? (
        <div className="card-grid">
          {filteredCards.map((card) => (
            <CardItem key={card.id} card={card} onOpen={setDetailCard} today={today} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          icon="library"
          title="弱项库还是空的"
          description="从最近一次做错的题开始，写一张卡片就够了。也可以先去导入 JSON 示例。"
          action={
            <button type="button" className="button button-primary button-small" onClick={onAdd}>
              <Icon name="plus" size={16} />
              新增第一张弱项
            </button>
          }
        />
      ) : (
        <EmptyState
          icon="search"
          title="没有匹配的弱项"
          description="换一个关键词，或清除筛选条件再看看。"
          action={
            <button type="button" className="button button-ghost button-small" onClick={resetFilters}>
              清除筛选
            </button>
          }
        />
      )}

      {detailCard && (
        <CardDetailModal
          card={detailCard}
          onClose={() => setDetailCard(null)}
          onEdit={(card) => {
            setDetailCard(null)
            onEdit(card)
          }}
          onDelete={(card) => {
            setDetailCard(null)
            setDeleteTarget(card)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这张弱项？"
        description={`「${deleteTarget?.title ?? ''}」会从本机删除，且无法撤销。建议先在「导入导出」里备份。`}
        confirmLabel="确认删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
