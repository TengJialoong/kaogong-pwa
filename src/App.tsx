import { useCallback, useEffect, useState } from 'react'
import type { PageId, WeaknessCard } from './types'
import { useStore } from './store'
import { useOnlineStatus, usePwaInstall } from './hooks/usePwa'
import { getDueCards } from './lib/srs'
import { toDateKey } from './lib/date'
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { CardEditorModal } from './components/CardEditorModal'
import { Toast, type ToastMessage } from './components/Toast'
import { Icon } from './components/Icon'
import { HomePage } from './pages/HomePage'
import { DashboardPage } from './pages/DashboardPage'
import { LibraryPage } from './pages/LibraryPage'
import { ReviewPage } from './pages/ReviewPage'
import { ImportExportPage } from './pages/ImportExportPage'
import { SettingsPage } from './pages/SettingsPage'

const PAGE_IDS: PageId[] = ['home', 'dashboard', 'library', 'review', 'data', 'settings']
const PAGE_TITLES: Record<PageId, string> = {
  home: '砺知 · 四川省考弱项工作台',
  dashboard: '战略仪表盘 · 砺知',
  library: '弱项库 · 砺知',
  review: '今日复习 · 砺知',
  data: '导入导出 · 砺知',
  settings: '设置 · 砺知',
}

function readPageFromHash(): PageId {
  const raw = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0]
  return (PAGE_IDS as string[]).includes(raw) ? (raw as PageId) : 'home'
}

export default function App() {
  const { cards, storageError, dismissStorageError } = useStore()
  const pwa = usePwaInstall()
  const online = useOnlineStatus()
  const [page, setPage] = useState<PageId>(readPageFromHash)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [editor, setEditor] = useState<{ card: WeaknessCard | null } | null>(null)
  const dueCount = getDueCards(cards, toDateKey()).length

  const notify = useCallback(
    (text: string, tone: 'success' | 'error' | 'info' = 'success') => {
      setToast({ id: Date.now(), text, tone })
    },
    [],
  )

  const navigate = useCallback((next: PageId) => {
    if (window.location.hash !== `#/${next}`) {
      window.location.hash = `#/${next}`
    }
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      setPage(readPageFromHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    document.title = PAGE_TITLES[page]
  }, [page])

  const openAdd = () => setEditor({ card: null })
  const openEdit = (card: WeaknessCard) => setEditor({ card })

  const pageContent = (() => {
    switch (page) {
      case 'home':
        return <HomePage onNavigate={navigate} onAdd={openAdd} notify={notify} />
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} onAdd={openAdd} />
      case 'library':
        return <LibraryPage onAdd={openAdd} onEdit={openEdit} notify={notify} />
      case 'review':
        return <ReviewPage onNavigate={navigate} onAdd={openAdd} notify={notify} />
      case 'data':
        return <ImportExportPage notify={notify} />
      case 'settings':
        return <SettingsPage pwa={pwa} online={online} notify={notify} />
      default:
        return null
    }
  })()

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <TopBar
        active={page}
        onNavigate={navigate}
        onAdd={openAdd}
        dueCount={dueCount}
        offline={!online}
      />

      {storageError && (
        <div className="storage-alert" role="alert">
          <Icon name="alert" size={17} />
          <span>{storageError}</span>
          <button type="button" onClick={dismissStorageError} aria-label="关闭存储提示">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <main id="main-content" className="app-main">
        {pageContent}
      </main>

      <BottomNav active={page} onNavigate={navigate} dueCount={dueCount} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {editor && (
        <CardEditorModal
          key={editor.card?.id ?? 'new-card'}
          card={editor.card}
          onClose={() => setEditor(null)}
          onSaved={(card, isNew) => {
            setEditor(null)
            navigate('library')
            notify(isNew ? `「${card.title}」已加入弱项库` : '弱项已更新')
          }}
        />
      )}
    </div>
  )
}
