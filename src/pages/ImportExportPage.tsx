import { useRef, useState } from 'react'
import type { ImportSummary } from '../types'
import { useStore } from '../store'
import {
  buildExportEnvelope,
  copyText,
  downloadTextFile,
  exportFileName,
  JSON_TEMPLATE,
  parseImportPayload,
  sampleJson,
  type ImportMode,
  type ParsedImport,
} from '../lib/importExport'
import { dataSizeLabel } from '../lib/storage'
import { formatDateTime, toDateKey } from '../lib/date'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Icon } from '../components/Icon'

interface DataPageProps {
  notify: (text: string, tone?: 'success' | 'error' | 'info') => void
}

export function ImportExportPage({ notify }: DataPageProps) {
  const { data, settings, importCards } = useStore()
  const today = toDateKey()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    parsed: ParsedImport
    mode: ImportMode
  } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const exportText = JSON.stringify(buildExportEnvelope(data), null, 2)
  const sampleText = sampleJson(today)
  const totalReviews = data.cards.reduce((total, card) => total + card.reviewCount, 0)

  const copyWithFeedback = async (value: string, key: string) => {
    try {
      await copyText(value)
      setCopiedKey(key)
      notify('已复制到剪贴板')
      window.setTimeout(() => setCopiedKey(null), 1800)
    } catch (copyError) {
      notify(copyError instanceof Error ? copyError.message : '复制失败', 'error')
    }
  }

  const handleExport = () => {
    if (data.cards.length === 0) {
      notify('当前没有卡片可导出，先新增一张吧。', 'info')
      return
    }
    downloadTextFile(exportFileName(), exportText)
    notify(`已导出 ${data.cards.length} 张弱项`)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const content = await file.text()
      setText(content)
      setFileName(file.name)
      setError(null)
      setSummary(null)
      notify(`已读取 ${file.name}，点击下方按钮确认导入`)
    } catch {
      setError('文件读取失败，请重试，或直接用文本粘贴。')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const applyParsed = (parsed: ParsedImport, importMode: ImportMode) => {
    const result = importCards(parsed, importMode)
    setSummary(result)
    setError(null)
    setText('')
    setFileName(null)
    setPendingOverwrite(null)
    const parts = [`新增 ${result.added}`]
    if (result.updated > 0) parts.push(`更新 ${result.updated}`)
    if (result.skipped > 0) parts.push(`跳过 ${result.skipped}`)
    notify(`导入完成：${parts.join('，')}`)
  }

  const handleImport = () => {
    setError(null)
    setSummary(null)
    try {
      const parsed = parseImportPayload(text)
      if (mode === 'overwrite' && data.cards.length > 0) {
        setPendingOverwrite({ parsed, mode })
        return
      }
      applyParsed(parsed, mode)
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : '导入失败，请检查 JSON。')
    }
  }

  const handleLoadSample = () => {
    setText(sampleText)
    setFileName(null)
    setError(null)
    setSummary(null)
    notify('示例 JSON 已填入文本框，可直接导入体验', 'info')
  }

  return (
    <div className="page data-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Backup &amp; Sync</span>
          <h1>导入导出</h1>
          <p className="page-lead">数据只在本机。用 JSON 手动同步手机和电脑，比账号更简单。</p>
        </div>
      </header>

      <div className="data-stats">
        <div className="data-stat">
          <span>弱项卡片</span>
          <strong>{data.cards.length}</strong>
          <small>张</small>
        </div>
        <div className="data-stat">
          <span>累计复习</span>
          <strong>{totalReviews}</strong>
          <small>次</small>
        </div>
        <div className="data-stat">
          <span>本地数据</span>
          <strong>{dataSizeLabel(data)}</strong>
          <small>localStorage</small>
        </div>
        <div className="data-stat">
          <span>上次导入</span>
          <strong className="data-stat-date">
            {settings.lastImportAt ? formatDateTime(settings.lastImportAt) : '暂无'}
          </strong>
          <small>{settings.lastImportAt ? '已合并/覆盖' : '还没有导入过'}</small>
        </div>
      </div>

      <section className="data-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Export</span>
            <h2>导出全部数据</h2>
          </div>
          <span className="panel-note">建议每周末备份一次</span>
        </div>
        <div className="export-panel">
          <div className="export-copy">
            <p>
              导出文件包含全部弱项、复习进度、掌握度、复盘笔记和考试日期设置。把它放到网盘、聊天记录或
              U 盘里，就是一份完整备份。AI 接口配置和 API Key 不会写入备份。
            </p>
            <div className="export-actions">
              <button type="button" className="button button-primary" onClick={handleExport}>
                <Icon name="download" size={18} />
                下载 JSON 备份
              </button>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => copyWithFeedback(exportText, 'export')}
              >
                <Icon name={copiedKey === 'export' ? 'check' : 'copy'} size={17} />
                {copiedKey === 'export' ? '已复制' : '复制 JSON'}
              </button>
            </div>
          </div>
          <div className="sync-steps">
            <span className="meta-label">手机 ↔ 电脑 手动同步</span>
            <ol>
              <li>
                <span>1</span>在旧设备「导出全部数据」
              </li>
              <li>
                <span>2</span>把 JSON 文件传到新设备
              </li>
              <li>
                <span>3</span>在新设备用「覆盖」导入
              </li>
            </ol>
            <p className="sync-tip">
              想保留新设备新增的卡片时，选择「合并」。同一张卡以更新时间较新的版本为准。
            </p>
          </div>
        </div>
      </section>

      <section className="data-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Import</span>
            <h2>导入 JSON</h2>
          </div>
          <span className="panel-note">支持粘贴或选择文件</span>
        </div>

        <div className="import-panel">
          <div className="mode-switch" role="group" aria-label="导入方式">
            <button
              type="button"
              className={`mode-card${mode === 'merge' ? ' is-active' : ''}`}
              onClick={() => setMode('merge')}
            >
              <span className="mode-icon">
                <Icon name="refresh" size={19} />
              </span>
              <span>
                <strong>合并导入</strong>
                <small>保留现有卡片，同 ID 时以更新时间新的为准</small>
              </span>
            </button>
            <button
              type="button"
              className={`mode-card mode-danger${mode === 'overwrite' ? ' is-active' : ''}`}
              onClick={() => setMode('overwrite')}
            >
              <span className="mode-icon">
                <Icon name="alert" size={19} />
              </span>
              <span>
                <strong>覆盖导入</strong>
                <small>清空当前卡片，完整恢复备份，适合换设备</small>
              </span>
            </button>
          </div>

          <div className="import-input-head">
            <span className="field-label">JSON 内容</span>
            <div className="import-file-actions">
              {fileName && <span className="file-name">{fileName}</span>}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <button
                type="button"
                className="button button-small button-ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="upload" size={16} />
                选择文件
              </button>
            </div>
          </div>
          <textarea
            className="textarea import-textarea"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setError(null)
              setSummary(null)
            }}
            placeholder={'在这里粘贴 JSON 数组，或直接粘贴本应用导出的完整备份…\n\n[\n  { "subject": "行测", "title": "…" }\n]'}
            spellCheck={false}
            aria-label="待导入的 JSON 内容"
          />

          {error && (
            <div className="form-error" role="alert">
              <Icon name="alert" size={17} />
              {error}
            </div>
          )}

          {summary && (
            <div className="import-summary" role="status">
              <span className="import-summary-icon">
                <Icon name="check" size={20} />
              </span>
              <div>
                <strong>导入完成</strong>
                <p>
                  共读取 {summary.total} 张，新增 {summary.added} 张
                  {summary.updated > 0 ? `，更新 ${summary.updated} 张` : ''}
                  {summary.skipped > 0 ? `，跳过 ${summary.skipped} 张` : ''}。
                </p>
              </div>
            </div>
          )}

          <div className="import-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={handleImport}
              disabled={!text.trim()}
            >
              <Icon name="upload" size={18} />
              {mode === 'overwrite' ? '覆盖导入' : '合并导入'}
            </button>
            <button type="button" className="text-button" onClick={handleLoadSample}>
              填入示例 JSON
            </button>
            <span className="import-count-hint">
              {text.trim() ? `${text.length.toLocaleString('zh-CN')} 字符` : '尚未粘贴内容'}
            </span>
          </div>
        </div>
      </section>

      <section className="data-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Template</span>
            <h2>批量导入格式</h2>
          </div>
          <div className="section-actions">
            <button
              type="button"
              className="button button-small button-ghost"
              onClick={() => downloadTextFile('lizhi-sample-cards.json', sampleText)}
            >
              <Icon name="download" size={16} />
              下载示例
            </button>
            <button
              type="button"
              className="button button-small button-ghost"
              onClick={() => copyWithFeedback(JSON_TEMPLATE, 'template')}
            >
              <Icon name={copiedKey === 'template' ? 'check' : 'copy'} size={16} />
              {copiedKey === 'template' ? '已复制' : '复制模板'}
            </button>
          </div>
        </div>

        <div className="format-note">
          <Icon name="info" size={17} />
          <div>
            <p>
              顶层可以是 JSON 数组，也可以是带 <code>cards</code> 的导出对象。除{' '}
              <code>subject</code> 和 <code>title</code> 外都可省略；省略时会自动补默认值。
            </p>
            <p>
              支持字段：<code>subject</code>（行测/申论/面试）、<code>module</code>、
              <code>title</code>、<code>errorReason</code>、<code>correctApproach</code>、
              <code>exercise</code>（<code>stem/options/answer/explanation</code>）、
              <code>tags</code>、<code>mastery</code>（0–5）、<code>createdAt</code>、
              <code>nextReviewAt</code>、<code>reviewCount</code>、<code>reviewNote</code>。
              字段名也可用中文（如「科目」「知识点标题」）。
            </p>
          </div>
        </div>

        <div className="code-grid">
          <div className="code-block">
            <div className="code-head">
              <span>标准模板</span>
              <button
                type="button"
                className="text-button"
                onClick={() => copyWithFeedback(JSON_TEMPLATE, 'template-inline')}
              >
                <Icon name={copiedKey === 'template-inline' ? 'check' : 'copy'} size={14} />
                {copiedKey === 'template-inline' ? '已复制' : '复制'}
              </button>
            </div>
            <pre>
              <code>{JSON_TEMPLATE}</code>
            </pre>
          </div>
          <div className="code-block">
            <div className="code-head">
              <span>可导入示例（3 张）</span>
              <div className="code-head-actions">
                <button type="button" className="text-button" onClick={handleLoadSample}>
                  填入输入框
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => copyWithFeedback(sampleText, 'sample')}
                >
                  <Icon name={copiedKey === 'sample' ? 'check' : 'copy'} size={14} />
                  {copiedKey === 'sample' ? '已复制' : '复制'}
                </button>
              </div>
            </div>
            <pre>
              <code>{sampleText}</code>
            </pre>
          </div>
        </div>
      </section>

      <div className="privacy-note">
        <Icon name="info" size={18} />
        <p>
          没有账号、没有后端。AI 出题接口是可选项，API Key 独立保存在当前浏览器，且不会写入导出 JSON。
          所有弱项数据仅存在本机 localStorage；清理浏览器数据会删除它，请定期导出。
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(pendingOverwrite)}
        title="确认覆盖本机数据？"
        description={`本机现有 ${data.cards.length} 张弱项，导入文件有 ${pendingOverwrite?.parsed.cards.length ?? 0} 张。覆盖会清空现有卡片和复习进度，无法撤销。建议先导出当前数据。`}
        confirmLabel="仍然覆盖导入"
        danger
        onCancel={() => setPendingOverwrite(null)}
        onConfirm={() => {
          if (pendingOverwrite) applyParsed(pendingOverwrite.parsed, pendingOverwrite.mode)
        }}
      />
    </div>
  )
}
