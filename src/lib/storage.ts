import type { AppData } from '../types'
import { createEmptyData, normalizeStoredData } from './model'

export const STORAGE_KEY = 'lizhi.kaogong.weakness.v1'

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyData()
    return normalizeStoredData(JSON.parse(raw))
  } catch {
    return createEmptyData()
  }
}

/** 返回 null 表示保存成功，否则返回给用户看的错误说明。 */
export function persistAppData(data: AppData): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    return `本地保存失败：${message}。请先导出备份，并检查浏览器存储空间。`
  }
}

export function clearAppData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 忽略清理失败；调用方会重置内存状态。
  }
}

export function dataSizeLabel(data: AppData): string {
  const bytes = new Blob([JSON.stringify(data)]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
