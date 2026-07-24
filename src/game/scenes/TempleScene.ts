import Phaser from 'phaser'
import DialogueBox from '../ui/DialogueBox'
import ObjectiveBox from '../ui/ObjectiveBox'
import GameHUD from '../ui/GameHUD'
import BadgeUI from '../ui/BadgeUI'
import TempleChallengePopup, {
  type TempleTrialId,
  type TempleTrialResult,
} from '../ui/TempleChallengePopup'
import { startOrResumeSharedCountdown } from '../utils/utility'
import {
  loadGameProgress,
  saveGameProgress,
} from '../utils/progressSave'

type TempleSceneData = {
  coins?: number
  reputation?: number
  remainingSeconds?: number
  resume?: boolean
  fromVillage?: boolean
}

type TempleTrialConfig = {
  id: TempleTrialId
  pointName: string
  title: string
  objective: string
  badgeId: string
}

const TEMPLE_TRIALS: TempleTrialConfig[] = [
  {
    id: 'truth-gate',
    pointName: 'TrialTruthGate',
    title: 'Gate of Truth',
    objective: 'Objective: Complete Trial 1 — Gate of Truth.',
    badgeId: 'temple-scarab',
  },
  {
    id: 'candle-of-ra',
    pointName: 'TrialCandleOfRa',
    title: 'Candle of Ra',
    objective: 'Objective: Complete Trial 2 — Candle of Ra.',
    badgeId: 'temple-eye',
  },
  {
    id: 'glyph-memory',
    pointName: 'TrialGlyphMemory',
    title: 'Hall of Hieroglyphs',
    objective: 'Objective: Complete Trial 3 — Hall of Hieroglyphs.',
    badgeId: 'temple-ankh',
  },
  {
    id: 'false-gold',
    pointName: 'TrialFalseGold',
    title: 'Treasury of False Gold',
    objective: 'Objective: Complete Trial 4 — Treasury of False Gold.',
    badgeId: 'temple-falcon',
  },
  {
    id: 'painted-prophecy',
    pointName: 'TrialPaintedProphecy',
    title: 'Painted Prophecy',
    objective: 'Objective: Complete Trial 5 — Painted Prophecy.',
    badgeId: 'temple-lotus',
  },
  {
    id: 'scarab-board',
    pointName: 'TrialScarabBoard',
    title: 'Sacred Scarab Board',
    objective: 'Objective: Complete Trial 6 — Sacred Scarab Board.',
    badgeId: 'temple-sun',
  },
  {
    id: 'stairway-sun',
    pointName: 'TrialStairwaySun',
    title: 'Stairway to the Sun',
    objective: 'Objective: Complete Trial 7 — Stairway to the Sun.',
    badgeId: 'temple-crown',
  },
]

const TRIAL_LABELS: Record<TempleTrialId, string> = {
  'truth-gate': 'Gate of Truth',
  'candle-of-ra': 'Candle of Ra',
  'glyph-memory': 'Hall of Hieroglyphs',
  'false-gold': 'Treasury of False Gold',
  'painted-prophecy': 'Painted Prophecy',
  'scarab-board': 'Sacred Scarab Board',
  'stairway-sun': 'Stairway to the Sun',
}

type TempleDisplayObject = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Depth &
  Phaser.GameObjects.Components.Visible

export default class TempleScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private keys!: any
  private interactKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key
  private debugCoordKey!: Phaser.Input.Keyboard.Key

  private dialogue!: DialogueBox
  private objectiveBox!: ObjectiveBox
  private hud!: GameHUD
  private badgeUI!: BadgeUI
  private templePopup!: TempleChallengePopup

  private worldObjects: Phaser.GameObjects.GameObject[] = []
  private uiCamera!: Phaser.Cameras.Scene2D.Camera
  private interactPrompt!: Phaser.GameObjects.Container
  private interactPromptBg!: Phaser.GameObjects.Rectangle
  private interactPromptText!: Phaser.GameObjects.Text

  private coins = 1000
  private reputation = 0
  private remainingSeconds = 3600
  private completedTempleTrials = new Set<string>()
  private templeIntroComplete = false

  private mapPixelWidth = 1024
  private mapPixelHeight = 2048
  private highPriest?: Phaser.GameObjects.Sprite
  private highPriestPoint?: Phaser.Math.Vector2
  private trialPoints = new Map<TempleTrialId, Phaser.Math.Vector2>()
  private templeExitPoint?: Phaser.Math.Vector2
  private trialMarkers = new Map<TempleTrialId, TempleDisplayObject[]>()
  private templeExitMarker?: Phaser.GameObjects.Container
  private templeQuestMarker?: Phaser.GameObjects.Container

  private minimap!: Phaser.Cameras.Scene2D.Camera
  private minimapBorder?: Phaser.GameObjects.Rectangle
  private minimapPlayerDot?: Phaser.GameObjects.Arc
  private minimapTargetDot?: Phaser.GameObjects.Arc
  private minimapPriestDot?: Phaser.GameObjects.Arc
  private minimapTrialDots = new Map<TempleTrialId, Phaser.GameObjects.Arc>()
  private readonly templeMinimapWidth = 92
  private minimapConfig = {
    x: 0,
    y: 0,
    width: 92,
    height: 184,
  }

  private stopGameTimer?: () => void
  private isTransitioning = false

  constructor() {
    super('TempleScene')
  }

  init(data?: TempleSceneData) {
    const savedProgress = data?.resume ? loadGameProgress() : null
    const existingSave = loadGameProgress()

    this.completedTempleTrials = new Set(
      savedProgress?.completedTempleTrials ??
        existingSave?.completedTempleTrials ??
        [],
    )

    this.templeIntroComplete = this.completedTempleTrials.size > 0

    if (savedProgress) {
      this.coins = savedProgress.coins
      this.reputation = savedProgress.reputation
      this.remainingSeconds = savedProgress.remainingSeconds
      return
    }

    if (typeof data?.coins === 'number') this.coins = data.coins
    if (typeof data?.reputation === 'number') this.reputation = data.reputation
    if (typeof data?.remainingSeconds === 'number') {
      this.remainingSeconds = data.remainingSeconds
    } else if (existingSave) {
      this.remainingSeconds = existingSave.remainingSeconds
    }
  }

  create() {
    this.worldObjects = []
    this.trialMarkers.clear()
    this.trialPoints.clear()
    this.isTransitioning = false

    const map = this.make.tilemap({ key: 'egypt_temple_final' })

    const background = this.add.image(0, 0, 'temple-final-background')
    background.setOrigin(0, 0)
    background.setDepth(0)
    this.worldObjects.push(background)

    this.mapPixelWidth = map.widthInPixels || background.width
    this.mapPixelHeight = map.heightInPixels || background.height

    this.physics.world.setBounds(0, 0, this.mapPixelWidth, this.mapPixelHeight)
    this.cameras.main.setBounds(0, 0, this.mapPixelWidth, this.mapPixelHeight)

    this.readTemplePoints(map)
    this.createPlayer(map)
    this.createCollisionObjects(map)
    this.createHighPriest()
    this.createTrialMarkers()
    this.createTempleExitMarker()
    this.createQuestTargetMarker()

    this.dialogue = new DialogueBox(this)
    this.objectiveBox = new ObjectiveBox(this)
    this.objectiveBox.setReservedMinimapWidth(this.templeMinimapWidth)
    this.objectiveBox.setText(
      this.templeIntroComplete
        ? this.getCurrentObjectiveText()
        : 'Objective: Listen to the High Priest.',
    )

    this.templePopup = new TempleChallengePopup(this)

    this.badgeUI = new BadgeUI(
      this,
      this.objectiveBox,
      'temple',
      () =>
        !this.dialogue.isOpen() &&
        !this.templePopup.open() &&
        !this.isTransitioning,
    )
    this.badgeUI.setCategory('temple')
    this.syncTempleBadges()

    this.createHud()
    this.createInteractPrompt()
    this.createMinimap(map)

    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.debugCoordKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C)

    const timerController = startOrResumeSharedCountdown(
      this,
      (remainingSeconds) => {
        this.remainingSeconds = remainingSeconds
        this.hud.setTime(remainingSeconds)
        this.saveProgress()
      },
      {
        totalSeconds: this.remainingSeconds,
      },
    )
    this.stopGameTimer = timerController.stop

    this.cameras.main.startFollow(this.player, true, 0.15, 0.15)
    this.cameras.main.setZoom(0.65)
    this.cameras.main.fadeIn(520, 18, 10, 5)

    this.createUICamera()

    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleTempleUIResize,
      this,
    )
    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.handleTempleUIResize,
      this,
    )
    this.handleTempleUIResize(this.scale.gameSize)

    this.refreshTrialMarkers()
    this.saveProgress()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(
        Phaser.Scale.Events.RESIZE,
        this.handleTempleUIResize,
        this,
      )
      this.stopGameTimer?.()
    })

    if (!this.templeIntroComplete) {
      this.startTempleIntroSequence()
    }
  }

  update() {
    if (!this.player) return

    if (Phaser.Input.Keyboard.JustDown(this.debugCoordKey)) {
      console.log('Temple player position:', {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
      })
    }

    this.updateInteractPrompt()
    this.updateQuestTargetMarker()
    this.updateMinimap()
    this.updateDepths()

    if (this.badgeUI?.isCollectionOpen()) {
      this.stopPlayer()
      return
    }

    if (this.templePopup?.open()) {
      this.stopPlayer()
      return
    }

    if (this.dialogue.isOpen()) {
      this.stopPlayer()
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.dialogue.next()
      }
      return
    }

    if (this.isTransitioning) {
      this.stopPlayer()
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (this.tryInteract()) return
    }

    this.handleMovement()
  }

  private readTemplePoints(map: Phaser.Tilemaps.Tilemap) {
    this.highPriestPoint = this.getPoint(map, 'HighPriest')
    this.templeExitPoint =
      this.getPoint(map, 'TempleEntrance') ??
      this.getPoint(map, 'TemplePlayerSpawn')

    TEMPLE_TRIALS.forEach((trial) => {
      const point = this.getPoint(map, trial.pointName)
      if (point) this.trialPoints.set(trial.id, point)
    })
  }

  private createPlayer(map: Phaser.Tilemaps.Tilemap) {
    const spawn = this.getPoint(map, 'TemplePlayerSpawn') ??
      new Phaser.Math.Vector2(this.mapPixelWidth / 2, this.mapPixelHeight - 80)

    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'player')
    this.player.setScale(1)
    this.player.setData('animKey', 'player')
    this.player.setDepth(this.player.y)
    this.player.setCollideWorldBounds(true)
    this.worldObjects.push(this.player)
  }

  private createCollisionObjects(map: Phaser.Tilemaps.Tilemap) {
    const collisionLayer = map.getObjectLayer('CollisionObjects')
    if (!collisionLayer) return

    collisionLayer.objects.forEach((obj) => {
      const wall = this.add.rectangle(
        (obj.x ?? 0) + (obj.width ?? 0) / 2,
        (obj.y ?? 0) + (obj.height ?? 0) / 2,
        obj.width ?? 0,
        obj.height ?? 0,
        0xff0000,
        0,
      )
      this.physics.add.existing(wall, true)
      this.physics.add.collider(this.player, wall)
      this.worldObjects.push(wall)
    })
  }

  private createHighPriest() {
    if (!this.highPriestPoint) return

    this.highPriest = this.add.sprite(
      this.highPriestPoint.x,
      this.highPriestPoint.y,
      'npc16',
      0,
    )
    this.highPriest.setScale(1.05)
    this.highPriest.setDepth(this.highPriest.y)
    this.worldObjects.push(this.highPriest)
  }

  private createTrialMarkers() {
    TEMPLE_TRIALS.forEach((trial) => {
      const point = this.trialPoints.get(trial.id)
      if (!point) return

      const glow = this.add.circle(point.x, point.y, 44, 0xd4af37, 0.14)
      const ring = this.add.circle(point.x, point.y, 38, 0x000000, 0)
      ring.setStrokeStyle(3, 0xd4af37, 0.85)
      const symbol = this.add.text(point.x, point.y - 3, '◆', {
        fontFamily: 'Georgia',
        fontSize: '22px',
        color: '#ffe7a3',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      })
      symbol.setOrigin(0.5)

      const labelBg = this.add.rectangle(point.x, point.y - 54, 210, 30, 0x241408, 0.92)
      labelBg.setStrokeStyle(2, 0xd4af37, 1)
      const label = this.add.text(point.x, point.y - 55, trial.title, {
        fontFamily: 'Georgia',
        fontSize: '13px',
        color: '#ffe7a3',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
      })
      label.setOrigin(0.5)

      const objects: TempleDisplayObject[] = [glow, ring, symbol, labelBg, label]
      objects.forEach((obj) => {
        obj.setDepth(9300)
        this.worldObjects.push(obj)
      })

      this.tweens.add({
        targets: glow,
        scaleX: 1.18,
        scaleY: 1.18,
        alpha: 0.05,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      this.trialMarkers.set(trial.id, objects)
    })
  }


  private createTempleExitMarker() {
    if (!this.templeExitPoint) return

    const point = this.templeExitPoint

    const glow = this.add.circle(point.x, point.y, 50, 0x66ccff, 0.14)
    glow.setStrokeStyle(2, 0xffd966, 0.65)

    const ring = this.add.circle(point.x, point.y, 38, 0x000000, 0)
    ring.setStrokeStyle(3, 0x66ccff, 0.9)

    const arrow = this.add.text(point.x, point.y - 4, '▼', {
      fontFamily: 'Georgia',
      fontSize: '26px',
      color: '#c7f7ff',
      stroke: '#000000',
      strokeThickness: 5,
      fontStyle: 'bold',
    })
    arrow.setOrigin(0.5)

    const labelBg = this.add.rectangle(point.x, point.y + 54, 184, 30, 0x120a04, 0.9)
    labelBg.setStrokeStyle(2, 0x66ccff, 0.9)

    const label = this.add.text(point.x, point.y + 53, 'Village Exit', {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#c7f7ff',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    })
    label.setOrigin(0.5)

    this.templeExitMarker = this.add.container(0, 0, [glow, ring, arrow, labelBg, label])
    this.templeExitMarker.setDepth(9300)
    this.worldObjects.push(this.templeExitMarker)

    this.tweens.add({
      targets: glow,
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: 0.05,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.tweens.add({
      targets: arrow,
      y: arrow.y + 8,
      duration: 680,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private createQuestTargetMarker() {
    // Match the small Bazaar-style objective marker instead of using a large
    // temple ring. This keeps the marker readable without covering the map art.
    const marker = this.add.text(0, 0, '!', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffd966',
      stroke: '#000000',
      strokeThickness: 5,
      fontStyle: 'bold',
    })
    marker.setOrigin(0.5)

    this.templeQuestMarker = this.add.container(0, 0, [marker])
    this.templeQuestMarker.setDepth(9500)
    this.templeQuestMarker.setVisible(false)
    this.worldObjects.push(this.templeQuestMarker)

    this.tweens.add({
      targets: marker,
      y: marker.y - 5,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private getCurrentQuestTargetPoint() {
    if (!this.templeIntroComplete) {
      return this.highPriestPoint
    }

    const nextTrial = this.getNextTrial()

    if (nextTrial) {
      return this.trialPoints.get(nextTrial.id)
    }

    // Once all seven trials are complete, the High Priest dialogue
    // automatically begins the chapter transition. No extra map marker is needed.
    return undefined
  }

  private updateQuestTargetMarker() {
    if (!this.templeQuestMarker) return

    const target = this.getCurrentQuestTargetPoint()

    if (!target || this.templePopup?.open() || this.isTransitioning) {
      this.templeQuestMarker.setVisible(false)
      return
    }

    const playerIsNearTarget =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        target.x,
        target.y,
      ) <= 110

    // Same behavior as Village/Bazaar: once the interaction prompt appears,
    // hide the exclamation mark so the two indicators do not stack.
    if (playerIsNearTarget && this.interactPrompt?.visible) {
      this.templeQuestMarker.setVisible(false)
      return
    }

    this.templeQuestMarker.setVisible(true)
    this.templeQuestMarker.setPosition(target.x, target.y - 45)
    this.templeQuestMarker.setDepth(target.y + 140)
  }

  private createMinimap(map: Phaser.Tilemaps.Tilemap) {
    this.mapPixelWidth = map.widthInPixels || this.mapPixelWidth
    this.mapPixelHeight = map.heightInPixels || this.mapPixelHeight

    const minimapWidth = this.templeMinimapWidth
    const minimapHeight = Math.round(
      minimapWidth * (this.mapPixelHeight / Math.max(1, this.mapPixelWidth)),
    )

    const padding = 12
    const x = this.scale.width - minimapWidth - padding
    const y = padding

    this.minimapConfig = {
      x,
      y,
      width: minimapWidth,
      height: minimapHeight,
    }

    this.minimap = this.cameras.add(x, y, minimapWidth, minimapHeight)
    this.minimap.setName('TempleMinimap')
    this.minimap.setBounds(0, 0, this.mapPixelWidth, this.mapPixelHeight)
    this.minimap.setZoom(
      Math.min(
        minimapWidth / Math.max(1, this.mapPixelWidth),
        minimapHeight / Math.max(1, this.mapPixelHeight),
      ),
    )
    this.minimap.centerOn(this.mapPixelWidth / 2, this.mapPixelHeight / 2)
    this.minimap.setBackgroundColor(0x100a05)

    this.minimapBorder = this.add.rectangle(
      x,
      y,
      minimapWidth,
      minimapHeight,
      0x000000,
      0.08,
    )
    this.minimapBorder.setOrigin(0)
    this.minimapBorder.setScrollFactor(0)
    this.minimapBorder.setDepth(20000)
    this.minimapBorder.setStrokeStyle(2, 0xffd966, 0.95)

    this.minimapPlayerDot = this.add.circle(x, y, 4.2, 0xff4444, 1)
    this.minimapPlayerDot.setScrollFactor(0)
    this.minimapPlayerDot.setDepth(20004)
    this.minimapPlayerDot.setStrokeStyle(1, 0xffffff, 0.95)

    this.minimapTargetDot = this.add.circle(x, y, 5.6, 0xffd966, 1)
    this.minimapTargetDot.setScrollFactor(0)
    this.minimapTargetDot.setDepth(20003)
    this.minimapTargetDot.setStrokeStyle(2, 0x000000, 0.95)

    if (this.highPriestPoint) {
      this.minimapPriestDot = this.add.circle(x, y, 4.4, 0x66ccff, 1)
      this.minimapPriestDot.setScrollFactor(0)
      this.minimapPriestDot.setDepth(20002)
      this.minimapPriestDot.setStrokeStyle(1, 0x000000, 0.95)
    }

    TEMPLE_TRIALS.forEach((trial) => {
      const point = this.trialPoints.get(trial.id)
      if (!point) return

      const dot = this.add.circle(x, y, 3.5, 0xbfa06a, 0.95)
      dot.setScrollFactor(0)
      dot.setDepth(20001)
      dot.setStrokeStyle(1, 0x000000, 0.9)
      this.minimapTrialDots.set(trial.id, dot)
    })

    const minimapUiObjects = [
      this.dialogue?.container,
      this.objectiveBox?.container,
      this.hud?.container,
      this.templePopup?.container,
      this.interactPrompt,
      this.minimapBorder,
      this.minimapPlayerDot,
      this.minimapTargetDot,
      this.minimapPriestDot,
      ...this.minimapTrialDots.values(),
      ...this.badgeUI.getCameraObjects(),
    ].filter(
      (object): object is Phaser.GameObjects.GameObject => Boolean(object),
    )

    this.minimap.ignore(minimapUiObjects)
  }

  private pointToMinimap(point: Phaser.Math.Vector2) {
    return {
      x:
        this.minimapConfig.x +
        Phaser.Math.Clamp(point.x / Math.max(1, this.mapPixelWidth), 0, 1) *
          this.minimapConfig.width,
      y:
        this.minimapConfig.y +
        Phaser.Math.Clamp(point.y / Math.max(1, this.mapPixelHeight), 0, 1) *
          this.minimapConfig.height,
    }
  }

  private updateMinimap() {
    if (!this.minimapPlayerDot || !this.minimapTargetDot) return

    const playerPosition = this.pointToMinimap(
      new Phaser.Math.Vector2(this.player.x, this.player.y),
    )

    this.minimapPlayerDot.setPosition(playerPosition.x, playerPosition.y)

    if (this.highPriestPoint && this.minimapPriestDot) {
      const priestPosition = this.pointToMinimap(this.highPriestPoint)
      this.minimapPriestDot.setPosition(priestPosition.x, priestPosition.y)
      this.minimapPriestDot.setVisible(true)
    }

    const nextTrial = this.getNextTrial()

    this.minimapTrialDots.forEach((dot, trialId) => {
      const point = this.trialPoints.get(trialId)
      if (!point) {
        dot.setVisible(false)
        return
      }

      const completed = this.completedTempleTrials.has(trialId)
      const isNext = nextTrial?.id === trialId
      const shouldShow = this.templeIntroComplete && (completed || isNext)

      if (!shouldShow) {
        dot.setVisible(false)
        return
      }

      const dotPosition = this.pointToMinimap(point)
      dot.setVisible(true)
      dot.setPosition(dotPosition.x, dotPosition.y)
      dot.setFillStyle(
        completed ? 0x72ff9b : isNext ? 0xffd966 : 0xbfa06a,
        completed ? 0.9 : 1,
      )
    })

    const target = this.getCurrentQuestTargetPoint()

    if (!target) {
      this.minimapTargetDot.setVisible(false)
      return
    }

    const targetPosition = this.pointToMinimap(target)
    this.minimapTargetDot.setVisible(true)
    this.minimapTargetDot.setPosition(targetPosition.x, targetPosition.y)
  }

  private createHud() {
    const hudWidth = 150
    const padding = 12
    const minimapHeight = Math.round(
      this.templeMinimapWidth *
        (this.mapPixelHeight / Math.max(1, this.mapPixelWidth)),
    )

    const hudX = this.scale.width - hudWidth - padding
    const hudY = padding + minimapHeight + 6

    this.hud = new GameHUD(this, hudX, hudY, hudWidth)
    this.hud.setCoins(this.coins)
    this.hud.setReputation(this.reputation)
    this.hud.setTime(this.remainingSeconds)
  }

  private handleTempleUIResize(gameSize: { width: number; height: number }) {
    const padding = 12
    const minimapWidth = this.templeMinimapWidth
    const minimapHeight = Math.round(
      minimapWidth *
        (this.mapPixelHeight / Math.max(1, this.mapPixelWidth)),
    )
    const minimapX = gameSize.width - minimapWidth - padding
    const minimapY = padding

    this.minimapConfig = {
      x: minimapX,
      y: minimapY,
      width: minimapWidth,
      height: minimapHeight,
    }

    this.minimap?.setViewport(
      minimapX,
      minimapY,
      minimapWidth,
      minimapHeight,
    )
    this.minimap?.centerOn(
      this.mapPixelWidth / 2,
      this.mapPixelHeight / 2,
    )

    this.minimapBorder
      ?.setPosition(minimapX, minimapY)
      .setSize(minimapWidth, minimapHeight)

    const hudWidth = 150
    this.hud?.container.setPosition(
      gameSize.width - hudWidth - padding,
      minimapY + minimapHeight + 6,
    )

    this.uiCamera?.setViewport(0, 0, gameSize.width, gameSize.height)
    this.updateMinimap()
  }

  private createInteractPrompt() {
    this.interactPromptBg = this.add.rectangle(0, 0, 96, 28, 0x000000, 0.78)
    this.interactPromptBg.setStrokeStyle(2, 0xffffff, 0.85)

    this.interactPromptText = this.add.text(0, 0, 'E Talk', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    this.interactPromptText.setOrigin(0.5)

    this.interactPrompt = this.add.container(0, 0, [
      this.interactPromptBg,
      this.interactPromptText,
    ])
    this.interactPrompt.setDepth(50000)
    this.interactPrompt.setVisible(false)
    this.worldObjects.push(this.interactPrompt)
  }

  private createUICamera() {
    const uiObjects: Phaser.GameObjects.GameObject[] = [
      this.dialogue?.container,
      this.objectiveBox?.container,
      this.hud?.container,
      this.templePopup?.container,
      this.minimapBorder,
      this.minimapPlayerDot,
      this.minimapTargetDot,
      this.minimapPriestDot,
      ...this.minimapTrialDots.values(),
      ...this.badgeUI.getCameraObjects(),
    ].filter(
      (object): object is Phaser.GameObjects.GameObject => Boolean(object),
    )

    this.cameras.main.ignore(uiObjects)

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height)
    this.uiCamera.setName('TempleUICamera')
    this.uiCamera.setScroll(0, 0)
    this.uiCamera.setZoom(1)
    this.uiCamera.ignore(this.worldObjects.filter(Boolean))
  }

  private startTempleIntroSequence() {
    this.isTransitioning = true
    this.objectiveBox.setText('Objective: Listen to the High Priest.')
    this.stopPlayer()

    if (this.highPriestPoint) {
      this.cameras.main.pan(this.highPriestPoint.x, this.highPriestPoint.y, 900, 'Sine.easeInOut')
    }

    this.time.delayedCall(950, () => {
      this.isTransitioning = false
      this.dialogue.show(
        [
          {
            text: 'High Priest: You have arrived.',
            portraitKey: 'npc16',
          },
          {
            text: 'The bazaar tested your cleverness. It taught you bargaining, patience, risk, and the cost of trusting too quickly.',
            portraitKey: 'npc16',
          },
          {
            text: 'But the temple is different. Here, gold alone means nothing.',
            portraitKey: 'npc16',
          },
          {
            text: 'Inside these walls are seven royal trials. Each trial will challenge you, and each trial will teach you.',
            portraitKey: 'npc16',
          },
          {
            text: 'Truth. Light. Memory. Judgment. History. Control. Endurance.',
            portraitKey: 'npc16',
          },
          {
            text: 'Pass them, and you will earn the Seven Temple Seals. Only then will the path to the pyramid open.',
            portraitKey: 'npc16',
          },
          {
            text: 'You entered Hahaland as a tourist. You survived as a trader. Now prove that you can rise as a king.',
            portraitKey: 'npc16',
          },
        ],
        () => {
          this.templeIntroComplete = true
          this.objectiveBox.setText(this.getCurrentObjectiveText())
          this.refreshTrialMarkers()
          this.cameras.main.startFollow(this.player, true, 0.15, 0.15)
          this.saveProgress()
        },
        'npc16',
      )
    })
  }

  private tryInteract() {
    const interaction = this.getAvailableInteraction()
    if (!interaction) return false
    interaction.action()
    return true
  }

  private getAvailableInteraction():
    | {
        label: string
        action: () => void
        point: Phaser.Math.Vector2
        promptOffsetY: number
      }
    | undefined {
    if (!this.templeIntroComplete) return undefined

    if (this.templeExitPoint && this.distanceTo(this.templeExitPoint) <= 96) {
      return {
        label: 'E Exit Temple',
        action: () => this.exitToVillage(),
        point: this.templeExitPoint,
        promptOffsetY: -55,
      }
    }

    if (this.highPriestPoint && this.distanceTo(this.highPriestPoint) <= 88) {
      return {
        label: 'E Talk',
        action: () => this.talkToHighPriest(),
        point: this.highPriestPoint,
        promptOffsetY: -45,
      }
    }

    const nextTrial = this.getNextTrial()
    if (nextTrial) {
      const point = this.trialPoints.get(nextTrial.id)
      if (point && this.distanceTo(point) <= 98) {
        return {
          label: `E ${nextTrial.title}`,
          action: () => this.startTrial(nextTrial.id),
          point,
          promptOffsetY: -88,
        }
      }
      return undefined
    }


    return undefined
  }

  private updateInteractPrompt() {
    const interaction = this.getAvailableInteraction()
    if (!interaction) {
      this.interactPrompt.setVisible(false)
      return
    }

    this.interactPromptText.setText(interaction.label)

    const promptWidth = Phaser.Math.Clamp(
      this.interactPromptText.width + 28,
      90,
      190,
    )

    this.interactPromptBg.setDisplaySize(promptWidth, 28)

    this.interactPrompt.setVisible(true)
    this.interactPrompt.setPosition(
      interaction.point.x,
      interaction.point.y + interaction.promptOffsetY,
    )
  }

  private talkToHighPriest() {
    const nextTrial = this.getNextTrial()

    if (nextTrial) {
      this.dialogue.show(
        [
          {
            text: `High Priest: You hold ${this.completedTempleTrials.size} temple seal${this.completedTempleTrials.size === 1 ? '' : 's'}.`,
            portraitKey: 'npc16',
          },
          {
            text: `Your next trial is ${nextTrial.title}. ${this.getTrialLesson(nextTrial.id)}`,
            portraitKey: 'npc16',
          },
        ],
        undefined,
        'npc16',
      )
      return
    }

    this.dialogue.show(
      [
        {
          text: 'High Priest: The seven seals are complete. The temple has seen enough.',
          portraitKey: 'npc16',
        },
        {
          text: 'Go to the pyramid. There, the final royal trials wait.',
          portraitKey: 'npc16',
        },
      ],
      undefined,
      'npc16',
    )
  }

  private startTrial(trialId: TempleTrialId) {
    this.stopPlayer()
    this.templePopup.show({
      trialId,
      alreadyCompleted: this.completedTempleTrials.has(trialId),
      onComplete: (result) => this.handleTrialComplete(result),
    })
  }

  private handleTrialComplete(result: TempleTrialResult) {
    this.coins = Math.max(0, this.coins + result.goldDelta)
    this.reputation = Phaser.Math.Clamp(this.reputation + result.reputationDelta, 0, 100)
    this.hud.setCoins(this.coins)
    this.hud.setReputation(this.reputation)

    const trial = TEMPLE_TRIALS.find((item) => item.id === result.trialId)

    if (result.success && trial && !this.completedTempleTrials.has(result.trialId)) {
      this.completedTempleTrials.add(result.trialId)
      this.badgeUI.award(trial.badgeId)
    }

    this.saveProgress()
    this.refreshTrialMarkers()

    const nextTrial = this.getNextTrial()

    if (nextTrial) {
      this.objectiveBox.setText(nextTrial.objective)
      this.dialogue.show(
        [
          {
            text: `High Priest: ${result.response}`,
            portraitKey: 'npc16',
          },
          {
            text: `Climb higher. ${nextTrial.title} waits.`,
            portraitKey: 'npc16',
          },
        ],
        undefined,
        'npc16',
      )
      return
    }

    this.badgeUI.award('temple-ascendant')
    this.objectiveBox.setText('Objective: Listen to the High Priest.')
    this.dialogue.show(
      [
        {
          text: `High Priest: ${result.response}`,
          portraitKey: 'npc16',
        },
        {
          text: 'Truth did not blind you. Wind did not stop you. Symbols did not confuse you. Gold did not fool you.',
          portraitKey: 'npc16',
        },
        {
          text: 'History did not reject you. Control did not fail you. The stairs did not defeat you.',
          portraitKey: 'npc16',
        },
        {
          text: 'The Seven Temple Seals are complete. The pyramid road is open.',
          portraitKey: 'npc16',
        },
      ],
      () => this.startPyramidRoadEnding(),
      'npc16',
    )
  }

  private startPyramidRoadEnding() {
    if (this.getNextTrial()) return
    if (this.isTransitioning) return

    this.isTransitioning = true
    this.stopPlayer()
    this.interactPrompt?.setVisible(false)
    this.templeQuestMarker?.setVisible(false)
    this.objectiveBox.setText('Objective: The Pyramid Quest begins.')

    const width = this.scale.width
    const height = this.scale.height

    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      1,
    )
    // Keep the shape's fill fully opaque and animate the Game Object alpha.
    // A rectangle created with fillAlpha 0 stays transparent even when its
    // object alpha is later tweened to 1.
    overlay.setAlpha(0)
    overlay.setScrollFactor(0)

    const title = this.add.text(
      width / 2,
      height / 2 - 30,
      'TEMPLE QUEST COMPLETE',
      {
        fontFamily: 'Georgia',
        fontSize: '30px',
        color: '#ffe7a3',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
        align: 'center',
      },
    )
    title.setOrigin(0.5)
    title.setScrollFactor(0)
    title.setAlpha(0)

    const subtitle = this.add.text(
      width / 2,
      height / 2 + 25,
      'Beyond the temple, the Great Pyramid awaits.',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#f5ead7',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      },
    )
    subtitle.setOrigin(0.5)
    subtitle.setScrollFactor(0)
    subtitle.setAlpha(0)

    const transitionObjects = [overlay, title, subtitle]
    transitionObjects.forEach((object) => object.setDepth(200000))

    // These belong to the UI camera so the blackout also covers the HUD.
    this.cameras.main.ignore(transitionObjects)

    // First complete the slow blackout. Only reveal the completion text
    // after the overlay is fully opaque, so the Temple map cannot show behind it.
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 1350,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        overlay.setAlpha(1)

        this.tweens.add({
          targets: [title, subtitle],
          alpha: 1,
          y: '-=8',
          duration: 720,
          ease: 'Sine.easeOut',
        })
      },
    })

    const existingSave = loadGameProgress()

    saveGameProgress({
      currentScene: 'VillageScene',
      coins: this.coins,
      reputation: this.reputation,
      remainingSeconds: this.remainingSeconds,
      completedMarkets: existingSave?.completedMarkets ?? [],
      completedTempleTrials: [...this.completedTempleTrials],
      earnedBadges: existingSave?.earnedBadges ?? [],
      unseenBadges: existingSave?.unseenBadges ?? [],
    })

    this.time.delayedCall(4050, () => {
      this.scene.start('VillageScene', {
        fromTemple: true,
        fromTempleComplete: true,
        spawnName: 'PyramidRoadSpawn',
        coins: this.coins,
        reputation: this.reputation,
        remainingSeconds: this.remainingSeconds,
      })
    })
  }

  private exitToVillage() {
    if (this.isTransitioning) return

    this.isTransitioning = true
    this.stopPlayer()
    this.saveProgress()

    this.cameras.main.fadeOut(420, 16, 9, 4)

    this.time.delayedCall(450, () => {
      this.scene.start('VillageScene', {
        fromTemple: true,
        spawnName: 'TempleEntrance',
        coins: this.coins,
        reputation: this.reputation,
        remainingSeconds: this.remainingSeconds,
      })
    })
  }

  private getTrialLesson(trialId: TempleTrialId) {
    const lessons: Record<TempleTrialId, string> = {
      'truth-gate': 'It will test whether your eyes can find truth among lies.',
      'candle-of-ra': 'It will test whether you can protect light under pressure.',
      'glyph-memory': 'It will test your memory and focus.',
      'false-gold': 'It will test your judgment against glittering deception.',
      'painted-prophecy': 'It will test whether you understand the story you are entering.',
      'scarab-board': 'It will test your control, balance, and patience.',
      'stairway-sun': 'It will test your endurance on the final climb.',
    }
    return lessons[trialId]
  }

  private syncTempleBadges() {
    const badgeIds = TEMPLE_TRIALS
      .filter((trial) => this.completedTempleTrials.has(trial.id))
      .map((trial) => trial.badgeId)

    if (this.completedTempleTrials.size >= TEMPLE_TRIALS.length) {
      badgeIds.push('temple-ascendant')
    }

    this.badgeUI.sync(badgeIds)
  }

  private refreshTrialMarkers() {
    const nextTrial = this.getNextTrial()
  
    this.trialMarkers.forEach((objects, trialId) => {
      const completed = this.completedTempleTrials.has(trialId)
      const isNext = nextTrial?.id === trialId
      const visible = this.templeIntroComplete && (completed || isNext)
  
      const glow = objects[0] as Phaser.GameObjects.Arc
      const ring = objects[1] as Phaser.GameObjects.Arc
      const symbol = objects[2] as Phaser.GameObjects.Text
      const labelBg = objects[3] as Phaser.GameObjects.Rectangle
      const label = objects[4] as Phaser.GameObjects.Text
  
      // Keep completed trials fully visible.
      objects.forEach((obj) => {
        obj.setVisible(visible)
        obj.setActive(visible)
        obj.setAlpha(completed ? 0.6 : 1)
      })
  
      if (!visible) return
  
      if (completed) {
        // Achieved appearance: teal glow, strong gold ring and check mark.
        glow.setFillStyle(0x2bbfae, 0.28)
  
        ring.setStrokeStyle(5, 0xffd966, 1)
  
        symbol
          .setText('✓')
          .setColor('#72ffb0')
          .setFontSize(25)
  
        labelBg.setFillStyle(0x123f3b, 0.97)
        labelBg.setStrokeStyle(3, 0xffd966, 1)
  
        label
          .setText(`✓ ${TRIAL_LABELS[trialId]}`)
          .setColor('#fff3b0')
      } else {
        // Normal appearance for the current unfinished trial.
        glow.setFillStyle(0xd4af37, 0.14)
  
        ring.setStrokeStyle(3, 0xd4af37, 0.85)
  
        symbol
          .setText('◆')
          .setColor('#ffe7a3')
          .setFontSize(22)
  
        labelBg.setFillStyle(0x241408, 0.92)
        labelBg.setStrokeStyle(2, 0xd4af37, 1)
  
        label
          .setText(TRIAL_LABELS[trialId])
          .setColor('#ffe7a3')
      }
    })
  
    this.updateQuestTargetMarker()
    this.updateMinimap()
  }

  private getNextTrial() {
    return TEMPLE_TRIALS.find((trial) => !this.completedTempleTrials.has(trial.id))
  }

  private getCurrentObjectiveText() {
    const nextTrial = this.getNextTrial()
    return nextTrial ? nextTrial.objective : 'Objective: Temple Quest complete.'
  }

  private saveProgress() {
    const existingSave = loadGameProgress()

    saveGameProgress({
      currentScene: 'TempleScene',
      coins: this.coins,
      reputation: this.reputation,
      remainingSeconds: this.remainingSeconds,
      completedMarkets: existingSave?.completedMarkets ?? [],
      completedTempleTrials: [...this.completedTempleTrials],
      earnedBadges: existingSave?.earnedBadges ?? [],
      unseenBadges: existingSave?.unseenBadges ?? [],
    })
  }

  private handleMovement() {
    const speed = 115
    this.player.setVelocity(0)

    if (this.keys.left.isDown) {
      this.player.setVelocityX(-speed)
      this.player.play('player-walk-left', true)
    } else if (this.keys.right.isDown) {
      this.player.setVelocityX(speed)
      this.player.play('player-walk-right', true)
    } else if (this.keys.up.isDown) {
      this.player.setVelocityY(-speed)
      this.player.play('player-walk-up', true)
    } else if (this.keys.down.isDown) {
      this.player.setVelocityY(speed)
      this.player.play('player-walk-down', true)
    } else {
      this.player.stop()
    }
  }

  private stopPlayer() {
    this.player.setVelocity(0)
    this.player.stop()
  }

  private updateDepths() {
    this.player.setDepth(this.player.y)
    this.highPriest?.setDepth(this.highPriest.y)
    this.templeQuestMarker?.setDepth(this.templeQuestMarker.y + 140)
    this.templeExitMarker?.setDepth(9300)
  }

  private getPoint(map: Phaser.Tilemaps.Tilemap, name: string) {
    const layer = map.getObjectLayer('Spawns') ?? map.getObjectLayer('GuidePath')
    const object = layer?.objects.find((item) => item.name === name)

    if (!object) {
      const allLayers = map.layers
      void allLayers
      const objectLayers = ['Spawns', 'GuidePath']
      for (const layerName of objectLayers) {
        const fallbackLayer = map.getObjectLayer(layerName)
        const fallbackObject = fallbackLayer?.objects.find((item) => item.name === name)
        if (fallbackObject) {
          return new Phaser.Math.Vector2(fallbackObject.x ?? 0, fallbackObject.y ?? 0)
        }
      }
      return undefined
    }

    return new Phaser.Math.Vector2(object.x ?? 0, object.y ?? 0)
  }

  private distanceTo(point?: Phaser.Math.Vector2) {
    if (!point) return Number.MAX_SAFE_INTEGER
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y)
  }
}