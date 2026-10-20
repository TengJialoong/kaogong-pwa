import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppData,
  AppSettings,
  ImportSummary,
  ReviewGrade,
  WeaknessCard,
} from './types'
import {
  createEmptyData,
  defaultSettings,
  normalizeCard,
  saveDraft,
  type CardDraft,
} from './lib/model'
import {
  applyImport,
  buildSampleCards,
  type ImportMode,
  type ParsedImport,
} from './lib/importExport'
import { scheduleReview } from './lib/srs'
import { clearAppData, loadAppData, persistAppData } from './lib/storage'
import { toDateKey } from './lib/date'

interface StoreValue {
  data: AppData
  cards: WeaknessCard[]
  settings: AppSettings
  storageError: string | null
  addCard: (draft: CardDraft) => WeaknessCard
  updateCard: (id: string, draft: CardDraft) => WeaknessCard | null
  deleteCard: (id: string) => void
  reviewCard: (id: string, grade: ReviewGrade, reviewNote?: string) => WeaknessCard | null
  saveReviewNote: (id: string, reviewNote: string) => void
  importCards: (parsed: ParsedImport, mode: ImportMode) => ImportSummary
  updateSettings: (patch: Partial<AppSettings>) => void
  loadSamples: () => number
  clearAll: () => void
  dismissStorageError: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAppData())
  const [storageError, setStorageError] = useState<string | null>(null)
  const initialRender = useRef(true)

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false
      return
    }
    const error = persistAppData(data)
    setStorageError(error)
  }, [data])

  const addCard = useCallback((draft: CardDraft): WeaknessCard => {
    const card = saveDraft(draft)
    setData((current) => ({ ...current, cards: [card, ...current.cards] }))
    return card
  }, [])

  const updateCard = useCallback(
    (id: string, draft: CardDraft): WeaknessCard | null => {
      const existing = data.cards.find((card) => card.id === id)
      if (!existing) return null
      const updated = saveDraft(draft, existing)
      setData((current) => ({
        ...current,
        cards: current.cards.map((card) => (card.id === id ? updated : card)),
      }))
      return updated
    },
    [data.cards],
  )

  const deleteCard = useCallback((id: string) => {
    setData((current) => ({
      ...current,
      cards: current.cards.filter((card) => card.id !== id),
    }))
  }, [])

  const reviewCard = useCallback(
    (id: string, grade: ReviewGrade, reviewNote?: string): WeaknessCard | null => {
      const existing = data.cards.find((card) => card.id === id)
      if (!existing) return null
      const scheduled = scheduleReview(existing, grade, toDateKey())
      const reviewed =
        reviewNote === undefined ? scheduled : { ...scheduled, reviewNote: reviewNote.trim() }
      setData((current) => ({
        ...current,
        cards: current.cards.map((card) => (card.id === id ? reviewed : card)),
      }))
      return reviewed
    },
    [data.cards],
  )

  const saveReviewNote = useCallback((id: string, reviewNote: string) => {
    const timestamp = new Date().toISOString()
    setData((current) => ({
      ...current,
      cards: current.cards.map((card) =>
        card.id === id
          ? { ...card, reviewNote: reviewNote.trim(), updatedAt: timestamp }
          : card,
      ),
    }))
  }, [])

  const importCards = useCallback(
    (parsed: ParsedImport, mode: ImportMode): ImportSummary => {
      const result = applyImport(data, parsed, mode)
      setData(result.data)
      return result.summary
    },
    [data],
  )

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }))
  }, [])

  const loadSamples = useCallback((): number => {
    const samples = buildSampleCards(toDateKey()).map((card) => normalizeCard(card))
    const existing = new Set(data.cards.map((card) => card.id))
    const addition = samples.filter((card) => !existing.has(card.id))
    if (addition.length > 0) {
      setData((current) => ({ ...current, cards: [...addition, ...current.cards] }))
    }
    return addition.length
  }, [data.cards])

  const clearAll = useCallback(() => {
    clearAppData()
    setData((current) => ({
      ...createEmptyData(),
      settings: {
        ...defaultSettings(),
        examDate: current.settings.examDate,
      },
    }))
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      data,
      cards: data.cards,
      settings: data.settings,
      storageError,
      addCard,
      updateCard,
      deleteCard,
      reviewCard,
      saveReviewNote,
      importCards,
      updateSettings,
      loadSamples,
      clearAll,
      dismissStorageError: () => setStorageError(null),
    }),
    [
      data,
      storageError,
      addCard,
      updateCard,
      deleteCard,
      reviewCard,
      saveReviewNote,
      importCards,
      updateSettings,
      loadSamples,
      clearAll,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore 必须在 StoreProvider 内使用')
  return value
}
