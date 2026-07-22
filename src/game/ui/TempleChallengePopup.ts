import Phaser from 'phaser'

export type TempleTrialId =
  | 'truth-gate'
  | 'candle-of-ra'
  | 'glyph-memory'
  | 'false-gold'
  | 'painted-prophecy'
  | 'scarab-board'
  | 'stairway-sun'

export type TempleTrialResult = {
  success: boolean
  response: string
  goldDelta: number
  reputationDelta: number
  sealKey?: string
  trialId: TempleTrialId
}

type TempleChallengeConfig = {
  trialId: TempleTrialId
  alreadyCompleted?: boolean
  onComplete: (result: TempleTrialResult) => void
}

type ButtonHandle = {
  bg: Phaser.GameObjects.Rectangle
  text: Phaser.GameObjects.Text
  setEnabled: (enabled: boolean) => void
  destroy: () => void
}

type TempleButtonConfig = {
  x: number
  y: number
  width: number
  height: number
  label: string
  onClick: () => void
  color?: number
  fontSize?: number
}

const TRIAL_TITLES: Record<TempleTrialId, string> = {
  'truth-gate': '1. Gate of Truth',
  'candle-of-ra': '2. Candle of Ra',
  'glyph-memory': '3. Hall of Hieroglyphs',
  'false-gold': '4. Treasury of False Gold',
  'painted-prophecy': '5. Painted Prophecy',
  'scarab-board': '6. Sacred Scarab Board',
  'stairway-sun': '7. Stairway to the Sun',
}

const SEAL_NAMES: Record<TempleTrialId, string> = {
  'truth-gate': 'Truth Seal',
  'candle-of-ra': 'Flame Seal',
  'glyph-memory': 'Glyph Seal',
  'false-gold': 'Treasury Seal',
  'painted-prophecy': 'Prophecy Seal',
  'scarab-board': 'Scarab Seal',
  'stairway-sun': 'Sun Seal',
}

export default class TempleChallengePopup {
  public container: Phaser.GameObjects.Container

  private scene: Phaser.Scene
  private isVisible = false
  private currentOnComplete?: (result: TempleTrialResult) => void
  private currentTrialId: TempleTrialId = 'truth-gate'
  private currentAlreadyCompleted = false
  private resultLocked = false
  private panelWidth = 760
  private panelHeight = 610
  private sessionId = 0
  private timers: Phaser.Time.TimerEvent[] = []
  private tweens: Phaser.Tweens.Tween[] = []
  private runtimeCleanups: Array<() => void> = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.container = scene.add.container(0, 0)
    this.container.setDepth(90000)
    this.container.setScrollFactor(0)
    this.container.setVisible(false)
  }

  open() {
    return this.isVisible
  }

  show(config: TempleChallengeConfig) {
    this.cleanupRuntime()
    this.sessionId += 1
    this.isVisible = true
    this.resultLocked = false
    this.currentOnComplete = config.onComplete
    this.currentTrialId = config.trialId
    this.currentAlreadyCompleted = config.alreadyCompleted === true

    this.container.removeAll(true)
    this.container.setVisible(true)
    this.createBase()
    this.createExitButton()

    switch (config.trialId) {
      case 'truth-gate':
        this.createGateOfTruth()
        break
      case 'candle-of-ra':
        this.createCandleOfRa()
        break
      case 'glyph-memory':
        this.createGlyphMemory()
        break
      case 'false-gold':
        this.createFalseGold()
        break
      case 'painted-prophecy':
        this.createPaintedProphecy()
        break
      case 'scarab-board':
        this.createScarabBoard()
        break
      case 'stairway-sun':
        this.createStairwaySun()
        break
    }
  }

  hide() {
    this.sessionId += 1
    this.cleanupRuntime()
    this.isVisible = false
    this.resultLocked = false
    this.currentOnComplete = undefined
    this.currentAlreadyCompleted = false
    this.container.removeAll(true)
    this.container.setVisible(false)
  }

  private cleanupRuntime() {
    this.timers.forEach((timer) => timer.remove(false))
    this.timers = []

    this.tweens.forEach((tween) => {
      if (tween.isPlaying()) tween.stop()
    })
    this.tweens = []

    this.runtimeCleanups.forEach((cleanup) => cleanup())
    this.runtimeCleanups = []
  }

  private addObject<T extends Phaser.GameObjects.GameObject>(object: T) {
    const scrollObject = object as T & {
      setScrollFactor?: (x: number, y?: number) => T
    }

    scrollObject.setScrollFactor?.(0)
    this.container.add(object)
    return object
  }

  private schedule(delay: number, callback: () => void) {
    const session = this.sessionId
    const timer = this.scene.time.delayedCall(delay, () => {
      if (!this.isVisible || session !== this.sessionId) return
      callback()
    })
    this.timers.push(timer)
    return timer
  }

  private addLoop(delay: number, callback: () => void) {
    const session = this.sessionId
    const timer = this.scene.time.addEvent({
      delay,
      loop: true,
      callback: () => {
        if (!this.isVisible || session !== this.sessionId) return
        callback()
      },
    })
    this.timers.push(timer)
    return timer
  }

  private addTween(config: Phaser.Types.Tweens.TweenBuilderConfig) {
    const tween = this.scene.tweens.add(config)
    this.tweens.push(tween)
    return tween
  }

  private getPanelTop() {
    return this.scene.scale.height / 2 - this.panelHeight / 2
  }

  private getPanelBottom() {
    return this.scene.scale.height / 2 + this.panelHeight / 2
  }

  private getPanelLeft() {
    return this.scene.scale.width / 2 - this.panelWidth / 2
  }

  private getPanelRight() {
    return this.scene.scale.width / 2 + this.panelWidth / 2
  }

  private createBase() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.panelWidth = Math.min(760, width - 16)
    this.panelHeight = Math.min(620, height - 8)

    const overlay = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.72,
    )
    overlay.setInteractive()

    const shadow = this.scene.add.rectangle(
      width / 2 + 8,
      height / 2 + 10,
      this.panelWidth,
      this.panelHeight,
      0x000000,
      0.5,
    )

    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      this.panelWidth,
      this.panelHeight,
      0x170d04,
      0.99,
    )
    panel.setStrokeStyle(4, 0xd4af37, 1)

    const topBar = this.scene.add.rectangle(
      width / 2,
      this.getPanelTop() + 35,
      this.panelWidth,
      70,
      0x3c2209,
      1,
    )
    topBar.setStrokeStyle(2, 0x8f5b20, 1)

    const footer = this.scene.add.rectangle(
      width / 2,
      this.getPanelBottom() - 18,
      this.panelWidth - 8,
      30,
      0x281607,
      0.96,
    )

    this.addObject(overlay)
    this.addObject(shadow)
    this.addObject(panel)
    this.addObject(topBar)
    this.addObject(footer)
  }

  private createExitButton() {
    const x = this.getPanelRight() - 26
    const y = this.getPanelTop() + 26
    const bg = this.scene.add.rectangle(x, y, 30, 30, 0x5a1111, 1)
    bg.setStrokeStyle(2, 0xffffff, 0.85)
    bg.setInteractive({ useHandCursor: true })

    const text = this.scene.add.text(x, y - 1, '×', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    })
    text.setOrigin(0.5)

    bg.on('pointerover', () => bg.setFillStyle(0x8a1c1c, 1))
    bg.on('pointerout', () => bg.setFillStyle(0x5a1111, 1))
    bg.on('pointerdown', () => {
      if (this.resultLocked) return
      this.hide()
    })

    this.addObject(bg)
    this.addObject(text)
  }

  private addTitle(title: string) {
    const text = this.scene.add.text(
      this.scene.scale.width / 2,
      this.getPanelTop() + 35,
      title,
      {
        fontFamily: 'Georgia',
        fontSize: `${Math.min(28, Math.max(21, this.panelWidth / 29))}px`,
        color: '#ffe7a3',
        stroke: '#000000',
        strokeThickness: 5,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: this.panelWidth - 95 },
      },
    )
    text.setOrigin(0.5)
    return this.addObject(text)
  }

  private addInstruction(textValue: string, y = this.getPanelTop() + 87) {
    const text = this.scene.add.text(this.scene.scale.width / 2, y, textValue, {
      fontFamily: 'Georgia',
      fontSize: '15px',
      color: '#f5ead7',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: this.panelWidth - 74, useAdvancedWrap: true },
    })
    text.setOrigin(0.5)
    return this.addObject(text)
  }

  private addStatusText(textValue: string, y: number, color = '#ffd966') {
    const text = this.scene.add.text(this.scene.scale.width / 2, y, textValue, {
      fontFamily: 'Georgia',
      fontSize: '16px',
      color,
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: this.panelWidth - 88, useAdvancedWrap: true },
    })
    text.setOrigin(0.5)
    return this.addObject(text)
  }

  /**
   * Compact parchment HUD card used across the temple trials.
   * It mirrors the clean Bazaar HUD: pale card, coloured top band,
   * small label, bold value, and an optional timer/progress bar.
   */
  private createCompactHudCard(config: {
    x: number
    y: number
    width: number
    label: string
    value?: string
    bandColor?: number
    valueColor?: string
    showProgress?: boolean
  }) {
    const height = 46
    const bandColor = config.bandColor ?? 0x245d78

    const shadow = this.scene.add.rectangle(
      config.x + 3,
      config.y + 3,
      config.width,
      height,
      0x000000,
      0.3,
    )

    const card = this.scene.add.rectangle(
      config.x,
      config.y,
      config.width,
      height,
      0xead8aa,
      1,
    )
    card.setStrokeStyle(3, 0xb8862e, 1)

    const band = this.scene.add.rectangle(
      config.x,
      config.y - height / 2 + 5,
      config.width - 10,
      7,
      bandColor,
      1,
    )

    const label = this.scene.add.text(
      config.x,
      config.y - (config.showProgress ? 10 : 9),
      config.label,
      {
        fontFamily: 'Georgia',
        fontSize: '10px',
        color: '#6f4512',
        fontStyle: 'bold',
        align: 'center',
      },
    )
    label.setOrigin(0.5)

    const valueText = this.scene.add.text(
      config.x,
      config.y + (config.showProgress ? 1 : 9),
      config.value ?? '',
      {
        fontFamily: 'Georgia',
        fontSize: config.showProgress ? '14px' : '16px',
        color: config.valueColor ?? '#3b2b1a',
        stroke: '#fff6d8',
        strokeThickness: 2,
        fontStyle: 'bold',
        align: 'center',
      },
    )
    valueText.setOrigin(0.5)

    this.addObject(shadow)
    this.addObject(card)
    this.addObject(band)
    this.addObject(label)
    this.addObject(valueText)

    let progressFill: Phaser.GameObjects.Rectangle | undefined

    if (config.showProgress) {
      const progressWidth = Math.max(30, config.width - 22)
      const progressY = config.y + 15

      const progressTrack = this.scene.add.rectangle(
        config.x,
        progressY,
        progressWidth,
        7,
        0x3b2b1a,
        0.78,
      )
      progressTrack.setStrokeStyle(1, 0xffffff, 0.35)

      progressFill = this.scene.add.rectangle(
        config.x - progressWidth / 2,
        progressY,
        progressWidth,
        7,
        0xffd966,
        1,
      )
      progressFill.setOrigin(0, 0.5)

      this.addObject(progressTrack)
      this.addObject(progressFill)
    }

    return {
      valueText,
      setValue: (value: string) => valueText.setText(value),
      setProgress: (ratio: number, danger = false) => {
        if (!progressFill) return
        const safeRatio = Phaser.Math.Clamp(ratio, 0, 1)
        progressFill.displayWidth = Math.max(0.01, (config.width - 22) * safeRatio)
        progressFill.setFillStyle(danger ? 0xc94b3e : 0xd8a92e, 1)
      },
    }
  }

  private createButton(config: TempleButtonConfig): ButtonHandle {
    const color = config.color ?? 0x5c3713
    const fontSize = config.fontSize ?? 14
    let enabled = true

    const bg = this.scene.add.rectangle(
      config.x,
      config.y,
      config.width,
      config.height,
      color,
      1,
    )
    bg.setStrokeStyle(3, 0xd4af37, 1)
    bg.setInteractive({ useHandCursor: true })

    const text = this.scene.add.text(config.x, config.y, config.label, {
      fontFamily: 'Georgia',
      fontSize: `${fontSize}px`,
      color: '#fff7cf',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: config.width - 14, useAdvancedWrap: true },
    })
    text.setOrigin(0.5)

    const refresh = () => {
      if (!enabled) {
        bg.disableInteractive()
        bg.setFillStyle(0x2d2a25, 0.9)
        bg.setStrokeStyle(2, 0x777777, 0.8)
        text.setAlpha(0.55)
        return
      }

      bg.setInteractive({ useHandCursor: true })
      bg.setFillStyle(color, 1)
      bg.setStrokeStyle(3, 0xd4af37, 1)
      text.setAlpha(1)
    }

    bg.on('pointerover', () => {
      if (!enabled) return
      bg.setFillStyle(0x7a4d19, 1)
      bg.setStrokeStyle(3, 0xffd966, 1)
      this.addTween({
        targets: [bg, text],
        scaleX: 1.025,
        scaleY: 1.025,
        duration: 85,
      })
    })

    bg.on('pointerout', () => {
      if (!enabled) return
      refresh()
      this.addTween({
        targets: [bg, text],
        scaleX: 1,
        scaleY: 1,
        duration: 85,
      })
    })

    bg.on('pointerdown', () => {
      if (!enabled || this.resultLocked) return
      this.addTween({ targets: [bg, text], scaleX: 0.97, scaleY: 0.97, duration: 70, yoyo: true })
      config.onClick()
    })

    this.addObject(bg)
    this.addObject(text)

    return {
      bg,
      text,
      setEnabled: (value: boolean) => {
        enabled = value
        refresh()
      },
      destroy: () => {
        if (bg.active) bg.destroy()
        if (text.active) text.destroy()
      },
    }
  }

  private complete(result: TempleTrialResult, delay = 350) {
    if (this.resultLocked) return
    this.resultLocked = true
    this.schedule(delay, () => this.showResult(result))
  }

  private showResult(result: TempleTrialResult) {
    this.cleanupRuntime()
    this.container.removeAll(true)
    this.createBase()

    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()
    const success = result.success

    this.addTitle('Temple Trial Result')

    const badge = this.scene.add.circle(
      width / 2,
      top + 110,
      42,
      success ? 0x205936 : 0x743519,
      1,
    )
    badge.setStrokeStyle(4, success ? 0x72ff9b : 0xffbd63, 1)

    const badgeText = this.scene.add.text(width / 2, top + 110, success ? '✓' : '!', {
      fontFamily: 'Georgia',
      fontSize: '46px',
      color: success ? '#72ff9b' : '#ffbd63',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold',
    })
    badgeText.setOrigin(0.5)

    const title = this.scene.add.text(
      width / 2,
      top + 175,
      success ? `${SEAL_NAMES[result.trialId].toUpperCase()} ACQUIRED` : 'TRIAL INCOMPLETE',
      {
        fontFamily: 'Georgia',
        fontSize: '24px',
        color: success ? '#72ff9b' : '#ffd966',
        stroke: '#000000',
        strokeThickness: 5,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: this.panelWidth - 92 },
      },
    )
    title.setOrigin(0.5)

    const responsePanel = this.scene.add.rectangle(
      width / 2,
      top + 270,
      this.panelWidth - 110,
      102,
      0x241507,
      0.98,
    )
    responsePanel.setStrokeStyle(3, 0x9b682c, 1)

    const response = this.scene.add.text(width / 2, top + 270, result.response, {
      fontFamily: 'Georgia',
      fontSize: '15px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: this.panelWidth - 160, useAdvancedWrap: true },
    })
    response.setOrigin(0.5)

    const rewardY = bottom - 105
    const rewardText = this.scene.add.text(
      width / 2,
      rewardY,
      `GOLD ${result.goldDelta >= 0 ? '+' : ''}${result.goldDelta}     REPUTATION ${result.reputationDelta >= 0 ? '+' : ''}${result.reputationDelta}`,
      {
        fontFamily: 'Georgia',
        fontSize: '17px',
        color: '#ffe7a3',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
        align: 'center',
      },
    )
    rewardText.setOrigin(0.5)

    this.addObject(badge)
    this.addObject(badgeText)
    this.addObject(title)
    this.addObject(responsePanel)
    this.addObject(response)
    this.addObject(rewardText)

    this.addTween({
      targets: [badge, badgeText],
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 260,
      yoyo: true,
      repeat: 1,
    })

    this.resultLocked = false

    this.createButton({
      x: width / 2,
      y: bottom - 42,
      width: 220,
      height: 46,
      label: 'Continue',
      color: 0x27633a,
      fontSize: 17,
      onClick: () => {
        this.currentOnComplete?.(result)
        this.hide()
      },
    })
  }

  private baseReward(trialId: TempleTrialId, success: boolean, score = 0) {
    if (this.currentAlreadyCompleted) {
      return {
        goldDelta: success ? 60 : 0,
        reputationDelta: 0,
        sealKey: undefined,
      }
    }

    return {
      goldDelta: success ? 160 + Math.floor(score / 2) : Math.max(20, Math.floor(score / 5)),
      reputationDelta: success ? 10 : 1,
      sealKey: success ? `${trialId}-seal` : undefined,
    }
  }

  // ---------------------------------------------------------------------------
  // 1. GATE OF TRUTH — FIND THE MISSING RELICS
  // ---------------------------------------------------------------------------
  private createGateOfTruth() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    type DifferenceSpot = {
      id: string
      label: string
      x: number
      y: number
      radius: number
    }

    type TruthRound = {
      title: string
      leftImageKey: string
      rightImageKey: string
      differences: DifferenceSpot[]
    }

    /*
     * Difference coordinates are normalized to each image:
     * x: 0 = left edge, 1 = right edge
     * y: 0 = top edge, 1 = bottom edge
     *
     * Keep these coordinates when creating the matching image pairs.
     */
    const rounds: TruthRound[] = [
      {
        title: 'Round 1 — Chamber of Scarabs',
        leftImageKey: 'temple-truth-pair-1-left',
        rightImageKey: 'temple-truth-pair-1-right',
        differences: [
          {
            id: 'floor-scarab',
            label: 'Floor scarab',
            x: 0.365,
            y: 0.76,
            radius: 0.125,
          },
          {
            id: 'blue-vase',
            label: 'Blue ceremonial vase',
            x: 0.79,
            y: 0.73,
            radius: 0.125,
          },
        ],
      },
      {
        title: 'Round 2 — Hall of Guardians',
        leftImageKey: 'temple-truth-pair-2-left',
        rightImageKey: 'temple-truth-pair-2-right',
        differences: [
          {
            id: 'treasure-chest',
            label: 'Guardian treasure chest',
            x: 0.16,
            y: 0.77,
            radius: 0.13,
          },
          {
            id: 'blue-offering-jar',
            label: 'Blue offering jar',
            x: 0.69,
            y: 0.69,
            radius: 0.125,
          },
        ],
      },
      {
        title: 'Round 3 — Sacred Scribe Room',
        leftImageKey: 'temple-truth-pair-3-left',
        rightImageKey: 'temple-truth-pair-3-right',
        differences: [
          {
            id: 'falcon-statue',
            label: 'Falcon guardian',
            x: 0.16,
            y: 0.70,
            radius: 0.125,
          },
          {
            id: 'large-vase',
            label: 'Large ceremonial vase',
            x: 0.84,
            y: 0.68,
            radius: 0.125,
          },
          {
            id: 'right-wall-torch',
            label: 'Right wall torch',
            x: 0.84,
            y: 0.35,
            radius: 0.11,
          },
        ],
      },
      {
        title: 'Round 4 — Treasury of the Sun',
        leftImageKey: 'temple-truth-pair-4-left',
        rightImageKey: 'temple-truth-pair-4-right',
        differences: [
          {
            id: 'coin-pile',
            label: 'Golden coin pile',
            x: 0.18,
            y: 0.74,
            radius: 0.13,
          },
          {
            id: 'treasury-vase',
            label: 'Blue treasury vase',
            x: 0.79,
            y: 0.69,
            radius: 0.125,
          },
          {
            id: 'anubis-statue',
            label: 'Anubis guardian statue',
            x: 0.95,
            y: 0.78,
            radius: 0.13,
          },
        ],
      },
      {
        title: 'Round 5 — Sanctuary of Ra',
        leftImageKey: 'temple-truth-pair-5-left',
        rightImageKey: 'temple-truth-pair-5-right',
        differences: [
          {
            id: 'corridor-vase',
            label: 'Blue corridor vase',
            x: 0.18,
            y: 0.80,
            radius: 0.13,
          },
          {
            id: 'cat-statue',
            label: 'Sacred cat statue',
            x: 0.86,
            y: 0.80,
            radius: 0.135,
          },
          {
            id: 'offering-bowl',
            label: 'Golden offering bowl',
            x: 0.73,
            y: 0.54,
            radius: 0.115,
          },
        ],
      },
    ]

    this.addTitle(TRIAL_TITLES['truth-gate'])
    this.addInstruction(
      'Find every missing relic. Tap the changed spot in either temple image.',
      top + 84,
    )

    let roundIndex = 0
    let hearts = 3
    let score = 0
    let wrongTaps = 0
    let remainingMs = 30000
    let roundLocked = false
    let roundTimer: Phaser.Time.TimerEvent | undefined
    let roundObjects: Phaser.GameObjects.GameObject[] = []
    let foundIds = new Set<string>()

    const hudWidth = this.panelWidth - 82
    const hudGap = 6
    const hudCardWidth = (hudWidth - hudGap * 4) / 5
    const hudStartX = width / 2 - hudWidth / 2 + hudCardWidth / 2
    const hudY = top + 126

    const roundHud = this.createCompactHudCard({
      x: hudStartX,
      y: hudY,
      width: hudCardWidth,
      label: 'ROUND',
      bandColor: 0x245d78,
    })

    const livesHud = this.createCompactHudCard({
      x: hudStartX + hudCardWidth + hudGap,
      y: hudY,
      width: hudCardWidth,
      label: 'LIVES',
      bandColor: 0x8f2d2d,
      valueColor: '#8f2d2d',
    })

    const foundHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 2,
      y: hudY,
      width: hudCardWidth,
      label: 'FOUND',
      bandColor: 0x27633a,
      valueColor: '#27633a',
    })

    const scoreHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 3,
      y: hudY,
      width: hudCardWidth,
      label: 'SCORE',
      bandColor: 0x8b6b1f,
    })

    const timerHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 4,
      y: hudY,
      width: hudCardWidth,
      label: 'TIME',
      bandColor: 0x8f2d2d,
      showProgress: true,
    })

    const roundTitleY = top + 163
    const imageLabelY = top + 186
    const imageTop = top + 198

    // Use more of the empty lower area for the comparison images.
    const statusY = bottom - 30
    const imageBottom = statusY - 16
    const imageGap = 10

    // Smaller outer margins make both images visibly larger.
    const maxImageWidth = (this.panelWidth - 34 - imageGap) / 2
    const maxImageHeight = Math.max(170, imageBottom - imageTop)
    const imageWidth = Math.min(maxImageWidth, maxImageHeight * (4 / 3))
    const imageHeight = imageWidth * (3 / 4)
    const imageY = imageTop + imageHeight / 2
    const leftImageX = width / 2 - imageGap / 2 - imageWidth / 2
    const rightImageX = width / 2 + imageGap / 2 + imageWidth / 2

    const statusPanel = this.scene.add.rectangle(
      width / 2,
      statusY,
      this.panelWidth - 96,
      34,
      0x211107,
      0.96,
    )
    statusPanel.setStrokeStyle(2, 0xd4af37, 0.8)
    this.addObject(statusPanel)

    const status = this.addStatusText('', statusY, '#ffd966')
    status.setFontSize(14)

    const addRoundObject = <T extends Phaser.GameObjects.GameObject>(object: T) => {
      this.addObject(object)
      roundObjects.push(object)
      return object
    }

    const clearRoundTimer = () => {
      roundTimer?.remove(false)
      roundTimer = undefined
    }

    const clearRoundObjects = () => {
      roundObjects.forEach((object) => {
        if (object.active) object.destroy()
      })
      roundObjects = []
    }

    const getCurrentRound = () => rounds[roundIndex]

    const updateTimerHud = () => {
      const ratio = Phaser.Math.Clamp(remainingMs / 30000, 0, 1)
      timerHud.setValue(`${Math.max(0, Math.ceil(remainingMs / 1000))}s`)
      timerHud.setProgress(ratio, ratio <= 0.25)
    }

    const updateHud = () => {
      const round = getCurrentRound()
      roundHud.setValue(`${roundIndex + 1} / ${rounds.length}`)
      livesHud.setValue(`${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}`)
      foundHud.setValue(`${foundIds.size} / ${round.differences.length}`)
      scoreHud.setValue(String(score))
      updateTimerHud()
    }

    const finishTrial = (success: boolean) => {
      if (roundLocked && !success) return

      roundLocked = true
      clearRoundTimer()

      const reward = this.baseReward('truth-gate', success, score)

      this.complete(
        {
          trialId: 'truth-gate',
          success,
          response: success
            ? 'You discovered every relic the altered chambers tried to hide. A ruler must notice what others overlook.'
            : 'The temple concealed too many relics. Return with a calmer eye and search the chambers again.',
          ...reward,
        },
        success ? 1050 : 750,
      )
    }

    const showWrongTapEffect = (x: number, y: number) => {
      const mark = addRoundObject(
        this.scene.add.text(x, y, '×', {
          fontFamily: 'Arial',
          fontSize: '34px',
          color: '#ff7770',
          stroke: '#000000',
          strokeThickness: 5,
          fontStyle: 'bold',
        }),
      )
      mark.setOrigin(0.5)

      this.addTween({
        targets: mark,
        scaleX: 1.28,
        scaleY: 1.28,
        alpha: 0,
        y: mark.y - 10,
        duration: 460,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (mark.active) mark.destroy()
          roundObjects = roundObjects.filter((object) => object !== mark)
        },
      })
    }

    const showFoundMarker = (spot: DifferenceSpot) => {
      const markerPositions = [leftImageX, rightImageX].map((imageX) => ({
        x: imageX - imageWidth / 2 + spot.x * imageWidth,
        y: imageY - imageHeight / 2 + spot.y * imageHeight,
      }))

      markerPositions.forEach((position, index) => {
        const ring = addRoundObject(
          this.scene.add.circle(position.x, position.y, 18, 0x236d3a, 0.28),
        )
        ring.setStrokeStyle(4, 0xffd966, 1)
        ring.setScale(0.35)

        const check = addRoundObject(
          this.scene.add.text(position.x, position.y - 1, '✓', {
            fontFamily: 'Georgia',
            fontSize: '18px',
            color: '#72ff9b',
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold',
          }),
        )
        check.setOrigin(0.5)
        check.setScale(0.35)

        this.addTween({
          targets: [ring, check],
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          delay: index * 70,
          ease: 'Back.easeOut',
        })
      })

      const sparkle = addRoundObject(
        this.scene.add.text(
          rightImageX - imageWidth / 2 + spot.x * imageWidth,
          imageY - imageHeight / 2 + spot.y * imageHeight - 24,
          '✦',
          {
            fontFamily: 'Georgia',
            fontSize: '22px',
            color: '#ffd966',
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold',
          },
        ),
      )
      sparkle.setOrigin(0.5)

      this.addTween({
        targets: sparkle,
        y: sparkle.y - 18,
        alpha: 0,
        duration: 620,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (sparkle.active) sparkle.destroy()
          roundObjects = roundObjects.filter((object) => object !== sparkle)
        },
      })
    }

    const completeRound = () => {
      if (roundLocked) return

      roundLocked = true
      clearRoundTimer()

      const timeBonus = Math.max(0, Math.ceil(remainingMs / 100))
      score += 150 + timeBonus
      updateHud()

      status.setText('All missing relics found!')
      status.setColor('#72ff9b')

      if (roundIndex >= rounds.length - 1) {
        this.schedule(950, () => finishTrial(true))
        return
      }

      this.schedule(1050, () => {
        roundIndex += 1
        renderRound()
      })
    }

    const handleImageTap = (
      imageX: number,
      hitZoneLocalX: number,
      hitZoneLocalY: number,
    ) => {
      if (roundLocked || this.resultLocked) return

      // Local hit-zone coordinates stay correct when the canvas or camera scales.
      const localX = Phaser.Math.Clamp(hitZoneLocalX / imageWidth, 0, 1)
      const localY = Phaser.Math.Clamp(hitZoneLocalY / imageHeight, 0, 1)
      const tappedX = imageX - imageWidth / 2 + localX * imageWidth
      const tappedY = imageY - imageHeight / 2 + localY * imageHeight

      const round = getCurrentRound()
      const spot = round.differences.find((difference) => {
        if (foundIds.has(difference.id)) return false

        const dx = localX - difference.x
        const dy = localY - difference.y
        return Math.sqrt(dx * dx + dy * dy) <= difference.radius
      })

      if (spot) {
        foundIds.add(spot.id)
        wrongTaps = 0

        const speedBonus = Math.max(0, Math.floor(remainingMs / 1000))
        score += 100 + speedBonus

        showFoundMarker(spot)
        status.setText(`Found: ${spot.label}`)
        status.setColor('#72ff9b')
        updateHud()

        this.scene.cameras.main.shake(55, 0.0007)

        if (foundIds.size >= round.differences.length) {
          completeRound()
        } else {
          this.schedule(420, () => {
            if (!roundLocked) status.setColor('#ffd966')
          })
        }
        return
      }

      wrongTaps += 1
      score = Math.max(0, score - 15)
      remainingMs = Math.max(0, remainingMs - 1500)

      showWrongTapEffect(tappedX, tappedY)
      this.scene.cameras.main.shake(90, 0.0025)

      if (wrongTaps >= 3) {
        wrongTaps = 0
        hearts -= 1

        status.setText('Three wrong taps cost one life. Search carefully.')
        status.setColor('#ff7770')

        if (hearts <= 0) {
          updateHud()
          finishTrial(false)
          return
        }
      } else {
        status.setText(`${3 - wrongTaps} careful tap${3 - wrongTaps === 1 ? '' : 's'} before a life is lost.`)
        status.setColor('#ffbd63')
      }

      updateHud()

      this.schedule(500, () => {
        if (!roundLocked) status.setColor('#ffd966')
      })
    }

    const addPairImage = (
      imageKey: string,
      imageX: number,
      labelValue: string,
    ) => {
      const frame = addRoundObject(
        this.scene.add.rectangle(
          imageX,
          imageY,
          imageWidth + 8,
          imageHeight + 8,
          0x0f0802,
          1,
        ),
      )
      frame.setStrokeStyle(4, 0xd4af37, 1)

      const labelBg = addRoundObject(
        this.scene.add.rectangle(imageX, imageLabelY, 126, 24, 0x3c2209, 0.98),
      )
      labelBg.setStrokeStyle(2, 0xd4af37, 0.9)

      const label = addRoundObject(
        this.scene.add.text(imageX, imageLabelY, labelValue, {
          fontFamily: 'Georgia',
          fontSize: '11px',
          color: '#ffe7a3',
          stroke: '#000000',
          strokeThickness: 3,
          fontStyle: 'bold',
        }),
      )
      label.setOrigin(0.5)

      if (this.scene.textures.exists(imageKey)) {
        const image = addRoundObject(this.scene.add.image(imageX, imageY, imageKey))
        image.setDisplaySize(imageWidth, imageHeight)
      } else {
        const fallback = addRoundObject(
          this.scene.add.rectangle(imageX, imageY, imageWidth, imageHeight, 0x241507, 1),
        )
        fallback.setStrokeStyle(2, 0x8f5b20, 1)

        const missingText = addRoundObject(
          this.scene.add.text(imageX, imageY, `Missing image asset\n${imageKey}`, {
            fontFamily: 'Georgia',
            fontSize: '15px',
            color: '#ffd966',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            wordWrap: { width: imageWidth - 28 },
          }),
        )
        missingText.setOrigin(0.5)
      }

      const hitZone = addRoundObject(
        this.scene.add.rectangle(imageX, imageY, imageWidth, imageHeight, 0xffffff, 0.001),
      )
      hitZone.setInteractive({ useHandCursor: true })
      hitZone.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          localX: number,
          localY: number,
        ) => {
          handleImageTap(imageX, localX, localY)
        },
      )
    }

    const startRoundTimer = () => {
      clearRoundTimer()
      remainingMs = 30000
      updateTimerHud()

      roundTimer = this.addLoop(100, () => {
        if (roundLocked) return

        remainingMs -= 100
        updateTimerHud()

        if (remainingMs > 0) return

        hearts -= 1
        updateHud()

        if (hearts <= 0) {
          status.setText('Time is gone. The chamber seals itself.')
          status.setColor('#ff7770')
          finishTrial(false)
          return
        }

        remainingMs = 15000
        status.setText('Time expired. One life lost — 15 seconds restored.')
        status.setColor('#ffbd63')
        updateHud()
      })
    }

    const renderRound = () => {
      clearRoundTimer()
      clearRoundObjects()

      foundIds = new Set<string>()
      wrongTaps = 0
      remainingMs = 30000
      roundLocked = false

      const round = getCurrentRound()

      const roundTitle = addRoundObject(
        this.scene.add.text(width / 2, roundTitleY, round.title, {
          fontFamily: 'Georgia',
          fontSize: '18px',
          color: '#ffe7a3',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold',
          align: 'center',
        }),
      )
      roundTitle.setOrigin(0.5)

      addPairImage(round.leftImageKey, leftImageX, 'ORIGINAL')
      addPairImage(round.rightImageKey, rightImageX, 'ALTERED')

      status.setText(
        `Tap the ${round.differences.length} changed or missing relic${
          round.differences.length === 1 ? '' : 's'
        }.`,
      )
      status.setColor('#ffd966')

      updateHud()
      startRoundTimer()
    }

    this.runtimeCleanups.push(() => {
      clearRoundTimer()
      clearRoundObjects()
    })

    renderRound()
  }

  // ---------------------------------------------------------------------------
  // 2. CANDLE OF RA
  // ---------------------------------------------------------------------------

private createCandleOfRa() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()
    const left = this.getPanelLeft()
    const right = this.getPanelRight()

    type CandleAction = 'cover' | 'shield' | 'bell' | 'oil' | 'raise'
    type CandlePhase = 'walking' | 'awaiting' | 'resolving' | 'finished'
    type MarkerState = 'inactive' | 'current' | 'completed' | 'failed' | 'final'

    type CandleCheckpoint = {
      id: string
      title: string
      prompt: string
      hint: string
      correctAction: CandleAction
      obstacleKeys: string[]
      actionAnim: string
      successText: string
    }

    const checkpoints: CandleCheckpoint[] = [
      {
        id: 'wind',
        title: 'Wind Gust',
        prompt: 'A fierce wind rushes toward the sacred flame.',
        hint: 'Cover the candle with your hand.',
        correctAction: 'cover',
        obstacleKeys: ['candle-ra-obstacle-wind-new', 'candle-ra-obstacle-wind'],
        actionAnim: 'candle-player-cover',
        successText: 'The flame is covered. The wind passes safely.',
      },
      {
        id: 'dust',
        title: 'Desert Dust',
        prompt: 'Dust swirls across the corridor.',
        hint: 'Shield the flame from the sand.',
        correctAction: 'shield',
        obstacleKeys: ['candle-ra-obstacle-dust-new', 'candle-ra-obstacle-dust'],
        actionAnim: 'candle-player-shield',
        successText: 'The shield blocks the dust before it touches the flame.',
      },
      {
        id: 'ghost',
        title: 'Temple Ghost',
        prompt: 'A spirit blocks the candle’s path.',
        hint: 'Ring the sacred bell to push the spirit away.',
        correctAction: 'bell',
        obstacleKeys: ['candle-ra-obstacle-ghost-new', 'candle-ra-obstacle-ghost'],
        actionAnim: 'candle-player-bell',
        successText: 'The bell echoes through the hall. The spirit fades.',
      },
      {
        id: 'weak',
        title: 'Weak Flame',
        prompt: 'The sacred fire begins to fade.',
        hint: 'Pour oil to feed the flame.',
        correctAction: 'oil',
        obstacleKeys: ['candle-ra-obstacle-shadow', 'candle-ra-action-oil', 'candle-ra-icon-oil'],
        actionAnim: 'candle-player-oil',
        successText: 'The oil feeds the candle. The flame rises again.',
      },
      {
        id: 'altar',
        title: 'Sun Altar',
        prompt: 'The altar awaits the sacred flame.',
        hint: 'Raise the candle toward the light of Ra.',
        correctAction: 'raise',
        obstacleKeys: ['candle-ra-altar-goal', 'candle-ra-obstacle-sparks', 'candle-ra-obstacle-altar'],
        actionAnim: 'candle-player-raise',
        successText: 'The candle meets the sun. The altar opens.',
      },
    ]

    const actionLabels: Record<CandleAction, string> = {
      cover: 'Cover',
      shield: 'Shield',
      bell: 'Bell',
      oil: 'Oil',
      raise: 'Raise',
    }

    const actionHints: Record<CandleAction, string> = {
      cover: 'Hand protects flame',
      shield: 'Block danger',
      bell: 'Repel spirit',
      oil: 'Feed flame',
      raise: 'Offer to Ra',
    }

    const actionIconKeys: Record<CandleAction, string[]> = {
      cover: ['candle-ra-action-cover', 'candle-ra-icon-cover'],
      shield: ['candle-ra-action-shield', 'candle-ra-icon-shield'],
      bell: ['candle-ra-action-bell', 'candle-ra-icon-bell'],
      oil: ['candle-ra-action-oil', 'candle-ra-icon-oil'],
      raise: ['candle-ra-action-raise', 'candle-ra-icon-raise'],
    }

    const flameKeys = {
      full: ['candle-ra-flame-full', 'candle-ra-candle'],
      medium: ['candle-ra-flame-medium', 'candle-ra-candle'],
      low: ['candle-ra-flame-low', 'candle-ra-candle'],
      tiny: ['candle-ra-flame-tiny', 'candle-ra-candle'],
      out: ['candle-ra-flame-extinguished'],
    }

    const markerKeys: Record<MarkerState, string[]> = {
      inactive: ['candle-ra-checkpoint-inactive'],
      current: ['candle-ra-checkpoint-current'],
      completed: ['candle-ra-checkpoint-completed'],
      failed: ['candle-ra-checkpoint-failed'],
      final: ['candle-ra-checkpoint-final'],
    }

    const textureExists = (key: string) => this.scene.textures.exists(key)
    const firstExistingTexture = (keys: string[]) => keys.find(textureExists)

    const individualPlayerFramesReady = () =>
      textureExists('candle-player-idle-0') &&
      textureExists('candle-player-walk-0') &&
      textureExists('candle-player-cover-0') &&
      textureExists('candle-player-shield-0') &&
      textureExists('candle-player-bell-0') &&
      textureExists('candle-player-oil-0') &&
      textureExists('candle-player-raise-0') &&
      textureExists('candle-player-fail-0') &&
      textureExists('candle-player-success-0')

    const ensureCandlePlayerAnimations = () => {
      const rowNames = ['idle', 'walk', 'cover', 'shield', 'bell', 'oil', 'raise', 'fail', 'success']
      const frameRates: Record<string, number> = {
        idle: 4,
        walk: 7,
        cover: 7,
        shield: 7,
        bell: 7,
        oil: 7,
        raise: 6,
        fail: 8,
        success: 5,
      }

      const repeats: Record<string, number> = {
        idle: -1,
        walk: -1,
        // Correct action animations should be visible, so they run 3 times total.
        cover: 2,
        shield: 2,
        bell: 2,
        oil: 2,
        raise: 2,
        fail: 0,
        success: 1,
      }


      rowNames.forEach((rowName) => {
        const key = `candle-player-${rowName}`
        if (this.scene.anims.exists(key)) this.scene.anims.remove(key)
      })
    
      if (individualPlayerFramesReady()) {
        rowNames.forEach((rowName) => {
          const key = `candle-player-${rowName}`
          if (this.scene.anims.exists(key)) return

          this.scene.anims.create({
            key,
            frames: [0, 1, 2, 3].map((frameIndex) => ({
              key: `candle-player-${rowName}-${frameIndex}`,
            })),
            frameRate: frameRates[rowName],
            repeat: repeats[rowName],
          })
        })

        return
      }

      if (!textureExists('candle-ra-player')) return

      const create = (key: string, start: number, end: number, frameRate: number, repeat: number) => {
        if (this.scene.anims.exists(key)) return
        this.scene.anims.create({
          key,
          frames: this.scene.anims.generateFrameNumbers('candle-ra-player', { start, end }),
          frameRate,
          repeat,
        })
      }

      create('candle-player-idle', 0, 3, 4, -1)
      create('candle-player-walk', 4, 7, 7, -1)
      create('candle-player-cover', 8, 11, 7, 2)
      create('candle-player-shield', 12, 15, 7, 2)
      create('candle-player-bell', 16, 19, 7, 2)
      create('candle-player-oil', 20, 23, 7, 2)
      create('candle-player-raise', 24, 27, 6, 2)
      create('candle-player-fail', 28, 31, 8, 0)
      create('candle-player-success', 32, 35, 5, 1)
    }

    ensureCandlePlayerAnimations()

    this.addTitle(TRIAL_TITLES['candle-of-ra'])
    this.addInstruction(
      'Protect the sacred candle through 5 checkpoints. Choose the right action before time runs out.',
      top + 86,
    )

    const gameplayWidth = this.panelWidth - 72
    const candleHudY = top + 127
    const candleHudGap = 7
    const candleHudCardWidth = (gameplayWidth - candleHudGap * 3) / 4
    const candleHudStartX = width / 2 - gameplayWidth / 2 + candleHudCardWidth / 2
    const contentTop = top + 166
    const optionButtonWidth = 116
    const optionButtonHeight = 42
    const buttonGapX = 10
    const buttonRowGap = 50
    const bottomButtonRowY = bottom - 45
    const topButtonRowY = bottomButtonRowY - buttonRowGap
    const promptY = topButtonRowY - 46
    const promptHeight = 34
    const gameplayBottom = promptY - 25
    const gameplayHeight = Math.max(205, gameplayBottom - contentTop)
    const gameplayX = width / 2
    const gameplayY = contentTop + gameplayHeight / 2
    const buttonTopY = topButtonRowY
    const checkpointHud = this.createCompactHudCard({
      x: candleHudStartX,
      y: candleHudY,
      width: candleHudCardWidth,
      label: 'CHECKPOINT',
      bandColor: 0x245d78,
    })
    const flameHud = this.createCompactHudCard({
      x: candleHudStartX + candleHudCardWidth + candleHudGap,
      y: candleHudY,
      width: candleHudCardWidth,
      label: 'FLAME',
      bandColor: 0xc36b22,
      valueColor: '#9b2d24',
    })
    const scoreHud = this.createCompactHudCard({
      x: candleHudStartX + (candleHudCardWidth + candleHudGap) * 2,
      y: candleHudY,
      width: candleHudCardWidth,
      label: 'SCORE',
      bandColor: 0x8b6b1f,
    })
    const timerHud = this.createCompactHudCard({
      x: candleHudStartX + (candleHudCardWidth + candleHudGap) * 3,
      y: candleHudY,
      width: candleHudCardWidth,
      label: 'TIME',
      bandColor: 0x8f2d2d,
      showProgress: true,
    })

    let phase: CandlePhase = 'walking'
    let checkpointIndex = 0
    let hearts = 3
    let score = 0
    let remainingMs = 0
    let choiceTimer: Phaser.Time.TimerEvent | undefined
    let currentObstacle: Phaser.GameObjects.Container | undefined
    let currentFeedback: Phaser.GameObjects.GameObject[] = []
    let actionButtonContainers: Phaser.GameObjects.Container[] = []
    let actionButtonBgs: Partial<Record<CandleAction, Phaser.GameObjects.Rectangle>> = {}

    const checkpointStates: MarkerState[] = checkpoints.map((_checkpoint, index) =>
      index === checkpoints.length - 1 ? 'final' : 'inactive',
    )

    const gameplayFrame = this.scene.add.rectangle(
      gameplayX,
      gameplayY,
      gameplayWidth,
      gameplayHeight,
      0x0f0802,
      1,
    )
    gameplayFrame.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(gameplayFrame)

    const bgKey = firstExistingTexture(['candle-ra-corridor-bg', 'candle-ra-path-bg'])
    if (bgKey) {
      const bg = this.scene.add.image(gameplayX, gameplayY, bgKey)
      bg.setDisplaySize(gameplayWidth - 10, gameplayHeight - 10)
      this.addObject(bg)
    } else {
      const bg = this.scene.add.rectangle(gameplayX, gameplayY, gameplayWidth - 10, gameplayHeight - 10, 0x231407, 1)
      bg.setStrokeStyle(2, 0x8f5b20, 1)
      this.addObject(bg)
    }

    const stageTop = gameplayY - gameplayHeight / 2
    const stageBottom = gameplayY + gameplayHeight / 2
    const pathY = gameplayY + gameplayHeight * 0.25
    const playerY = pathY - 52
    const pathStartX = gameplayX - gameplayWidth / 2 + 58
    const pathEndX = gameplayX + gameplayWidth / 2 - 62
    const checkpointXs = checkpoints.map((_checkpoint, index) =>
      pathStartX + 24 + index * ((pathEndX - pathStartX - 42) / (checkpoints.length - 1)),
    )

    const pathLine = this.scene.add.rectangle(
      gameplayX,
      pathY -6,
      pathEndX - pathStartX,
      5,
      0xd4af37,
      0.72,
    )
    pathLine.setStrokeStyle(1, 0x120a04, 0.85)
    this.addObject(pathLine)

    const checkpointMarkerObjects: Array<{
      container: Phaser.GameObjects.Container
      image?: Phaser.GameObjects.Image
      circle?: Phaser.GameObjects.Arc
      number: Phaser.GameObjects.Text
    }> = []

    const createFallbackMarker = (state: MarkerState) => {
      const color =
        state === 'completed'
          ? 0x236d3a
          : state === 'failed'
            ? 0x8a231b
            : state === 'current'
              ? 0x5b3c10
              : state === 'final'
                ? 0x805810
                : 0x14242a

      const stroke =
        state === 'completed'
          ? 0x72ff9b
          : state === 'failed'
            ? 0xff7770
            : state === 'current'
              ? 0xffd966
              : state === 'final'
                ? 0xffd966
                : 0xd4af37

      const circle = this.scene.add.circle(0, 0, state === 'current' ? 18 : 16, color, 0.94)
      circle.setStrokeStyle(state === 'current' ? 4 : 3, stroke, 1)
      return circle
    }

    const setMarkerState = (index: number, state: MarkerState) => {
      checkpointStates[index] = state
      const marker = checkpointMarkerObjects[index]
      if (!marker) return

      marker.image?.destroy()
      marker.circle?.destroy()
      marker.image = undefined
      marker.circle = undefined

      const imageKey = firstExistingTexture(markerKeys[state])
      if (imageKey) {
        const image = this.scene.add.image(0, 0, imageKey)
        image.setDisplaySize(state === 'current' ? 42 : 36, state === 'current' ? 42 : 36)
        marker.container.addAt(image, 0)
        marker.image = image
      } else {
        const circle = createFallbackMarker(state)
        marker.container.addAt(circle, 0)
        marker.circle = circle
      }

      marker.number.setColor(
        state === 'completed'
          ? '#72ff9b'
          : state === 'failed'
            ? '#ff8b85'
            : state === 'current'
              ? '#fff7cf'
              : '#ffe7a3',
      )
    }

    checkpointXs.forEach((x, index) => {
      const container = this.scene.add.container(x, pathY -6)
      const circle = createFallbackMarker(index === checkpoints.length - 1 ? 'final' : 'inactive')
      const number = this.scene.add.text(0, -1, String(index + 1), {
        fontFamily: 'Georgia',
        fontSize: '15px',
        color: '#ffe7a3',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      })
      number.setOrigin(0.5)
      container.add([circle, number])
      this.addObject(container)
      checkpointMarkerObjects.push({ container, circle, number })
    })


    const promptPanel = this.scene.add.rectangle(
      gameplayX,
      promptY,
      gameplayWidth,
      promptHeight,
      0x211107,
      0.96,
    )
    promptPanel.setStrokeStyle(3, 0xd4af37, 1)
    this.addObject(promptPanel)

    const promptText = this.scene.add.text(gameplayX, promptY, '', {
      fontFamily: 'Georgia',
      fontSize: '11px',
      color: '#fff7cf',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 2,
      wordWrap: { width: gameplayWidth - 48, useAdvancedWrap: true },
    })
    promptText.setOrigin(0.5)
    this.addObject(promptText)

    const gameplayMessage = this.scene.add.text(
      gameplayX - gameplayWidth / 2 + 18,
      stageTop + 26,
      '',
      {
        fontFamily: 'Georgia',
        fontSize: '12px',
        color: '#fff7cf',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
        align: 'left',
        wordWrap: { width: gameplayWidth - 210, useAdvancedWrap: true },
      },
    )
    gameplayMessage.setOrigin(0, 0.5)
    this.addObject(gameplayMessage)

    const playerGroup = this.scene.add.container(checkpointXs[0] - 28, playerY)
    this.addObject(playerGroup)

    let playerSprite: Phaser.GameObjects.Sprite | undefined
    let flameImage: Phaser.GameObjects.Image | undefined

    // Set this to true only after candle_player_sheet.png is a real transparent PNG.
    // Keep false while generated checkerboard/white pixels are baked into the sheet.
    const usePlayerSpritesheet = true // individual frame textures are preferred and loaded first to avoid spritesheet bleeding

    // The player spritesheet already includes the candle.
    // Keep this false so we do not draw a second candle/flame above the player.
    const useSeparateFlameOverlay = false
    const useFlameStateAssets = false
    let flameFallback: Phaser.GameObjects.Triangle | undefined
    let flameSmokeFallback: Phaser.GameObjects.Text | undefined

    if (usePlayerSpritesheet && individualPlayerFramesReady()) {
      playerSprite = this.scene.add.sprite(0, 0, 'candle-player-idle-0')
      playerSprite.setDisplaySize(96, 96)
      playerSprite.play('candle-player-idle', true)
      playerGroup.add(playerSprite)
    } else if (usePlayerSpritesheet && textureExists('candle-ra-player')) {
      playerSprite = this.scene.add.sprite(0, 0, 'candle-ra-player', 0)
      playerSprite.setDisplaySize(96, 96)
      playerSprite.play('candle-player-idle', true)
      playerGroup.add(playerSprite)
    } else {
      const shadow = this.scene.add.ellipse(0, 28, 44, 14, 0x000000, 0.28)
      const legs = this.scene.add.rectangle(-2, 18, 26, 34, 0xf3dfbd, 1)
      legs.setStrokeStyle(2, 0x5c3713, 1)
      const body = this.scene.add.ellipse(0, -6, 38, 54, 0xf3dfbd, 1)
      body.setStrokeStyle(3, 0x5c3713, 1)
      const cloth = this.scene.add.rectangle(0, 2, 30, 30, 0x0f5961, 1)
      cloth.setStrokeStyle(2, 0xd4af37, 1)
      const head = this.scene.add.circle(0, -39, 16, 0xd59a5b, 1)
      head.setStrokeStyle(2, 0x3c2209, 1)
      const headband = this.scene.add.rectangle(0, -48, 31, 6, 0xd4af37, 1)
      headband.setStrokeStyle(1, 0x0f5961, 1)
      const arm = this.scene.add.rectangle(24, -12, 30, 8, 0xd59a5b, 1)
      arm.setRotation(-0.18)
      arm.setStrokeStyle(1, 0x5c3713, 1)
      playerGroup.add([shadow, legs, body, cloth, head, headband, arm])
    }

    const startingFlameKey =
      useSeparateFlameOverlay && useFlameStateAssets
        ? firstExistingTexture(flameKeys.full)
        : undefined

    if (useSeparateFlameOverlay && startingFlameKey) {
      flameImage = this.scene.add.image(34, -36, startingFlameKey)
      flameImage.setDisplaySize(28, 34)
      flameImage.setDepth(2)
      playerGroup.add(flameImage)
    } else if (!usePlayerSpritesheet) {
      const candleCup = this.scene.add.ellipse(34, -24, 22, 12, 0x0f5961, 1)
      candleCup.setStrokeStyle(2, 0xd4af37, 1)
      const candleStem = this.scene.add.rectangle(34, -32, 10, 20, 0xf5d9a0, 1)
      candleStem.setStrokeStyle(1, 0x8a5b24, 1)
      flameFallback = this.scene.add.triangle(34, -47, 0, 22, 12, -16, 24, 22, 0xffa42e, 1)
      flameFallback.setStrokeStyle(2, 0xfff1ad, 1)
      playerGroup.add([candleCup, candleStem, flameFallback])
    }

    const flameGlow = this.scene.add.circle(34, -47, 20, 0xffd966, usePlayerSpritesheet ? 0.05 : 0.16)
    flameGlow.setDepth(1)
    playerGroup.addAt(flameGlow, 0)

    this.addTween({
      targets: flameGlow,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.06,
      duration: 680,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const playPlayerAnimation = (key: string, fallbackPulse = false) => {
      if (playerSprite && this.scene.anims.exists(key)) {
        playerSprite.play(key, true)
        return
      }

      if (fallbackPulse) {
        this.addTween({
          targets: playerGroup,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 140,
          yoyo: true,
          ease: 'Sine.easeOut',
        })
      }
    }

    const setFlameState = (state: 'full' | 'medium' | 'low' | 'tiny' | 'out') => {
      const key =
        useSeparateFlameOverlay && useFlameStateAssets
          ? firstExistingTexture(flameKeys[state])
          : undefined

      flameSmokeFallback?.destroy()
      flameSmokeFallback = undefined

      if (flameImage && key) {
        flameImage.setTexture(key)
        const size =
          state === 'full'
            ? [30, 38]
            : state === 'medium'
              ? [27, 32]
              : state === 'low'
                ? [23, 26]
                : state === 'tiny'
                  ? [18, 20]
                  : [20, 24]
        flameImage.setDisplaySize(size[0], size[1])
        flameImage.setAlpha(state === 'out' ? 0.65 : 1)
      }

      if (flameFallback) {
        const scale = state === 'full' ? 1 : state === 'medium' ? 0.76 : state === 'low' ? 0.54 : state === 'tiny' ? 0.32 : 0.1
        flameFallback.setScale(scale)
        flameFallback.setAlpha(state === 'out' ? 0 : 1)
      }

      flameGlow.setScale(state === 'full' ? 1 : state === 'medium' ? 0.78 : state === 'low' ? 0.55 : state === 'tiny' ? 0.32 : 0.12)
      flameGlow.setAlpha(state === 'full' ? 0.16 : state === 'medium' ? 0.11 : state === 'low' ? 0.07 : state === 'tiny' ? 0.04 : 0.02)

      if (state === 'out' && !key && !usePlayerSpritesheet) {
        flameSmokeFallback = this.scene.add.text(34, -49, '〰', {
          fontFamily: 'Georgia',
          fontSize: '28px',
          color: '#c6c6c6',
          stroke: '#000000',
          strokeThickness: 3,
        })
        flameSmokeFallback.setOrigin(0.5)
        playerGroup.add(flameSmokeFallback)
      }
    }

    const updateFlameFromHearts = () => {
      if (hearts >= 3) {
        setFlameState('full')
      } else if (hearts === 2) {
        setFlameState('medium')
      } else if (hearts === 1) {
        setFlameState('low')
      } else {
        setFlameState('out')
      }
    }

    const clearChoiceTimer = () => {
      choiceTimer?.remove(false)
      choiceTimer = undefined
    }

    const clearFeedback = () => {
      currentFeedback.forEach((object) => object.destroy())
      currentFeedback = []
    }

    const clearObstacle = () => {
      currentObstacle?.destroy()
      currentObstacle = undefined
    }

    const setActionButtonsEnabled = (enabled: boolean) => {
      Object.values(actionButtonBgs).forEach((bg) => {
        if (!bg) return
        if (enabled) {
          bg.setInteractive({ useHandCursor: true })
          bg.setAlpha(1)
        } else {
          bg.disableInteractive()
          bg.setAlpha(0.72)
        }
      })
    }

    const updateStatus = () => {
      checkpointHud.setValue(`${Math.min(checkpointIndex + 1, checkpoints.length)} / ${checkpoints.length}`)
      flameHud.setValue(`${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}`)
      scoreHud.setValue(String(score))
    }

    const updateTimer = () => {
      const maxMs = 12000
      const ratio = Phaser.Math.Clamp(remainingMs / maxMs, 0, 1)
      timerHud.setValue(phase === 'awaiting' ? `${Math.ceil(remainingMs / 1000)}s` : '—')
      timerHud.setProgress(ratio, ratio <= 0.25)
    }

    const startChoiceTimer = () => {
      clearChoiceTimer()
      remainingMs = 12000
      updateTimer()

      choiceTimer = this.addLoop(100, () => {
        if (phase !== 'awaiting') return

        remainingMs -= 100
        updateTimer()

        if (remainingMs <= 0) {
          resolveAction(undefined, true)
        }
      })
    }

    const flashButton = (action: CandleAction, success: boolean) => {
      const bg = actionButtonBgs[action]
      if (!bg) return
      bg.setFillStyle(success ? 0x236d3a : 0x7a1717, 1)
      bg.setStrokeStyle(4, success ? 0x72ff9b : 0xff7770, 1)

      this.addTween({
        targets: bg,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 120,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeOut',
      })
    }

    const showFloatingFeedback = (message: string, success: boolean) => {
      const text = this.scene.add.text(gameplayX, gameplayY - gameplayHeight / 2 + 92, message, {
        fontFamily: 'Georgia',
        fontSize: '22px',
        color: success ? '#72ff9b' : '#ff8b85',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: gameplayWidth - 44, useAdvancedWrap: true },
      })
      text.setOrigin(0.5)
      this.addObject(text)
      currentFeedback.push(text)

      this.addTween({
        targets: text,
        y: text.y - 18,
        alpha: 0,
        duration: 780,
        ease: 'Sine.easeOut',
        onComplete: () => {
          text.destroy()
          currentFeedback = currentFeedback.filter((object) => object !== text)
        },
      })
    }

    const showEffectAtPlayer = (keys: string[], fallbackText: string, success: boolean) => {
      const key = firstExistingTexture(keys)

      if (key) {
        const fx = this.scene.add.image(playerGroup.x + 34, playerGroup.y - 36, key)
        fx.setDisplaySize(success ? 108 : 94, success ? 108 : 94)
        fx.setAlpha(0.92)
        this.addObject(fx)
        currentFeedback.push(fx)

        this.addTween({
          targets: fx,
          scaleX: 1.24,
          scaleY: 1.24,
          alpha: 0,
          duration: 620,
          ease: 'Sine.easeOut',
          onComplete: () => {
            fx.destroy()
            currentFeedback = currentFeedback.filter((object) => object !== fx)
          },
        })
        return
      }

      const fx = this.scene.add.text(playerGroup.x + 34, playerGroup.y - 36, fallbackText, {
        fontFamily: 'Georgia',
        fontSize: '36px',
        color: success ? '#72ff9b' : '#ff7770',
        stroke: '#000000',
        strokeThickness: 5,
      })
      fx.setOrigin(0.5)
      this.addObject(fx)
      currentFeedback.push(fx)

      this.addTween({
        targets: fx,
        y: fx.y - 16,
        alpha: 0,
        duration: 620,
        ease: 'Sine.easeOut',
        onComplete: () => {
          fx.destroy()
          currentFeedback = currentFeedback.filter((object) => object !== fx)
        },
      })
    }

    const animateSelectedIconToCandle = (action: CandleAction | undefined) => {
      if (!action) return

      const key = firstExistingTexture(actionIconKeys[action])
      const bg = actionButtonBgs[action]
      if (!key || !bg) return

      const matrix = bg.getWorldTransformMatrix()
      const icon = this.scene.add.image(matrix.tx, matrix.ty, key)
      icon.setDisplaySize(42, 42)
      this.addObject(icon)
      currentFeedback.push(icon)

      this.addTween({
        targets: icon,
        x: playerGroup.x + 34,
        y: playerGroup.y - 36,
        alpha: 0.1,
        duration: 360,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          icon.destroy()
          currentFeedback = currentFeedback.filter((object) => object !== icon)
        },
      })
    }

    const destroyActionButtons = () => {
      actionButtonContainers.forEach((container) => container.destroy())
      actionButtonContainers = []
      actionButtonBgs = {}
    }

    const createActionButton = (action: CandleAction, x: number, y: number, buttonWidth: number, buttonHeight: number) => {
      const container = this.scene.add.container(x, y)
      const bg = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x4b2b0f, 1)
      bg.setStrokeStyle(3, 0xd4af37, 1)
      bg.setInteractive({ useHandCursor: true })

      const iconKey = firstExistingTexture(actionIconKeys[action])
      if (iconKey) {
        const icon = this.scene.add.image(-36, -1, iconKey)
        icon.setDisplaySize(27, 24)
        container.add(icon)
      } else {
        const fallbackSymbols: Record<CandleAction, string> = {
          cover: '✋',
          shield: '◈',
          bell: '🔔',
          oil: '◔',
          raise: '☀',
        }
        const symbol = this.scene.add.text(-36, -1, fallbackSymbols[action], {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#ffe7a3',
          stroke: '#000000',
          strokeThickness: 4,
        })
        symbol.setOrigin(0.5)
        container.add(symbol)
      }

      const label = this.scene.add.text(10, -1, actionLabels[action], {
        fontFamily: 'Georgia',
        fontSize: '14px',
        color: '#fff7cf',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
        align: 'center',
      })
      label.setOrigin(0.5)

      container.add([bg, label])
      container.sendToBack(bg)

      bg.on('pointerover', () => {
        if (phase !== 'awaiting' || this.resultLocked) return
        bg.setFillStyle(0x684018, 1)
        bg.setStrokeStyle(3, 0xffd966, 1)
      })

      bg.on('pointerout', () => {
        if (phase !== 'awaiting' || this.resultLocked) return
        bg.setFillStyle(0x4b2b0f, 1)
        bg.setStrokeStyle(3, 0xd4af37, 1)
      })

      bg.on('pointerdown', () => {
        if (phase !== 'awaiting' || this.resultLocked) return
        resolveAction(action, false)
      })

      this.addObject(container)
      actionButtonContainers.push(container)
      actionButtonBgs[action] = bg
    }

    const renderActionButtons = () => {
      destroyActionButtons()

      const shuffled = Phaser.Utils.Array.Shuffle(
        ['cover', 'shield', 'bell', 'oil', 'raise'] as CandleAction[],
      )

      const buttonWidth = optionButtonWidth
      const buttonHeight = optionButtonHeight
      const gapX = buttonGapX
      const topRow = shuffled.slice(0, 3)
      const bottomRow = shuffled.slice(3)

      const topRowTotal = topRow.length * buttonWidth + (topRow.length - 1) * gapX
      const topRowStartX = width / 2 - topRowTotal / 2 + buttonWidth / 2

      topRow.forEach((action, index) => {
        createActionButton(action, topRowStartX + index * (buttonWidth + gapX), topButtonRowY, buttonWidth, buttonHeight)
      })

      const bottomRowTotal = bottomRow.length * buttonWidth + (bottomRow.length - 1) * gapX
      const bottomRowStartX = width / 2 - bottomRowTotal / 2 + buttonWidth / 2

      bottomRow.forEach((action, index) => {
        createActionButton(action, bottomRowStartX + index * (buttonWidth + gapX), bottomButtonRowY, buttonWidth, buttonHeight)
      })
    }

    const showObstacle = (checkpoint: CandleCheckpoint) => {
      clearObstacle()
    
      const key = firstExistingTexture(checkpoint.obstacleKeys)
    
      const obstacleX =
        checkpoint.id === 'altar'
          ? checkpointXs[checkpointIndex] + 60
          : playerGroup.x + 92
    
          const obstacleY =
          checkpoint.id === 'altar'
            ? playerY - 82
            : playerY - 48
    
      const hazard = this.scene.add.container(obstacleX, obstacleY)
      this.addObject(hazard)
      currentObstacle = hazard
    
      // Dark shadow under the hazard.
      const shadow = this.scene.add.ellipse(
        0,
        46,
        checkpoint.id === 'altar' ? 118 : 96,
        25,
        0x000000,
        0.5,
      )
    
      // // Dangerous glowing area.
      // const dangerGlow = this.scene.add.circle(
      //   0,
      //   0,
      //   checkpoint.id === 'altar' ? 62 : 49,
      //   checkpoint.id === 'ghost' ? 0x4da8c7 : 0xff5a24,
      //   0.14,
      // )
    
      // const dangerRing = this.scene.add.circle(
      //   0,
      //   0,
      //   checkpoint.id === 'altar' ? 70 : 57,
      //   0x000000,
      //   0,
      // )
    
      // dangerRing.setStrokeStyle(
      //   4,
      //   checkpoint.id === 'ghost' ? 0x70e6ff : 0xff7a32,
      //   0.85,
      // )
    
      // // Red danger strip on the floor.
      // const dangerZone = this.scene.add.rectangle(
      //   0,
      //   49,
      //   checkpoint.id === 'altar' ? 130 : 106,
      //   8,
      //   0xff4a22,
      //   0.55,
      // )
    
      // hazard.add([shadow, dangerGlow, dangerRing, dangerZone])
    
      const pieces: Phaser.GameObjects.GameObject[] = []
    
      const createImagePiece = (
        x: number,
        y: number,
        size: number,
        alpha = 1,
      ) => {
        if (!key) return
    
        const image = this.scene.add.image(x, y, key)
        image.setDisplaySize(size, size)
        image.setAlpha(alpha)
    
        hazard.add(image)
        pieces.push(image)
    
        return image
      }
    
      if (key) {
        if (checkpoint.id === 'wind') {
          // Several gusts moving directly toward the player.
          createImagePiece(12, 0, 98, 1)
          createImagePiece(50, -25, 70, 0.72)
          createImagePiece(44, 28, 62, 0.55)
          createImagePiece(-18, -18, 56, 0.5)
        } else if (checkpoint.id === 'dust') {
          // Thick layered dust cloud.
          createImagePiece(0, 0, 108, 0.95)
          createImagePiece(44, -17, 82, 0.72)
          createImagePiece(-35, 24, 72, 0.58)
          createImagePiece(18, 34, 64, 0.48)
        } else if (checkpoint.id === 'ghost') {
          // Large ghost with two smaller spirits.
          createImagePiece(0, -5, 112, 1)
          createImagePiece(-48, 18, 64, 0.48)
          createImagePiece(48, -20, 70, 0.56)
        } else if (checkpoint.id === 'weak') {
          // Darkness closing around the candle.
          createImagePiece(0, 0, 105, 0.92)
          createImagePiece(-38, -18, 68, 0.44)
          createImagePiece(42, 20, 74, 0.5)
        } else {
          // Sun Altar: one clear floating image.
          createImagePiece(0, 0, 112, 1)
        }
      } else {
        const fallback =
          checkpoint.id === 'wind'
            ? '〰〰'
            : checkpoint.id === 'dust'
              ? '☁☁'
              : checkpoint.id === 'ghost'
                ? '☠'
                : checkpoint.id === 'weak'
                  ? '◉'
                  : '☀'
    
        const fallbackObstacle = this.scene.add.text(0, 0, fallback, {
          fontFamily: 'Georgia',
          fontSize: checkpoint.id === 'ghost' ? '70px' : '62px',
          color:
            checkpoint.id === 'ghost'
              ? '#8eefff'
              : checkpoint.id === 'weak'
                ? '#8d73c7'
                : '#ffe09a',
          stroke: '#000000',
          strokeThickness: 7,
          fontStyle: 'bold',
        })
    
        fallbackObstacle.setOrigin(0.5)
        hazard.add(fallbackObstacle)
        pieces.push(fallbackObstacle)
      }
    
      // // Warning symbol.
      // const warningBg = this.scene.add.circle(
      //   0,
      //   -75,
      //   19,
      //   0x7b1712,
      //   0.96,
      // )
      // warningBg.setStrokeStyle(3, 0xffd966, 1)
    
      // const warningText = this.scene.add.text(0, -76, '!', {
      //   fontFamily: 'Arial',
      //   fontSize: '25px',
      //   color: '#fff1a8',
      //   stroke: '#000000',
      //   strokeThickness: 4,
      //   fontStyle: 'bold',
      // })
      // warningText.setOrigin(0.5)
    
      // hazard.add([warningBg, warningText])
    
      // // Main danger pulse.
      // this.addTween({
      //   targets: dangerGlow,
      //   scaleX: 1.4,
      //   scaleY: 1.4,
      //   alpha: 0.04,
      //   duration: 380,
      //   yoyo: true,
      //   repeat: -1,
      //   ease: 'Sine.easeInOut',
      // })
    
      // this.addTween({
      //   targets: dangerRing,
      //   scaleX: 1.18,
      //   scaleY: 1.18,
      //   alpha: 0.25,
      //   duration: 440,
      //   yoyo: true,
      //   repeat: -1,
      //   ease: 'Sine.easeInOut',
      // })
    
      // this.addTween({
      //   targets: [warningBg, warningText],
      //   scaleX: 1.2,
      //   scaleY: 1.2,
      //   duration: 240,
      //   yoyo: true,
      //   repeat: -1,
      //   ease: 'Sine.easeInOut',
      // })
    
     // Aggressive movement for hazards, but not for the Sun Altar.
if (checkpoint.id !== 'altar') {
  pieces.forEach((piece, index) => {
    this.addTween({
      targets: piece,
      x: index % 2 === 0 ? '-=16' : '+=12',
      y: index % 2 === 0 ? '-=7' : '+=8',
      angle: index % 2 === 0 ? -5 : 5,
      duration: 260 + index * 70,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  })
}
    
      // The whole danger moves toward the player and retreats.
      if (checkpoint.id !== 'altar') {
        this.addTween({
          targets: hazard,
          x: obstacleX - 18,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      } else {
        this.addTween({
          targets: hazard,
          scaleX: 0.86,
          scaleY: 0.86,
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }
    
      // Small impact when the threat appears.
      this.scene.cameras.main.shake(90, 0.0018)
    
      if (checkpoint.id === 'weak') {
        setFlameState('tiny')
      } else {
        updateFlameFromHearts()
      }
    }

    const refreshPromptText = (checkpoint: CandleCheckpoint) => {
      promptText.setText(`${checkpoint.title}: ${checkpoint.prompt} ${checkpoint.hint}`)
    }

    const beginWalkToCheckpoint = () => {
      phase = 'walking'
      clearChoiceTimer()
      clearFeedback()
      clearObstacle()
      destroyActionButtons()
      updateStatus()
      updateTimer()

      const checkpoint = checkpoints[checkpointIndex]
      gameplayMessage.setText(`Walking to ${checkpoint.title}...`)
      promptText.setText('The player carries the sacred candle through the corridor.')
      timerHud.setValue('—')
      timerHud.setProgress(0)

      checkpointStates.forEach((state, index) => {
        if (index === checkpointIndex) {
          setMarkerState(index, index === checkpoints.length - 1 ? 'final' : 'current')
        } else if (state !== 'completed' && state !== 'failed') {
          setMarkerState(index, index === checkpoints.length - 1 ? 'final' : 'inactive')
        }
      })

      playPlayerAnimation('candle-player-walk', true)

      this.addTween({
        targets: playerGroup,
        x: checkpointXs[checkpointIndex],
        y: playerY,
        duration: 900,
        ease: 'Sine.easeInOut',
        onComplete: () => arriveAtCheckpoint(),
      })
    }

    const arriveAtCheckpoint = () => {
      const checkpoint = checkpoints[checkpointIndex]
      phase = 'awaiting'
      playPlayerAnimation('candle-player-idle', true)
      updateStatus()
      refreshPromptText(checkpoint)
      showObstacle(checkpoint)
      gameplayMessage.setText(checkpoint.title)
      renderActionButtons()
      setActionButtonsEnabled(true)
      startChoiceTimer()
    }

    const finishTrial = (success: boolean) => {
      if (phase === 'finished') return
      phase = 'finished'
      clearChoiceTimer()
      destroyActionButtons()
      clearObstacle()

      const finalScore = score + hearts * 100
      const reward = this.baseReward('candle-of-ra', success, finalScore)

      this.complete(
        {
          trialId: 'candle-of-ra',
          success,
          response: success
            ? 'You protected the sacred flame through wind, dust, fear, and darkness. A king must guard hope until it reaches the light.'
            : 'The candle faded before the altar. Return with calmer hands and protect the flame again.',
          ...reward,
        },
        success ? 1100 : 850,
      )
    }

    const advanceAfterSuccess = () => {
      setMarkerState(checkpointIndex, 'completed')
      checkpointIndex += 1

      if (checkpointIndex >= checkpoints.length) {
        playPlayerAnimation('candle-player-success', true)
        showEffectAtPlayer(['candle-ra-fx-correct-sparkle', 'candle-ra-fx-success-glow'], '✦', true)
        gameplayMessage.setText('The Flame Seal awakens.')
        finishTrial(true)
        return
      }

      this.schedule(700, beginWalkToCheckpoint)
    }

    const retryCurrentCheckpointAfterFailure = () => {
      if (hearts <= 0) {
        setFlameState('out')
        finishTrial(false)
        return
      }

      setMarkerState(checkpointIndex, 'failed')
      this.schedule(250, () => {
        if (phase === 'finished') return
        phase = 'awaiting'
        const checkpoint = checkpoints[checkpointIndex]
        refreshPromptText(checkpoint)
        showObstacle(checkpoint)
        gameplayMessage.setText('Try again — protect the flame.')
        renderActionButtons()
        setActionButtonsEnabled(true)
        startChoiceTimer()
      })
    }

    const resolveAction = (action: CandleAction | undefined, timedOut: boolean) => {
      if (phase !== 'awaiting') return
      const checkpoint = checkpoints[checkpointIndex]
      const success = !timedOut && action === checkpoint.correctAction

      phase = 'resolving'
      clearChoiceTimer()
      setActionButtonsEnabled(false)

      if (action) {
        flashButton(action, success)
        animateSelectedIconToCandle(action)
      }

      if (success) {
        score += 130 + Math.ceil(remainingMs / 100)
        playPlayerAnimation(checkpoint.actionAnim, true)
        gameplayMessage.setText(checkpoint.successText)

        if (checkpoint.id === 'weak') {
          updateFlameFromHearts()
        }

        if (checkpoint.id === 'altar') {
          showEffectAtPlayer(['candle-ra-fx-correct-sparkle', 'candle-ra-fx-success-glow'], '☀', true)
        }

        if (currentObstacle) {
          this.addTween({
            targets: currentObstacle,
            alpha: 0,
            scaleX: 0.75,
            scaleY: 0.75,
            duration: 520,
            ease: 'Sine.easeOut',
            onComplete: () => {
              currentObstacle?.destroy()
              currentObstacle = undefined
            },
          })
        }

        updateStatus()
        this.schedule(2250, () => playPlayerAnimation('candle-player-idle', true))
        this.schedule(2550, advanceAfterSuccess)
        return
      }

      hearts -= 1
      playPlayerAnimation('candle-player-fail', true)
      gameplayMessage.setText(
        timedOut
          ? `Too slow. Use ${actionLabels[checkpoint.correctAction]} for ${checkpoint.title}.`
          : `Wrong action. ${action ? actionHints[action] : ''} does not solve ${checkpoint.title}.`,
      )
      showEffectAtPlayer(['candle-ra-fx-candle-damaged', 'candle-ra-fx-failure-smoke'], '!', false)

      updateFlameFromHearts()
      updateStatus()

      this.scene.cameras.main.shake(150, 0.004)
      this.addTween({
        targets: playerGroup,
        angle: 5,
        duration: 75,
        yoyo: true,
        repeat: 2,
        onComplete: () => playerGroup.setAngle(0),
      })

      this.schedule(1250, () => playPlayerAnimation('candle-player-idle', true))
      this.schedule(1650, retryCurrentCheckpointAfterFailure)
    }

    this.runtimeCleanups.push(() => {
      clearChoiceTimer()
      clearFeedback()
      clearObstacle()
      destroyActionButtons()
    })

    updateStatus()
    updateFlameFromHearts()
    beginWalkToCheckpoint()
  }


  // ---------------------------------------------------------------------------
  // 3. HALL OF HIEROGLYPHS
  // ---------------------------------------------------------------------------
  private createGlyphMemory() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    type GlyphOption = {
      id: string
      label: string
      imageKey: string
      fallback: string
    }

    type GlyphButtonHandle = {
      setEnabled: (enabled: boolean) => void
      destroy: () => void
    }

    this.addTitle(TRIAL_TITLES['glyph-memory'])
    this.addInstruction('Watch the glowing temple emblems. Repeat the sequence to awaken the wall.', top + 88)

    const glyphs: GlyphOption[] = [
      { id: 'sun', label: 'Sun', imageKey: 'temple-glyph-sun', fallback: '☀' },
      { id: 'eye', label: 'Eye', imageKey: 'temple-glyph-eye', fallback: '𓂀' },
      { id: 'scarab', label: 'Scarab', imageKey: 'temple-glyph-scarab', fallback: '𓆣' },
      { id: 'falcon', label: 'Falcon', imageKey: 'temple-glyph-falcon', fallback: '𓅓' },
      { id: 'ankh', label: 'Ankh', imageKey: 'temple-glyph-ankh', fallback: '𓋹' },
    ]

    let round = 1
    let inputIndex = 0
    let sequence: GlyphOption[] = []
    let score = 0
    let hearts = 3
    let buttons: GlyphButtonHandle[] = []
    let sequenceObjects: Phaser.GameObjects.GameObject[] = []

    const glyphHudWidth = this.panelWidth - 82
    const glyphHudGap = 7
    const glyphHudCardWidth = (glyphHudWidth - glyphHudGap * 3) / 4
    const glyphHudStartX = width / 2 - glyphHudWidth / 2 + glyphHudCardWidth / 2
    const glyphHudY = top + 127

    const roundHud = this.createCompactHudCard({
      x: glyphHudStartX,
      y: glyphHudY,
      width: glyphHudCardWidth,
      label: 'ROUND',
      bandColor: 0x245d78,
    })
    const livesHud = this.createCompactHudCard({
      x: glyphHudStartX + glyphHudCardWidth + glyphHudGap,
      y: glyphHudY,
      width: glyphHudCardWidth,
      label: 'LIVES',
      bandColor: 0x8f2d2d,
      valueColor: '#8f2d2d',
    })
    const scoreHud = this.createCompactHudCard({
      x: glyphHudStartX + (glyphHudCardWidth + glyphHudGap) * 2,
      y: glyphHudY,
      width: glyphHudCardWidth,
      label: 'SCORE',
      bandColor: 0x8b6b1f,
    })
    const sequenceHud = this.createCompactHudCard({
      x: glyphHudStartX + (glyphHudCardWidth + glyphHudGap) * 3,
      y: glyphHudY,
      width: glyphHudCardWidth,
      label: 'SEQUENCE',
      bandColor: 0x5b3c88,
    })

    const wallY = top + 262
    const wallWidth = this.panelWidth - 100
    const wallHeight = 178
    const statusY = bottom - 145
    const buttonY = bottom - 66

    const wall = this.scene.add.rectangle(width / 2, wallY, wallWidth, wallHeight, 0x221608, 1)
    wall.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(wall)

    const innerWall = this.scene.add.rectangle(width / 2, wallY, wallWidth - 26, wallHeight - 28, 0x120a04, 0.78)
    innerWall.setStrokeStyle(2, 0x8f5b20, 0.8)
    this.addObject(innerWall)

    const wallTitle = this.scene.add.text(width / 2, wallY - 66, 'MEMORIZE THE EMBLEMS', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#ffe7a3',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
      align: 'center',
    })
    wallTitle.setOrigin(0.5)
    this.addObject(wallTitle)

    const statusPanel = this.scene.add.rectangle(
      width / 2,
      statusY,
      this.panelWidth - 130,
      32,
      0x211107,
      0.92,
    )
    statusPanel.setStrokeStyle(2, 0xd4af37, 0.72)
    this.addObject(statusPanel)

    const status = this.addStatusText('', statusY, '#ffd966')
    status.setFontSize(14)

    const updateHud = () => {
      roundHud.setValue(`${round} / 5`)
      livesHud.setValue(`${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}`)
      scoreHud.setValue(String(score))
      sequenceHud.setValue(String(round + 1))
    }

    const clearSequenceObjects = () => {
      sequenceObjects.forEach((object) => {
        if (object.active) object.destroy()
      })
      sequenceObjects = []
    }

    const addSequenceObject = <T extends Phaser.GameObjects.GameObject>(object: T) => {
      this.addObject(object)
      sequenceObjects.push(object)
      return object
    }

    const addGlyphVisual = (
      glyph: GlyphOption,
      x: number,
      y: number,
      size: number,
      alpha = 1,
    ) => {
      if (this.scene.textures.exists(glyph.imageKey)) {
        const image = this.scene.add.image(x, y, glyph.imageKey)
        image.setDisplaySize(size, size)
        image.setAlpha(alpha)
        return image
      }

      const fallback = this.scene.add.text(x, y, glyph.fallback, {
        fontFamily: 'Georgia',
        fontSize: `${Math.round(size * 0.72)}px`,
        color: '#ffe7a3',
        stroke: '#000000',
        strokeThickness: 5,
        fontStyle: 'bold',
      })
      fallback.setOrigin(0.5)
      fallback.setAlpha(alpha)
      return fallback
    }

    const showGlyphSequence = (items: GlyphOption[]) => {
      clearSequenceObjects()
      wallTitle.setText('MEMORIZE THE EMBLEMS')

      if (items.length === 0) return

      const gap = 14
      const iconSize = Math.min(64, (wallWidth - 150 - gap * (items.length - 1)) / items.length)
      const totalWidth = items.length * iconSize + (items.length - 1) * gap
      const startX = width / 2 - totalWidth / 2 + iconSize / 2

      items.forEach((glyph, index) => {
        const x = startX + index * (iconSize + gap)
        const y = wallY + 8

        const disk = addSequenceObject(this.scene.add.circle(x, y, iconSize * 0.52, 0x3d250b, 0.94))
        disk.setStrokeStyle(3, 0xd4af37, 0.95)

        const icon = addGlyphVisual(glyph, x, y, iconSize * 0.9)
        addSequenceObject(icon)

        this.addTween({
          targets: [disk, icon],
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 260,
          delay: index * 180,
          yoyo: true,
          ease: 'Sine.easeInOut',
        })

        if (index < items.length - 1) {
          const arrow = addSequenceObject(
            this.scene.add.text(x + iconSize / 2 + gap / 2, y, '›', {
              fontFamily: 'Georgia',
              fontSize: '28px',
              color: '#d4af37',
              stroke: '#000000',
              strokeThickness: 3,
              fontStyle: 'bold',
            }),
          )
          arrow.setOrigin(0.5)
        }
      })
    }

    const showRepeatSlots = () => {
      clearSequenceObjects()
      wallTitle.setText('REPEAT THE WALL')

      const gap = 12
      const slotSize = Math.min(44, (wallWidth - 180 - gap * (sequence.length - 1)) / sequence.length)
      const totalWidth = sequence.length * slotSize + (sequence.length - 1) * gap
      const startX = width / 2 - totalWidth / 2 + slotSize / 2

      sequence.forEach((_glyph, index) => {
        const x = startX + index * (slotSize + gap)
        const y = wallY + 8
        const filled = index < inputIndex

        const slot = addSequenceObject(
          this.scene.add.circle(x, y, slotSize * 0.5, filled ? 0x27633a : 0x3d250b, 0.96),
        )
        slot.setStrokeStyle(3, filled ? 0x72ff9b : 0xd4af37, 0.95)

        const mark = addSequenceObject(
          this.scene.add.text(x, y, filled ? '✓' : '?', {
            fontFamily: 'Georgia',
            fontSize: `${Math.round(slotSize * 0.55)}px`,
            color: filled ? '#72ff9b' : '#ffe7a3',
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold',
          }),
        )
        mark.setOrigin(0.5)
      })
    }

    const destroyButtons = () => {
      buttons.forEach((button) => button.destroy())
      buttons = []
    }

    const setButtonsEnabled = (enabled: boolean) => {
      buttons.forEach((button) => button.setEnabled(enabled))
    }

    const createGlyphButton = (
      glyph: GlyphOption,
      x: number,
      y: number,
      onClick: () => void,
    ): GlyphButtonHandle => {
      let enabled = true
      const container = this.scene.add.container(x, y)

      const bg = this.scene.add.rectangle(0, 0, 94, 70, 0x4d2d10, 1)
      bg.setStrokeStyle(3, 0xd4af37, 1)
      bg.setInteractive({ useHandCursor: true })

      const icon = addGlyphVisual(glyph, 0, -8, 47)
      const label = this.scene.add.text(0, 25, glyph.label, {
        fontFamily: 'Georgia',
        fontSize: '9px',
        color: '#fff7cf',
        stroke: '#000000',
        strokeThickness: 2,
        fontStyle: 'bold',
        align: 'center',
      })
      label.setOrigin(0.5)

      container.add([bg, icon, label])
      this.addObject(container)

      const refresh = () => {
        if (!enabled) {
          bg.disableInteractive()
          bg.setFillStyle(0x2d2a25, 0.9)
          bg.setStrokeStyle(2, 0x777777, 0.8)
          container.setAlpha(0.58)
          return
        }

        bg.setInteractive({ useHandCursor: true })
        bg.setFillStyle(0x4d2d10, 1)
        bg.setStrokeStyle(3, 0xd4af37, 1)
        container.setAlpha(1)
      }

      bg.on('pointerover', () => {
        if (!enabled || this.resultLocked) return
        bg.setFillStyle(0x684018, 1)
        bg.setStrokeStyle(4, 0xffd966, 1)
        this.addTween({
          targets: container,
          scaleX: 1.045,
          scaleY: 1.045,
          duration: 85,
        })
      })

      bg.on('pointerout', () => {
        if (!enabled || this.resultLocked) return
        refresh()
        this.addTween({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 85,
        })
      })

      bg.on('pointerdown', () => {
        if (!enabled || this.resultLocked) return
        this.addTween({
          targets: container,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 70,
          yoyo: true,
        })
        onClick()
      })

      return {
        setEnabled: (value: boolean) => {
          enabled = value
          refresh()
        },
        destroy: () => {
          if (container.active) container.destroy()
        },
      }
    }

    const showInput = () => {
      status.setText(`Tap emblem ${inputIndex + 1} of ${sequence.length}`)
      showRepeatSlots()
      destroyButtons()

      const gap = 10
      const buttonWidth = 94
      const totalWidth = glyphs.length * buttonWidth + (glyphs.length - 1) * gap
      const startX = width / 2 - totalWidth / 2 + buttonWidth / 2

      buttons = glyphs.map((glyph, index) =>
        createGlyphButton(
          glyph,
          startX + index * (buttonWidth + gap),
          buttonY,
          () => choose(glyph),
        ),
      )
    }

    const startRound = () => {
      inputIndex = 0
      sequence = Array.from(
        { length: round + 1 },
        () => glyphs[Phaser.Math.Between(0, glyphs.length - 1)],
      )

      updateHud()
      destroyButtons()
      status.setText('Memorize the glowing emblem order.')
      status.setColor('#ffd966')
      showGlyphSequence(sequence)

      const memorizeDelay = 2800 + sequence.length * 850
      this.schedule(memorizeDelay, showInput)
    }

    const choose = (glyph: GlyphOption) => {
      if (this.resultLocked) return

      if (glyph.id === sequence[inputIndex].id) {
        inputIndex += 1
        score += 40
        updateHud()
        showRepeatSlots()

        if (inputIndex >= sequence.length) {
          setButtonsEnabled(false)
          status.setText('Correct. The wall remembers you.')
          status.setColor('#72ff9b')

          if (round >= 5) {
            const reward = this.baseReward('glyph-memory', true, score)
            this.complete(
              {
                trialId: 'glyph-memory',
                success: true,
                response:
                  'The ancient emblems obey your memory. A ruler must remember what the walls have already taught.',
                ...reward,
              },
              850,
            )
            return
          }

          round += 1
          this.schedule(900, () => {
            status.setColor('#ffd966')
            startRound()
          })
          return
        }

        status.setText(`Good. Tap emblem ${inputIndex + 1} of ${sequence.length}`)
        status.setColor('#72ff9b')
        this.schedule(250, () => {
          if (!this.isVisible) return
          status.setColor('#ffd966')
        })
        return
      }

      hearts -= 1
      updateHud()
      setButtonsEnabled(false)
      status.setText('Wrong emblem. The chamber groans.')
      status.setColor('#ff7770')
      this.scene.cameras.main.shake(140, 0.004)

      if (hearts <= 0) {
        const reward = this.baseReward('glyph-memory', false, score)
        this.complete(
          {
            trialId: 'glyph-memory',
            success: false,
            response:
              'The emblems fade before the sequence is complete. Memory is a staircase; climb it again.',
            ...reward,
          },
          850,
        )
        return
      }

      this.schedule(850, () => {
        status.setColor('#ffd966')
        startRound()
      })
    }

    this.runtimeCleanups.push(() => {
      destroyButtons()
      clearSequenceObjects()
    })

    startRound()
  }

  // ---------------------------------------------------------------------------
  // 4. TREASURY OF FALSE GOLD
  // ---------------------------------------------------------------------------
  private createFalseGold() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    type InspectTool = 'magnifier' | 'scale' | 'tap' | 'torch'
    type CoinVisualTrait = 'good' | 'bad'
    type CoinCase = {
      real: boolean
      imageKey: string
      stamp: CoinVisualTrait
      weight: CoinVisualTrait
      sound: CoinVisualTrait
      shine: CoinVisualTrait
      mark: string
      tint: number
    }

    type LocalButton = {
      container: Phaser.GameObjects.Container
      bg: Phaser.GameObjects.Rectangle
      setEnabled: (enabled: boolean) => void
      destroy: () => void
    }

    this.addTitle(TRIAL_TITLES['false-gold'])
    this.addInstruction(
      'Inspect the coin with 2 visual tools, then send it to the royal chest or fake pot.',
      top + 88,
    )

    const textureExists = (key: string) => this.scene.textures.exists(key)
    const firstExistingTexture = (keys: string[]) => keys.find(textureExists)

    const coins: CoinCase[] = Phaser.Utils.Array.Shuffle([
      // Real coins are not always perfect. This keeps the judgment less obvious.
      {
        real: true,
        imageKey: 'false-gold-real-coin-1',
        stamp: 'good',
        weight: 'good',
        sound: 'good',
        shine: 'bad',
        mark: '𓆣',
        tint: 0xffd966,
      },
      {
        real: true,
        imageKey: 'false-gold-real-coin-2',
        stamp: 'good',
        weight: 'good',
        sound: 'bad',
        shine: 'good',
        mark: '☀',
        tint: 0xf2c14d,
      },
      {
        real: true,
        imageKey: 'false-gold-real-coin-3',
        stamp: 'bad',
        weight: 'good',
        sound: 'good',
        shine: 'good',
        mark: '𓋹',
        tint: 0xf6d46a,
      },
      {
        real: true,
        imageKey: 'false-gold-real-coin-1',
        stamp: 'good',
        weight: 'bad',
        sound: 'good',
        shine: 'good',
        mark: '𓆣',
        tint: 0xe8bc42,
      },

      // Fake coins can pass some checks, but enough visual evidence exposes them.
      {
        real: false,
        imageKey: 'false-gold-fake-coin-1',
        stamp: 'bad',
        weight: 'bad',
        sound: 'good',
        shine: 'good',
        mark: '☾',
        tint: 0xd7b85d,
      },
      {
        real: false,
        imageKey: 'false-gold-fake-coin-2',
        stamp: 'good',
        weight: 'bad',
        sound: 'bad',
        shine: 'good',
        mark: '☀',
        tint: 0xf5d05c,
      },
      {
        real: false,
        imageKey: 'false-gold-fake-coin-3',
        stamp: 'bad',
        weight: 'good',
        sound: 'bad',
        shine: 'bad',
        mark: '𓋹',
        tint: 0xcab36b,
      },
      {
        real: false,
        imageKey: 'false-gold-fake-coin-1',
        stamp: 'good',
        weight: 'good',
        sound: 'bad',
        shine: 'bad',
        mark: '𓆣',
        tint: 0xffdd76,
      },
    ]).slice(0, 7)

    const tools: Array<{
      id: InspectTool
      label: string
      icon: string
      imageKey: string
      color: number
    }> = [
      { id: 'magnifier', label: 'MAGNIFY', icon: '⌕', imageKey: 'false-gold-tool-magnifier', color: 0x245d78 },
      { id: 'scale', label: 'WEIGH', icon: '⚖', imageKey: 'false-gold-tool-scale', color: 0x5b3c88 },
      { id: 'tap', label: 'TAP', icon: '◉', imageKey: 'false-gold-tool-tap-hammer', color: 0x7a4d19 },
      { id: 'torch', label: 'TORCH', icon: '🔥', imageKey: 'false-gold-tool-torch', color: 0x8f2d2d },
    ]

    let coinIndex = 0
    let score = 0
    let mistakes = 0
    let toolsUsed = 0
    let currentCoin: CoinCase = coins[0]
    let currentCoinGroup: Phaser.GameObjects.Container | undefined
    let inspectionObjects: Phaser.GameObjects.GameObject[] = []
    let toolButtons: LocalButton[] = []
    let judgeButtons: LocalButton[] = []
    let isResolving = false

    const hudWidth = this.panelWidth - 82
    const hudGap = 7
    const hudCardWidth = (hudWidth - hudGap * 3) / 4
    const hudStartX = width / 2 - hudWidth / 2 + hudCardWidth / 2
    const hudY = top + 127

    const coinHud = this.createCompactHudCard({
      x: hudStartX,
      y: hudY,
      width: hudCardWidth,
      label: 'COIN',
      bandColor: 0x245d78,
    })
    const toolsHud = this.createCompactHudCard({
      x: hudStartX + hudCardWidth + hudGap,
      y: hudY,
      width: hudCardWidth,
      label: 'TOOLS',
      bandColor: 0x5b3c88,
    })
    const mistakesHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 2,
      y: hudY,
      width: hudCardWidth,
      label: 'MISTAKES',
      bandColor: 0x8f2d2d,
      valueColor: '#8f2d2d',
    })
    const scoreHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 3,
      y: hudY,
      width: hudCardWidth,
      label: 'SCORE',
      bandColor: 0x8b6b1f,
    })

    const stationY = top + 288
    const stationWidth = this.panelWidth - 96
    const stationHeight = 250
    const coinX = width / 2
    const coinY = stationY + 20

    const station = this.scene.add.rectangle(width / 2, stationY, stationWidth, stationHeight, 0x211407, 1)
    station.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(station)

    const bgKey = firstExistingTexture(['false-gold-bg'])
    if (bgKey) {
      const bg = this.scene.add.image(width / 2, stationY, bgKey)
      bg.setDisplaySize(stationWidth - 10, stationHeight - 10)
      bg.setAlpha(0.76)
      this.addObject(bg)

      const bgShade = this.scene.add.rectangle(width / 2, stationY, stationWidth - 10, stationHeight - 10, 0x000000, 0.2)
      this.addObject(bgShade)
    } else {
      const table = this.scene.add.rectangle(width / 2, stationY + 64, stationWidth - 46, 70, 0x6d4218, 1)
      table.setStrokeStyle(3, 0xb8862e, 1)
      this.addObject(table)
    }

    const royalChest = this.scene.add.rectangle(width / 2 - 240, stationY + 82, 120, 72, 0x236d3a, 0.94)
    royalChest.setStrokeStyle(4, 0xffd966, 1)
    const royalIcon = this.scene.add.text(royalChest.x, royalChest.y - 8, '♕', {
      fontFamily: 'Georgia',
      fontSize: '30px',
      color: '#ffe7a3',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    })
    royalIcon.setOrigin(0.5)
    const royalLabel = this.scene.add.text(royalChest.x, royalChest.y + 24, 'ROYAL', {
      fontFamily: 'Georgia',
      fontSize: '12px',
      color: '#fff7cf',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    })
    royalLabel.setOrigin(0.5)

    const fakePot = this.scene.add.rectangle(width / 2 + 240, stationY + 82, 120, 72, 0x7a2c22, 0.94)
    fakePot.setStrokeStyle(4, 0xffbd63, 1)
    const fakeIcon = this.scene.add.text(fakePot.x, fakePot.y - 8, '✕', {
      fontFamily: 'Georgia',
      fontSize: '30px',
      color: '#ffbd63',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    })
    fakeIcon.setOrigin(0.5)
    const fakeLabel = this.scene.add.text(fakePot.x, fakePot.y + 24, 'FAKE', {
      fontFamily: 'Georgia',
      fontSize: '12px',
      color: '#fff7cf',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    })
    fakeLabel.setOrigin(0.5)

    this.addObject(royalChest)
    this.addObject(royalIcon)
    this.addObject(royalLabel)
    this.addObject(fakePot)
    this.addObject(fakeIcon)
    this.addObject(fakeLabel)

    const coinSpot = this.scene.add.circle(coinX, coinY, 73, 0x0f0802, 0.56)
    coinSpot.setStrokeStyle(3, 0xd4af37, 0.7)
    this.addObject(coinSpot)

    this.addTween({
      targets: coinSpot,
      scaleX: 1.05,
      scaleY: 1.05,
      alpha: 0.35,
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const statusPanel = this.scene.add.rectangle(width / 2, bottom - 154, this.panelWidth - 118, 36, 0x211107, 0.92)
    statusPanel.setStrokeStyle(2, 0xd4af37, 0.72)
    this.addObject(statusPanel)

    const status = this.addStatusText('', bottom - 154, '#ffd966')
    status.setFontSize(14)

    const clearInspectionObjects = () => {
      inspectionObjects.forEach((object) => {
        if (object.active) object.destroy()
      })
      inspectionObjects = []
    }

    const addInspectionObject = <T extends Phaser.GameObjects.GameObject>(object: T) => {
      this.addObject(object)
      inspectionObjects.push(object)
      return object
    }

    const destroyCoin = () => {
      currentCoinGroup?.destroy()
      currentCoinGroup = undefined
    }

    const updateHud = () => {
      coinHud.setValue(`${Math.min(coinIndex + 1, coins.length)} / ${coins.length}`)
      toolsHud.setValue(`${toolsUsed} / 2`)
      mistakesHud.setValue(`${mistakes} / 3`)
      scoreHud.setValue(String(score))
    }

    const setLocalButtonsEnabled = (buttons: LocalButton[], enabled: boolean) => {
      buttons.forEach((button) => button.setEnabled(enabled))
    }

    const destroyLocalButtons = (buttons: LocalButton[]) => {
      buttons.forEach((button) => button.destroy())
    }

    const addCoinImage = (
      coin: CoinCase,
      x: number,
      y: number,
      displaySize: number,
    ) => {
      if (textureExists(coin.imageKey)) {
        const image = this.scene.add.image(x, y, coin.imageKey)
        image.setDisplaySize(displaySize, displaySize)
        return image
      }

      const fallback = this.scene.add.container(x, y)
      const outer = this.scene.add.circle(0, 0, displaySize * 0.45, coin.tint, 1)
      outer.setStrokeStyle(5, 0x8b5a2b, 1)
      const inner = this.scene.add.circle(0, 0, displaySize * 0.32, 0xffe49a, 0.85)
      inner.setStrokeStyle(3, 0xb8862e, 0.95)
      const mark = this.scene.add.text(0, 0, coin.mark, {
        fontFamily: 'Georgia',
        fontSize: `${Math.round(displaySize * 0.28)}px`,
        color: '#74420d',
        stroke: '#fff2bc',
        strokeThickness: 2,
        fontStyle: 'bold',
      })
      mark.setOrigin(0.5)
      mark.setRotation(coin.stamp === 'bad' ? Phaser.Math.DegToRad(13) : 0)
      fallback.add([outer, inner, mark])
      return fallback
    }

    const showFx = (
      keys: string[],
      x: number,
      y: number,
      size: number,
      fallbackText: string,
      success: boolean,
    ) => {
      const key = firstExistingTexture(keys)

      if (key) {
        const fx = addInspectionObject(this.scene.add.image(x, y, key))
        fx.setDisplaySize(size, size)
        fx.setAlpha(0.92)
        this.addTween({
          targets: fx,
          scaleX: 1.24,
          scaleY: 1.24,
          alpha: 0,
          duration: 650,
          ease: 'Sine.easeOut',
          onComplete: () => {
            if (fx.active) fx.destroy()
            inspectionObjects = inspectionObjects.filter((object) => object !== fx)
          },
        })
        return
      }

      const textFx = addInspectionObject(this.scene.add.text(x, y, fallbackText, {
        fontFamily: 'Georgia',
        fontSize: '34px',
        color: success ? '#72ff9b' : '#ff7770',
        stroke: '#000000',
        strokeThickness: 5,
        fontStyle: 'bold',
      }))
      textFx.setOrigin(0.5)
      this.addTween({
        targets: textFx,
        y: y - 18,
        alpha: 0,
        duration: 650,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (textFx.active) textFx.destroy()
          inspectionObjects = inspectionObjects.filter((object) => object !== textFx)
        },
      })
    }

    const createLocalButton = (config: {
      x: number
      y: number
      width: number
      height: number
      icon: string
      imageKey?: string
      label: string
      color: number
      onClick: () => void
    }): LocalButton => {
      let enabled = true

      const container = this.scene.add.container(config.x, config.y)
      const bg = this.scene.add.rectangle(0, 0, config.width, config.height, config.color, 1)
      bg.setStrokeStyle(3, 0xd4af37, 1)
      bg.setInteractive({ useHandCursor: true })

      if (config.imageKey && textureExists(config.imageKey)) {
        const iconImage = this.scene.add.image(0, -8, config.imageKey)
        const iconSize = config.height >= 56 ? 44 : 30
        iconImage.setDisplaySize(iconSize, iconSize)
        container.add(iconImage)
      } else {
        const icon = this.scene.add.text(0, -9, config.icon, {
          fontFamily: 'Georgia',
          fontSize: '24px',
          color: '#ffe7a3',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold',
        })
        icon.setOrigin(0.5)
        container.add(icon)
      }

      const label = this.scene.add.text(0, config.height >= 56 ? 22 : 10, config.label, {
        fontFamily: 'Georgia',
        fontSize: config.height >= 56 ? '8px' : '10px',
        color: '#fff7cf',
        stroke: '#000000',
        strokeThickness: 2,
        fontStyle: 'bold',
        align: 'center',
      })
      label.setOrigin(0.5)

      container.add([bg, label])
      container.sendToBack(bg)
      this.addObject(container)

      const refresh = () => {
        if (!enabled) {
          bg.disableInteractive()
          bg.setFillStyle(0x2d2a25, 0.9)
          bg.setStrokeStyle(2, 0x777777, 0.7)
          container.setAlpha(0.55)
          return
        }

        bg.setInteractive({ useHandCursor: true })
        bg.setFillStyle(config.color, 1)
        bg.setStrokeStyle(3, 0xd4af37, 1)
        container.setAlpha(1)
      }

      bg.on('pointerover', () => {
        if (!enabled || isResolving || this.resultLocked) return
        bg.setStrokeStyle(4, 0xffd966, 1)
        this.addTween({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 90 })
      })

      bg.on('pointerout', () => {
        if (!enabled || isResolving || this.resultLocked) return
        refresh()
        this.addTween({ targets: container, scaleX: 1, scaleY: 1, duration: 90 })
      })

      bg.on('pointerdown', () => {
        if (!enabled || isResolving || this.resultLocked) return
        this.addTween({ targets: container, scaleX: 0.95, scaleY: 0.95, duration: 70, yoyo: true })
        config.onClick()
      })

      return {
        container,
        bg,
        setEnabled: (value: boolean) => {
          enabled = value
          refresh()
        },
        destroy: () => {
          if (container.active) container.destroy()
        },
      }
    }

    const createCoinVisual = () => {
      destroyCoin()

      const coin = currentCoin
      const coinGroup = this.scene.add.container(coinX, coinY)
      this.addObject(coinGroup)
      currentCoinGroup = coinGroup

      const shadow = this.scene.add.ellipse(0, 56, 126, 28, 0x000000, 0.34)
      const coinVisual = addCoinImage(coin, 0, 0, 118)
      coinGroup.add([shadow, coinVisual])
      coinGroup.setScale(0.72)
      coinGroup.setAlpha(0)

      this.addTween({
        targets: coinGroup,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 360,
        ease: 'Back.easeOut',
      })
      this.addTween({
        targets: coinGroup,
        y: coinY - 6,
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }

    const showStampResult = (trait: CoinVisualTrait) => {
      if (!currentCoinGroup) return
      clearInspectionObjects()

      const magnifierKey = firstExistingTexture(['false-gold-tool-magnifier'])
      const magnifier = magnifierKey
        ? addInspectionObject(this.scene.add.image(coinX - 150, coinY - 84, magnifierKey))
        : addInspectionObject(this.scene.add.text(coinX - 150, coinY - 84, '⌕', {
            fontFamily: 'Georgia',
            fontSize: '48px',
            color: '#ffe7a3',
            stroke: '#000000',
            strokeThickness: 5,
            fontStyle: 'bold',
          }))

      if ('setOrigin' in magnifier) {
        ;(magnifier as Phaser.GameObjects.Image | Phaser.GameObjects.Text).setOrigin(0.5)
      }
      if (magnifier instanceof Phaser.GameObjects.Image) {
        magnifier.setDisplaySize(96, 96)
      }
      magnifier.setAlpha(0)

      const zoom = addInspectionObject(this.scene.add.circle(coinX + 108, coinY - 56, 48, 0x221407, 0.96))
      zoom.setStrokeStyle(4, trait === 'good' ? 0x72ff9b : 0xff7770, 1)
      zoom.setScale(0.35)
      zoom.setAlpha(0)

      const zoomCoin = addInspectionObject(addCoinImage(currentCoin, coinX + 108, coinY - 56, 62))
      zoomCoin.setScale(0.35)
      zoomCoin.setAlpha(0)
      zoomCoin.setRotation(trait === 'bad' ? Phaser.Math.DegToRad(13) : 0)

      if (trait === 'bad') {
        const crack = addInspectionObject(this.scene.add.text(coinX + 145, coinY - 92, '⚡', {
          fontFamily: 'Georgia',
          fontSize: '26px',
          color: '#ff7770',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold',
        }))
        crack.setOrigin(0.5)
        crack.setRotation(0.42)
        crack.setAlpha(0)
        this.addTween({ targets: crack, alpha: 1, scaleX: 1.25, scaleY: 1.25, duration: 220, delay: 310, yoyo: true })
      }

      this.addTween({
        targets: magnifier,
        alpha: 1,
        x: coinX - 54,
        y: coinY - 38,
        angle: 8,
        duration: 370,
        ease: 'Sine.easeOut',
      })
      this.addTween({
        targets: [zoom, zoomCoin],
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 280,
        delay: 260,
        ease: 'Back.easeOut',
      })
      showFx(
        trait === 'good'
          ? ['false-gold-fx-correct-glow-1', 'false-gold-fx-correct-glow-2']
          : ['false-gold-fx-fake-burst-1', 'false-gold-fx-fake-burst-2'],
        coinX + 108,
        coinY - 56,
        trait === 'good' ? 98 : 104,
        trait === 'good' ? '✓' : '!',
        trait === 'good',
      )
    }

    const showWeightResult = (trait: CoinVisualTrait) => {
      clearInspectionObjects()

      const scaleGroup = this.scene.add.container(coinX, coinY - 24)
      addInspectionObject(scaleGroup)

      const scaleKey = firstExistingTexture(['false-gold-tool-scale'])
      if (scaleKey) {
        const scale = this.scene.add.image(0, 0, scaleKey)
        scale.setDisplaySize(214, 120)
        scaleGroup.add(scale)
      } else {
        const pole = this.scene.add.rectangle(0, 36, 8, 78, 0xd4af37, 1)
        const beam = this.scene.add.rectangle(0, 0, 180, 8, 0xd4af37, 1)
        const leftPan = this.scene.add.ellipse(-70, 39, 62, 18, 0x3d250b, 1)
        const rightPan = this.scene.add.ellipse(70, 39, 62, 18, 0x3d250b, 1)
        leftPan.setStrokeStyle(2, 0xffd966, 1)
        rightPan.setStrokeStyle(2, 0xffd966, 1)
        scaleGroup.add([pole, beam, leftPan, rightPan])
      }

      const coinOnPan = addCoinImage(currentCoin, -66, 18, 42)
      scaleGroup.add(coinOnPan)
      scaleGroup.setScale(0.55)
      scaleGroup.setAlpha(0)

      const targetAngle = trait === 'good' ? 0 : Phaser.Math.DegToRad(8)
      this.addTween({
        targets: scaleGroup,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 260,
        ease: 'Back.easeOut',
      })
      this.addTween({
        targets: scaleGroup,
        angle: targetAngle,
        duration: 360,
        yoyo: trait === 'bad',
        repeat: trait === 'bad' ? 2 : 0,
        ease: 'Sine.easeInOut',
      })

      showFx(
        trait === 'good'
          ? ['false-gold-fx-correct-glow-1', 'false-gold-fx-correct-glow-2']
          : ['false-gold-fx-fake-burst-1', 'false-gold-fx-fake-burst-2'],
        coinX + 112,
        coinY - 56,
        94,
        trait === 'good' ? '✓' : '!',
        trait === 'good',
      )
    }

    const showSoundResult = (trait: CoinVisualTrait) => {
      clearInspectionObjects()

      const hammerKey = firstExistingTexture(['false-gold-tool-tap-hammer'])
      const hammer = hammerKey
        ? addInspectionObject(this.scene.add.image(coinX - 86, coinY - 86, hammerKey))
        : addInspectionObject(this.scene.add.text(coinX - 86, coinY - 86, '✦', {
            fontFamily: 'Georgia',
            fontSize: '42px',
            color: '#ffe7a3',
            stroke: '#000000',
            strokeThickness: 5,
            fontStyle: 'bold',
          }))
      if ('setOrigin' in hammer) {
        ;(hammer as Phaser.GameObjects.Image | Phaser.GameObjects.Text).setOrigin(0.5)
      }
      if (hammer instanceof Phaser.GameObjects.Image) {
        hammer.setDisplaySize(92, 92)
        hammer.setRotation(Phaser.Math.DegToRad(-14))
      }

      this.addTween({
        targets: hammer,
        x: coinX - 42,
        y: coinY - 48,
        angle: 12,
        duration: 180,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
      })

      const ringKey = firstExistingTexture(
        trait === 'good'
          ? ['false-gold-fx-sound-ring', 'false-gold-fx-correct-glow-2']
          : ['false-gold-fx-bad-sound-crack', 'false-gold-fx-fake-burst-2'],
      )

      if (ringKey) {
        for (let i = 0; i < 3; i += 1) {
          const ring = addInspectionObject(this.scene.add.image(coinX, coinY + 2, ringKey))
          ring.setDisplaySize(108 + i * 22, 108 + i * 22)
          ring.setAlpha(0.72 - i * 0.16)
          this.addTween({
            targets: ring,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0,
            delay: 120 + i * 115,
            duration: 540,
            ease: 'Sine.easeOut',
            onComplete: () => {
              if (ring.active) ring.destroy()
              inspectionObjects = inspectionObjects.filter((object) => object !== ring)
            },
          })
        }
      } else {
        for (let i = 0; i < 3; i += 1) {
          const ring = addInspectionObject(this.scene.add.circle(coinX, coinY + 2, 44 + i * 18, 0x000000, 0))
          ring.setStrokeStyle(3, trait === 'good' ? 0x72ff9b : 0xff7770, 0.95 - i * 0.2)
          this.addTween({
            targets: ring,
            scaleX: 1.35,
            scaleY: 1.35,
            alpha: 0,
            delay: i * 110,
            duration: 540,
            ease: 'Sine.easeOut',
          })
        }
      }

      if (currentCoinGroup) {
        this.addTween({
          targets: currentCoinGroup,
          angle: trait === 'good' ? 4 : -8,
          duration: 70,
          yoyo: true,
          repeat: trait === 'good' ? 2 : 5,
          onComplete: () => currentCoinGroup?.setAngle(0),
        })
      }
    }

    const showShineResult = (trait: CoinVisualTrait) => {
      clearInspectionObjects()

      const torchKey = firstExistingTexture(['false-gold-tool-torch'])
      const torch = torchKey
        ? addInspectionObject(this.scene.add.image(coinX - 130, coinY - 50, torchKey))
        : addInspectionObject(this.scene.add.text(coinX - 130, coinY - 50, '🔥', {
            fontFamily: 'Georgia',
            fontSize: '36px',
            color: '#ffbd63',
            stroke: '#000000',
            strokeThickness: 5,
          }))
      if ('setOrigin' in torch) {
        ;(torch as Phaser.GameObjects.Image | Phaser.GameObjects.Text).setOrigin(0.5)
      }
      if (torch instanceof Phaser.GameObjects.Image) {
        torch.setDisplaySize(94, 94)
        torch.setRotation(Phaser.Math.DegToRad(-22))
      }

      const beam = addInspectionObject(
        this.scene.add.triangle(
          coinX - 44,
          coinY - 10,
          0,
          0,
          174,
          -45,
          174,
          45,
          trait === 'good' ? 0xffd966 : 0x77aa55,
          trait === 'good' ? 0.22 : 0.3,
        ),
      )
      beam.setAngle(-7)
      beam.setAlpha(0)

      this.addTween({
        targets: torch,
        x: coinX - 106,
        y: coinY - 34,
        duration: 260,
        ease: 'Sine.easeOut',
      })
      this.addTween({
        targets: beam,
        alpha: trait === 'good' ? 0.42 : 0.16,
        duration: 220,
        yoyo: true,
        repeat: trait === 'good' ? 1 : 3,
        ease: 'Sine.easeInOut',
      })
      showFx(
        trait === 'good'
          ? ['false-gold-fx-correct-glow-1', 'false-gold-fx-correct-glow-2']
          : ['false-gold-fx-fake-burst-1', 'false-gold-fx-fake-burst-2'],
        coinX + 48,
        coinY - 8,
        trait === 'good' ? 120 : 128,
        trait === 'good' ? '✓' : '!',
        trait === 'good',
      )
    }

    const useTool = (tool: InspectTool) => {
      if (isResolving || toolsUsed >= 2) return

      toolsUsed += 1
      updateHud()

      if (tool === 'magnifier') showStampResult(currentCoin.stamp)
      if (tool === 'scale') showWeightResult(currentCoin.weight)
      if (tool === 'tap') showSoundResult(currentCoin.sound)
      if (tool === 'torch') showShineResult(currentCoin.shine)

      status.setText(toolsUsed >= 2 ? 'Choose the chest or pot.' : 'Use one more tool or decide now.')

      if (toolsUsed >= 2) {
        setLocalButtonsEnabled(toolButtons, false)
      }
    }

    const finish = () => {
      const success = mistakes < 3 && score >= 420
      const reward = this.baseReward('false-gold', success, score)
      this.complete({
        trialId: 'false-gold',
        success,
        response: success
          ? 'You judged wealth by proof instead of shine. A king must know that not every golden face deserves trust.'
          : 'Too many false coins reached the royal chest. Judgment must look deeper than the surface.',
        ...reward,
      })
    }

    const nextCoin = () => {
      coinIndex += 1

      if (coinIndex >= coins.length || mistakes >= 3) {
        finish()
        return
      }

      toolsUsed = 0
      currentCoin = coins[coinIndex]
      isResolving = false
      clearInspectionObjects()
      createCoinVisual()
      renderButtons()
      updateHud()
      status.setText('Use up to 2 visual tools, then judge the coin.')
    }

    const judgeCoin = (choiceReal: boolean) => {
      if (isResolving || this.resultLocked) return
      isResolving = true

      setLocalButtonsEnabled(toolButtons, false)
      setLocalButtonsEnabled(judgeButtons, false)
      clearInspectionObjects()

      const correct = choiceReal === currentCoin.real
      if (correct) {
        score += 120 + (2 - toolsUsed) * 25
        status.setText('Correct.')
        status.setColor('#72ff9b')
      } else {
        mistakes += 1
        status.setText('Wrong.')
        status.setColor('#ff7770')
        this.scene.cameras.main.shake(160, 0.004)
      }

      updateHud()

      if (currentCoinGroup) {
        const targetX = choiceReal ? royalChest.x : fakePot.x
        const targetY = choiceReal ? royalChest.y - 14 : fakePot.y - 14

        this.addTween({
          targets: currentCoinGroup,
          x: targetX,
          y: targetY,
          scaleX: 0.58,
          scaleY: 0.58,
          angle: correct ? 360 : -120,
          duration: 620,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            showFx(
              correct
                ? ['false-gold-fx-correct-glow-1', 'false-gold-fx-correct-glow-2']
                : ['false-gold-fx-fake-burst-1', 'false-gold-fx-fake-burst-2'],
              targetX,
              targetY,
              correct ? 118 : 126,
              correct ? '✓' : '!',
              correct,
            )

            this.schedule(560, () => {
              status.setColor('#ffd966')
              nextCoin()
            })
          },
        })
      }
    }

    const renderButtons = () => {
      destroyLocalButtons(toolButtons)
      destroyLocalButtons(judgeButtons)
      toolButtons = []
      judgeButtons = []

      const toolGap = 9
      const toolWidth = 92
      const toolStartX = width / 2 - ((toolWidth + toolGap) * (tools.length - 1)) / 2

      toolButtons = tools.map((tool, index) =>
        createLocalButton({
          x: toolStartX + index * (toolWidth + toolGap),
          y: bottom - 96,
          width: toolWidth,
          height: 58,
          icon: tool.icon,
          imageKey: tool.imageKey,
          label: tool.label,
          color: tool.color,
          onClick: () => useTool(tool.id),
        }),
      )

      judgeButtons = [
        createLocalButton({
          x: width / 2 - 178,
          y: bottom - 44,
          width: 154,
          height: 42,
          icon: '♕',
          label: 'ROYAL',
          color: 0x27633a,
          onClick: () => judgeCoin(true),
        }),
        createLocalButton({
          x: width / 2 + 178,
          y: bottom - 44,
          width: 154,
          height: 42,
          icon: '✕',
          label: 'FAKE',
          color: 0x7a2c22,
          onClick: () => judgeCoin(false),
        }),
      ]
    }

    this.runtimeCleanups.push(() => {
      clearInspectionObjects()
      destroyCoin()
      destroyLocalButtons(toolButtons)
      destroyLocalButtons(judgeButtons)
    })

    currentCoin = coins[coinIndex]
    updateHud()
    createCoinVisual()
    renderButtons()
    status.setText('Use up to 2 visual tools, then judge the coin.')
  }

  // ---------------------------------------------------------------------------
  // 5. PAINTED PROPHECY
  // ---------------------------------------------------------------------------
  private createPaintedProphecy() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle(TRIAL_TITLES['painted-prophecy'])
    this.addInstruction('Restore the mural in the correct story order.', top + 88)

    const correctOrder = [
      'Tourist arrives with gold',
      'Fake hotel steals comfort',
      'Bazaar teaches trade',
      'Temple tests the heart',
      'Pyramid opens the crown road',
    ]
    const options = Phaser.Utils.Array.Shuffle([...correctOrder])
    let nextIndex = 0
    let mistakes = 0
    let score = 0
    let buttons: ButtonHandle[] = []

    const mural = this.scene.add.rectangle(width / 2, top + 235, this.panelWidth - 110, 210, 0xead8aa, 1)
    mural.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(mural)

    const muralText = this.scene.add.text(width / 2, top + 235, 'The prophecy wall is broken.\nSelect each missing scene in order.', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#74420d',
      stroke: '#fff4cf',
      strokeThickness: 2,
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 6,
      wordWrap: { width: this.panelWidth - 170 },
    })
    muralText.setOrigin(0.5)
    this.addObject(muralText)

    const status = this.addStatusText('', top + 128)

    const finish = (success: boolean) => {
      const reward = this.baseReward('painted-prophecy', success, score)
      this.complete({
        trialId: 'painted-prophecy',
        success,
        response: success
          ? 'The painted prophecy is restored. A ruler must understand the story before writing the ending.'
          : 'The mural rejects the order. History cannot be forced into a lie.',
        ...reward,
      })
    }

    const render = () => {
      buttons.forEach((button) => button.destroy())
      buttons = []
      status.setText(`PLACE ${nextIndex + 1} / ${correctOrder.length}     MISTAKES ${mistakes} / 3`)
      muralText.setText(`Restored mural:\n${correctOrder.slice(0, nextIndex).map((item, idx) => `${idx + 1}. ${item}`).join('\n') || 'No scenes restored yet.'}`)

      const available = options.filter((item) => !correctOrder.slice(0, nextIndex).includes(item))
      const buttonYStart = bottom - 150
      const gapY = 47
      buttons = available.map((label, index) =>
        this.createButton({
          x: width / 2,
          y: buttonYStart + index * gapY,
          width: Math.min(500, this.panelWidth - 120),
          height: 39,
          label,
          fontSize: 13,
          onClick: () => choose(label),
        }),
      )
    }

    const choose = (label: string) => {
      if (label === correctOrder[nextIndex]) {
        nextIndex += 1
        score += 70
        if (nextIndex >= correctOrder.length) {
          finish(true)
          return
        }
        render()
        return
      }

      mistakes += 1
      this.scene.cameras.main.shake(120, 0.004)
      if (mistakes >= 3) {
        finish(false)
        return
      }
      render()
    }

    render()
  }

  // ---------------------------------------------------------------------------
  // 6. SACRED SCARAB BOARD
  // ---------------------------------------------------------------------------
  private createScarabBoard() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle(TRIAL_TITLES['scarab-board'])
    this.addInstruction('Flick the sacred scarab into the Sun Disk. Choose balanced force, not chaos.', top + 88)

    type BoardRound = {
      hint: string
      options: [string, string, string]
      correctIndex: number
    }

    const rounds: BoardRound[] = [
      { hint: 'A straight lane opens. The Sun Disk waits ahead.', options: ['Soft push', 'Balanced flick', 'Wild smash'], correctIndex: 1 },
      { hint: 'A left bumper guards the hole. Bank gently from the right.', options: ['Right bank', 'Center smash', 'Left bank'], correctIndex: 0 },
      { hint: 'Three trap holes surround the disk. Use a soft final touch.', options: ['Maximum power', 'Soft controlled flick', 'No aim'], correctIndex: 1 },
    ]

    let round = 0
    let scarabs = 3
    let score = 0
    let buttons: ButtonHandle[] = []

    const board = this.scene.add.rectangle(width / 2, top + 245, this.panelWidth - 118, 230, 0x8f6227, 1)
    board.setStrokeStyle(5, 0xd4af37, 1)
    this.addObject(board)

    const sunDisk = this.scene.add.circle(width / 2 + 130, top + 245, 34, 0xffd966, 1)
    sunDisk.setStrokeStyle(4, 0xfff1ad, 1)
    const scarab = this.scene.add.ellipse(width / 2 - 150, top + 245, 36, 28, 0x1b7c77, 1)
    scarab.setStrokeStyle(3, 0xffd966, 1)
    this.addObject(sunDisk)
    this.addObject(scarab)

    const traps = [-50, 45, 105].map((offset) => {
      const trap = this.scene.add.circle(width / 2 + offset, top + 272, 18, 0x120904, 1)
      trap.setStrokeStyle(2, 0xd4af37, 0.75)
      this.addObject(trap)
      return trap
    })

    const hud = this.addStatusText('', top + 128)
    const hint = this.addStatusText('', top + 384)

    const render = () => {
      buttons.forEach((button) => button.destroy())
      buttons = []
      const current = rounds[round]
      hud.setText(`ROUND ${round + 1} / ${rounds.length}     SCARABS ${scarabs}     SCORE ${score}`)
      hint.setText(current.hint)
      scarab.setPosition(width / 2 - 150, top + 245)
      scarab.setAlpha(1)
      const gap = 14
      const buttonWidth = Math.min(210, (this.panelWidth - 94 - gap * 2) / 3)
      const y = bottom - 82
      const xs = [width / 2 - buttonWidth - gap, width / 2, width / 2 + buttonWidth + gap]
      buttons = current.options.map((label, index) =>
        this.createButton({ x: xs[index], y, width: buttonWidth, height: 58, label, fontSize: 13, onClick: () => choose(index) }),
      )
    }

    const finish = (success: boolean) => {
      const reward = this.baseReward('scarab-board', success, score)
      this.complete({
        trialId: 'scarab-board',
        success,
        response: success
          ? 'You moved power without wasting it. A king must know when to strike and when to soften the hand.'
          : 'The scarab falls into the trap holes. Control is not weakness; it is aim with patience.',
        ...reward,
      })
    }

    const choose = (index: number) => {
      const current = rounds[round]
      buttons.forEach((button) => button.setEnabled(false))
      const correct = index === current.correctIndex
      this.addTween({
        targets: scarab,
        x: correct ? sunDisk.x : traps[Math.min(index, traps.length - 1)].x,
        y: correct ? sunDisk.y : traps[Math.min(index, traps.length - 1)].y,
        angle: correct ? 360 : 140,
        duration: 620,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (correct) {
            score += 120
            round += 1
            if (round >= rounds.length) {
              finish(true)
              return
            }
            this.schedule(500, render)
          } else {
            scarabs -= 1
            this.scene.cameras.main.shake(160, 0.004)
            if (scarabs <= 0) {
              finish(false)
              return
            }
            this.schedule(500, render)
          }
        },
      })
    }

    render()
  }

  // ---------------------------------------------------------------------------
  // 7. STAIRWAY TO THE SUN
  // ---------------------------------------------------------------------------
  private createStairwaySun() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle(TRIAL_TITLES['stairway-sun'])
    this.addInstruction('Climb the final stairway. Choose the safe step through falling stone, wind, and scarabs.', top + 88)

    type StepRound = {
      prompt: string
      options: [string, string, string]
      correctIndex: number
    }

    const rounds: StepRound[] = [
      { prompt: 'A cracked stair waits ahead.', options: ['Left step', 'Center step', 'Right step'], correctIndex: 0 },
      { prompt: 'Wind blows sand across the stairs.', options: ['Walk fast', 'Lower your body', 'Jump blindly'], correctIndex: 1 },
      { prompt: 'Scarab swarm crosses the middle.', options: ['Middle lane', 'Right lane', 'Stop forever'], correctIndex: 1 },
      { prompt: 'A falling stone shadow appears.', options: ['Stand still', 'Move to glowing tile', 'Run backward'], correctIndex: 1 },
      { prompt: 'The Sun Altar asks for the final step.', options: ['Rush proudly', 'Climb with steady breath', 'Throw gold at altar'], correctIndex: 1 },
    ]

    let round = 0
    let hearts = 3
    let score = 0
    let buttons: ButtonHandle[] = []

    const stairs = this.scene.add.rectangle(width / 2, top + 250, this.panelWidth - 130, 238, 0x5b3a18, 1)
    stairs.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(stairs)

    const sun = this.scene.add.circle(width / 2, top + 148, 34, 0xffd966, 1)
    sun.setStrokeStyle(5, 0xfff1ad, 1)
    this.addObject(sun)

    const climber = this.scene.add.circle(width / 2, top + 334, 14, 0x7de0d3, 1)
    climber.setStrokeStyle(3, 0xffffff, 1)
    this.addObject(climber)

    const prompt = this.addStatusText('', top + 386)
    const hud = this.addStatusText('', top + 128)

    const render = () => {
      buttons.forEach((button) => button.destroy())
      buttons = []
      const current = rounds[round]
      hud.setText(`STEP ${round + 1} / ${rounds.length}     HEARTS ${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}     SCORE ${score}`)
      prompt.setText(current.prompt)
      climber.setPosition(width / 2, top + 334 - round * 42)
      const gap = 14
      const buttonWidth = Math.min(210, (this.panelWidth - 94 - gap * 2) / 3)
      const y = bottom - 82
      const xs = [width / 2 - buttonWidth - gap, width / 2, width / 2 + buttonWidth + gap]
      buttons = current.options.map((label, index) =>
        this.createButton({ x: xs[index], y, width: buttonWidth, height: 58, label, fontSize: 13, onClick: () => choose(index) }),
      )
    }

    const finish = (success: boolean) => {
      const reward = this.baseReward('stairway-sun', success, score)
      this.complete({
        trialId: 'stairway-sun',
        success,
        response: success
          ? 'You reached the Sun Altar. A king is not crowned in one step, but you climbed every one with purpose.'
          : 'The stairway refuses a rushed climb. Endurance is learned one careful step at a time.',
        ...reward,
      })
    }

    const choose = (index: number) => {
      const current = rounds[round]
      buttons.forEach((button) => button.setEnabled(false))
      if (index === current.correctIndex) {
        score += 90
        this.addTween({ targets: climber, y: climber.y - 42, duration: 420, ease: 'Sine.easeInOut' })
        round += 1
        if (round >= rounds.length) {
          this.schedule(650, () => finish(true))
          return
        }
        this.schedule(650, render)
        return
      }

      hearts -= 1
      this.scene.cameras.main.shake(140, 0.004)
      if (hearts <= 0) {
        finish(false)
        return
      }
      this.schedule(500, render)
    }

    render()
  }
}