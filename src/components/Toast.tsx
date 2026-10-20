import { useEffect } from 'react'
import { Icon } from './Icon'

export interface ToastMessage {
  id: number
  text: string
  tone?: 'success' | 'error' | 'info'
}

interface ToastProps {
  toast: ToastMessage | null
  onDismiss: () => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(onDismiss, 3200)
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null
  const icon = toast.tone === 'error' ? 'alert' : toast.tone === 'info' ? 'info' : 'check'

  return (
    <div className={`toast toast-${toast.tone ?? 'success'}`} role="status" aria-live="polite">
      <Icon name={icon} size={18} />
      <span>{toast.text}</span>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="关闭提示">
        <Icon name="close" size={15} />
      </button>
    </div>
  )
}
