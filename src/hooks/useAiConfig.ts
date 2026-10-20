import { useCallback, useEffect, useState } from 'react'
import {
  AI_CONFIG_EVENT,
  clearAiConfig,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
} from '../lib/ai'

export function useAiConfig() {
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig())

  useEffect(() => {
    const sync = () => setConfig(loadAiConfig())
    window.addEventListener(AI_CONFIG_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AI_CONFIG_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const save = useCallback((next: AiConfig) => {
    saveAiConfig(next)
    setConfig(loadAiConfig())
  }, [])

  const clear = useCallback(() => {
    clearAiConfig()
    setConfig(loadAiConfig())
  }, [])

  return { config, save, clear }
}
