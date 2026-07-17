import Phaser from 'phaser'

export type HahalandSceneKey = 'VillageScene' | 'BazaarScene'

export type HahalandProgressSave = {
  version: 1
  currentScene: HahalandSceneKey
  coins: number
  reputation: number
  remainingSeconds: number
  completedMarkets: string[]
  earnedBadges: string[]
  unseenBadges: string[]
  updatedAt: number
}

const SAVE_KEY = 'hahaland.progress.v1'
const TIMER_KEY = 'hahaland.timer.remaining.v1'

const DEFAULT_SAVE: HahalandProgressSave = {
  version: 1,
  currentScene: 'VillageScene',
  coins: 1000,
  reputation: 0,
  remainingSeconds: 3600,
  completedMarkets: [],
  earnedBadges: [],
  unseenBadges: [],
  updatedAt: Date.now(),
}

const canUseStorage = () => {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function loadGameProgress(): HahalandProgressSave | null {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(SAVE_KEY)

    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<HahalandProgressSave>

    if (parsed.version !== 1) return null

    return {
      ...DEFAULT_SAVE,
      ...parsed,
      coins: Math.max(0, Math.floor(Number(parsed.coins ?? 1000))),
      reputation: Phaser.Math.Clamp(
        Math.floor(Number(parsed.reputation ?? 0)),
        0,
        100
      ),
      remainingSeconds: Math.max(
        0,
        Math.ceil(Number(parsed.remainingSeconds ?? 3600))
      ),
      completedMarkets: Array.isArray(parsed.completedMarkets)
        ? parsed.completedMarkets.filter(
            (value): value is string => typeof value === 'string'
          )
        : [],
      earnedBadges: Array.isArray(parsed.earnedBadges)
        ? parsed.earnedBadges.filter(
            (value): value is string => typeof value === 'string'
          )
        : [],
      unseenBadges: Array.isArray(parsed.unseenBadges)
        ? parsed.unseenBadges.filter(
            (value): value is string => typeof value === 'string'
          )
        : [],
      currentScene:
        parsed.currentScene === 'BazaarScene'
          ? 'BazaarScene'
          : 'VillageScene',
      updatedAt: Number(parsed.updatedAt ?? Date.now()),
    }
  } catch {
    return null
  }
}

export function hasGameProgress() {
  return loadGameProgress() !== null
}

export function saveGameProgress(
  patch: Partial<Omit<HahalandProgressSave, 'version' | 'updatedAt'>>
) {
  if (!canUseStorage()) return

  const current = loadGameProgress() ?? DEFAULT_SAVE

  const next: HahalandProgressSave = {
    ...current,
    ...patch,
    version: 1,
    coins: Math.max(0, Math.floor(Number(patch.coins ?? current.coins))),
    reputation: Phaser.Math.Clamp(
      Math.floor(Number(patch.reputation ?? current.reputation)),
      0,
      100
    ),
    remainingSeconds: Math.max(
      0,
      Math.ceil(
        Number(patch.remainingSeconds ?? current.remainingSeconds)
      )
    ),
    completedMarkets:
      patch.completedMarkets ?? current.completedMarkets,
    earnedBadges:
      patch.earnedBadges ?? current.earnedBadges,
    unseenBadges:
      patch.unseenBadges ?? current.unseenBadges,
    updatedAt: Date.now(),
  }

  window.localStorage.setItem(SAVE_KEY, JSON.stringify(next))
  window.localStorage.setItem(
    TIMER_KEY,
    String(next.remainingSeconds)
  )
}

export function clearGameProgress() {
  if (!canUseStorage()) return

  window.localStorage.removeItem(SAVE_KEY)
  window.localStorage.removeItem(TIMER_KEY)
}