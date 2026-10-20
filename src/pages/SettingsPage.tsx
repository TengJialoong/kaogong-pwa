import { useEffect, useState } from 'react'
import type { PwaInstallState } from '../hooks/usePwa'
import { useAiConfig } from '../hooks/useAiConfig'
import { useStore } from '../store'
import { DEFAULT_AI_CONFIG, isAiConfigured, validateAiConfig } from '../lib/ai'
import { addDays, daysBetween, formatDateCN, formatDateTime, toDateKey } from '../lib/date'
import { dataSizeLabel } from '../lib/storage'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Icon } from '../components/Icon'

interface SettingsPageProps {
  pwa: PwaInstallState
  online: boolean
  notify: (text: string, tone?: 'success' | 'error' | 'info') => void
}

export function SettingsPage({ pwa, online, notify }: SettingsPageProps) {
  const { cards, settings, updateSettings, loadSamples, clearAll } = useStore()
  const { config: aiConfig, save: saveAiConfig, clear: clearAiConfig } = useAiConfig()
  const today = toDateKey()
  const examDays = daysBetween(today, settings.examDate)
  const [clearOpen, setClearOpen] = useState(false)
  const [swReady, setSwReady] = useState(false)
  const [aiDraft, setAiDraft] = useState(aiConfig)
  const [showAiKey, setShowAiKey] = useState(false)
  const [aiFormError, setAiFormError] = useState<string | null>(null)
  const totalReviews = cards.reduce((total, card) => total + card.reviewCount, 0)

  useEffect(() => {
    setAiDraft(aiConfig)
  }, [aiConfig])

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => setSwReady(Boolean(registration)))
      .catch(() => setSwReady(false))
  }, [])

  const handleInstall = async () => {
    try {
      const outcome = await pwa.promptInstall()
      if (outcome === 'accepted') {
        notify('已开始安装，稍后可从主屏幕打开')
      } else if (outcome === 'dismissed') {
        notify('已取消安装，可随时回来再添加', 'info')
      } else {
        notify('当前浏览器没有弹出安装窗口，请按下方说明手动添加', 'info')
      }
    } catch {
      notify('安装窗口打开失败，请按下方说明手动添加', 'error')
    }
  }

  const handleLoadSamples = () => {
    const count = loadSamples()
    notify(count > 0 ? `已加入 ${count} 张示例卡片` : '示例卡片已经在库里了')
  }

  const handleClear = () => {
    clearAll()
    setClearOpen(false)
    notify('本机数据已清空')
  }

  const handleSaveAiConfig = () => {
    const validation = validateAiConfig(aiDraft)
    if (validation) {
      setAiFormError(validation)
      return
    }
    try {
      saveAiConfig(aiDraft)
      setAiFormError(null)
      notify(
        isAiConfigured(aiDraft)
          ? 'AI 接口配置已保存在本机'
          : 'Base URL 和模型已保存，但还需要填写 API Key 才能生成',
        isAiConfigured(aiDraft) ? 'success' : 'info',
      )
    } catch {
      setAiFormError('保存失败。请检查浏览器是否允许 localStorage，或存储空间是否已满。')
    }
  }

  const handleClearAiConfig = () => {
    clearAiConfig()
    setAiDraft({ ...DEFAULT_AI_CONFIG })
    setShowAiKey(false)
    setAiFormError(null)
    notify('已清除 AI 接口配置', 'info')
  }

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Settings</span>
          <h1>设置</h1>
          <p className="page-lead">考试日期、AI 出题接口、离线安装与本机数据管理。</p>
        </div>
      </header>

      <section className="settings-card">
        <div className="settings-heading">
          <span className="settings-icon">
            <Icon name="target" size={20} />
          </span>
          <div>
            <h2>备考目标</h2>
            <p>首页倒计时和复习节奏都会参考这个日期。</p>
          </div>
        </div>
        <div className="settings-body">
          <label className="field">
            <span className="field-label">四川省考日期</span>
            <div className="input-with-action">
              <input
                type="date"
                className="input"
                value={settings.examDate}
                onChange={(event) => {
                  if (event.target.value) updateSettings({ examDate: event.target.value })
                }}
              />
              <button
                type="button"
                className="button button-small button-ghost"
                onClick={() => updateSettings({ examDate: addDays(today, 90) })}
              >
                设为 90 天后
              </button>
            </div>
          </label>
          <div className={`exam-countdown-box${examDays < 0 ? ' is-past' : ''}`}>
            <span>{examDays >= 0 ? '距离考试还有' : '考试日期已经过去'}</span>
            <strong>{Math.abs(examDays)}</strong>
            <span>天</span>
            <small>{formatDateCN(settings.examDate, today)}</small>
          </div>
        </div>
      </section>

      <section className="settings-card ai-settings-card">
        <div className="settings-heading">
          <span className="settings-icon">
            <Icon name="spark" size={20} />
          </span>
          <div>
            <h2>AI 出题接口</h2>
            <p>复习时根据知识点、正确思路和原题生成同类变式题。</p>
          </div>
          <span className={`status-badge${isAiConfigured(aiConfig) ? ' is-ok' : ' is-warn'}`}>
            {isAiConfigured(aiConfig) ? '已配置' : '未配置'}
          </span>
        </div>
        <div className="settings-body">
          <div className="ai-security-note">
            <Icon name="alert" size={18} />
            <div>
              <strong>API Key 只保存在当前浏览器</strong>
              <p>
                它不会写入导出的 JSON，也不会发送到你填写的 Base URL 以外的地址。但纯前端页面无法真正隐藏
                Key：请勿在公用电脑使用主 Key，建议单独创建一把低额度 Key。
              </p>
            </div>
          </div>

          <div className="ai-config-grid">
            <label className="field">
              <span className="field-label">API Base URL</span>
              <input
                className="input"
                type="url"
                value={aiDraft.baseUrl}
                onChange={(event) => {
                  setAiDraft((current) => ({ ...current, baseUrl: event.target.value }))
                  setAiFormError(null)
                }}
                placeholder="https://api.deepseek.com"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="field-hint">
                会自动请求 <code>{'{Base URL}'}/chat/completions</code>；填到 <code>/v1</code> 也可以。
              </span>
            </label>

            <label className="field">
              <span className="field-label">模型名称</span>
              <input
                className="input"
                value={aiDraft.model}
                onChange={(event) => {
                  setAiDraft((current) => ({ ...current, model: event.target.value }))
                  setAiFormError(null)
                }}
                placeholder="deepseek-flash"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="field-hint">
                DeepSeek 当前可用 <code>deepseek-flash</code>；其他兼容服务填对应模型名。
              </span>
            </label>
          </div>

          <label className="field">
            <span className="field-label">API Key</span>
            <div className="input-with-toggle">
              <input
                className="input"
                type={showAiKey ? 'text' : 'password'}
                value={aiDraft.apiKey}
                onChange={(event) => {
                  setAiDraft((current) => ({ ...current, apiKey: event.target.value }))
                  setAiFormError(null)
                }}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="button button-small button-ghost"
                onClick={() => setShowAiKey((visible) => !visible)}
              >
                {showAiKey ? '隐藏' : '显示'}
              </button>
            </div>
            <span className="field-hint">
              保存在 localStorage 的 <code>lizhi.kaogong.ai.v1</code>，不会跟随弱项数据导出。
            </span>
          </label>

          {aiFormError && (
            <div className="form-error" role="alert">
              <Icon name="alert" size={17} />
              {aiFormError}
            </div>
          )}

          <div className="settings-actions ai-config-actions">
            <button type="button" className="button button-primary" onClick={handleSaveAiConfig}>
              <Icon name="check" size={17} />
              保存 AI 配置
            </button>
            <button type="button" className="button button-ghost" onClick={handleClearAiConfig}>
              <Icon name="trash" size={17} />
              清除配置
            </button>
            <span className={`ai-config-state${isAiConfigured(aiConfig) ? ' is-ready' : ''}`}>
              {isAiConfigured(aiConfig)
                ? `已就绪 · ${aiConfig.model}`
                : '填写完整后才能使用 AI 生成'}
            </span>
          </div>

          <p className="settings-hint">
            调用从浏览器直接发往你填写的接口，会产生该平台的 API 费用。DeepSeek 官方接口支持浏览器跨域；
            如果其他服务返回 CORS 错误，请换用允许跨域的接口，或填写你自己的兼容代理地址。
          </p>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-heading">
          <span className="settings-icon">
            <Icon name="install" size={20} />
          </span>
          <div>
            <h2>添加到主屏幕</h2>
            <p>安装后可全屏打开，断网也能查看已缓存的页面。</p>
          </div>
          {pwa.isStandalone && <span className="status-badge is-ok">已安装</span>}
        </div>
        <div className="settings-body">
          {pwa.canInstall ? (
            <button type="button" className="button button-primary" onClick={handleInstall}>
              <Icon name="install" size={18} />
              安装砺知到主屏幕
            </button>
          ) : pwa.isStandalone ? (
            <div className="install-status">
              <Icon name="check" size={18} />
              正在以独立应用模式运行，数据与浏览器内保持一致。
            </div>
          ) : (
            <div className="install-status is-muted">
              <Icon name="info" size={18} />
              当前浏览器没有提供自动安装按钮，按下面的手动步骤添加即可。
            </div>
          )}

          <div className="install-instructions">
            <div className="install-instruction">
              <span className="instruction-platform">iPhone / iPad</span>
              <ol>
                <li>用 Safari 打开本站。</li>
                <li>
                  点底部「分享」按钮
                  <span className="inline-symbol">⎋</span>
                </li>
                <li>选择「添加到主屏幕」，再点「添加」。</li>
              </ol>
            </div>
            <div className="install-instruction">
              <span className="instruction-platform">Android</span>
              <ol>
                <li>用 Chrome / Edge 打开本站。</li>
                <li>点右上角「⋮」菜单。</li>
                <li>选择「安装应用」或「添加到主屏幕」。</li>
              </ol>
            </div>
            <div className="install-instruction">
              <span className="instruction-platform">电脑</span>
              <ol>
                <li>用 Chrome / Edge 打开本站。</li>
                <li>点地址栏右侧的安装图标，或打开浏览器菜单。</li>
                <li>选择「安装砺知」。</li>
              </ol>
            </div>
          </div>
          <p className="settings-hint">
            安装与离线缓存需要通过 HTTPS 访问（GitHub Pages 默认支持）。用本地文件直接打开
            HTML 不会启用 Service Worker。
          </p>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-heading">
          <span className="settings-icon">
            <Icon name="offline" size={20} />
          </span>
          <div>
            <h2>离线与连接</h2>
            <p>页面和静态资源会缓存到本机，断网后仍能打开。</p>
          </div>
          <span className={`status-badge${online ? ' is-ok' : ' is-warn'}`}>
            {online ? '在线' : '离线'}
          </span>
        </div>
        <div className="settings-body">
          <div className="status-list">
            <div>
              <span>网络状态</span>
              <strong>{online ? '已连接' : '离线，正在使用本机缓存'}</strong>
            </div>
            <div>
              <span>离线缓存</span>
              <strong>
                {swReady ? 'Service Worker 已启用' : import.meta.env.PROD ? '正在注册或等待刷新' : '开发预览模式未启用'}
              </strong>
            </div>
            <div>
              <span>数据存储</span>
              <strong>localStorage · {dataSizeLabel({ schemaVersion: 1, cards, settings })}</strong>
            </div>
          </div>
          <p className="settings-hint">
            首次打开需要联网，让浏览器缓存页面。之后在断网状态下刷新，已加载的内容仍可查看与复习。
          </p>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-heading">
          <span className="settings-icon">
            <Icon name="data" size={20} />
          </span>
          <div>
            <h2>本机数据</h2>
            <p>没有后端，也没有云端。备份和同步都要靠 JSON 文件。</p>
          </div>
        </div>
        <div className="settings-body">
          <div className="data-mini-stats">
            <div>
              <strong>{cards.length}</strong>
              <span>张弱项</span>
            </div>
            <div>
              <strong>{totalReviews}</strong>
              <span>次复习</span>
            </div>
            <div>
              <strong>{dataSizeLabel({ schemaVersion: 1, cards, settings })}</strong>
              <span>本地占用</span>
            </div>
            <div>
              <strong>{settings.lastImportAt ? formatDateTime(settings.lastImportAt) : '—'}</strong>
              <span>上次导入</span>
            </div>
          </div>
          <div className="settings-actions">
            {cards.length === 0 && (
              <button type="button" className="button button-ghost" onClick={handleLoadSamples}>
                <Icon name="spark" size={17} />
                载入 3 张示例卡片
              </button>
            )}
            <button
              type="button"
              className="button button-danger-ghost"
              onClick={() => setClearOpen(true)}
            >
              <Icon name="trash" size={17} />
              清空本机数据
            </button>
          </div>
          <p className="settings-hint">
            清空只影响弱项数据和复习进度，不会删除上方的 AI 配置；需要移除 Key 请使用「清除配置」。
            若已导出 JSON，可随时在「导入导出」中恢复。清理浏览器缓存或站点数据也会删除弱项。
          </p>
        </div>
      </section>

      <section className="settings-card about-card">
        <div className="settings-heading">
          <span className="settings-icon">
            <Icon name="book" size={20} />
          </span>
          <div>
            <h2>关于砺知</h2>
            <p>四川省考 · 弱项卡片、简化 SM-2 间隔复习、战略仪表盘与可选 AI 出题。</p>
          </div>
          <span className="version-badge">v1.2.0</span>
        </div>
        <div className="settings-body">
          <ul className="about-list">
            <li>纯静态 PWA，无后端、无登录、无数据库、无第三方统计。</li>
            <li>战略仪表盘：按模块统计掌握率，并提供纯前端的分数段模拟，不引入图表库。</li>
            <li>可选 AI 变式题：只有点击生成按钮时，才会把当前知识点、思路和原题发给你配置的接口。</li>
            <li>API Key 单独保存在本机，不写入导出的 JSON；清理浏览器数据会一并清除。</li>
            <li>掌握度 0–5；复习结果「仍不会 / 模糊 / 已掌握」会重新计算间隔。</li>
            <li>所有弱项数据只保存在当前浏览器，导出 JSON 即可手动同步。</li>
          </ul>
        </div>
      </section>

      <footer className="page-foot settings-foot">
        <span>砺知 · 把漏洞磨小，把确定性磨大。</span>
      </footer>

      <ConfirmDialog
        open={clearOpen}
        title="清空全部本机数据？"
        description={`将删除 ${cards.length} 张弱项、全部复习进度和复盘笔记。此操作无法撤销，建议先导出 JSON 备份。`}
        confirmLabel="确认清空"
        danger
        onCancel={() => setClearOpen(false)}
        onConfirm={handleClear}
      />
    </div>
  )
}
