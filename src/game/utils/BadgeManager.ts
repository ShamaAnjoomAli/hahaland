import Phaser from 'phaser'
import {
  BADGES,
  BADGE_BY_ID,
  type BadgeDefinition,
} from '../data/badges'
import {
  loadGameProgress,
  saveGameProgress,
} from './progressSave'

export const BADGE_AWARDED_EVENT = 'hahaland-badge-awarded'
export const BADGE_PROGRESS_CHANGED_EVENT = 'hahaland-badge-progress-changed'

export type AwardBadgeOptions = {
  notify?: boolean
}

export function getEarnedBadgeIds() {
  return loadGameProgress()?.earnedBadges ?? []
}

export function getUnseenBadgeIds() {
  return loadGameProgress()?.unseenBadges ?? []
}

export function isBadgeEarned(badgeId: string) {
  return getEarnedBadgeIds().includes(badgeId)
}

export function awardBadge(
  scene: Phaser.Scene,
  badgeId: string,
  options: AwardBadgeOptions = {},
): BadgeDefinition[] {
  const notify = options.notify !== false
  const requestedBadge = BADGE_BY_ID.get(badgeId)

  if (!requestedBadge) {
    console.warn(`Unknown badge id: ${badgeId}`)
    return []
  }

  const progress = loadGameProgress()
  const earned = new Set(progress?.earnedBadges ?? [])
  const unseen = new Set(progress?.unseenBadges ?? [])
  const awarded: BadgeDefinition[] = []

  const addBadge = (badge: BadgeDefinition) => {
    if (earned.has(badge.id)) return false

    earned.add(badge.id)
    awarded.push(badge)

    if (notify) {
      unseen.add(badge.id)
    }

    return true
  }

  addBadge(requestedBadge)

  let foundAutomaticBadge = true

  while (foundAutomaticBadge) {
    foundAutomaticBadge = false

    BADGES.forEach((badge) => {
      if (earned.has(badge.id)) return
      if (!badge.requires?.length) return

      if (badge.requires.every((requiredId) => earned.has(requiredId))) {
        addBadge(badge)
        foundAutomaticBadge = true
      }
    })
  }

  if (awarded.length === 0) return []

  saveGameProgress({
    earnedBadges: [...earned],
    unseenBadges: [...unseen],
  })

  scene.events.emit(BADGE_PROGRESS_CHANGED_EVENT)

  if (notify) {
    awarded.forEach((badge) => {
      scene.events.emit(BADGE_AWARDED_EVENT, badge)
    })
  }

  return awarded
}

export function syncBadges(scene: Phaser.Scene, badgeIds: string[]) {
  badgeIds.forEach((badgeId) => {
    awardBadge(scene, badgeId, { notify: false })
  })
}

export function markAllBadgesSeen(scene?: Phaser.Scene) {
  const progress = loadGameProgress()

  if (!progress || progress.unseenBadges.length === 0) return

  saveGameProgress({ unseenBadges: [] })
  scene?.events.emit(BADGE_PROGRESS_CHANGED_EVENT)
}
