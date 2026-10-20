import type { PageId } from '../types'
import { Icon, type IconName } from './Icon'

const TABS: Array<{ id: PageId; label: string; icon: IconName }> = [
  { id: 'home', label: '首页', icon: 'home' },
  { id: 'dashboard', label: '仪表盘', icon: 'target' },
  { id: 'library', label: '弱项库', icon: 'library' },
  { id: 'review', label: '复习', icon: 'review' },
  { id: 'data', label: '导入导出', icon: 'data' },
  { id: 'settings', label: '设置', icon: 'settings' },
]

interface BottomNavProps {
  active: PageId
  onNavigate: (page: PageId) => void
  dueCount: number
}

export function BottomNav({ active, onNavigate, dueCount }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <div className="bottom-nav-inner">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`bottom-tab${active === tab.id ? ' is-active' : ''}`}
            onClick={() => onNavigate(tab.id)}
            aria-current={active === tab.id ? 'page' : undefined}
          >
            <span className="bottom-tab-icon">
              <Icon name={tab.icon} size={21} />
              {tab.id === 'review' && dueCount > 0 && (
                <span className="nav-badge" aria-label={`${dueCount} 张待复习`}>
                  {dueCount > 99 ? '99+' : dueCount}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
