import Phaser from 'phaser'
import {
  BADGES,
  BADGE_BY_ID,
  BADGE_CATEGORIES,
  getBadgesForCategory,
  type BadgeCategory,
  type BadgeDefinition,
} from '../data/badges'
import ObjectiveBox, {
  OBJECTIVE_BOX_LAYOUT_EVENT,
} from './ObjectiveBox'
import {
  awardBadge,
  BADGE_AWARDED_EVENT,
  BADGE_PROGRESS_CHANGED_EVENT,
  getEarnedBadgeIds,
  getUnseenBadgeIds,
  markAllBadgesSeen,
  syncBadges,
} from '../utils/BadgeManager'

type CanOpenCollection = () => boolean

const BADGE_ICON_ASSETS = [
  ['badge-fake-hotel', 'assets/ui/badges/badge_fake_hotel.png'],
  ['badge-bazaar-date', 'assets/ui/badges/badge_bazaar_date.png'],
  ['badge-bazaar-eagle', 'assets/ui/badges/badge_bazaar_eagle.png'],
  ['badge-bazaar-donkey', 'assets/ui/badges/badge_bazaar_donkey.png'],
  ['badge-bazaar-grain', 'assets/ui/badges/badge_bazaar_grain.png'],
  ['badge-bazaar-spice', 'assets/ui/badges/badge_bazaar_spice.png'],
  ['badge-bazaar-pottery', 'assets/ui/badges/badge_bazaar_pottery.png'],
  ['badge-bazaar-archery', 'assets/ui/badges/badge_bazaar_archery.png'],
  ['badge-bazaar-finish', 'assets/ui/badges/badge_bazaar_finish.png'],
  ['badge-temple-gate-truth', 'assets/ui/badges/badge_temple_gate_truth.png'],
  ['badge-temple-candle-ra', 'assets/ui/badges/badge_temple_candle_ra.png'],
  ['badge-temple-hieroglyphs', 'assets/ui/badges/badge_temple_hieroglyphs.png'],
  ['badge-temple-false-gold', 'assets/ui/badges/badge_temple_false_gold.png'],
  ['badge-temple-painted-prophecy', 'assets/ui/badges/badge_temple_painted_prophecy.png'],
  ['badge-temple-scarab-board', 'assets/ui/badges/badge_temple_scarab_board.png'],
  ['badge-temple-stairway-sun', 'assets/ui/badges/badge_temple_stairway_sun.png'],
  ['badge-temple-finish', 'assets/ui/badges/badge_temple_finish.png'],
] as const


function createBadgeIcon(
  scene: Phaser.Scene,
  badge: BadgeDefinition | undefined,
  x: number,
  y: number,
  size: number,
  earned = true,
): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
  if (badge?.iconKey && scene.textures.exists(badge.iconKey)) {
    const icon = scene.add.image(x, y, badge.iconKey)

    icon.setDisplaySize(size, size)
    icon.setOrigin(0.5)

    if (!earned) {
      // Keep locked artwork recognizable instead of turning it into an
      // almost-black silhouette. The reduced saturation/alpha still makes
      // its locked state obvious.
      icon.setTint(0x9a8d7c)
      icon.setAlpha(0.62)
    }

    return icon
  }

  const symbol = scene.add.text(x, y, badge?.symbol ?? '◆', {
    fontFamily: 'Georgia',
    fontSize: `${Math.max(8, Math.round(size * 0.44))}px`,
    color: earned ? '#fff7cf' : '#8f867c',
    fontStyle: 'bold',
  })

  symbol.setOrigin(0.5)
  return symbol
}


class BadgeTracker {
  public readonly container: Phaser.GameObjects.Container

  private readonly scene: Phaser.Scene
  private readonly objectiveBox: ObjectiveBox
  private readonly onOpen: () => void
  private category: BadgeCategory
  private externallyVisible = true
  private progressExpanded = false
  private progressTimer?: Phaser.Time.TimerEvent
  private progressTween?: Phaser.Tweens.Tween
  private progressPanel?: Phaser.GameObjects.Container

  constructor(
    scene: Phaser.Scene,
    objectiveBox: ObjectiveBox,
    category: BadgeCategory,
    onOpen: () => void,
  ) {
    this.scene = scene
    this.objectiveBox = objectiveBox
    this.category = category
    this.onOpen = onOpen

    // The compact button sits inside the ObjectiveBox, so it must render
    // slightly above the objective background and text.
    this.container = scene.add.container(0, 0)
    this.container.setScrollFactor(0)
    this.container.setDepth(41000)

    this.render()
  }

  setCategory(category: BadgeCategory) {
    if (this.category === category) return

    this.category = category
    this.render()
  }

  setVisible(visible: boolean) {
    this.externallyVisible = visible
    this.container.setVisible(visible)
  }

  refresh() {
    this.render()
  }

  showTemporaryProgress(duration = 3000) {
    this.progressTimer?.remove(false)
    this.progressTimer = undefined

    this.progressExpanded = true
    this.render()

    const panel = this.progressPanel

    if (panel) {
      panel.setAlpha(0)
      panel.setScale(0.82, 1)
      panel.y += 4

      this.progressTween?.remove()
      this.progressTween = this.scene.tweens.add({
        targets: panel,
        alpha: 1,
        scaleX: 1,
        y: panel.y - 4,
        duration: 240,
        ease: 'Back.easeOut',
      })
    }

    this.progressTimer = this.scene.time.delayedCall(duration, () => {
      this.hideTemporaryProgress()
    })
  }

  destroy() {
    this.progressTimer?.remove(false)
    this.progressTimer = undefined

    this.progressTween?.remove()
    this.progressTween = undefined
  }

  private hideTemporaryProgress() {
    this.progressTimer?.remove(false)
    this.progressTimer = undefined

    if (!this.progressExpanded) return

    const panel = this.progressPanel

    if (!panel) {
      this.progressExpanded = false
      this.render()
      return
    }

    this.progressTween?.remove()
    this.progressTween = this.scene.tweens.add({
      targets: panel,
      alpha: 0,
      scaleX: 0.9,
      y: panel.y - 3,
      duration: 170,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.progressExpanded = false
        this.progressTween = undefined
        this.render()
      },
    })
  }

  private render() {
    this.progressTween?.remove()
    this.progressTween = undefined
    this.progressPanel = undefined

    this.container.removeAll(true)

    const bounds = this.objectiveBox.getScreenBounds()
    const categoryInfo = BADGE_CATEGORIES[this.category]
    const categoryBadges = getBadgesForCategory(this.category)
    const earned = new Set(getEarnedBadgeIds())
    const unseenCount = getUnseenBadgeIds().length

    // ---------------------------------------------------------------------
    // Compact badge button inside the right side of the ObjectiveBox.
    // ---------------------------------------------------------------------
    const buttonRadius = 11
    const buttonX = bounds.x + bounds.width - 17
    const buttonY = bounds.y + bounds.height / 2
    const questBadge =
      categoryBadges.find((badge) => badge.kind === 'quest') ??
      categoryBadges[0]

    const buttonGlow = this.scene.add.circle(
      buttonX,
      buttonY,
      buttonRadius + 2,
      categoryInfo.accent,
      unseenCount > 0 ? 0.22 : 0.08,
    )

    const buttonOuter = this.scene.add.circle(
      buttonX,
      buttonY,
      buttonRadius,
      0x241408,
      0.98,
    )
    buttonOuter.setStrokeStyle(
      unseenCount > 0 ? 3 : 2,
      unseenCount > 0 ? 0xffdf83 : categoryInfo.accent,
      1,
    )
    buttonOuter.setInteractive({ useHandCursor: true })
    buttonOuter.on('pointerdown', this.onOpen)

    const buttonInner = this.scene.add.circle(
      buttonX,
      buttonY,
      7,
      categoryInfo.accent,
      0.92,
    )
    buttonInner.setInteractive({ useHandCursor: true })
    buttonInner.on('pointerdown', this.onOpen)

    const buttonSymbol = createBadgeIcon(
      this.scene,
      questBadge,
      buttonX,
      buttonY,
      18,
      true,
    )
    buttonSymbol.setInteractive({ useHandCursor: true })
    buttonSymbol.on('pointerdown', this.onOpen)

    const keyHint = this.scene.add.text(
      buttonX,
      buttonY + 15,
      'J',
      {
        fontFamily: 'Arial',
        fontSize: '7px',
        color: '#d6c7ae',
        fontStyle: 'bold',
      },
    )
    keyHint.setOrigin(0.5)

    const buttonObjects: Phaser.GameObjects.GameObject[] = [
      buttonGlow,
      buttonOuter,
      buttonInner,
      buttonSymbol,
      keyHint,
    ]

    if (unseenCount > 0) {
      const dotX = buttonX + 9
      const dotY = buttonY - 9
      const notificationDot = this.scene.add.circle(
        dotX,
        dotY,
        unseenCount > 9 ? 6 : 5,
        0xffd166,
        1,
      )
      notificationDot.setStrokeStyle(2, 0x241408, 1)

      const notificationText = this.scene.add.text(
        dotX,
        dotY,
        unseenCount > 9 ? '9+' : String(unseenCount),
        {
          fontFamily: 'Arial',
          fontSize: unseenCount > 9 ? '6px' : '7px',
          color: '#241408',
          fontStyle: 'bold',
        },
      )
      notificationText.setOrigin(0.5)

      buttonObjects.push(notificationDot, notificationText)
    }

    this.container.add(buttonObjects)

    // Soft breathing animation only when there are unseen badges.
    if (unseenCount > 0) {
      this.scene.tweens.add({
        targets: buttonGlow,
        scaleX: 1.18,
        scaleY: 1.18,
        alpha: 0.06,
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }

    // ---------------------------------------------------------------------
    // Temporary progress strip. It expands leftward from the badge button
    // after a badge is earned, then collapses automatically.
    // ---------------------------------------------------------------------
    if (this.progressExpanded) {
      const slotGap = categoryBadges.length > 5 ? 24 : 29
      const titleWidth = 72
      const stripWidth = Math.max(
        154,
        titleWidth + 20 + Math.max(0, categoryBadges.length - 1) * slotGap + 28,
      )
      const stripHeight = 34

      // Anchor at the right edge of the objective box so the strip expands
      // leftward and never enters the minimap area.
      const strip = this.scene.add.container(
        bounds.x + bounds.width,
        bounds.bottom + 5,
      )

      const stripBg = this.scene.add.rectangle(
        0,
        0,
        stripWidth,
        stripHeight,
        0x120b06,
        0.9,
      )
      stripBg.setOrigin(1, 0)
      stripBg.setStrokeStyle(2, categoryInfo.accent, 0.88)
      stripBg.setInteractive({ useHandCursor: true })
      stripBg.on('pointerdown', this.onOpen)

      const stripTitle = this.scene.add.text(
        -stripWidth + 11,
        stripHeight / 2,
        `${categoryInfo.shortTitle}\nBADGES`,
        {
          fontFamily: 'Georgia',
          fontSize: '8px',
          color: '#ffe7a3',
          fontStyle: 'bold',
          align: 'center',
          lineSpacing: -1,
        },
      )
      stripTitle.setOrigin(0, 0.5)

      const slotStartX =
        -stripWidth + titleWidth + 19

      const slotObjects: Phaser.GameObjects.GameObject[] = []

      categoryBadges.forEach((badge, index) => {
        const x = slotStartX + index * slotGap
        const y = stripHeight / 2
        const isEarned = earned.has(badge.id)
        const isMajor = badge.kind === 'quest'
        const fill = isEarned ? categoryInfo.accent : 0x29241f
        const stroke = isEarned ? 0xffdf83 : 0x6d6257

        const slot = isMajor
          ? this.scene.add.rectangle(x, y, 14, 14, fill, 1).setAngle(45)
          : this.scene.add.circle(x, y, 7, fill, 1)

        slot.setStrokeStyle(1.5, stroke, 1)

        const symbol = createBadgeIcon(
          this.scene,
          badge,
          x,
          y,
          isMajor ? 22 : 20,
          isEarned,
        )

        slotObjects.push(slot, symbol)
      })

      strip.add([stripBg, stripTitle, ...slotObjects])
      this.container.add(strip)
      this.progressPanel = strip
    }

    this.container.setVisible(this.externallyVisible)
  }
}

class BadgeCollectionPopup {
  public readonly container: Phaser.GameObjects.Container

  private readonly scene: Phaser.Scene
  private readonly onClose: () => void
  private selectedBadgeId = BADGES[0]?.id ?? ''

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene
    this.onClose = onClose

    this.container = scene.add.container(0, 0)
    this.container.setScrollFactor(0)
    this.container.setDepth(120000)
    this.container.setVisible(false)

    this.render()
  }

  isOpen() {
    return this.container.visible
  }

  open() {
    markAllBadgesSeen(this.scene)
    this.render()
    this.container.setVisible(true)
    this.container.setAlpha(0)
    this.container.setScale(0.97)

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut',
    })
  }

  close() {
    if (!this.container.visible) return

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.98,
      duration: 130,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.container.setVisible(false)
        this.container.setAlpha(1)
        this.container.setScale(1)
        this.onClose()
      },
    })
  }

  refresh() {
    if (this.container.visible) {
      this.render()
    }
  }

  resize() {
    this.render()
  }

  private render() {
    const wasVisible = this.container.visible
    this.container.removeAll(true)

    const screenWidth = this.scene.scale.width
    const screenHeight = this.scene.scale.height
    const panelWidth = Math.min(760, Math.max(430, screenWidth - 28))
    const panelHeight = Math.min(520, Math.max(430, screenHeight - 28))
    const panelX = Math.round((screenWidth - panelWidth) / 2)
    const panelY = Math.round((screenHeight - panelHeight) / 2)
    const earned = new Set(getEarnedBadgeIds())

    const dimmer = this.scene.add.rectangle(
      0,
      0,
      screenWidth,
      screenHeight,
      0x050301,
      0.78,
    )
    dimmer.setOrigin(0)
    dimmer.setInteractive()

    const panel = this.scene.add.rectangle(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      0x1d1209,
      0.98,
    )
    panel.setOrigin(0)
    panel.setStrokeStyle(3, 0xd5a84b, 1)

    const innerFrame = this.scene.add.rectangle(
      panelX + 8,
      panelY + 8,
      panelWidth - 16,
      panelHeight - 16,
      0x000000,
      0,
    )
    innerFrame.setOrigin(0)
    innerFrame.setStrokeStyle(1, 0x4aa7a3, 0.72)

    const title = this.scene.add.text(
      panelX + 24,
      panelY + 17,
      'BADGE COLLECTION',
      {
        fontFamily: 'Georgia',
        fontSize: '24px',
        color: '#ffe7a3',
        fontStyle: 'bold',
      },
    )

    const total = this.scene.add.text(
      panelX + 25,
      panelY + 47,
      `${earned.size} / ${BADGES.length} earned`,
      {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#7de0d3',
      },
    )

    const closeButton = this.scene.add.text(
      panelX + panelWidth - 22,
      panelY + 22,
      '×',
      {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      },
    )
    closeButton.setOrigin(0.5)
    closeButton.setInteractive({ useHandCursor: true })
    closeButton.on('pointerdown', () => this.close())

    const categoryOrder: BadgeCategory[] = [
      'fake-hotel',
      'bazaar',
      'pyramid',
      'temple',
    ]

    const rowStartY = panelY + 76
    const detailsHeight = 84
    const rowAreaHeight = panelHeight - 76 - detailsHeight - 18
    const rowHeight = Math.floor(rowAreaHeight / categoryOrder.length)
    const rowObjects: Phaser.GameObjects.GameObject[] = []

    categoryOrder.forEach((category, rowIndex) => {
      const info = BADGE_CATEGORIES[category]
      const badges = getBadgesForCategory(category)
      const rowY = rowStartY + rowIndex * rowHeight
      const rowBg = this.scene.add.rectangle(
        panelX + 18,
        rowY,
        panelWidth - 36,
        rowHeight - 6,
        rowIndex % 2 === 0 ? 0x2a1a0d : 0x23160b,
        0.86,
      )
      rowBg.setOrigin(0)
      rowBg.setStrokeStyle(1, info.accent, 0.35)

      const categoryEarned = badges.filter((badge) =>
        earned.has(badge.id),
      ).length

      const rowTitle = this.scene.add.text(
        panelX + 31,
        rowY + 10,
        info.title.toUpperCase(),
        {
          fontFamily: 'Georgia',
          fontSize: '13px',
          color: '#ffe7a3',
          fontStyle: 'bold',
        },
      )

      const progress = this.scene.add.text(
        panelX + 31,
        rowY + 29,
        `${categoryEarned}/${badges.length}`,
        {
          fontFamily: 'Arial',
          fontSize: '11px',
          color: '#cfc2ad',
        },
      )

      const slotAreaX = panelX + 172
      const slotAreaWidth = panelWidth - 214
      const slotGap =
        badges.length > 1
          ? Math.min(62, slotAreaWidth / (badges.length - 1))
          : 0
      const groupWidth = slotGap * Math.max(0, badges.length - 1)
      const firstSlotX =
        badges.length === 1
          ? slotAreaX
          : slotAreaX + (slotAreaWidth - groupWidth) / 2

      const badgeObjects: Phaser.GameObjects.GameObject[] = []

      badges.forEach((badge, index) => {
        const slotX = firstSlotX + index * slotGap
        const slotY = rowY + Math.floor((rowHeight - 6) / 2)
        const isEarned = earned.has(badge.id)
        const isSelected = this.selectedBadgeId === badge.id
        const isMajor = badge.kind === 'quest'
        const iconSize = Math.max(
          40,
          Math.min(isMajor ? 62 : 56, rowHeight - 18),
        )
        const hitSize = Math.max(48, iconSize + 8)

        // The PNG already contains its own gold medallion frame. Use an
        // invisible hit area rather than drawing a second circle/diamond
        // around it.
        const hitArea = this.scene.add.rectangle(
          slotX,
          slotY,
          hitSize,
          hitSize,
          0x000000,
          0.001,
        )
        hitArea.setInteractive({ useHandCursor: true })
        hitArea.on('pointerdown', () => {
          this.selectedBadgeId = badge.id
          this.scene.time.delayedCall(0, () => this.render())
        })

        const selectionGlow = this.scene.add.circle(
          slotX,
          slotY,
          iconSize * 0.47,
          isEarned ? info.accent : 0x5d554c,
          isSelected ? 0.2 : 0,
        )
        selectionGlow.setStrokeStyle(
          isSelected ? 2 : 0,
          isEarned ? 0xffdf83 : 0xb0a79d,
          isSelected ? 0.95 : 0,
        )

        const symbol = createBadgeIcon(
          this.scene,
          badge,
          slotX,
          slotY,
          iconSize,
          isEarned,
        )
        symbol.setInteractive({ useHandCursor: true })
        symbol.on('pointerdown', () => {
          this.selectedBadgeId = badge.id
          this.scene.time.delayedCall(0, () => this.render())
        })

        badgeObjects.push(selectionGlow, hitArea, symbol)
      })

      rowObjects.push(rowBg, rowTitle, progress, ...badgeObjects)
    })

    const selectedBadge =
      BADGE_BY_ID.get(this.selectedBadgeId) ?? BADGES[0]
    const selectedEarned = selectedBadge
      ? earned.has(selectedBadge.id)
      : false
    const detailY = panelY + panelHeight - detailsHeight - 10

    const detailBg = this.scene.add.rectangle(
      panelX + 18,
      detailY,
      panelWidth - 36,
      detailsHeight,
      0x100a05,
      0.92,
    )
    detailBg.setOrigin(0)
    detailBg.setStrokeStyle(1, 0xd5a84b, 0.55)

    const detailName = this.scene.add.text(
      panelX + 31,
      detailY + 12,
      selectedBadge?.name ?? 'Select a badge',
      {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: selectedEarned ? '#ffe7a3' : '#a8a097',
        fontStyle: 'bold',
      },
    )

    const detailStatus = this.scene.add.text(
      panelX + panelWidth - 31,
      detailY + 13,
      selectedEarned ? 'EARNED' : 'LOCKED',
      {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: selectedEarned ? '#7de0d3' : '#9a9188',
        fontStyle: 'bold',
      },
    )
    detailStatus.setOrigin(1, 0)

    const detailDescription = this.scene.add.text(
      panelX + 31,
      detailY + 38,
      selectedBadge?.description ?? '',
      {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#e4d8c4',
        wordWrap: {
          width: panelWidth - 62,
          useAdvancedWrap: true,
        },
      },
    )

    const footer = this.scene.add.text(
      panelX + panelWidth / 2,
      panelY + panelHeight - 5,
      'Press J or ESC to close',
      {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#aa9d89',
      },
    )
    footer.setOrigin(0.5, 1)

    this.container.add([
      dimmer,
      panel,
      innerFrame,
      title,
      total,
      closeButton,
      ...rowObjects,
      detailBg,
      detailName,
      detailStatus,
      detailDescription,
      footer,
    ])

    this.container.setVisible(wasVisible)
  }
}

class BadgeToast {
  public readonly container: Phaser.GameObjects.Container

  private readonly scene: Phaser.Scene
  private readonly queue: BadgeDefinition[] = []
  private readonly toastHeight = 86
  private active = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.container = scene.add.container(0, 0)
    this.container.setScrollFactor(0)
    this.container.setDepth(130000)
    this.container.setVisible(false)
    this.resize()
  }

  enqueue(badge: BadgeDefinition) {
    this.queue.push(badge)
    this.showNext()
  }

  resize() {
    this.container.setPosition(
      this.scene.scale.width / 2,
      this.getCenteredY(),
    )
  }

  private getCenteredY() {
    return Math.round(
      this.scene.scale.height / 2 - this.toastHeight / 2,
    )
  }

  private showNext() {
    if (this.active) return

    const badge = this.queue.shift()
    if (!badge) return

    this.active = true
    this.container.removeAll(true)

    const info = BADGE_CATEGORIES[badge.category]
    const width = Math.min(390, this.scene.scale.width - 28)
    const height = this.toastHeight

    const bg = this.scene.add.rectangle(0, 0, width, height, 0x1b1008, 0.97)
    bg.setOrigin(0.5, 0)
    bg.setStrokeStyle(3, 0xd5a84b, 1)

    const accent = this.scene.add.rectangle(
      -width / 2 + 4,
      4,
      5,
      height - 8,
      info.accent,
      1,
    )
    accent.setOrigin(0, 0)

    const medal = this.scene.add.circle(-width / 2 + 43, 43, 24, 0x2a190c, 1)
    medal.setStrokeStyle(3, info.accent, 1)

    const medalInner = this.scene.add.circle(
      -width / 2 + 43,
      43,
      17,
      info.accent,
      0.82,
    )

    const symbol = createBadgeIcon(
      this.scene,
      badge,
      -width / 2 + 43,
      43,
      54,
      true,
    )

    const heading = this.scene.add.text(
      -width / 2 + 80,
      15,
      badge.kind === 'quest' ? 'QUEST BADGE EARNED' : 'BADGE EARNED',
      {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#7de0d3',
        fontStyle: 'bold',
      },
    )

    const name = this.scene.add.text(
      -width / 2 + 80,
      32,
      badge.name,
      {
        fontFamily: 'Georgia',
        fontSize: '19px',
        color: '#ffe7a3',
        fontStyle: 'bold',
      },
    )

    const category = this.scene.add.text(
      -width / 2 + 80,
      59,
      BADGE_CATEGORIES[badge.category].title,
      {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#d8cdbb',
      },
    )

    this.container.add([
      bg,
      accent,
      medal,
      medalInner,
      symbol,
      heading,
      name,
      category,
    ])

    const centeredY = this.getCenteredY()

    this.resize()
    this.container.setVisible(true)
    this.container.setAlpha(0)
    this.container.setScale(0.94)
    this.container.y = centeredY + 18

    this.scene.tweens.add({
      targets: this.container,
      y: centeredY,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(2300, () => {
          const exitY = this.getCenteredY() - 14

          this.scene.tweens.add({
            targets: this.container,
            y: exitY,
            alpha: 0,
            scaleX: 0.97,
            scaleY: 0.97,
            duration: 220,
            ease: 'Sine.easeIn',
            onComplete: () => {
              this.container.setVisible(false)
              this.container.setAlpha(1)
              this.container.setScale(1)
              this.active = false
              this.showNext()
            },
          })
        })
      },
    })
  }
}

export default class BadgeUI {
  private readonly scene: Phaser.Scene
  private readonly canOpenCollection: CanOpenCollection
  private readonly tracker: BadgeTracker
  private readonly collection: BadgeCollectionPopup
  private readonly toast: BadgeToast
  private badgeIconsLoading = false
  private visible = true

  constructor(
    scene: Phaser.Scene,
    objectiveBox: ObjectiveBox,
    initialCategory: BadgeCategory,
    canOpenCollection: CanOpenCollection = () => true,
  ) {
    this.scene = scene
    this.canOpenCollection = canOpenCollection

    // Keep objective text clear of the compact badge medallion.
    objectiveBox.setRightAccessoryWidth(38)

    this.collection = new BadgeCollectionPopup(scene, () => {})
    this.toast = new BadgeToast(scene)
    this.tracker = new BadgeTracker(
      scene,
      objectiveBox,
      initialCategory,
      () => this.openCollection(),
    )

    scene.events.on(BADGE_AWARDED_EVENT, this.handleBadgeAwarded, this)
    scene.events.on(
      BADGE_PROGRESS_CHANGED_EVENT,
      this.handleProgressChanged,
      this,
    )
    scene.events.on(
      OBJECTIVE_BOX_LAYOUT_EVENT,
      this.handleObjectiveLayoutChanged,
      this,
    )

    scene.input.keyboard?.on('keydown-J', this.toggleCollection, this)
    scene.input.keyboard?.on('keydown-ESC', this.closeCollection, this)
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)

    this.ensureBadgeIconsLoaded()
  }

  private ensureBadgeIconsLoaded() {
    if (this.badgeIconsLoading) return

    const missingAssets = BADGE_ICON_ASSETS.filter(
      ([key]) => !this.scene.textures.exists(key),
    )

    if (missingAssets.length === 0) {
      this.refreshBadgeViews()
      return
    }

    this.badgeIconsLoading = true

    missingAssets.forEach(([key, path]) => {
      this.scene.load.image(key, path)
    })

    const handleLoadError = (file: Phaser.Loader.File) => {
      if (!String(file.key).startsWith('badge-')) return

      console.error(
        `Badge icon failed to load: ${file.key}`,
        file.src,
      )
    }

    this.scene.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      handleLoadError,
    )

    this.scene.load.once(
      Phaser.Loader.Events.COMPLETE,
      () => {
        this.badgeIconsLoading = false
        this.scene.load.off(
          Phaser.Loader.Events.FILE_LOAD_ERROR,
          handleLoadError,
        )
        this.refreshBadgeViews()
      },
    )

    if (!this.scene.load.isLoading()) {
      this.scene.load.start()
    }
  }

  private refreshBadgeViews() {
    this.tracker.refresh()
    this.collection.refresh()
  }

  award(badgeId: string) {
    return awardBadge(this.scene, badgeId)
  }

  sync(badgeIds: string[]) {
    syncBadges(this.scene, badgeIds)
  }

  setCategory(category: BadgeCategory) {
    this.tracker.setCategory(category)
  }

  setVisible(visible: boolean) {
    this.visible = visible
    this.tracker.setVisible(visible)

    if (!visible) {
      this.collection.close()
    }
  }

  isCollectionOpen() {
    return this.collection.isOpen()
  }

  getCameraObjects(): Phaser.GameObjects.GameObject[] {
    return [
      this.tracker.container,
      this.collection.container,
      this.toast.container,
    ]
  }

  private openCollection() {
    if (!this.visible) return
    if (!this.canOpenCollection()) return
    if (this.collection.isOpen()) return

    this.collection.open()
    this.tracker.refresh()
  }

  private toggleCollection() {
    if (this.collection.isOpen()) {
      this.collection.close()
      return
    }

    this.openCollection()
  }

  private closeCollection() {
    this.collection.close()
  }

  private handleBadgeAwarded(badge: BadgeDefinition) {
    this.tracker.refresh()
    this.tracker.showTemporaryProgress(3000)
    this.collection.refresh()
    this.toast.enqueue(badge)
  }

  private handleProgressChanged() {
    this.tracker.refresh()
    this.collection.refresh()
  }

  private handleObjectiveLayoutChanged() {
    this.tracker.refresh()
  }

  private handleResize() {
    this.tracker.refresh()
    this.collection.resize()
    this.toast.resize()
  }

  private destroy() {
    this.tracker.destroy()

    this.scene.events.off(
      BADGE_AWARDED_EVENT,
      this.handleBadgeAwarded,
      this,
    )
    this.scene.events.off(
      BADGE_PROGRESS_CHANGED_EVENT,
      this.handleProgressChanged,
      this,
    )
    this.scene.events.off(
      OBJECTIVE_BOX_LAYOUT_EVENT,
      this.handleObjectiveLayoutChanged,
      this,
    )
    this.scene.input.keyboard?.off('keydown-J', this.toggleCollection, this)
    this.scene.input.keyboard?.off('keydown-ESC', this.closeCollection, this)
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
  }
}