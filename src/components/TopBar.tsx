import type { PageId } from '../types'
import { Icon } from './Icon'

const TABS: Array<{ id: PageId; label: string }> = [
  { id: 'home', label: '首页' },
  { id: 'dashboard', label: '仪表盘' },
  { id: 'library', label: '弱项库' },
  { id: 'review', label: '复习' },
  { id: 'data', label: '导入导出' },
  { id: 'settings', label: '设置' },
]

interface TopBarProps {
  active: PageId
  onNavigate: (page: PageId) => void
  onAdd: () => void
  dueCount: number
  offline: boolean
}

export function TopBar({ active, onNavigate, onAdd, dueCount, offline }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button type="button" className="brand" onClick={() => onNavigate('home')} aria-label="回到首页">
          <span className="brand-mark" aria-hidden>
            砺
          </span>
          <span className="brand-copy">
            <strong>砺知</strong>
            <small>四川省考弱项工作台</small>
          </span>
        </button>

        <nav className="desktop-nav" aria-label="桌面导航">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`desktop-tab${active === tab.id ? ' is-active' : ''}`}
              onClick={() => onNavigate(tab.id)}
              aria-current={active === tab.id ? 'page' : undefined}
            >
              {tab.label}
              {tab.id === 'review' && dueCount > 0 && <span className="desktop-badge">{dueCount}</span>}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          {offline && (
            <span className="offline-chip" title="当前处于离线状态，已缓存内容仍可使用">
              <Icon name="offline" size={15} />
              <span>离线</span>
            </span>
          )}
          <button
            type="button"
            className="button button-primary topbar-add"
            onClick={onAdd}
            aria-label="新增弱项"
          >
            <Icon name="plus" size={18} />
            <span>新增弱项</span>
          </button>
        </div>
      </div>
    </header>
  )
}
