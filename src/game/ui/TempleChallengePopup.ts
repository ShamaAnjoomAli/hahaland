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
          { id: 'ankh', label: 'Golden ankh', x: 0.22, y: 0.29, radius: 0.085 },
          { id: 'blue-vase', label: 'Blue ceremonial vase', x: 0.78, y: 0.65, radius: 0.085 },
          { id: 'floor-scarab', label: 'Floor scarab', x: 0.51, y: 0.79, radius: 0.085 },
        ],
      },
      {
        title: 'Round 2 — Hall of Guardians',
        leftImageKey: 'temple-truth-pair-2-left',
        rightImageKey: 'temple-truth-pair-2-right',
        differences: [
          { id: 'wall-torch', label: 'Wall torch', x: 0.18, y: 0.31, radius: 0.085 },
          { id: 'falcon-statue', label: 'Falcon guardian', x: 0.80, y: 0.43, radius: 0.09 },
          { id: 'offering-bowl', label: 'Offering bowl', x: 0.52, y: 0.72, radius: 0.09 },
        ],
      },
      {
        title: 'Round 3 — Sacred Scribe Room',
        leftImageKey: 'temple-truth-pair-3-left',
        rightImageKey: 'temple-truth-pair-3-right',
        differences: [
          { id: 'eye-carving', label: 'Eye of Horus carving', x: 0.51, y: 0.24, radius: 0.09 },
          { id: 'papyrus', label: 'Papyrus scroll', x: 0.29, y: 0.66, radius: 0.09 },
          { id: 'cat-statue', label: 'Cat statue', x: 0.74, y: 0.74, radius: 0.09 },
        ],
      },
      {
        title: 'Round 4 — Treasury of the Sun',
        leftImageKey: 'temple-truth-pair-4-left',
        rightImageKey: 'temple-truth-pair-4-right',
        differences: [
          { id: 'coin-stack', label: 'Golden coin stack', x: 0.24, y: 0.76, radius: 0.09 },
          { id: 'ruby-scarab', label: 'Ruby scarab', x: 0.52, y: 0.53, radius: 0.085 },
          { id: 'treasury-jar', label: 'Blue treasury jar', x: 0.80, y: 0.66, radius: 0.09 },
        ],
      },
      {
        title: 'Round 5 — Sanctuary of Ra',
        leftImageKey: 'temple-truth-pair-5-left',
        rightImageKey: 'temple-truth-pair-5-right',
        differences: [
          { id: 'sun-disk', label: 'Sacred sun disk', x: 0.50, y: 0.22, radius: 0.09 },
          { id: 'lotus-lamp', label: 'Lotus flame lamp', x: 0.21, y: 0.69, radius: 0.09 },
          { id: 'gold-scepter', label: 'Golden scepter', x: 0.79, y: 0.53, radius: 0.09 },
        ],
      },
    ]

    this.addTitle(TRIAL_TITLES['truth-gate'])
    this.addInstruction(
      'Find the 3 missing relics. Tap the changed spot in either temple image.',
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

    const roundTitleY = top + 166
    const imageLabelY = top + 190
    const imageTop = top + 208
    const statusY = bottom - 39
    const imageBottom = statusY - 28
    const imageGap = 16
    const maxImageWidth = (this.panelWidth - 86 - imageGap) / 2
    const maxImageHeight = Math.max(150, imageBottom - imageTop)
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
    status.setFontSize(13)

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
      pointer: Phaser.Input.Pointer,
      imageX: number,
    ) => {
      if (roundLocked || this.resultLocked) return

      const localX = (pointer.x - (imageX - imageWidth / 2)) / imageWidth
      const localY = (pointer.y - (imageY - imageHeight / 2)) / imageHeight

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

      showWrongTapEffect(pointer.x, pointer.y)
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
      hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        handleImageTap(pointer, imageX)
      })
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

      status.setText('Tap the three changed or missing relics.')
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

    type InspectTool = 'weight' | 'sound' | 'edge'
    type CoinVisualTrait = 'good' | 'bad'
    type CoinCase = {
      real: boolean
      imageKey: string
      weight: CoinVisualTrait
      sound: CoinVisualTrait
      edge: CoinVisualTrait
    }

    type LocalButton = {
      container: Phaser.GameObjects.Container
      bg: Phaser.GameObjects.Rectangle
      setEnabled: (enabled: boolean) => void
      destroy: () => void
    }

    type TestSlot = {
      bg: Phaser.GameObjects.Rectangle
      value: Phaser.GameObjects.Text
      setResult: (result?: CoinVisualTrait) => void
    }

    this.addTitle(TRIAL_TITLES['false-gold'])
    this.addInstruction('Use 2 visual tests. Then send the coin to Royal Vault or Fake Pot.', top + 86)

    const textureExists = (key: string) => this.scene.textures.exists(key)
    const firstExistingTexture = (keys: string[]) => keys.find(textureExists)
    const playSfx = (key: string, volume = 0.72) => {
      const audioCache = this.scene.cache.audio as { exists: (cacheKey: string) => boolean }
      if (!audioCache.exists(key)) return
      this.scene.sound.play(key, { volume })
    }

    const coins: CoinCase[] = Phaser.Utils.Array.Shuffle([
      // Real coins should always pass the core authenticity tests.
      // They should ring metallic, weigh correctly, and have a clean rim.
      { real: true, imageKey: 'false-gold-real-coin-1', weight: 'good', sound: 'good', edge: 'good' },
      { real: true, imageKey: 'false-gold-real-coin-2', weight: 'good', sound: 'good', edge: 'good' },
      { real: true, imageKey: 'false-gold-real-coin-3', weight: 'good', sound: 'good', edge: 'good' },
      { real: true, imageKey: 'false-gold-real-coin-1', weight: 'good', sound: 'good', edge: 'good' },

      // Fake coins can pass one test, but never all tests.
      // This keeps the game tricky without making real coins feel unfair.
      { real: false, imageKey: 'false-gold-fake-coin-1', weight: 'bad', sound: 'bad', edge: 'good' },
      { real: false, imageKey: 'false-gold-fake-coin-2', weight: 'bad', sound: 'good', edge: 'bad' },
      { real: false, imageKey: 'false-gold-fake-coin-3', weight: 'good', sound: 'bad', edge: 'bad' },
      { real: false, imageKey: 'false-gold-fake-coin-1', weight: 'bad', sound: 'bad', edge: 'bad' },
    ]).slice(0, 7)

    const tools: Array<{
      id: InspectTool
      label: string
      imageKeys: string[]
      color: number
      fallback: string
      iconSize: number
    }> = [
      {
        id: 'weight',
        label: 'WEIGH',
        imageKeys: ['false-gold-tool-scale'],
        color: 0x5b3c88,
        fallback: '⚖',
        iconSize: 42,
      },
      {
        id: 'sound',
        label: 'TAP',
        imageKeys: ['false-gold-tool-sound-coin-waves', 'false-gold-tool-tap-hammer', 'false-gold-tool-sound-hammer-emblem'],
        color: 0x8b6b1f,
        fallback: '◉',
        iconSize: 42,
      },
      {
        id: 'edge',
        label: 'EDGE',
        imageKeys: ['false-gold-real-coin-2', 'false-gold-real-coin-1'],
        color: 0x27633a,
        fallback: '◌',
        iconSize: 38,
      },
    ]

    let coinIndex = 0
    let score = 0
    let mistakes = 0
    let toolsUsed = 0
    let currentCoin: CoinCase = coins[0]
    let currentCoinGroup: Phaser.GameObjects.Container | undefined
    let inspectionObjects: Phaser.GameObjects.GameObject[] = []
    let toolButtons: Partial<Record<InspectTool, LocalButton>> = {}
    let judgeButtons: LocalButton[] = []
    let resultSlots: Partial<Record<InspectTool, TestSlot>> = {}
    let usedTools = new Set<InspectTool>()
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
      label: 'TESTS',
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

    // Keep the scene higher and reserve clean space below for the final sort buttons.
    const stationTop = top + 184
    const stationBottom = bottom - 146
    const stationHeight = Math.max(250, stationBottom - stationTop)
    const stationY = stationTop + stationHeight / 2
    const stationWidth = this.panelWidth - 66
    const stationLeft = width / 2 - stationWidth / 2
    const stationRight = width / 2 + stationWidth / 2
    // Tests are on the left; results are on the right.
    const toolColumnX = stationLeft + 72
    const resultColumnX = stationRight - 72
    const coinX = width / 2
    const coinY = stationTop + stationHeight * 0.48
    // Prompt sits under the HUD, not over the coin/gameplay area.
    const statusY = top + 172
    const judgeY = bottom - 30

    const station = this.scene.add.rectangle(width / 2, stationY, stationWidth, stationHeight, 0x211407, 1)
    station.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(station)

    const bgKey = firstExistingTexture(['false-gold-bg'])
    if (bgKey) {
      const bg = this.scene.add.image(width / 2, stationY, bgKey)
      bg.setDisplaySize(stationWidth - 10, stationHeight - 10)
      bg.setAlpha(0.45)
      this.addObject(bg)
    }

    const resultPanel = this.scene.add.rectangle(resultColumnX, stationY, 118, stationHeight - 28, 0x120904, 0.66)
    resultPanel.setStrokeStyle(3, 0xd4af37, 0.78)
    this.addObject(resultPanel)

    const resultHeader = this.scene.add.text(resultColumnX, stationTop + 22, 'RESULT', {
      fontFamily: 'Georgia',
      fontSize: '11px',
      color: '#ffe7a3',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
      align: 'center',
    })
    resultHeader.setOrigin(0.5)
    this.addObject(resultHeader)

    const toolPanel = this.scene.add.rectangle(toolColumnX, stationY, 118, stationHeight - 28, 0x120904, 0.66)
    toolPanel.setStrokeStyle(3, 0xd4af37, 0.78)
    this.addObject(toolPanel)

    const toolHeader = this.scene.add.text(toolColumnX, stationTop + 22, 'TEST', {
      fontFamily: 'Georgia',
      fontSize: '11px',
      color: '#ffe7a3',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
      align: 'center',
    })
    toolHeader.setOrigin(0.5)
    this.addObject(toolHeader)

    const coinStage = this.scene.add.ellipse(coinX, coinY + 74, 254, 58, 0x090402, 0.34)
    coinStage.setStrokeStyle(2, 0xd4af37, 0.4)
    this.addObject(coinStage)

    const statusPanel = this.scene.add.rectangle(coinX, statusY, this.panelWidth - 126, 30, 0x211107, 0.94)
    statusPanel.setStrokeStyle(2, 0xd4af37, 0.76)
    this.addObject(statusPanel)

    const status = this.addStatusText('', statusY, '#ffd966')
    status.setFontSize(13)

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

    const destroyLocalButtons = (buttons: LocalButton[]) => {
      buttons.forEach((button) => button.destroy())
    }

    const destroyToolButtons = () => {
      Object.values(toolButtons).forEach((button) => button?.destroy())
      toolButtons = {}
    }

    const setJudgeButtonsEnabled = (enabled: boolean) => {
      judgeButtons.forEach((button) => button.setEnabled(enabled))
    }

    const setToolButtonsEnabled = (enabled: boolean) => {
      Object.values(toolButtons).forEach((button) => button?.setEnabled(enabled))
    }

    const createImageIcon = (
      imageKeys: string[],
      x: number,
      y: number,
      size: number,
      fallback: string,
    ) => {
      const imageKey = firstExistingTexture(imageKeys)
      if (imageKey) {
        const image = this.scene.add.image(x, y, imageKey)
        image.setDisplaySize(size, size)
        return image
      }

      const text = this.scene.add.text(x, y, fallback, {
        fontFamily: 'Georgia',
        fontSize: `${Math.round(size * 0.55)}px`,
        color: '#ffe7a3',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      })
      text.setOrigin(0.5)
      return text
    }

    const createLocalButton = (config: {
      x: number
      y: number
      width: number
      height: number
      imageKeys?: string[]
      icon?: string
      label: string
      color: number
      iconSize?: number
      onClick: () => void
    }): LocalButton => {
      let enabled = true

      const container = this.scene.add.container(config.x, config.y)
      const bg = this.scene.add.rectangle(0, 0, config.width, config.height, config.color, 1)
      bg.setStrokeStyle(3, 0xd4af37, 1)
      bg.setInteractive({ useHandCursor: true })
      container.add(bg)

      if (config.imageKeys) {
        const icon = createImageIcon(config.imageKeys, 0, -7, config.iconSize ?? 36, config.icon ?? '•')
        container.add(icon)
      } else if (config.icon) {
        const icon = this.scene.add.text(0, -7, config.icon, {
          fontFamily: 'Georgia',
          fontSize: `${config.iconSize ?? 22}px`,
          color: '#ffe7a3',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold',
        })
        icon.setOrigin(0.5)
        container.add(icon)
      }

      const label = this.scene.add.text(0, config.height / 2 - 12, config.label, {
        fontFamily: 'Georgia',
        fontSize: '9px',
        color: '#fff7cf',
        stroke: '#000000',
        strokeThickness: 2,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: config.width - 10, useAdvancedWrap: true },
      })
      label.setOrigin(0.5)
      container.add(label)

      this.addObject(container)

      const refresh = () => {
        if (!enabled) {
          bg.disableInteractive()
          bg.setFillStyle(0x2d2a25, 0.9)
          bg.setStrokeStyle(2, 0x777777, 0.7)
          container.setAlpha(0.52)
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

    const createResultSlot = (tool: InspectTool, y: number): TestSlot => {
      const bg = this.scene.add.rectangle(resultColumnX, y, 90, 40, 0x241507, 0.92)
      bg.setStrokeStyle(2, 0xd4af37, 0.74)
      this.addObject(bg)

      const label = this.scene.add.text(resultColumnX - 17, y - 8, tool.toUpperCase(), {
        fontFamily: 'Georgia',
        fontSize: '9px',
        color: '#fff7cf',
        stroke: '#000000',
        strokeThickness: 2,
        fontStyle: 'bold',
      })
      label.setOrigin(0.5)
      this.addObject(label)

      const value = this.scene.add.text(resultColumnX + 28, y + 2, '?', {
        fontFamily: 'Georgia',
        fontSize: '24px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      })
      value.setOrigin(0.5)
      this.addObject(value)

      return {
        bg,
        value,
        setResult: (result?: CoinVisualTrait) => {
          if (!result) {
            value.setText('?')
            value.setColor('#ffd966')
            bg.setFillStyle(0x241507, 0.92)
            bg.setStrokeStyle(2, 0xd4af37, 0.74)
            return
          }

          value.setText(result === 'good' ? '✓' : '!')
          value.setColor(result === 'good' ? '#72ff9b' : '#ffbd63')
          bg.setFillStyle(result === 'good' ? 0x173d27 : 0x4b1812, 0.98)
          bg.setStrokeStyle(3, result === 'good' ? 0x72ff9b : 0xff7770, 0.95)
        },
      }
    }

    const resultRowYStart = stationTop + 66
    const resultRowGap = 58
    tools.forEach((tool, index) => {
      resultSlots[tool.id] = createResultSlot(tool.id, resultRowYStart + index * resultRowGap)
    })

    const resetSlots = () => {
      resultSlots.weight?.setResult(undefined)
      resultSlots.sound?.setResult(undefined)
      resultSlots.edge?.setResult(undefined)
    }

    const createCoinVisual = () => {
      destroyCoin()

      const coinGroup = this.scene.add.container(coinX, coinY)
      this.addObject(coinGroup)
      currentCoinGroup = coinGroup

      const shadow = this.scene.add.ellipse(0, 76, 132, 28, 0x000000, 0.4)
      coinGroup.add(shadow)

      if (textureExists(currentCoin.imageKey)) {
        const coinImage = this.scene.add.image(0, 0, currentCoin.imageKey)
        coinImage.setDisplaySize(142, 142)
        coinGroup.add(coinImage)
      } else {
        const outer = this.scene.add.circle(0, 0, 58, currentCoin.real ? 0xffd966 : 0xcab36b, 1)
        outer.setStrokeStyle(6, 0x8b5a2b, 1)
        coinGroup.add(outer)
      }

      this.addTween({
        targets: coinGroup,
        y: coinY - 5,
        duration: 520,
        yoyo: true,
        ease: 'Sine.easeInOut',
      })
    }

    const showWeightResult = (trait: CoinVisualTrait) => {
      clearInspectionObjects()

      const scaleGroup = this.scene.add.container(coinX, coinY + 16)
      addInspectionObject(scaleGroup)

      const scaleKey = firstExistingTexture(['false-gold-tool-scale'])
      if (scaleKey) {
        const scale = this.scene.add.image(0, 0, scaleKey)
        scale.setDisplaySize(188, 132)
        scale.setAlpha(0.95)
        scaleGroup.add(scale)
      } else {
        const fallback = this.scene.add.text(0, 0, '⚖', {
          fontFamily: 'Georgia',
          fontSize: '70px',
          color: '#ffe7a3',
          stroke: '#000000',
          strokeThickness: 5,
          fontStyle: 'bold',
        })
        fallback.setOrigin(0.5)
        scaleGroup.add(fallback)
      }

      const panCoinKey = firstExistingTexture([currentCoin.imageKey])
      if (panCoinKey) {
        const panCoin = this.scene.add.image(-48, 8, panCoinKey)
        panCoin.setDisplaySize(46, 46)
        scaleGroup.add(panCoin)
      }

      const badge = this.scene.add.circle(88, -54, 20, trait === 'good' ? 0x236d3a : 0x7a1717, 0.98)
      badge.setStrokeStyle(3, trait === 'good' ? 0x72ff9b : 0xff7770, 1)
      const mark = this.scene.add.text(88, -55, trait === 'good' ? '✓' : '!', {
        fontFamily: 'Georgia',
        fontSize: '24px',
        color: trait === 'good' ? '#72ff9b' : '#ffbd63',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      })
      mark.setOrigin(0.5)
      scaleGroup.add([badge, mark])

      if (trait === 'good') {
        const levelGlow = this.scene.add.rectangle(0, -50, 110, 4, 0x72ff9b, 0.8)
        scaleGroup.add(levelGlow)
        this.addTween({
          targets: [scaleGroup],
          scaleX: 1.03,
          scaleY: 1.03,
          duration: 220,
          yoyo: true,
          ease: 'Sine.easeInOut',
        })
        return
      }

      const warningGlow = this.scene.add.rectangle(0, -50, 112, 4, 0xff7770, 0.82)
      warningGlow.setAngle(14)
      scaleGroup.add(warningGlow)

      this.addTween({
        targets: scaleGroup,
        angle: { from: -8, to: 8 },
        x: coinX + 5,
        duration: 110,
        yoyo: true,
        repeat: 5,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          scaleGroup.setAngle(0)
          scaleGroup.setX(coinX)
        },
      })
    }

    const showSoundResult = (trait: CoinVisualTrait) => {
      clearInspectionObjects()
      playSfx(trait === 'good' ? 'false-gold-sound-good' : 'false-gold-sound-bad', trait === 'good' ? 0.76 : 0.84)

      const hammerKey = firstExistingTexture(['false-gold-tool-tap-hammer', 'false-gold-tool-sound-hammer-emblem'])
      const hammer = hammerKey
        ? addInspectionObject(this.scene.add.image(coinX + 86, coinY - 62, hammerKey))
        : addInspectionObject(this.scene.add.text(coinX + 86, coinY - 62, '◉', {
            fontFamily: 'Georgia',
            fontSize: '40px',
            color: '#ffe7a3',
            stroke: '#000000',
            strokeThickness: 5,
            fontStyle: 'bold',
          }))
      ;(hammer as any).setDisplaySize?.(72, 72)
      ;(hammer as any).setOrigin?.(0.5)
      ;(hammer as any).setRotation?.(Phaser.Math.DegToRad(-22))

      this.addTween({
        targets: hammer,
        y: coinY - 34,
        angle: -4,
        duration: 130,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
      })

      if (trait === 'good') {
        const ringKey = firstExistingTexture(['false-gold-fx-sound-ring', 'false-gold-tool-sound-coin-waves'])
        if (ringKey) {
          const ring = addInspectionObject(this.scene.add.image(coinX, coinY + 4, ringKey))
          ring.setDisplaySize(136, 136)
          ring.setAlpha(0.88)
          this.addTween({
            targets: ring,
            scaleX: 1.24,
            scaleY: 1.24,
            alpha: 0,
            duration: 650,
            ease: 'Sine.easeOut',
          })
        } else {
          for (let i = 0; i < 3; i += 1) {
            const ring = addInspectionObject(this.scene.add.circle(coinX, coinY, 52 + i * 18, 0x000000, 0))
            ring.setStrokeStyle(3, 0xffd966, 0.9 - i * 0.2)
            this.addTween({
              targets: ring,
              scaleX: 1.35,
              scaleY: 1.35,
              alpha: 0,
              delay: i * 80,
              duration: 620,
              ease: 'Sine.easeOut',
            })
          }
        }
        return
      }

      const crackKey = firstExistingTexture(['false-gold-fx-bad-sound-crack', 'false-gold-fx-fake-burst-2'])
      if (crackKey) {
        const crack = addInspectionObject(this.scene.add.image(coinX, coinY + 4, crackKey))
        crack.setDisplaySize(130, 130)
        crack.setAlpha(0.9)
        this.addTween({
          targets: crack,
          scaleX: 1.16,
          scaleY: 1.16,
          alpha: 0.32,
          duration: 160,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut',
        })
      }

      this.scene.cameras.main.shake(120, 0.002)
    }

    const showEdgeResult = (trait: CoinVisualTrait) => {
      clearInspectionObjects()

      const rimColor = trait === 'good' ? 0xffd966 : 0xff7770
      const rimGlow = addInspectionObject(this.scene.add.circle(coinX, coinY, 80, 0x000000, 0))
      rimGlow.setStrokeStyle(6, rimColor, trait === 'good' ? 0.92 : 1)

      const innerRim = addInspectionObject(this.scene.add.circle(coinX, coinY, 67, 0x000000, 0))
      innerRim.setStrokeStyle(2, trait === 'good' ? 0xfff1ad : 0xffbd63, trait === 'good' ? 0.72 : 0.88)

      if (trait === 'good') {
        const sparkles: Phaser.GameObjects.Text[] = []
        ;[-54, -18, 18, 54].forEach((offset, index) => {
          const sparkle = addInspectionObject(
            this.scene.add.text(coinX + offset, coinY - 84 + Math.abs(offset) * 0.12, '✦', {
              fontFamily: 'Georgia',
              fontSize: '18px',
              color: '#ffe7a3',
              stroke: '#000000',
              strokeThickness: 3,
              fontStyle: 'bold',
            }),
          )
          sparkle.setOrigin(0.5)
          sparkle.setAlpha(0.85)
          sparkles.push(sparkle)

          this.addTween({
            targets: sparkle,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.35,
            duration: 320,
            delay: index * 80,
            yoyo: true,
            ease: 'Sine.easeInOut',
          })
        })

        this.addTween({
          targets: [rimGlow, innerRim],
          scaleX: 1.08,
          scaleY: 1.08,
          alpha: 0.55,
          duration: 420,
          yoyo: true,
          ease: 'Sine.easeInOut',
        })

        if (currentCoinGroup) {
          this.addTween({
            targets: currentCoinGroup,
            angle: { from: -4, to: 4 },
            duration: 360,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => currentCoinGroup?.setAngle(0),
          })
        }
        return
      }

      const chipAngles = [-132, -82, -24, 38, 112]
      chipAngles.forEach((angle, index) => {
        const radians = Phaser.Math.DegToRad(angle)
        const chip = addInspectionObject(
          this.scene.add.triangle(
            coinX + Math.cos(radians) * 78,
            coinY + Math.sin(radians) * 78,
            0,
            -9,
            8,
            9,
            -8,
            9,
            0x5a1111,
            0.96,
          ),
        )
        chip.setStrokeStyle(2, 0xff7770, 0.9)
        chip.setRotation(radians + Math.PI / 2)
        chip.setScale(0.2)

        this.addTween({
          targets: chip,
          scaleX: 1,
          scaleY: 1,
          duration: 130,
          delay: index * 70,
          ease: 'Back.easeOut',
        })
      })

      this.addTween({
        targets: [rimGlow, innerRim],
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: 0.35,
        duration: 130,
        yoyo: true,
        repeat: 4,
        ease: 'Sine.easeInOut',
      })

      if (currentCoinGroup) {
        this.addTween({
          targets: currentCoinGroup,
          angle: { from: -9, to: 9 },
          x: coinX + 4,
          duration: 95,
          yoyo: true,
          repeat: 5,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            currentCoinGroup?.setAngle(0)
            currentCoinGroup?.setX(coinX)
          },
        })
      }
    }

    const useTool = (tool: InspectTool) => {
      if (isResolving || usedTools.has(tool) || toolsUsed >= 2) return

      usedTools.add(tool)
      toolsUsed += 1
      updateHud()
      toolButtons[tool]?.setEnabled(false)

      const result = currentCoin[tool]
      resultSlots[tool]?.setResult(result)

      if (tool === 'weight') showWeightResult(result)
      if (tool === 'sound') showSoundResult(result)
      if (tool === 'edge') showEdgeResult(result)

      if (toolsUsed >= 2) {
        setToolButtonsEnabled(false)
        setJudgeButtonsEnabled(true)
        status.setText('Send the coin to Royal Vault or Fake Pot.')
        return
      }

      status.setText('Use one more test, then send the coin below.')
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
      usedTools = new Set<InspectTool>()
      currentCoin = coins[coinIndex]
      isResolving = false
      clearInspectionObjects()
      resetSlots()
      createCoinVisual()
      renderButtons()
      updateHud()
      setJudgeButtonsEnabled(false)
      status.setText('Use 2 tests. Then send the coin below.')
    }

    const judgeCoin = (choiceReal: boolean) => {
      if (isResolving || this.resultLocked || toolsUsed < 2) return
      isResolving = true

      setToolButtonsEnabled(false)
      setJudgeButtonsEnabled(false)
      clearInspectionObjects()

      const correct = choiceReal === currentCoin.real
      if (correct) {
        score += 120
        status.setText('Correct.')
        status.setColor('#72ff9b')
      } else {
        mistakes += 1
        status.setText('Wrong.')
        status.setColor('#ff7770')
        this.scene.cameras.main.shake(160, 0.004)
      }

      updateHud()

      const targetX = choiceReal ? width / 2 - 108 : width / 2 + 108
      const targetY = judgeY

      if (currentCoinGroup) {
        this.addTween({
          targets: currentCoinGroup,
          x: targetX,
          y: targetY - 34,
          scaleX: 0.38,
          scaleY: 0.38,
          angle: correct ? 360 : -100,
          duration: 560,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            // Use clean Phaser shapes for the sort feedback.
            // This avoids any PNG/VFX assets that may still have baked checkerboard backgrounds.
            if (correct) {
              const glow = addInspectionObject(this.scene.add.circle(targetX, targetY - 34, 42, 0x72ff9b, 0.18))
              glow.setStrokeStyle(4, 0x72ff9b, 0.85)

              const check = addInspectionObject(
                this.scene.add.text(targetX, targetY - 35, '✓', {
                  fontFamily: 'Georgia',
                  fontSize: '32px',
                  color: '#72ff9b',
                  stroke: '#000000',
                  strokeThickness: 5,
                  fontStyle: 'bold',
                }),
              )
              check.setOrigin(0.5)

              this.addTween({
                targets: [glow, check],
                scaleX: 1.32,
                scaleY: 1.32,
                alpha: 0,
                duration: 500,
                ease: 'Sine.easeOut',
              })
            } else {
              const burst = addInspectionObject(this.scene.add.circle(targetX, targetY - 34, 42, 0xff7770, 0.18))
              burst.setStrokeStyle(4, 0xff7770, 0.88)

              const warning = addInspectionObject(
                this.scene.add.text(targetX, targetY - 35, '!', {
                  fontFamily: 'Georgia',
                  fontSize: '34px',
                  color: '#ffbd63',
                  stroke: '#000000',
                  strokeThickness: 5,
                  fontStyle: 'bold',
                }),
              )
              warning.setOrigin(0.5)

              this.addTween({
                targets: [burst, warning],
                scaleX: 1.28,
                scaleY: 1.28,
                alpha: 0,
                duration: 500,
                ease: 'Sine.easeOut',
              })
            }

            this.schedule(540, () => {
              status.setColor('#ffd966')
              nextCoin()
            })
          },
        })
      }
    }

    const renderButtons = () => {
      destroyToolButtons()
      destroyLocalButtons(judgeButtons)
      judgeButtons = []

      tools.forEach((tool, index) => {
        const y = resultRowYStart + index * resultRowGap
        toolButtons[tool.id] = createLocalButton({
          x: toolColumnX,
          y,
          width: 78,
          height: 48,
          imageKeys: tool.imageKeys,
          icon: tool.fallback,
          label: tool.label,
          color: tool.color,
          iconSize: tool.iconSize,
          onClick: () => useTool(tool.id),
        })
      })

      judgeButtons = [
        createLocalButton({
          x: width / 2 - 108,
          y: judgeY,
          width: 184,
          height: 46,
          imageKeys: ['false-gold-real-coin-2', 'false-gold-real-coin-1'],
          label: 'ROYAL VAULT',
          color: 0x27633a,
          iconSize: 32,
          onClick: () => judgeCoin(true),
        }),
        createLocalButton({
          x: width / 2 + 108,
          y: judgeY,
          width: 184,
          height: 46,
          imageKeys: ['false-gold-fake-coin-2', 'false-gold-fake-coin-1'],
          label: 'FAKE POT',
          color: 0x7a2c22,
          iconSize: 32,
          onClick: () => judgeCoin(false),
        }),
      ]
    }

    this.runtimeCleanups.push(() => {
      clearInspectionObjects()
      destroyCoin()
      destroyToolButtons()
      destroyLocalButtons(judgeButtons)
    })

    currentCoin = coins[coinIndex]
    updateHud()
    renderButtons()
    resetSlots()
    createCoinVisual()
    setJudgeButtonsEnabled(false)
    status.setText('Use 2 tests. Then send the coin below.')
  }

  // ---------------------------------------------------------------------------
  // 5. PAINTED PROPHECY — MURAL TILE PUZZLE
  // ---------------------------------------------------------------------------
  private createPaintedProphecy() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    type PuzzleRound = {
      title: string
      textureKey: string
      gridSize: number
      timeLimitMs: number
      previewMs: number
      shuffleSwaps: number
    }

    type PuzzleTile = {
      pieceIndex: number
      slotIndex: number
      container: Phaser.GameObjects.Container
      image?: Phaser.GameObjects.Image
      fallback?: Phaser.GameObjects.Rectangle
      fallbackText?: Phaser.GameObjects.Text
      border: Phaser.GameObjects.Rectangle
      hitZone: Phaser.GameObjects.Rectangle
    }

    const rounds: PuzzleRound[] = [
      {
        title: 'Round 1 — Broken Scarab Mural',
        textureKey: 'painted-prophecy-round-1',
        gridSize: 3,
        timeLimitMs: 60000,
        previewMs: 3000,
        shuffleSwaps: 14,
      },
      {
        title: 'Round 2 — Prophecy of the Pharaoh',
        textureKey: 'painted-prophecy-round-2',
        gridSize: 3,
        timeLimitMs: 50000,
        previewMs: 3000,
        shuffleSwaps: 20,
      },
      {
        title: 'Round 3 — Ascension of Ra',
        textureKey: 'painted-prophecy-round-3',
        gridSize: 4,
        timeLimitMs: 75000,
        previewMs: 3200,
        shuffleSwaps: 34,
      },
    ]

    this.addTitle(TRIAL_TITLES['painted-prophecy'])
    this.addInstruction(
      'Memorize the mural, then tap two tiles to swap them back into place.',
      top + 84,
    )

    let roundIndex = 0
    let hearts = 3
    let moves = 0
    let totalMoves = 0
    let score = 0
    let remainingMs = rounds[0].timeLimitMs
    let phase: 'preview' | 'playing' | 'swapping' | 'finished' = 'preview'
    let roundTimer: Phaser.Time.TimerEvent | undefined
    let roundObjects: Phaser.GameObjects.GameObject[] = []
    let tiles: PuzzleTile[] = []
    let slotToTile: PuzzleTile[] = []
    let selectedTile: PuzzleTile | undefined
    let previewObjects: Phaser.GameObjects.GameObject[] = []

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

    const movesHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 2,
      y: hudY,
      width: hudCardWidth,
      label: 'MOVES',
      bandColor: 0x5b3c88,
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

    const boardTop = top + 174

    // Reserve a dedicated footer lane for the status message.
    // Do not force a minimum board size: on shorter screens that minimum
    // pushed the puzzle underneath the footer panel.
    const statusPanelHeight = 30
    const statusY = bottom - 17
    const statusTop = statusY - statusPanelHeight / 2
    const boardBottom = statusTop - 22
    const availableBoardHeight = Math.max(180, boardBottom - boardTop)
    const boardSize = Math.min(
      this.panelWidth - 112,
      availableBoardHeight,
      340,
    )
    const boardX = width / 2
    const boardY = boardTop + boardSize / 2

    const boardShadow = this.scene.add.rectangle(
      boardX + 7,
      boardY + 8,
      boardSize + 22,
      boardSize + 22,
      0x000000,
      0.42,
    )

    const boardFrame = this.scene.add.rectangle(
      boardX,
      boardY,
      boardSize + 22,
      boardSize + 22,
      0x211107,
      1,
    )
    boardFrame.setStrokeStyle(4, 0xd4af37, 1)

    const boardInner = this.scene.add.rectangle(
      boardX,
      boardY,
      boardSize + 8,
      boardSize + 8,
      0x0d0703,
      1,
    )
    boardInner.setStrokeStyle(2, 0x4aa7a3, 0.72)

    this.addObject(boardShadow)
    this.addObject(boardFrame)
    this.addObject(boardInner)

    const roundTitle = this.scene.add.text(
      width / 2,
      boardTop - 13,
      '',
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
    roundTitle.setOrigin(0.5)
    this.addObject(roundTitle)

    const statusPanel = this.scene.add.rectangle(
      width / 2,
      statusY,
      this.panelWidth - 104,
      statusPanelHeight,
      0x211107,
      0.96,
    )
    statusPanel.setStrokeStyle(2, 0xd4af37, 0.82)
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
      selectedTile = undefined
      previewObjects = []

      roundObjects.forEach((object) => {
        if (object.active) object.destroy()
      })

      roundObjects = []
      tiles = []
      slotToTile = []
    }

    const getRound = () => rounds[roundIndex]

    const getSlotPosition = (
      slotIndex: number,
      gridSize: number,
      tileSize: number,
    ) => {
      const column = slotIndex % gridSize
      const row = Math.floor(slotIndex / gridSize)

      return {
        x: boardX - boardSize / 2 + column * tileSize + tileSize / 2,
        y: boardY - boardSize / 2 + row * tileSize + tileSize / 2,
      }
    }

    const updateTimerHud = () => {
      const round = getRound()
      const ratio = Phaser.Math.Clamp(
        remainingMs / round.timeLimitMs,
        0,
        1,
      )

      if (phase === 'preview') {
        timerHud.setValue('LOOK')
        timerHud.setProgress(1)
        return
      }

      timerHud.setValue(`${Math.max(0, Math.ceil(remainingMs / 1000))}s`)
      timerHud.setProgress(ratio, ratio <= 0.25)
    }

    const updateHud = () => {
      roundHud.setValue(`${roundIndex + 1} / ${rounds.length}`)
      livesHud.setValue(`${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}`)
      movesHud.setValue(String(moves))
      scoreHud.setValue(String(score))
      updateTimerHud()
    }

    const setTileBorder = (
      tile: PuzzleTile,
      mode: 'normal' | 'selected' | 'correct',
    ) => {
      if (mode === 'selected') {
        tile.border.setFillStyle(0x2a190c, 0.08)
        tile.border.setStrokeStyle(4, 0x4de0d2, 1)
        tile.container.setScale(1.045)
        return
      }

      if (mode === 'correct') {
        tile.border.setFillStyle(0x236d3a, 0.16)
        tile.border.setStrokeStyle(3, 0x72ff9b, 0.9)
        tile.container.setScale(1)
        return
      }

      tile.border.setFillStyle(0x000000, 0)
      tile.border.setStrokeStyle(2, 0xd4af37, 0.74)
      tile.container.setScale(1)
    }

    const refreshTileStates = () => {
      tiles.forEach((tile) => {
        if (selectedTile === tile) {
          setTileBorder(tile, 'selected')
          return
        }

        setTileBorder(
          tile,
          tile.pieceIndex === tile.slotIndex ? 'correct' : 'normal',
        )
      })
    }

    const isSolved = () =>
      tiles.length > 0 &&
      tiles.every((tile) => tile.pieceIndex === tile.slotIndex)

    const createFallbackTile = (
      tile: PuzzleTile,
      pieceIndex: number,
      tileSize: number,
      gridSize: number,
    ) => {
      const colors = [
        0xd5a84b,
        0x2f8b84,
        0x8b5a2b,
        0xb86b35,
        0x5b3c88,
        0x27633a,
      ]

      const fallback = this.scene.add.rectangle(
        0,
        0,
        tileSize - 5,
        tileSize - 5,
        colors[pieceIndex % colors.length],
        0.96,
      )
      fallback.setStrokeStyle(1, 0xffe7a3, 0.6)

      const symbol = this.scene.add.text(
        0,
        0,
        `${pieceIndex + 1}`,
        {
          fontFamily: 'Georgia',
          fontSize: `${Math.max(16, Math.round(tileSize * 0.3))}px`,
          color: '#fff7cf',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold',
        },
      )
      symbol.setOrigin(0.5)

      const row = Math.floor(pieceIndex / gridSize)
      const column = pieceIndex % gridSize
      const cornerMark = this.scene.add.text(
        -tileSize * 0.31,
        -tileSize * 0.31,
        `${row + 1}-${column + 1}`,
        {
          fontFamily: 'Arial',
          fontSize: `${Math.max(7, Math.round(tileSize * 0.1))}px`,
          color: '#211107',
          fontStyle: 'bold',
        },
      )
      cornerMark.setOrigin(0.5)

      tile.container.add([fallback, symbol, cornerMark])
      tile.fallback = fallback
      tile.fallbackText = symbol
    }

    const createPuzzleTiles = (order: number[]) => {
      const round = getRound()
      const gridSize = round.gridSize
      const tileSize = boardSize / gridSize
      const textureExists = this.scene.textures.exists(round.textureKey)

      const sourceFrame = textureExists
        ? this.scene.textures.getFrame(round.textureKey)
        : undefined

      const sourceWidth =
        sourceFrame?.realWidth ??
        sourceFrame?.width ??
        1024

      const sourceHeight =
        sourceFrame?.realHeight ??
        sourceFrame?.height ??
        1024

      tiles = []
      slotToTile = []

      order.forEach((pieceIndex, slotIndex) => {
        const position = getSlotPosition(slotIndex, gridSize, tileSize)
        const container = addRoundObject(
          this.scene.add.container(position.x, position.y),
        )

        const border = this.scene.add.rectangle(
          0,
          0,
          tileSize - 2,
          tileSize - 2,
          0x000000,
          0,
        )
        border.setStrokeStyle(2, 0xd4af37, 0.74)

        const hitZone = this.scene.add.rectangle(
          0,
          0,
          tileSize - 2,
          tileSize - 2,
          0xffffff,
          0.001,
        )
        hitZone.setInteractive({ useHandCursor: true })

        const tile: PuzzleTile = {
          pieceIndex,
          slotIndex,
          container,
          border,
          hitZone,
        }

        if (textureExists) {
          const sourceColumn = pieceIndex % gridSize
          const sourceRow = Math.floor(pieceIndex / gridSize)

          // Build a true Phaser frame for this mural section. Using setCrop()
          // and then setDisplaySize() scales against the full mural dimensions,
          // which makes the visible cropped section appear tiny inside its tile.
          const cropX = Math.round(
            sourceColumn * sourceWidth / gridSize,
          )
          const cropY = Math.round(
            sourceRow * sourceHeight / gridSize,
          )
          const cropRight = Math.round(
            (sourceColumn + 1) * sourceWidth / gridSize,
          )
          const cropBottom = Math.round(
            (sourceRow + 1) * sourceHeight / gridSize,
          )
          const cropWidth = Math.max(1, cropRight - cropX)
          const cropHeight = Math.max(1, cropBottom - cropY)
          const frameName = `painted-prophecy-${gridSize}x${gridSize}-piece-${pieceIndex}`
          const texture = this.scene.textures.get(round.textureKey)

          if (!texture.has(frameName)) {
            texture.add(
              frameName,
              0,
              cropX,
              cropY,
              cropWidth,
              cropHeight,
            )
          }

          const image = this.scene.add.image(
            0,
            0,
            round.textureKey,
            frameName,
          )
          image.setDisplaySize(tileSize - 5, tileSize - 5)
          container.add(image)
          tile.image = image
        } else {
          createFallbackTile(tile, pieceIndex, tileSize, gridSize)
        }

        container.add([border, hitZone])
        container.bringToTop(border)
        container.bringToTop(hitZone)

        hitZone.on('pointerover', () => {
          if (phase !== 'playing' || selectedTile === tile) return

          if (tile.pieceIndex !== tile.slotIndex) {
            border.setStrokeStyle(3, 0xffd966, 1)
          }
        })

        hitZone.on('pointerout', () => {
          if (phase !== 'playing') return
          refreshTileStates()
        })

        hitZone.on('pointerdown', () => {
          chooseTile(tile)
        })

        tiles.push(tile)
        slotToTile[slotIndex] = tile
      })

      refreshTileStates()
    }

    const createShuffledOrder = (
      pieceCount: number,
      shuffleSwaps: number,
    ) => {
      const order = Array.from({ length: pieceCount }, (_value, index) => index)

      for (let swap = 0; swap < shuffleSwaps; swap += 1) {
        const first = Phaser.Math.Between(0, pieceCount - 1)
        let second = Phaser.Math.Between(0, pieceCount - 1)

        while (second === first) {
          second = Phaser.Math.Between(0, pieceCount - 1)
        }

        ;[order[first], order[second]] = [order[second], order[first]]
      }

      const solved = order.every((pieceIndex, slotIndex) => pieceIndex === slotIndex)

      if (solved && pieceCount > 1) {
        ;[order[0], order[1]] = [order[1], order[0]]
      }

      return order
    }

    const finishTrial = (success: boolean) => {
      if (phase === 'finished') return

      phase = 'finished'
      clearRoundTimer()

      const finalScore = Math.max(
        0,
        score + hearts * 120 - Math.max(0, totalMoves - 24) * 2,
      )

      const reward = this.baseReward(
        'painted-prophecy',
        success,
        finalScore,
      )

      this.complete(
        {
          trialId: 'painted-prophecy',
          success,
          response: success
            ? 'You restored every shattered mural. A ruler must see how separate pieces become one history.'
            : 'The prophecy remains broken. Return with patience and rebuild the mural piece by piece.',
          ...reward,
        },
        success ? 1100 : 850,
      )
    }

    const showRoundCompleteEffect = () => {
      const glow = addRoundObject(
        this.scene.add.rectangle(
          boardX,
          boardY,
          boardSize + 8,
          boardSize + 8,
          0x72ff9b,
          0.12,
        ),
      )
      glow.setStrokeStyle(6, 0xffd966, 0.9)

      const message = addRoundObject(
        this.scene.add.text(
          boardX,
          boardY,
          'MURAL RESTORED',
          {
            fontFamily: 'Georgia',
            fontSize: '28px',
            color: '#72ff9b',
            stroke: '#000000',
            strokeThickness: 6,
            fontStyle: 'bold',
            align: 'center',
          },
        ),
      )
      message.setOrigin(0.5)
      message.setScale(0.6)

      const sparklePositions = [
        [-boardSize * 0.38, -boardSize * 0.34],
        [boardSize * 0.39, -boardSize * 0.31],
        [-boardSize * 0.37, boardSize * 0.33],
        [boardSize * 0.38, boardSize * 0.34],
      ]

      sparklePositions.forEach(([offsetX, offsetY], index) => {
        const sparkle = addRoundObject(
          this.scene.add.text(
            boardX + offsetX,
            boardY + offsetY,
            '✦',
            {
              fontFamily: 'Georgia',
              fontSize: '23px',
              color: '#ffd966',
              stroke: '#000000',
              strokeThickness: 4,
              fontStyle: 'bold',
            },
          ),
        )
        sparkle.setOrigin(0.5)
        sparkle.setScale(0)

        this.addTween({
          targets: sparkle,
          scaleX: 1.25,
          scaleY: 1.25,
          alpha: 0,
          y: sparkle.y - 14,
          delay: index * 80,
          duration: 760,
          ease: 'Sine.easeOut',
        })
      })

      this.addTween({
        targets: [glow, message],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 360,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
      })
    }

    const completeRound = () => {
      if (phase === 'finished') return

      phase = 'swapping'
      clearRoundTimer()
      selectedTile = undefined
      refreshTileStates()

      const round = getRound()
      const timeBonus = Math.max(0, Math.ceil(remainingMs / 100))
      const moveTarget = round.gridSize === 3 ? 18 : 38
      const moveBonus = Math.max(0, (moveTarget - moves) * 8)

      score += 250 + timeBonus + moveBonus
      updateHud()

      status.setText('The mural is whole again!')
      status.setColor('#72ff9b')
      showRoundCompleteEffect()

      if (roundIndex >= rounds.length - 1) {
        this.schedule(1200, () => finishTrial(true))
        return
      }

      this.schedule(1250, () => {
        roundIndex += 1
        startRound()
      })
    }

    const swapTiles = (
      firstTile: PuzzleTile,
      secondTile: PuzzleTile,
    ) => {
      if (phase !== 'playing') return

      phase = 'swapping'
      selectedTile = undefined

      const firstSlot = firstTile.slotIndex
      const secondSlot = secondTile.slotIndex
      const round = getRound()
      const tileSize = boardSize / round.gridSize
      const firstTarget = getSlotPosition(secondSlot, round.gridSize, tileSize)
      const secondTarget = getSlotPosition(firstSlot, round.gridSize, tileSize)

      firstTile.slotIndex = secondSlot
      secondTile.slotIndex = firstSlot
      slotToTile[firstSlot] = secondTile
      slotToTile[secondSlot] = firstTile

      moves += 1
      totalMoves += 1
      score = Math.max(0, score - 2)
      updateHud()

      let completedTweens = 0
      const finishSwapAnimation = () => {
        completedTweens += 1
        if (completedTweens < 2) return

        phase = 'playing'
        refreshTileStates()

        if (isSolved()) {
          completeRound()
        } else {
          status.setText('Choose another pair of tiles.')
          status.setColor('#ffd966')
        }
      }

      this.addTween({
        targets: firstTile.container,
        x: firstTarget.x,
        y: firstTarget.y,
        duration: 250,
        ease: 'Sine.easeInOut',
        onComplete: finishSwapAnimation,
      })

      this.addTween({
        targets: secondTile.container,
        x: secondTarget.x,
        y: secondTarget.y,
        duration: 250,
        ease: 'Sine.easeInOut',
        onComplete: finishSwapAnimation,
      })
    }

    const chooseTile = (tile: PuzzleTile) => {
      if (phase !== 'playing' || this.resultLocked) return

      if (!selectedTile) {
        selectedTile = tile
        refreshTileStates()
        status.setText('Now tap the tile you want to swap with it.')
        status.setColor('#4de0d2')
        return
      }

      if (selectedTile === tile) {
        selectedTile = undefined
        refreshTileStates()
        status.setText('Selection cleared. Choose a tile.')
        status.setColor('#ffd966')
        return
      }

      const firstTile = selectedTile
      swapTiles(firstTile, tile)
    }

    const startRoundTimer = () => {
      clearRoundTimer()

      const round = getRound()
      remainingMs = round.timeLimitMs
      updateTimerHud()

      roundTimer = this.addLoop(100, () => {
        if (phase !== 'playing') return

        remainingMs -= 100
        updateTimerHud()

        if (remainingMs > 0) return

        clearRoundTimer()
        hearts -= 1
        score = Math.max(0, score - 100)
        updateHud()

        if (hearts <= 0) {
          status.setText('The prophecy fades before the mural is restored.')
          status.setColor('#ff7770')
          finishTrial(false)
          return
        }

        phase = 'swapping'
        selectedTile = undefined
        status.setText('Time expired. One life lost — the mural reshuffles.')
        status.setColor('#ffbd63')
        this.scene.cameras.main.shake(160, 0.004)

        this.schedule(850, () => {
          startRound(false)
        })
      })
    }

    const showPreview = () => {
      const round = getRound()

      phase = 'preview'
      remainingMs = round.timeLimitMs
      roundTitle.setText(round.title)
      status.setText('Memorize the complete mural...')
      status.setColor('#ffd966')
      updateHud()

      if (this.scene.textures.exists(round.textureKey)) {
        const preview = addRoundObject(
          this.scene.add.image(boardX, boardY, round.textureKey),
        )
        preview.setDisplaySize(boardSize, boardSize)
        previewObjects.push(preview)
      } else {
        const missingPanel = addRoundObject(
          this.scene.add.rectangle(
            boardX,
            boardY,
            boardSize,
            boardSize,
            0x3c2209,
            1,
          ),
        )
        missingPanel.setStrokeStyle(3, 0xd4af37, 1)

        const missingText = addRoundObject(
          this.scene.add.text(
            boardX,
            boardY,
            `Missing mural asset
${round.textureKey}

The numbered fallback puzzle will still work.`,
            {
              fontFamily: 'Georgia',
              fontSize: '17px',
              color: '#ffe7a3',
              stroke: '#000000',
              strokeThickness: 4,
              fontStyle: 'bold',
              align: 'center',
              lineSpacing: 5,
              wordWrap: { width: boardSize - 46, useAdvancedWrap: true },
            },
          ),
        )
        missingText.setOrigin(0.5)
        previewObjects.push(missingPanel, missingText)
      }

      const previewShade = addRoundObject(
        this.scene.add.rectangle(
          boardX,
          boardY + boardSize / 2 - 22,
          boardSize,
          44,
          0x120904,
          0.82,
        ),
      )

      const previewCountdown = addRoundObject(
        this.scene.add.text(
          boardX,
          boardY + boardSize / 2 - 22,
          'STUDY THE MURAL',
          {
            fontFamily: 'Georgia',
            fontSize: '15px',
            color: '#fff7cf',
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold',
          },
        ),
      )
      previewCountdown.setOrigin(0.5)
      previewObjects.push(previewShade, previewCountdown)

      this.schedule(round.previewMs, () => {
        if (phase !== 'preview') return

        const objectsToRemove = [...previewObjects]
        objectsToRemove.forEach((object) => {
          if (object.active) object.destroy()
        })

        roundObjects = roundObjects.filter(
          (object) => !objectsToRemove.includes(object),
        )
        previewObjects = []

        const pieceCount = round.gridSize * round.gridSize
        const order = createShuffledOrder(
          pieceCount,
          round.shuffleSwaps,
        )

        createPuzzleTiles(order)
        phase = 'playing'
        status.setText('Tap one tile, then another tile, to swap them.')
        status.setColor('#ffd966')
        startRoundTimer()
        updateHud()
      })
    }

    const startRound = (showFullPreview = true) => {
      clearRoundTimer()
      clearRoundObjects()

      moves = 0
      selectedTile = undefined
      remainingMs = getRound().timeLimitMs
      phase = showFullPreview ? 'preview' : 'swapping'

      roundTitle.setText(getRound().title)
      updateHud()

      if (showFullPreview) {
        showPreview()
        return
      }

      const round = getRound()
      const pieceCount = round.gridSize * round.gridSize
      const order = createShuffledOrder(
        pieceCount,
        round.shuffleSwaps,
      )

      createPuzzleTiles(order)
      phase = 'playing'
      status.setText('The mural has reshuffled. Rebuild it before time runs out.')
      status.setColor('#ffd966')
      startRoundTimer()
      updateHud()
    }

    this.runtimeCleanups.push(() => {
      clearRoundTimer()
      clearRoundObjects()
    })

    startRound()
  }


  // ---------------------------------------------------------------------------
  // 6. SACRED SCARAB BOARD — DRAG-TO-AIM CARROM
  // ---------------------------------------------------------------------------
  private createScarabBoard() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    // These assets are large transparent illustrations displayed at a much
    // smaller size. Linear filtering prevents harsh, pixel-sharp edges when
    // Phaser scales them down.
    const smoothTextureKeys = [
      'scarab-board-background',
      'scarab-striker',
      'sun-disk-goal',
      'stone-pillar-bumper',
      'anubis-blocker',
      'cursed-hole',
      'scarab-success-glow',
    ]

    smoothTextureKeys.forEach((key) => {
      if (!this.scene.textures.exists(key)) return
      this.scene.textures
        .get(key)
        .setFilter(Phaser.Textures.FilterMode.LINEAR)
    })

    type NormalizedPoint = {
      x: number
      y: number
    }

    type PillarConfig = NormalizedPoint & {
      radius: number
    }

    type HoleConfig = NormalizedPoint & {
      radius: number
    }

    type MovingBlockerConfig = NormalizedPoint & {
      radius: number
      axis: 'x' | 'y'
      amplitude: number
      speed: number
      phase?: number
    }

    type ScarabRound = {
      title: string
      hint: string
      start: NormalizedPoint
      goal: NormalizedPoint & { radius: number }
      pillars: PillarConfig[]
      holes: HoleConfig[]
      blockers: MovingBlockerConfig[]
    }

    type CircleObstacle = {
      x: number
      y: number
      radius: number
      visual: Phaser.GameObjects.Container
    }

    type MovingBlocker = CircleObstacle & {
      baseX: number
      baseY: number
      axis: 'x' | 'y'
      amplitude: number
      speed: number
      phase: number
    }

    const rounds: ScarabRound[] = [
      {
        title: 'Round 1 — Sun Gate',
        hint: 'Drag from the scarab toward the Sun Disk, then release.',
        start: { x: 0.5, y: 0.82 },
        goal: { x: 0.5, y: 0.16, radius: 0.085 },
        pillars: [],
        holes: [
          { x: 0.20, y: 0.49, radius: 0.052 },
          { x: 0.80, y: 0.49, radius: 0.052 },
        ],
        blockers: [],
      },
      {
        title: 'Round 2 — Pillar Chamber',
        hint: 'Use an angled shot or rebound around the temple pillars.',
        start: { x: 0.18, y: 0.80 },
        goal: { x: 0.82, y: 0.18, radius: 0.078 },
        pillars: [
          { x: 0.38, y: 0.62, radius: 0.072 },
          { x: 0.62, y: 0.39, radius: 0.072 },
        ],
        holes: [
          { x: 0.70, y: 0.74, radius: 0.052 },
          { x: 0.28, y: 0.28, radius: 0.052 },
        ],
        blockers: [],
      },
      {
        title: 'Round 3 — Trial of Anubis',
        hint: 'Time the shot past the moving guardians and cursed holes.',
        start: { x: 0.5, y: 0.84 },
        goal: { x: 0.5, y: 0.13, radius: 0.072 },
        pillars: [
          { x: 0.23, y: 0.56, radius: 0.062 },
          { x: 0.77, y: 0.56, radius: 0.062 },
          { x: 0.50, y: 0.36, radius: 0.066 },
        ],
        holes: [
          { x: 0.36, y: 0.72, radius: 0.047 },
          { x: 0.64, y: 0.72, radius: 0.047 },
          { x: 0.18, y: 0.28, radius: 0.047 },
          { x: 0.82, y: 0.28, radius: 0.047 },
        ],
        blockers: [
          {
            x: 0.5,
            y: 0.52,
            radius: 0.062,
            axis: 'x',
            amplitude: 0.18,
            speed: 1.9,
          },
          {
            x: 0.5,
            y: 0.23,
            radius: 0.055,
            axis: 'x',
            amplitude: 0.23,
            speed: 1.45,
            phase: Math.PI,
          },
        ],
      },
    ]

    this.addTitle(TRIAL_TITLES['scarab-board'])
    this.addInstruction(
      'Hold the sacred scarab, drag toward the shot direction, and release to launch.',
      top + 84,
    )

    let roundIndex = 0
    let hearts = 3
    let shots = 0
    let roundStartShots = 0
    let score = 0
    let phase: 'ready' | 'aiming' | 'moving' | 'resolving' | 'finished' = 'ready'
    let aimPower = 0
    let aimAngle = -Math.PI / 2
    let elapsedSeconds = 0

    let scarabX = 0
    let scarabY = 0
    let velocityX = 0
    let velocityY = 0

    let scarabVisual: Phaser.GameObjects.Container | undefined
    let goalObstacle: CircleObstacle | undefined
    let pillars: CircleObstacle[] = []
    let holes: CircleObstacle[] = []
    let movingBlockers: MovingBlocker[] = []
    let roundObjects: Phaser.GameObjects.GameObject[] = []

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

    const shotsHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 2,
      y: hudY,
      width: hudCardWidth,
      label: 'SHOTS',
      bandColor: 0x5b3c88,
    })

    const scoreHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 3,
      y: hudY,
      width: hudCardWidth,
      label: 'SCORE',
      bandColor: 0x8b6b1f,
    })

    const powerHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 4,
      y: hudY,
      width: hudCardWidth,
      label: 'POWER',
      bandColor: 0x27633a,
      showProgress: true,
    })

    const boardTop = top + 178
    const statusY = bottom - 28
    const boardBottom = statusY - 28
    const boardHeight = Math.max(235, boardBottom - boardTop)
    const boardWidth = Math.min(this.panelWidth - 76, boardHeight * 1.62)
    const boardX = width / 2
    const boardY = boardTop + boardHeight / 2
    const boardLeft = boardX - boardWidth / 2
    const boardRight = boardX + boardWidth / 2
    const boardUpper = boardY - boardHeight / 2
    const boardLower = boardY + boardHeight / 2
    const scarabRadius = Math.max(14, Math.min(19, boardHeight * 0.055))
    const maxAimDistance = Math.min(145, boardWidth * 0.24)

    const boardShadow = this.scene.add.rectangle(
      boardX + 7,
      boardY + 8,
      boardWidth + 20,
      boardHeight + 20,
      0x000000,
      0.42,
    )

    const boardFrame = this.scene.add.rectangle(
      boardX,
      boardY,
      boardWidth + 20,
      boardHeight + 20,
      0x211107,
      1,
    )
    boardFrame.setStrokeStyle(4, 0xd4af37, 1)

    this.addObject(boardShadow)
    this.addObject(boardFrame)

    if (this.scene.textures.exists('scarab-board-background')) {
      const boardImage = this.scene.add.image(
        boardX,
        boardY,
        'scarab-board-background',
      )
      boardImage.setDisplaySize(boardWidth, boardHeight)
      this.addObject(boardImage)
    } else {
      const boardSurface = this.scene.add.rectangle(
        boardX,
        boardY,
        boardWidth,
        boardHeight,
        0x9b6a2d,
        1,
      )
      boardSurface.setStrokeStyle(3, 0x1c716e, 0.9)
      this.addObject(boardSurface)

      const innerSurface = this.scene.add.rectangle(
        boardX,
        boardY,
        boardWidth - 20,
        boardHeight - 20,
        0xc3934e,
        0.95,
      )
      innerSurface.setStrokeStyle(2, 0x5b3513, 0.82)
      this.addObject(innerSurface)

      const centerLine = this.scene.add.rectangle(
        boardX,
        boardY,
        3,
        boardHeight - 36,
        0x1c716e,
        0.38,
      )
      this.addObject(centerLine)

      const centerSun = this.scene.add.circle(
        boardX,
        boardY,
        38,
        0x000000,
        0,
      )
      centerSun.setStrokeStyle(3, 0xd4af37, 0.46)
      this.addObject(centerSun)

      const cornerMarks = [
        [boardLeft + 38, boardUpper + 35],
        [boardRight - 38, boardUpper + 35],
        [boardLeft + 38, boardLower - 35],
        [boardRight - 38, boardLower - 35],
      ]

      cornerMarks.forEach(([x, y], index) => {
        const mark = this.scene.add.text(
          x,
          y,
          index % 2 === 0 ? '𓂀' : '𓋹',
          {
            fontFamily: 'Georgia',
            fontSize: '24px',
            color: '#245f5c',
            stroke: '#5b3513',
            strokeThickness: 2,
            fontStyle: 'bold',
          },
        )
        mark.setOrigin(0.5)
        this.addObject(mark)
      })
    }

    const roundTitle = this.scene.add.text(
      width / 2,
      boardTop - 13,
      '',
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
    roundTitle.setOrigin(0.5)
    this.addObject(roundTitle)

    const statusPanel = this.scene.add.rectangle(
      width / 2,
      statusY,
      this.panelWidth - 100,
      34,
      0x211107,
      0.96,
    )
    statusPanel.setStrokeStyle(2, 0xd4af37, 0.82)
    this.addObject(statusPanel)

    const status = this.addStatusText('', statusY, '#ffd966')
    status.setFontSize(13)

    const aimGraphics = this.scene.add.graphics()
    this.addObject(aimGraphics)

    const boardHitZone = this.scene.add.rectangle(
      boardX,
      boardY,
      boardWidth,
      boardHeight,
      0xffffff,
      0.001,
    )
    boardHitZone.setInteractive({ useHandCursor: true })
    this.addObject(boardHitZone)

    const addRoundObject = <T extends Phaser.GameObjects.GameObject>(object: T) => {
      this.addObject(object)
      roundObjects.push(object)
      return object
    }

    const clearRoundObjects = () => {
      aimGraphics.clear()
      roundObjects.forEach((object) => {
        if (object.active) object.destroy()
      })
      roundObjects = []
      scarabVisual = undefined
      goalObstacle = undefined
      pillars = []
      holes = []
      movingBlockers = []
    }

    const toBoardPoint = (point: NormalizedPoint) => ({
      x: boardLeft + point.x * boardWidth,
      y: boardUpper + point.y * boardHeight,
    })

    const toBoardRadius = (normalizedRadius: number) =>
      normalizedRadius * Math.min(boardWidth, boardHeight)

    const createScarabVisual = (x: number, y: number) => {
      const container = addRoundObject(this.scene.add.container(x, y))

      const shadow = this.scene.add.ellipse(
        0,
        scarabRadius * 0.66,
        scarabRadius * 2.15,
        scarabRadius * 0.72,
        0x000000,
        0.34,
      )

      const glow = this.scene.add.circle(
        0,
        0,
        scarabRadius + 8,
        0x4de0d2,
        0.12,
      )
      glow.setStrokeStyle(2, 0xffd966, 0.55)

      if (this.scene.textures.exists('scarab-striker')) {
        const image = this.scene.add.image(0, 0, 'scarab-striker')
        image.setDisplaySize(scarabRadius * 2.3, scarabRadius * 2.3)
        image.setAlpha(0.97)
        container.add([shadow, glow, image])
      } else {
        const body = this.scene.add.ellipse(
          0,
          1,
          scarabRadius * 1.7,
          scarabRadius * 1.95,
          0x176f70,
          1,
        )
        body.setStrokeStyle(3, 0xffd966, 1)

        const wingLeft = this.scene.add.ellipse(
          -scarabRadius * 0.64,
          0,
          scarabRadius * 0.92,
          scarabRadius * 1.42,
          0x225f6d,
          1,
        )
        wingLeft.setAngle(-22)
        wingLeft.setStrokeStyle(2, 0xd4af37, 0.9)

        const wingRight = this.scene.add.ellipse(
          scarabRadius * 0.64,
          0,
          scarabRadius * 0.92,
          scarabRadius * 1.42,
          0x225f6d,
          1,
        )
        wingRight.setAngle(22)
        wingRight.setStrokeStyle(2, 0xd4af37, 0.9)

        const sun = this.scene.add.circle(
          0,
          -scarabRadius * 0.82,
          scarabRadius * 0.35,
          0xffc94f,
          1,
        )
        sun.setStrokeStyle(2, 0x8b4e16, 1)

        container.add([shadow, glow, wingLeft, wingRight, body, sun])
      }

      this.addTween({
        targets: glow,
        scaleX: 1.18,
        scaleY: 1.18,
        alpha: 0.04,
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      return container
    }

    const createGoal = (round: ScarabRound) => {
      const point = toBoardPoint(round.goal)
      const radius = toBoardRadius(round.goal.radius)
      const visual = addRoundObject(this.scene.add.container(point.x, point.y))

      const glow = this.scene.add.circle(0, 0, radius + 9, 0xffd966, 0.16)
      const ring = this.scene.add.circle(0, 0, radius, 0x5f3a10, 0)
      ring.setStrokeStyle(2, 0xffef9a, 0.55)

      if (this.scene.textures.exists('sun-disk-goal')) {
        const image = this.scene.add.image(0, 0, 'sun-disk-goal')
        image.setDisplaySize(radius * 1.95, radius * 1.95)
        image.setAlpha(0.97)
        visual.add([glow, image])
      } else {
        const rays = this.scene.add.text(0, -1, '☀', {
          fontFamily: 'Georgia',
          fontSize: `${Math.round(radius * 1.55)}px`,
          color: '#ffe074',
          stroke: '#7c4313',
          strokeThickness: 4,
          fontStyle: 'bold',
        })
        rays.setOrigin(0.5)
        visual.add([glow, ring, rays])
      }

      this.addTween({
        targets: glow,
        scaleX: 1.28,
        scaleY: 1.28,
        alpha: 0.04,
        duration: 780,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      return {
        x: point.x,
        y: point.y,
        radius,
        visual,
      }
    }

    const createPillar = (config: PillarConfig) => {
      const point = toBoardPoint(config)
      const radius = toBoardRadius(config.radius)
      const visual = addRoundObject(this.scene.add.container(point.x, point.y))

      const shadow = this.scene.add.ellipse(
        0,
        radius * 0.58,
        radius * 1.9,
        radius * 0.72,
        0x000000,
        0.28,
      )

      if (this.scene.textures.exists('stone-pillar-bumper')) {
        const image = this.scene.add.image(0, 0, 'stone-pillar-bumper')
        image.setDisplaySize(radius * 2.08, radius * 2.08)
        image.setAlpha(0.96)
        visual.add([shadow, image])
      } else {
        const base = this.scene.add.circle(0, 0, radius, 0xb77732, 1)
        base.setStrokeStyle(4, 0x5a3112, 1)
        const inner = this.scene.add.circle(0, 0, radius * 0.65, 0x1e7774, 0.9)
        inner.setStrokeStyle(2, 0xffd966, 0.9)
        const symbol = this.scene.add.text(0, 0, '𓊽', {
          fontFamily: 'Georgia',
          fontSize: `${Math.round(radius * 1.18)}px`,
          color: '#ffe7a3',
          stroke: '#5a3112',
          strokeThickness: 3,
          fontStyle: 'bold',
        })
        symbol.setOrigin(0.5)
        visual.add([shadow, base, inner, symbol])
      }

      return {
        x: point.x,
        y: point.y,
        radius,
        visual,
      }
    }

    const createHole = (config: HoleConfig) => {
      const point = toBoardPoint(config)
      const radius = toBoardRadius(config.radius)
      const visual = addRoundObject(this.scene.add.container(point.x, point.y))

      const outer = this.scene.add.circle(0, 0, radius + 4, 0x6c3517, 1)
      outer.setStrokeStyle(2, 0xd4af37, 0.58)

      if (this.scene.textures.exists('cursed-hole')) {
        const image = this.scene.add.image(0, 0, 'cursed-hole')
        image.setDisplaySize(radius * 2.12, radius * 2.12)
        image.setAlpha(0.97)
        visual.add(image)
      } else {
        const hole = this.scene.add.circle(0, 0, radius, 0x090402, 1)
        hole.setStrokeStyle(3, 0x7c1e1e, 0.95)
        const center = this.scene.add.circle(0, 0, radius * 0.45, 0x000000, 1)
        visual.add([outer, hole, center])
      }

      return {
        x: point.x,
        y: point.y,
        radius,
        visual,
      }
    }

    const createMovingBlocker = (config: MovingBlockerConfig) => {
      const point = toBoardPoint(config)
      const radius = toBoardRadius(config.radius)
      const visual = addRoundObject(this.scene.add.container(point.x, point.y))

      const shadow = this.scene.add.ellipse(
        0,
        radius * 0.62,
        radius * 1.8,
        radius * 0.65,
        0x000000,
        0.3,
      )

      if (this.scene.textures.exists('anubis-blocker')) {
        const image = this.scene.add.image(0, 0, 'anubis-blocker')
        image.setDisplaySize(radius * 2.16, radius * 2.16)
        image.setAlpha(0.96)
        visual.add([shadow, image])
      } else {
        const disk = this.scene.add.circle(0, 0, radius, 0x20272d, 1)
        disk.setStrokeStyle(3, 0xffd966, 0.95)
        const head = this.scene.add.text(0, -1, '𓃢', {
          fontFamily: 'Georgia',
          fontSize: `${Math.round(radius * 1.45)}px`,
          color: '#71c8c1',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold',
        })
        head.setOrigin(0.5)
        visual.add([shadow, disk, head])
      }

      return {
        x: point.x,
        y: point.y,
        baseX: point.x,
        baseY: point.y,
        radius,
        axis: config.axis,
        amplitude:
          config.amplitude *
          (config.axis === 'x' ? boardWidth : boardHeight),
        speed: config.speed,
        phase: config.phase ?? 0,
        visual,
      }
    }

    const updateHud = () => {
      roundHud.setValue(`${roundIndex + 1} / ${rounds.length}`)
      livesHud.setValue(`${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}`)
      shotsHud.setValue(String(shots))
      scoreHud.setValue(String(score))

      if (phase === 'aiming') {
        powerHud.setValue(`${Math.round(aimPower * 100)}%`)
        powerHud.setProgress(aimPower, aimPower >= 0.82)
      } else if (phase === 'moving') {
        powerHud.setValue('MOVING')
        powerHud.setProgress(0)
      } else {
        powerHud.setValue('READY')
        powerHud.setProgress(0)
      }
    }

    const setScarabPosition = (x: number, y: number) => {
      scarabX = x
      scarabY = y
      scarabVisual?.setPosition(x, y)
    }

    const resetScarab = (message?: string) => {
      const start = toBoardPoint(rounds[roundIndex].start)

      velocityX = 0
      velocityY = 0
      aimPower = 0
      aimGraphics.clear()
      phase = 'ready'
      setScarabPosition(start.x, start.y)

      if (message) {
        status.setText(message)
      } else {
        status.setText(rounds[roundIndex].hint)
      }

      status.setColor('#ffd966')
      updateHud()
    }

    const finishTrial = (success: boolean) => {
      if (phase === 'finished') return

      phase = 'finished'
      velocityX = 0
      velocityY = 0
      aimGraphics.clear()

      const finalScore = score + hearts * 120
      const reward = this.baseReward('scarab-board', success, finalScore)

      this.complete(
        {
          trialId: 'scarab-board',
          success,
          response: success
            ? 'You guided the sacred scarab with control, timing, and purpose. A ruler must direct power instead of merely releasing it.'
            : 'The scarab is claimed by the cursed board. Return with steadier aim and greater control.',
          ...reward,
        },
        success ? 1100 : 850,
      )
    }

    const loseLife = (message: string) => {
      if (phase === 'resolving' || phase === 'finished') return

      phase = 'resolving'
      hearts -= 1
      velocityX = 0
      velocityY = 0
      aimGraphics.clear()
      updateHud()

      status.setText(message)
      status.setColor('#ff7770')
      this.scene.cameras.main.shake(170, 0.004)

      if (scarabVisual) {
        this.addTween({
          targets: scarabVisual,
          alpha: 0.12,
          scaleX: 0.45,
          scaleY: 0.45,
          angle: 150,
          duration: 330,
          ease: 'Sine.easeIn',
        })
      }

      if (hearts <= 0) {
        this.schedule(650, () => finishTrial(false))
        return
      }

      this.schedule(720, () => {
        if (!scarabVisual) return
        scarabVisual.setAlpha(1)
        scarabVisual.setScale(1)
        scarabVisual.setAngle(0)
        resetScarab('One life lost. Hold the scarab and try another angle.')
      })
    }

    const showGoalEffect = () => {
      const glow = addRoundObject(
        this.scene.add.circle(
          scarabX,
          scarabY,
          scarabRadius + 24,
          0x72ff9b,
          0.22,
        ),
      )
      glow.setStrokeStyle(5, 0xffd966, 1)

      const mark = addRoundObject(
        this.scene.add.text(scarabX, scarabY - 1, '✓', {
          fontFamily: 'Georgia',
          fontSize: '31px',
          color: '#72ff9b',
          stroke: '#000000',
          strokeThickness: 6,
          fontStyle: 'bold',
        }),
      )
      mark.setOrigin(0.5)

      this.addTween({
        targets: [glow, mark],
        scaleX: 1.42,
        scaleY: 1.42,
        alpha: 0,
        duration: 760,
        ease: 'Sine.easeOut',
      })
    }

    const completeRound = () => {
      if (phase === 'resolving' || phase === 'finished') return

      phase = 'resolving'
      velocityX = 0
      velocityY = 0
      aimGraphics.clear()

      const shotsThisRound = shots - roundStartShots
      const shotBonus = Math.max(0, 7 - shotsThisRound) * 55
      score += 300 + shotBonus
      updateHud()

      status.setText('The scarab enters the Sun Disk!')
      status.setColor('#72ff9b')
      showGoalEffect()

      if (scarabVisual) {
        this.addTween({
          targets: scarabVisual,
          x: goalObstacle?.x ?? scarabX,
          y: goalObstacle?.y ?? scarabY,
          scaleX: 0.45,
          scaleY: 0.45,
          angle: 360,
          alpha: 0.25,
          duration: 520,
          ease: 'Sine.easeIn',
        })
      }

      if (roundIndex >= rounds.length - 1) {
        this.schedule(950, () => finishTrial(true))
        return
      }

      this.schedule(980, () => {
        roundIndex += 1
        renderRound()
      })
    }

    const resolveCircleCollision = (
      obstacleX: number,
      obstacleY: number,
      obstacleRadius: number,
      restitution = 0.88,
    ) => {
      const dx = scarabX - obstacleX
      const dy = scarabY - obstacleY
      const minimumDistance = scarabRadius + obstacleRadius
      const distanceSquared = dx * dx + dy * dy

      if (
        distanceSquared >= minimumDistance * minimumDistance ||
        distanceSquared <= 0.0001
      ) {
        return
      }

      const distance = Math.sqrt(distanceSquared)
      const normalX = dx / distance
      const normalY = dy / distance
      const penetration = minimumDistance - distance

      scarabX += normalX * penetration
      scarabY += normalY * penetration

      const velocityAlongNormal =
        velocityX * normalX + velocityY * normalY

      if (velocityAlongNormal < 0) {
        velocityX -=
          (1 + restitution) * velocityAlongNormal * normalX
        velocityY -=
          (1 + restitution) * velocityAlongNormal * normalY
      }
    }

    const drawAimGuide = (pointerX: number, pointerY: number) => {
      if (phase !== 'aiming') {
        aimGraphics.clear()
        return
      }

      const dx = pointerX - scarabX
      const dy = pointerY - scarabY
      const rawDistance = Math.sqrt(dx * dx + dy * dy)

      if (rawDistance <= 0.001) {
        aimGraphics.clear()
        aimPower = 0
        updateHud()
        return
      }

      const distance = Math.min(maxAimDistance, rawDistance)
      aimAngle = Math.atan2(dy, dx)
      aimPower = Phaser.Math.Clamp(distance / maxAimDistance, 0, 1)

      const directionX = Math.cos(aimAngle)
      const directionY = Math.sin(aimAngle)
      const startX = scarabX + directionX * (scarabRadius + 7)
      const startY = scarabY + directionY * (scarabRadius + 7)
      const endX = scarabX + directionX * distance
      const endY = scarabY + directionY * distance

      const arrowColor =
        aimPower >= 0.82
          ? 0xff8a54
          : aimPower >= 0.48
            ? 0xffd966
            : 0x4de0d2

      aimGraphics.clear()
      aimGraphics.lineStyle(6, 0x000000, 0.52)
      aimGraphics.lineBetween(startX + 2, startY + 2, endX + 2, endY + 2)
      aimGraphics.lineStyle(4, arrowColor, 1)
      aimGraphics.lineBetween(startX, startY, endX, endY)

      const arrowLength = 14
      const arrowAngle = 0.58
      aimGraphics.fillStyle(arrowColor, 1)
      aimGraphics.fillTriangle(
        endX,
        endY,
        endX - Math.cos(aimAngle - arrowAngle) * arrowLength,
        endY - Math.sin(aimAngle - arrowAngle) * arrowLength,
        endX - Math.cos(aimAngle + arrowAngle) * arrowLength,
        endY - Math.sin(aimAngle + arrowAngle) * arrowLength,
      )

      aimGraphics.fillStyle(0xfff1ad, 0.72)
      const guideStep = 27
      const guideDistance = Math.min(boardWidth * 0.42, 220)

      for (
        let distanceAlong = distance + 22;
        distanceAlong <= guideDistance;
        distanceAlong += guideStep
      ) {
        const dotX = scarabX + directionX * distanceAlong
        const dotY = scarabY + directionY * distanceAlong

        if (
          dotX < boardLeft + 6 ||
          dotX > boardRight - 6 ||
          dotY < boardUpper + 6 ||
          dotY > boardLower - 6
        ) {
          break
        }

        aimGraphics.fillCircle(dotX, dotY, 3)
      }

      updateHud()
    }

    const launchScarab = () => {
      if (phase !== 'aiming') return

      if (aimPower < 0.08) {
        phase = 'ready'
        aimGraphics.clear()
        aimPower = 0
        status.setText('Drag farther from the scarab to add power.')
        status.setColor('#ffbd63')
        updateHud()
        return
      }

      const minimumSpeed = 190
      const maximumSpeed = 760
      const launchSpeed =
        minimumSpeed + (maximumSpeed - minimumSpeed) * aimPower

      velocityX = Math.cos(aimAngle) * launchSpeed
      velocityY = Math.sin(aimAngle) * launchSpeed
      shots += 1
      phase = 'moving'
      aimGraphics.clear()

      status.setText('The sacred scarab is moving...')
      status.setColor('#4de0d2')
      updateHud()
    }

    const handlePointerDown = (pointer: Phaser.Input.Pointer) => {
      if (phase !== 'ready' || this.resultLocked) return

      const distance = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        scarabX,
        scarabY,
      )

      if (distance > scarabRadius + 18) {
        status.setText('Hold directly on the sacred scarab to begin aiming.')
        status.setColor('#ffbd63')
        return
      }

      phase = 'aiming'
      aimPower = 0
      drawAimGuide(pointer.x, pointer.y)
      status.setText('Drag toward the direction you want the scarab to travel.')
      status.setColor('#4de0d2')
      updateHud()
    }

    const handlePointerMove = (pointer: Phaser.Input.Pointer) => {
      if (phase !== 'aiming') return
      drawAimGuide(pointer.x, pointer.y)
    }

    const handlePointerUp = () => {
      if (phase !== 'aiming') return
      launchScarab()
    }

    const physicsStep = () => {
      if (phase === 'finished') return

      const deltaSeconds = 1 / 60
      elapsedSeconds += deltaSeconds

      movingBlockers.forEach((blocker) => {
        const offset =
          Math.sin(elapsedSeconds * blocker.speed + blocker.phase) *
          blocker.amplitude

        if (blocker.axis === 'x') {
          blocker.x = blocker.baseX + offset
          blocker.y = blocker.baseY
        } else {
          blocker.x = blocker.baseX
          blocker.y = blocker.baseY + offset
        }

        blocker.visual.setPosition(blocker.x, blocker.y)
      })

      if (phase !== 'moving') return

      scarabX += velocityX * deltaSeconds
      scarabY += velocityY * deltaSeconds

      const restitution = 0.84

      if (scarabX - scarabRadius < boardLeft) {
        scarabX = boardLeft + scarabRadius
        velocityX = Math.abs(velocityX) * restitution
      } else if (scarabX + scarabRadius > boardRight) {
        scarabX = boardRight - scarabRadius
        velocityX = -Math.abs(velocityX) * restitution
      }

      if (scarabY - scarabRadius < boardUpper) {
        scarabY = boardUpper + scarabRadius
        velocityY = Math.abs(velocityY) * restitution
      } else if (scarabY + scarabRadius > boardLower) {
        scarabY = boardLower - scarabRadius
        velocityY = -Math.abs(velocityY) * restitution
      }

      pillars.forEach((pillar) => {
        resolveCircleCollision(
          pillar.x,
          pillar.y,
          pillar.radius,
          0.9,
        )
      })

      movingBlockers.forEach((blocker) => {
        resolveCircleCollision(
          blocker.x,
          blocker.y,
          blocker.radius,
          0.92,
        )
      })

      const frictionPerFrame = 0.985
      velocityX *= frictionPerFrame
      velocityY *= frictionPerFrame

      setScarabPosition(scarabX, scarabY)

      const currentGoal = goalObstacle

      if (
        currentGoal &&
        Phaser.Math.Distance.Between(
          scarabX,
          scarabY,
          currentGoal.x,
          currentGoal.y,
        ) <=
          Math.max(
            scarabRadius * 0.58,
            currentGoal.radius - scarabRadius * 0.28,
          )
      ) {
        completeRound()
        return
      }

      const capturedByHole = holes.some(
        (hole) =>
          Phaser.Math.Distance.Between(
            scarabX,
            scarabY,
            hole.x,
            hole.y,
          ) <=
          Math.max(
            scarabRadius * 0.52,
            hole.radius - scarabRadius * 0.16,
          ),
      )

      if (capturedByHole) {
        loseLife('The scarab fell into a cursed hole.')
        return
      }

      const speed = Math.sqrt(
        velocityX * velocityX + velocityY * velocityY,
      )

      if (speed < 9) {
        velocityX = 0
        velocityY = 0
        phase = 'ready'
        status.setText('The scarab has stopped. Hold it for your next shot.')
        status.setColor('#ffd966')
        updateHud()
      }
    }

    const renderRound = () => {
      clearRoundObjects()

      phase = 'ready'
      velocityX = 0
      velocityY = 0
      aimPower = 0
      elapsedSeconds = 0
      roundStartShots = shots

      const round = rounds[roundIndex]
      roundTitle.setText(round.title)

      goalObstacle = createGoal(round)
      pillars = round.pillars.map(createPillar)
      holes = round.holes.map(createHole)
      movingBlockers = round.blockers.map(createMovingBlocker)

      const start = toBoardPoint(round.start)
      scarabVisual = createScarabVisual(start.x, start.y)
      setScarabPosition(start.x, start.y)

      status.setText(round.hint)
      status.setColor('#ffd966')
      updateHud()
    }

    boardHitZone.on('pointerdown', handlePointerDown)
    this.scene.input.on('pointermove', handlePointerMove)
    this.scene.input.on('pointerup', handlePointerUp)
    this.scene.input.on('pointerupoutside', handlePointerUp)

    const physicsTimer = this.addLoop(16, physicsStep)

    this.runtimeCleanups.push(() => {
      physicsTimer.remove(false)
      aimGraphics.clear()
      boardHitZone.off('pointerdown', handlePointerDown)
      this.scene.input.off('pointermove', handlePointerMove)
      this.scene.input.off('pointerup', handlePointerUp)
      this.scene.input.off('pointerupoutside', handlePointerUp)
      clearRoundObjects()
    })

    renderRound()
  }


  // ---------------------------------------------------------------------------
  // 7. STAIRWAY TO THE SUN — ASCENT OF RA
  // ---------------------------------------------------------------------------
  private createStairwaySun() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    const smoothTextureKeys = [
      'stairway-bg-stone',
      'stairway-bg-sky',
      'stairway-bg-sun',
      'stairway-platform-stone',
      'stairway-platform-gold',
      'stairway-light-fragment',
      'stairway-checkpoint',
      'stairway-spike',
      'stairway-flame',
      'stairway-falling-rock',
      'stairway-guardian',
      'stairway-sun-altar',
      'stairway-cloud',
      'stairway-swinging-blade',
      'stairway-sun-beam',
    ]

    smoothTextureKeys.forEach((key) => {
      if (!this.scene.textures.exists(key)) return
      this.scene.textures
        .get(key)
        .setFilter(Phaser.Textures.FilterMode.LINEAR)
    })

    this.addTitle(TRIAL_TITLES['stairway-sun'])
    this.addInstruction(
      'Use A/D or arrows to move. Hold a direction and press Space to jump onto the glowing platforms. Shift air-dashes.',
      top + 83,
    )

    type PlatformKind =
      | 'stone'
      | 'gold'
      | 'moving-x'
      | 'moving-y'
      | 'crumble'
      | 'cloud'

    type Platform = {
      id: string
      x: number
      y: number
      width: number
      height: number
      kind: PlatformKind
      baseX: number
      baseY: number
      amplitude: number
      speed: number
      phase: number
      visual: Phaser.GameObjects.Container
      collidable: boolean
      crumbleStarted: boolean
      deltaX: number
      deltaY: number
    }

    type HazardKind =
      | 'spikes'
      | 'flame'
      | 'rock'
      | 'guardian'
      | 'beam'
      | 'blade'

    type Hazard = {
      kind: HazardKind
      x: number
      y: number
      width: number
      height: number
      baseX: number
      baseY: number
      amplitude: number
      speed: number
      phase: number
      active: boolean
      visual: Phaser.GameObjects.Container
    }

    type LightFragment = {
      name: string
      x: number
      y: number
      baseY: number
      collected: boolean
      phase: number
      visual: Phaser.GameObjects.Container
    }

    type Checkpoint = {
      index: number
      x: number
      y: number
      spawnX: number
      spawnY: number
      activated: boolean
      visual: Phaser.GameObjects.Container
    }

    const hudWidth = this.panelWidth - 84
    const hudGap = 7
    const hudCardWidth = (hudWidth - hudGap * 3) / 4
    const hudStartX = width / 2 - hudWidth / 2 + hudCardWidth / 2
    const hudY = top + 121

    const heartsHud = this.createCompactHudCard({
      x: hudStartX,
      y: hudY,
      width: hudCardWidth,
      label: 'HEARTS',
      bandColor: 0x8f2d2d,
      valueColor: '#8f2d2d',
    })

    const heightHud = this.createCompactHudCard({
      x: hudStartX + hudCardWidth + hudGap,
      y: hudY,
      width: hudCardWidth,
      label: 'HEIGHT',
      bandColor: 0x245d78,
      showProgress: true,
    })

    const lightHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 2,
      y: hudY,
      width: hudCardWidth,
      label: 'LIGHT',
      bandColor: 0x8b6b1f,
      valueColor: '#7b5510',
    })

    const checkpointHud = this.createCompactHudCard({
      x: hudStartX + (hudCardWidth + hudGap) * 3,
      y: hudY,
      width: hudCardWidth,
      label: 'CHECKPOINT',
      bandColor: 0x27633a,
      valueColor: '#27633a',
    })

    const statusY = bottom - 18
    const viewportTop = top + 158
    const viewportBottom = statusY - 28
    const viewportHeight = Math.max(310, viewportBottom - viewportTop)
    const viewportWidth = this.panelWidth - 84
    const viewportLeft = width / 2 - viewportWidth / 2
    const viewportRight = viewportLeft + viewportWidth

    const viewportShadow = this.scene.add.rectangle(
      width / 2 + 6,
      viewportTop + viewportHeight / 2 + 7,
      viewportWidth + 14,
      viewportHeight + 14,
      0x000000,
      0.46,
    )

    const viewportFrame = this.scene.add.rectangle(
      width / 2,
      viewportTop + viewportHeight / 2,
      viewportWidth + 14,
      viewportHeight + 14,
      0x211107,
      1,
    )
    viewportFrame.setStrokeStyle(4, 0xd4af37, 1)

    const viewportInner = this.scene.add.rectangle(
      width / 2,
      viewportTop + viewportHeight / 2,
      viewportWidth,
      viewportHeight,
      0x0e0804,
      1,
    )
    viewportInner.setStrokeStyle(2, 0x2aa7a1, 0.72)

    this.addObject(viewportShadow)
    this.addObject(viewportFrame)
    this.addObject(viewportInner)

    const maskGraphics = this.scene.add.graphics()
    maskGraphics.fillStyle(0xffffff, 1)
    maskGraphics.fillRect(
      viewportLeft,
      viewportTop,
      viewportWidth,
      viewportHeight,
    )
    maskGraphics.setVisible(false)
    this.addObject(maskGraphics)

    const worldContainer = this.scene.add.container(
      viewportLeft,
      viewportTop,
    )
    const worldMask = maskGraphics.createGeometryMask()
    worldContainer.setMask(worldMask)
    this.addObject(worldContainer)

    this.runtimeCleanups.push(() => {
      worldContainer.clearMask(true)
      worldMask.destroy()
    })

    const backgroundLayer = this.scene.add.container(0, 0)
    const gameplayLayer = this.scene.add.container(0, 0)
    const fxLayer = this.scene.add.container(0, 0)
    worldContainer.add([backgroundLayer, gameplayLayer, fxLayer])

    const worldWidth = viewportWidth
    const worldHeight = 2580
    const playerWidth = 24
    const playerHeight = 36
    const playerHalfWidth = playerWidth / 2
    const playerHalfHeight = playerHeight / 2

    const statusPanel = this.scene.add.rectangle(
      width / 2,
      statusY,
      this.panelWidth - 102,
      30,
      0x211107,
      0.97,
    )
    statusPanel.setStrokeStyle(2, 0xd4af37, 0.85)
    this.addObject(statusPanel)

    const status = this.addStatusText(
      'Move left with A, then press Space to reach the first platform.',
      statusY,
      '#ffd966',
    )
    status.setFontSize(12)

    const zoneBadge = this.scene.add.text(
      viewportLeft + 10,
      viewportTop + 9,
      'CHAMBER OF STONE',
      {
        fontFamily: 'Georgia',
        fontSize: '12px',
        color: '#ffe7a3',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      },
    )
    zoneBadge.setOrigin(0, 0)
    zoneBadge.setDepth(120000)
    this.addObject(zoneBadge)

    const dashBadge = this.scene.add.text(
      viewportRight - 10,
      viewportTop + 9,
      'SHIFT: AIR DASH',
      {
        fontFamily: 'Georgia',
        fontSize: '10px',
        color: '#7de0d3',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
      },
    )
    dashBadge.setOrigin(1, 0)
    dashBadge.setDepth(120000)
    this.addObject(dashBadge)

    const progressTrack = this.scene.add.rectangle(
      viewportRight - 11,
      viewportTop + viewportHeight / 2,
      6,
      viewportHeight - 54,
      0x211107,
      0.82,
    )
    progressTrack.setStrokeStyle(1, 0xffd966, 0.48)
    this.addObject(progressTrack)

    const progressFillHeight = viewportHeight - 58
    const progressFill = this.scene.add.rectangle(
      viewportRight - 11,
      viewportTop + viewportHeight - 29,
      4,
      1,
      0xffd966,
      0.95,
    )
    progressFill.setOrigin(0.5, 1)
    this.addObject(progressFill)

    const progressMarker = this.scene.add.circle(
      viewportRight - 11,
      viewportTop + viewportHeight - 29,
      5,
      0x7de0d3,
      1,
    )
    progressMarker.setStrokeStyle(1, 0xffffff, 1)
    this.addObject(progressMarker)

    const addWorld = <T extends Phaser.GameObjects.GameObject>(
      object: T,
      layer: Phaser.GameObjects.Container = gameplayLayer,
    ) => {
      layer.add(object)
      return object
    }

    const createProceduralBackground = () => {
      const graphics = this.scene.add.graphics()

      graphics.fillGradientStyle(
        0x241208,
        0x241208,
        0x5b3214,
        0x5b3214,
        1,
      )
      graphics.fillRect(0, 1700, worldWidth, 880)

      graphics.fillGradientStyle(
        0x163b52,
        0x163b52,
        0xb87a32,
        0xb87a32,
        1,
      )
      graphics.fillRect(0, 760, worldWidth, 940)

      graphics.fillGradientStyle(
        0xffd66a,
        0xffd66a,
        0x5a9eb5,
        0x5a9eb5,
        1,
      )
      graphics.fillRect(0, 0, worldWidth, 760)

      for (let y = 1730; y < worldHeight; y += 58) {
        const offset = Math.floor((y / 58) % 2) * 28
        for (let x = -offset; x < worldWidth; x += 72) {
          graphics.lineStyle(1, 0xb57b37, 0.18)
          graphics.strokeRect(x, y, 68, 52)
        }
      }

      for (let i = 0; i < 10; i += 1) {
        const rayX = (i / 9) * worldWidth
        graphics.lineStyle(5, 0xfff0a1, 0.1)
        graphics.lineBetween(
          worldWidth / 2,
          40,
          rayX,
          700,
        )
      }

      addWorld(graphics, backgroundLayer)

      for (let i = 0; i < 14; i += 1) {
        const cloudX = 35 + (i * 97) % Math.max(120, worldWidth - 70)
        const cloudY = 820 + (i * 131) % 760
        const cloud = this.scene.add.container(cloudX, cloudY)

        const c1 = this.scene.add.ellipse(0, 0, 88, 26, 0xe8e2c8, 0.12)
        const c2 = this.scene.add.ellipse(-28, -7, 55, 24, 0xf3ead2, 0.12)
        const c3 = this.scene.add.ellipse(30, -5, 62, 25, 0xf3ead2, 0.12)
        cloud.add([c1, c2, c3])
        addWorld(cloud, backgroundLayer)
      }

      for (let y = 1780; y < 2520; y += 240) {
        const leftPillar = this.scene.add.rectangle(
          24,
          y,
          34,
          190,
          0x7f4b21,
          0.5,
        )
        leftPillar.setStrokeStyle(2, 0xd4af37, 0.25)

        const rightPillar = this.scene.add.rectangle(
          worldWidth - 24,
          y - 80,
          34,
          190,
          0x7f4b21,
          0.5,
        )
        rightPillar.setStrokeStyle(2, 0xd4af37, 0.25)

        addWorld(leftPillar, backgroundLayer)
        addWorld(rightPillar, backgroundLayer)
      }

      const sunGlow = this.scene.add.circle(
        worldWidth / 2,
        88,
        150,
        0xffef9a,
        0.1,
      )
      const sunCore = this.scene.add.circle(
        worldWidth / 2,
        88,
        72,
        0xffd34f,
        0.18,
      )
      sunCore.setStrokeStyle(5, 0xfff4c7, 0.28)
      addWorld(sunGlow, backgroundLayer)
      addWorld(sunCore, backgroundLayer)
    }

    const createBackgroundSegment = (
      key: string,
      centerY: number,
      heightValue: number,
    ) => {
      if (!this.scene.textures.exists(key)) return false

      const image = this.scene.add.image(
        worldWidth / 2,
        centerY,
        key,
      )
      image.setDisplaySize(worldWidth, heightValue)
      addWorld(image, backgroundLayer)
      return true
    }

    const hasAllBackgrounds =
      createBackgroundSegment('stairway-bg-sun', 380, 760) &&
      createBackgroundSegment('stairway-bg-sky', 1230, 940) &&
      createBackgroundSegment('stairway-bg-stone', 2140, 880)

    if (!hasAllBackgrounds) {
      backgroundLayer.removeAll(true)
      createProceduralBackground()
    }

    const platforms: Platform[] = []
    const hazards: Hazard[] = []
    const fragments: LightFragment[] = []
    const checkpoints: Checkpoint[] = []

    const createPlatform = (
      id: string,
      x: number,
      y: number,
      platformWidth: number,
      kind: PlatformKind = 'stone',
      options?: {
        amplitude?: number
        speed?: number
        phase?: number
      },
    ) => {
      const platformHeight = kind === 'cloud' ? 16 : 18
      const visual = this.scene.add.container(x, y)

      const shadow = this.scene.add.rectangle(
        3,
        platformHeight / 2 + 5,
        platformWidth * 0.94,
        platformHeight,
        0x000000,
        kind === 'cloud' ? 0.07 : 0.13,
      )

      const textureKey =
        kind === 'gold'
          ? 'stairway-platform-gold'
          : kind === 'cloud'
            ? 'stairway-cloud'
            : 'stairway-platform-stone'

      if (this.scene.textures.exists(textureKey)) {
        const image = this.scene.add.image(
          0,
          kind === 'cloud'
            ? platformHeight / 2
            : platformHeight / 2 - 4,
          textureKey,
        )

        image.setDisplaySize(
          platformWidth,
          kind === 'cloud' ? 38 : 48,
        )
        image.setAlpha(kind === 'cloud' ? 0.9 : 1)

        if (kind !== 'cloud') {
          image.clearTint()
        }

        visual.add([shadow, image])
      } else if (kind === 'cloud') {
        const cloud = this.scene.add.ellipse(
          0,
          platformHeight / 2,
          platformWidth,
          27,
          0xf4e7c4,
          0.88,
        )
        cloud.setStrokeStyle(2, 0xffd966, 0.5)
        visual.add([shadow, cloud])
      } else {
        const bodyColor =
          kind === 'gold' ? 0xd3a13b : 0x9c6932

        const body = this.scene.add.rectangle(
          0,
          platformHeight / 2,
          platformWidth,
          platformHeight,
          bodyColor,
          1,
        )
        body.setStrokeStyle(
          2,
          kind === 'gold' ? 0xffef9a : 0x4f2d12,
          1,
        )

        const trim = this.scene.add.rectangle(
          0,
          2,
          platformWidth - 8,
          4,
          kind === 'gold' ? 0x2d8985 : 0xd4af37,
          0.9,
        )

        const lowerTrim = this.scene.add.rectangle(
          0,
          platformHeight - 2,
          platformWidth - 12,
          3,
          0x5b3513,
          0.55,
        )

        visual.add([shadow, body, trim, lowerTrim])
      }

      addWorld(visual)

      const platform: Platform = {
        id,
        x,
        y,
        width: platformWidth,
        height: platformHeight,
        kind,
        baseX: x,
        baseY: y,
        amplitude: options?.amplitude ?? 0,
        speed: options?.speed ?? 1,
        phase: options?.phase ?? 0,
        visual,
        collidable: true,
        crumbleStarted: false,
        deltaX: 0,
        deltaY: 0,
      }

      platforms.push(platform)
      return platform
    }

    const X = (ratio: number) =>
      Phaser.Math.Clamp(
        worldWidth * ratio,
        48,
        worldWidth - 48,
      )

    const groundPlatform = createPlatform(
      'ground',
      X(0.5),
      2500,
      worldWidth - 54,
      'stone',
    )
    createPlatform('stone-1', X(0.22), 2374, 150, 'stone')
    createPlatform('moving-1', X(0.59), 2252, 142, 'moving-x', {
      amplitude: Math.min(92, worldWidth * 0.15),
      speed: 1.45,
    })
    createPlatform('crumble-1', X(0.25), 2130, 158, 'crumble')
    createPlatform('checkpoint-1', X(0.56), 2020, 205, 'gold')

    createPlatform('sky-1', X(0.15), 1900, 122, 'stone')
    createPlatform('sky-2', X(0.48), 1785, 138, 'moving-y', {
      amplitude: 34,
      speed: 1.3,
    })
    createPlatform('sky-3', X(0.82), 1660, 118, 'cloud')
    createPlatform('sky-4', X(0.48), 1540, 154, 'stone')
    createPlatform('checkpoint-2', X(0.67), 1430, 198, 'gold')

    createPlatform('heaven-1', X(0.23), 1310, 126, 'cloud')
    createPlatform('heaven-2', X(0.61), 1190, 130, 'moving-x', {
      amplitude: Math.min(110, worldWidth * 0.18),
      speed: 1.72,
      phase: 1.5,
    })
    createPlatform('heaven-3', X(0.82), 1068, 110, 'gold')
    createPlatform('crumble-2', X(0.44), 950, 158, 'crumble')
    createPlatform('checkpoint-3', X(0.58), 840, 204, 'gold')

    createPlatform('sun-1', X(0.20), 720, 116, 'cloud')
    createPlatform('sun-2', X(0.58), 605, 120, 'moving-y', {
      amplitude: 38,
      speed: 1.55,
      phase: 0.7,
    })
    createPlatform('sun-3', X(0.80), 485, 112, 'gold')
    createPlatform('sun-4', X(0.44), 370, 130, 'moving-x', {
      amplitude: Math.min(94, worldWidth * 0.15),
      speed: 1.9,
      phase: 2.1,
    })
    createPlatform('sun-5', X(0.27), 270, 118, 'cloud')
    createPlatform('altar-platform', X(0.5), 170, 250, 'gold')

    const createSpikes = (
      x: number,
      y: number,
      spikeWidth: number,
    ) => {
      const heightValue = 16
      const visual = this.scene.add.container(x, y)

      if (this.scene.textures.exists('stairway-spike')) {
        const image = this.scene.add.image(
          0,
          -4,
          'stairway-spike',
        )
        image.setDisplaySize(spikeWidth, heightValue + 17)
        image.setAlpha(0.96)
        image.setTint(0xd4b27d)
        visual.add(image)
      } else {
        const graphics = this.scene.add.graphics()
        graphics.fillStyle(0x66534c, 1)
        graphics.lineStyle(1, 0xffd966, 0.55)

        const count = Math.max(2, Math.floor(spikeWidth / 14))
        const itemWidth = spikeWidth / count

        for (let i = 0; i < count; i += 1) {
          const left = -spikeWidth / 2 + i * itemWidth
          graphics.fillTriangle(
            left,
            heightValue,
            left + itemWidth / 2,
            0,
            left + itemWidth,
            heightValue,
          )
          graphics.strokeTriangle(
            left,
            heightValue,
            left + itemWidth / 2,
            0,
            left + itemWidth,
            heightValue,
          )
        }

        visual.add(graphics)
      }

      addWorld(visual)
      hazards.push({
        kind: 'spikes',
        x,
        y,
        width: spikeWidth,
        height: heightValue,
        baseX: x,
        baseY: y,
        amplitude: 0,
        speed: 0,
        phase: 0,
        active: true,
        visual,
      })
    }

    const createFlame = (
      x: number,
      y: number,
      flameLength: number,
      phase: number,
    ) => {
      const visual = this.scene.add.container(x, y)

      const ventStone = this.scene.add.rectangle(
        8,
        0,
        25,
        36,
        0xb78345,
        1,
      )
      ventStone.setStrokeStyle(2, 0xffd98b, 0.9)

      const ventInset = this.scene.add.rectangle(
        4,
        0,
        14,
        24,
        0x4c2a13,
        1,
      )
      ventInset.setStrokeStyle(2, 0x2aa7a1, 0.58)

      const ventMouth = this.scene.add.ellipse(
        -1,
        0,
        10,
        17,
        0x160b05,
        1,
      )

      if (
        this.scene.textures.exists('stairway-flame') &&
        !this.scene.anims.exists('stairway-flame-jet')
      ) {
        this.scene.anims.create({
          key: 'stairway-flame-jet',
          frames: this.scene.anims.generateFrameNumbers(
            'stairway-flame',
            {
              start: 0,
              end: 7,
            },
          ),
          frameRate: 14,
          repeat: -1,
        })
      }

      if (this.scene.textures.exists('stairway-flame')) {
        const flame = this.scene.add.sprite(
          -2,
          0,
          'stairway-flame',
          0,
        )
        flame.setName('flameSprite')
        flame.setOrigin(1, 0.5)
        flame.setDisplaySize(flameLength + 28, 52)
        flame.play('stairway-flame-jet')
        flame.anims.setProgress(
          Phaser.Math.Wrap(phase, 0, Math.PI * 2) /
            (Math.PI * 2),
        )

        const glow = this.scene.add.ellipse(
          -flameLength * 0.44,
          0,
          flameLength,
          34,
          0xff8a2e,
          0.11,
        )
        glow.setName('flameGlow')

        visual.add([
          glow,
          flame,
          ventStone,
          ventInset,
          ventMouth,
        ])
      } else {
        const flame = this.scene.add.ellipse(
          -flameLength / 2,
          0,
          flameLength,
          26,
          0xff7a24,
          0.9,
        )
        flame.setName('flameFallback')

        const core = this.scene.add.ellipse(
          -flameLength * 0.38,
          0,
          flameLength * 0.58,
          12,
          0xffef8f,
          0.96,
        )
        core.setName('flameCore')

        visual.add([
          flame,
          core,
          ventStone,
          ventInset,
          ventMouth,
        ])
      }

      addWorld(visual)

      hazards.push({
        kind: 'flame',
        x: x - flameLength * 0.42,
        y,
        width: flameLength * 0.78,
        height: 25,
        baseX: x - flameLength * 0.42,
        baseY: y,
        amplitude: 0,
        speed: 1.7,
        phase,
        active: false,
        visual,
      })
    }

    const createRock = (
      x: number,
      startY: number,
      travelDistance: number,
      speed: number,
      phase: number,
    ) => {
      const visual = this.scene.add.container(x, startY)

      if (this.scene.textures.exists('stairway-falling-rock')) {
        const image = this.scene.add.image(
          0,
          0,
          'stairway-falling-rock',
        )
        image.setDisplaySize(42, 42)
        image.setAlpha(0.95)
        image.setTint(0xc6a27a)
        visual.add(image)
      } else {
        const rock = this.scene.add.circle(
          0,
          0,
          18,
          0x6f4a2d,
          1,
        )
        rock.setStrokeStyle(3, 0x2d1b11, 1)
        const crack = this.scene.add.text(0, 0, '✦', {
          fontFamily: 'Georgia',
          fontSize: '14px',
          color: '#b98a50',
        })
        crack.setOrigin(0.5)
        visual.add([rock, crack])
      }

      addWorld(visual)
      hazards.push({
        kind: 'rock',
        x,
        y: startY,
        width: 34,
        height: 34,
        baseX: x,
        baseY: startY,
        amplitude: travelDistance,
        speed,
        phase,
        active: true,
        visual,
      })
    }

    const createGuardian = (
      x: number,
      y: number,
      guardianWidth: number,
      amplitude: number,
      speed: number,
      phase: number,
    ) => {
      const visual = this.scene.add.container(x, y)

      if (this.scene.textures.exists('stairway-guardian')) {
        const image = this.scene.add.image(
          0,
          0,
          'stairway-guardian',
        )
        image.setDisplaySize(
          guardianWidth * 1.08,
          guardianWidth * 0.98,
        )
        image.setAlpha(0.94)
        image.setTint(0xd3b081)
        visual.add(image)
      } else {
        const disk = this.scene.add.circle(
          0,
          0,
          guardianWidth / 2,
          0x1c2528,
          1,
        )
        disk.setStrokeStyle(3, 0xd4af37, 0.95)

        const symbol = this.scene.add.text(
          0,
          -1,
          '𓃢',
          {
            fontFamily: 'Georgia',
            fontSize: `${Math.round(guardianWidth * 0.62)}px`,
            color: '#56bdb5',
            stroke: '#000000',
            strokeThickness: 4,
          },
        )
        symbol.setOrigin(0.5)
        visual.add([disk, symbol])
      }

      addWorld(visual)
      hazards.push({
        kind: 'guardian',
        x,
        y,
        width: guardianWidth,
        height: guardianWidth * 0.8,
        baseX: x,
        baseY: y,
        amplitude,
        speed,
        phase,
        active: true,
        visual,
      })
    }

    const createBeam = (
      x: number,
      y: number,
      beamHeight: number,
      phase: number,
    ) => {
      const visual = this.scene.add.container(x, y)

      const warningBase = this.scene.add.ellipse(
        0,
        beamHeight - 2,
        38,
        9,
        0xffd966,
        0.12,
      )
      warningBase.setStrokeStyle(1, 0xfff3b2, 0.28)

      if (this.scene.textures.exists('stairway-sun-beam')) {
        const image = this.scene.add.image(
          0,
          beamHeight / 2,
          'stairway-sun-beam',
        )
        image.setName('sunBeamSprite')
        image.setDisplaySize(76, beamHeight + 18)
        image.setAlpha(0.78)
        image.clearTint()
        visual.add([warningBase, image])
      } else {
        const beam = this.scene.add.rectangle(
          0,
          beamHeight / 2,
          18,
          beamHeight,
          0xfff09a,
          0.72,
        )
        beam.setStrokeStyle(2, 0xffffff, 0.72)

        const core = this.scene.add.rectangle(
          0,
          beamHeight / 2,
          5,
          beamHeight,
          0xffffff,
          0.88,
        )
        visual.add([warningBase, beam, core])
      }

      addWorld(visual)

      hazards.push({
        kind: 'beam',
        x,
        y,
        width: 18,
        height: beamHeight,
        baseX: x,
        baseY: y,
        amplitude: 0,
        speed: 1.55,
        phase,
        active: false,
        visual,
      })
    }

    const createBlade = (
      x: number,
      y: number,
      amplitude: number,
      speed: number,
      phase: number,
    ) => {
      const visual = this.scene.add.container(x, y)

      if (this.scene.textures.exists('stairway-swinging-blade')) {
        const image = this.scene.add.image(
          0,
          -13,
          'stairway-swinging-blade',
        )
        image.setDisplaySize(57, 74)
        image.setAlpha(0.94)
        image.setTint(0xd2ab79)
        visual.add(image)
      } else {
        const chain = this.scene.add.rectangle(
          0,
          -33,
          3,
          62,
          0xd4af37,
          0.68,
        )

        const dangerGlow = this.scene.add.circle(
          0,
          0,
          26,
          0xff6b42,
          0.08,
        )
        const blade = this.scene.add.triangle(
          0,
          0,
          -24,
          -10,
          0,
          21,
          24,
          -10,
          0x8f9699,
          1,
        )
        blade.setStrokeStyle(3, 0xffd966, 0.9)
        visual.add([chain, dangerGlow, blade])
      }

      addWorld(visual)

      hazards.push({
        kind: 'blade',
        x,
        y,
        width: 34,
        height: 25,
        baseX: x,
        baseY: y,
        amplitude,
        speed,
        phase,
        active: true,
        visual,
      })
    }

    // Leave a safe starting lane and keep hazards off checkpoint centers.
    createSpikes(X(0.76), 2485, Math.min(76, worldWidth * 0.12))
    createSpikes(X(0.91), 1645, Math.min(58, worldWidth * 0.095))
    createSpikes(X(0.73), 470, Math.min(54, worldWidth * 0.085))

    createFlame(worldWidth - 10, 2218, 112, 0)
    createFlame(worldWidth - 10, 1508, 104, 1.8)
    createFlame(worldWidth - 10, 808, 96, 0.9)
    createFlame(worldWidth - 10, 238, 88, 2.4)

    createRock(X(0.32), 1840, 300, 78, 0)
    createRock(X(0.18), 610, 250, 96, 1.4)

    createGuardian(
      X(0.5),
      1730,
      48,
      Math.min(155, worldWidth * 0.25),
      1.5,
      0,
    )
    createGuardian(
      X(0.5),
      690,
      50,
      Math.min(170, worldWidth * 0.27),
      1.72,
      2.1,
    )

    createBeam(X(0.39), 1185, 170, 0.4)
    createBeam(X(0.70), 360, 155, 2.3)

    createBlade(
      X(0.79),
      2075,
      Math.min(54, worldWidth * 0.09),
      0.92,
      0.8,
    )
    createBlade(
      X(0.80),
      1010,
      Math.min(58, worldWidth * 0.095),
      0.98,
      2.4,
    )

    const createFragment = (
      name: string,
      x: number,
      y: number,
      phase: number,
    ) => {
      const visual = this.scene.add.container(x, y)

      const glow = this.scene.add.circle(
        0,
        0,
        31,
        0xffd966,
        0.22,
      )
      glow.setStrokeStyle(2, 0xffef9a, 0.68)

      const label = this.scene.add.text(
        0,
        -39,
        'LIGHT',
        {
          fontFamily: 'Georgia',
          fontSize: '10px',
          color: '#fff1a8',
          stroke: '#000000',
          strokeThickness: 3,
          fontStyle: 'bold',
        },
      )
      label.setOrigin(0.5)

      const pointer = this.scene.add.triangle(
        0,
        -28,
        -5,
        -4,
        5,
        -4,
        0,
        3,
        0xffd966,
        1,
      )

      if (this.scene.textures.exists('stairway-light-fragment')) {
        const image = this.scene.add.image(
          0,
          0,
          'stairway-light-fragment',
        )
        image.setDisplaySize(52, 52)
        visual.add([glow, image, label, pointer])
      } else {
        const diamond = this.scene.add.polygon(
          0,
          0,
          [
            0, -18,
            13, 0,
            0, 18,
            -13, 0,
          ],
          0xffec85,
          1,
        )
        diamond.setStrokeStyle(3, 0x2aa7a1, 1)
        visual.add([glow, diamond, label, pointer])
      }

      addWorld(visual, fxLayer)

      fragments.push({
        name,
        x,
        y,
        baseY: y,
        collected: false,
        phase,
        visual,
      })
    }

    createFragment('Courage', X(0.15), 1858, 0)
    createFragment('Wisdom', X(0.82), 1028, 1.7)
    createFragment('Balance', X(0.27), 228, 3.1)

    const createCheckpoint = (
      index: number,
      x: number,
      y: number,
    ) => {
      const visual = this.scene.add.container(x, y)

      const glow = this.scene.add.circle(
        0,
        0,
        38,
        0x7cff9b,
        0.16,
      )
      glow.setStrokeStyle(2, 0xffd966, 0.56)

      const label = this.scene.add.text(
        0,
        -54,
        'CHECKPOINT',
        {
          fontFamily: 'Georgia',
          fontSize: '9px',
          color: '#91ffac',
          stroke: '#000000',
          strokeThickness: 3,
          fontStyle: 'bold',
        },
      )
      label.setName('checkpointLabel')
      label.setOrigin(0.5)

      const arrow = this.scene.add.triangle(
        0,
        -42,
        -5,
        -4,
        5,
        -4,
        0,
        4,
        0x91ffac,
        1,
      )

      if (this.scene.textures.exists('stairway-checkpoint')) {
        const image = this.scene.add.image(
          0,
          2,
          'stairway-checkpoint',
        )
        image.setDisplaySize(67, 78)
        visual.add([glow, image, label, arrow])
      } else {
        const ring = this.scene.add.circle(
          0,
          0,
          21,
          0x000000,
          0,
        )
        ring.setStrokeStyle(4, 0x4de0d2, 0.9)

        const symbol = this.scene.add.text(
          0,
          -1,
          '𓋹',
          {
            fontFamily: 'Georgia',
            fontSize: '25px',
            color: '#ffd966',
            stroke: '#000000',
            strokeThickness: 4,
          },
        )
        symbol.setOrigin(0.5)
        visual.add([glow, ring, symbol, label, arrow])
      }

      addWorld(visual, fxLayer)

      checkpoints.push({
        index,
        x,
        y,
        spawnX: x,
        spawnY: y - 46,
        activated: false,
        visual,
      })
    }

    createCheckpoint(1, X(0.56), 1977)
    createCheckpoint(2, X(0.67), 1387)
    createCheckpoint(3, X(0.58), 797)

    const altarX = X(0.5)
    const altarY = 112
    const altar = this.scene.add.container(altarX, altarY)

    const altarGlow = this.scene.add.circle(
      0,
      0,
      78,
      0xffef9a,
      0.16,
    )

    if (this.scene.textures.exists('stairway-sun-altar')) {
      const image = this.scene.add.image(
        0,
        0,
        'stairway-sun-altar',
      )
      image.setDisplaySize(150, 120)
      altar.add([altarGlow, image])
    } else {
      const disk = this.scene.add.circle(
        0,
        0,
        52,
        0xffc94f,
        1,
      )
      disk.setStrokeStyle(5, 0xfff3b2, 1)

      const symbol = this.scene.add.text(
        0,
        -2,
        '☀',
        {
          fontFamily: 'Georgia',
          fontSize: '58px',
          color: '#fff0a0',
          stroke: '#8b4e16',
          strokeThickness: 5,
          fontStyle: 'bold',
        },
      )
      symbol.setOrigin(0.5)
      altar.add([altarGlow, disk, symbol])
    }

    addWorld(altar, fxLayer)

    this.addTween({
      targets: altarGlow,
      scaleX: 1.24,
      scaleY: 1.24,
      alpha: 0.04,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    let playerX = X(0.5)

    // The visible top of a normal platform sits about 18 px above its
    // collision Y. Spawn directly on that top edge instead of inside it.
    const startingPlatformTop = groundPlatform.y - 18
    let playerY =
      startingPlatformTop - playerHalfHeight - 1

    let previousPlayerY = playerY
    let velocityX = 0
    let velocityY = 0
    let onGround = true
    let standingPlatform: Platform | undefined =
      groundPlatform
    let canAirDash = true
    let facing = 1
    let hearts = 3
    let collectedLights = 0
    let checkpointIndex = 0
    let respawnX = playerX
    let respawnY = playerY
    let cameraY = Phaser.Math.Clamp(
      playerY - viewportHeight * 0.67,
      0,
      worldHeight - viewportHeight,
    )
    let elapsedSeconds = 0
    let invulnerableUntil = 1.5
    let coyoteTime = 0
    let jumpBuffer = 0
    let state:
      | 'playing'
      | 'respawning'
      | 'enlightened'
      | 'failed' = 'playing'
    let completionDelivered = false

    const playerVisual = this.scene.add.container(playerX, playerY)
    let playerSprite: Phaser.GameObjects.Sprite | undefined

    const shadow = this.scene.add.ellipse(
      0,
      playerHalfHeight - 1,
      27,
      9,
      0x000000,
      0.32,
    )

    if (this.scene.textures.exists('player')) {
      playerSprite = this.scene.add.sprite(
        0,
        0,
        'player',
        0,
      )
      playerSprite.setDisplaySize(42, 42)
      playerVisual.add([shadow, playerSprite])
    } else {
      const body = this.scene.add.rectangle(
        0,
        3,
        18,
        25,
        0x2d8985,
        1,
      )
      body.setStrokeStyle(2, 0xffd966, 1)

      const head = this.scene.add.circle(
        0,
        -13,
        8,
        0xc89055,
        1,
      )
      head.setStrokeStyle(2, 0x5b3513, 1)

      const crown = this.scene.add.triangle(
        0,
        -24,
        -8,
        6,
        0,
        -7,
        8,
        6,
        0xffd966,
        1,
      )
      playerVisual.add([shadow, body, head, crown])
    }

    addWorld(playerVisual, gameplayLayer)

    const keyboard = this.scene.input.keyboard
    const keys = keyboard?.addKeys({
      leftA: Phaser.Input.Keyboard.KeyCodes.A,
      rightD: Phaser.Input.Keyboard.KeyCodes.D,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jumpSpace: Phaser.Input.Keyboard.KeyCodes.SPACE,
      jumpW: Phaser.Input.Keyboard.KeyCodes.W,
      jumpUp: Phaser.Input.Keyboard.KeyCodes.UP,
      dashShift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    }) as
      | Record<string, Phaser.Input.Keyboard.Key>
      | undefined

    keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    ])

    const overlapsRect = (
      ax: number,
      ay: number,
      aw: number,
      ah: number,
      bx: number,
      by: number,
      bw: number,
      bh: number,
    ) =>
      Math.abs(ax - bx) * 2 < aw + bw &&
      Math.abs(ay - by) * 2 < ah + bh

    const setStatus = (
      message: string,
      color = '#ffd966',
    ) => {
      status.setText(message)
      status.setColor(color)
    }

    const getZoneName = () => {
      if (playerY > 1700) return 'CHAMBER OF STONE'
      if (playerY > 760) return 'HEAVENS OF HORUS'
      return 'CROWN OF RA'
    }

    const updateHud = () => {
      const progress = Phaser.Math.Clamp(
        (worldHeight - playerY) /
          Math.max(1, worldHeight - altarY),
        0,
        1,
      )

      heartsHud.setValue(
        `${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}`,
      )
      heightHud.setValue(`${Math.round(progress * 100)}%`)
      heightHud.setProgress(progress)
      lightHud.setValue(`${collectedLights} / 3`)
      checkpointHud.setValue(`${checkpointIndex} / 3`)

      progressFill.setDisplaySize(
        4,
        Math.max(1, progressFillHeight * progress),
      )

      const markerY =
        viewportTop +
        viewportHeight -
        29 -
        progressFillHeight * progress
      progressMarker.setY(markerY)

      zoneBadge.setText(getZoneName())
    }

    const setPlayerPosition = (x: number, y: number) => {
      playerX = x
      playerY = y
      playerVisual.setPosition(x, y)
    }

    const respawnPlayer = () => {
      velocityX = 0
      velocityY = 0
      onGround = false
      standingPlatform = undefined
      canAirDash = true
      coyoteTime = 0
      jumpBuffer = 0
      invulnerableUntil = elapsedSeconds + 1.35
      setPlayerPosition(respawnX, respawnY)
      playerVisual.setAlpha(1)
      playerVisual.setScale(1)
      playerVisual.setAngle(0)
      state = 'playing'
      setStatus(
        'Rise again. Your latest checkpoint still shines.',
        '#7de0d3',
      )
      updateHud()
    }

    const finishTrial = (success: boolean) => {
      if (completionDelivered) return
      completionDelivered = true

      state = success ? 'enlightened' : 'failed'
      velocityX = 0
      velocityY = 0

      const heightBonus = Math.round(
        Phaser.Math.Clamp(
          (worldHeight - playerY) /
            Math.max(1, worldHeight - altarY),
          0,
          1,
        ) * 450,
      )
      const score =
        collectedLights * 350 +
        checkpointIndex * 180 +
        hearts * 140 +
        heightBonus

      const reward = this.baseReward(
        'stairway-sun',
        success,
        score,
      )

      this.complete(
        {
          trialId: 'stairway-sun',
          success,
          response: success
            ? 'You reached the light by rising after every fall. Courage, wisdom, and balance now burn together within you. The Temple recognizes your enlightenment.'
            : 'The ascent has ended for now. Enlightenment is not denied—it waits for the courage to rise again.',
          ...reward,
        },
        success ? 1500 : 950,
      )
    }

    const damagePlayer = (reason: string) => {
      if (
        state !== 'playing' ||
        elapsedSeconds < invulnerableUntil
      ) {
        return
      }

      state = 'respawning'
      hearts -= 1
      velocityX = 0
      velocityY = 0
      updateHud()

      setStatus(reason, '#ff7770')
      this.scene.cameras.main.shake(160, 0.004)

      this.addTween({
        targets: playerVisual,
        alpha: 0.1,
        scaleX: 0.55,
        scaleY: 0.55,
        angle: 95 * facing,
        duration: 360,
        ease: 'Sine.easeIn',
      })

      if (hearts <= 0) {
        this.schedule(650, () => finishTrial(false))
        return
      }

      this.schedule(680, respawnPlayer)
    }

    const activateCheckpoint = (checkpoint: Checkpoint) => {
      if (
        checkpoint.activated ||
        checkpoint.index <= checkpointIndex
      ) {
        return
      }

      checkpoint.activated = true
      checkpointIndex = checkpoint.index
      respawnX = checkpoint.spawnX
      respawnY = checkpoint.spawnY
      hearts = Math.min(3, hearts + 1)

      const checkpointLabel =
        checkpoint.visual.getByName(
          'checkpointLabel',
        ) as Phaser.GameObjects.Text | null
      checkpointLabel
        ?.setText('ACTIVE')
        .setColor('#fff3a4')

      const glow = this.scene.add.circle(
        checkpoint.x,
        checkpoint.y,
        48,
        0x72ffb0,
        0.24,
      )
      glow.setStrokeStyle(4, 0xffd966, 0.92)
      addWorld(glow, fxLayer)

      this.addTween({
        targets: glow,
        scaleX: 1.55,
        scaleY: 1.55,
        alpha: 0,
        duration: 850,
        ease: 'Sine.easeOut',
        onComplete: () => glow.destroy(),
      })

      this.addTween({
        targets: checkpoint.visual,
        scaleX: 1.26,
        scaleY: 1.26,
        duration: 220,
        yoyo: true,
        ease: 'Back.easeOut',
      })

      setStatus(
        `Checkpoint ${checkpoint.index} awakened.`,
        '#72ffb0',
      )
      updateHud()
    }

    const collectFragment = (fragment: LightFragment) => {
      if (fragment.collected) return

      fragment.collected = true
      collectedLights += 1

      this.addTween({
        targets: fragment.visual,
        y: fragment.visual.y - 32,
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0,
        duration: 620,
        ease: 'Sine.easeOut',
        onComplete: () => fragment.visual.setVisible(false),
      })

      const burst = this.scene.add.circle(
        fragment.x,
        fragment.y,
        36,
        0xffed8a,
        0.2,
      )
      burst.setStrokeStyle(4, 0x4de0d2, 0.92)
      addWorld(burst, fxLayer)

      this.addTween({
        targets: burst,
        scaleX: 1.7,
        scaleY: 1.7,
        alpha: 0,
        duration: 700,
        ease: 'Sine.easeOut',
        onComplete: () => burst.destroy(),
      })

      setStatus(
        `${fragment.name} awakened — Light ${collectedLights} of 3.`,
        '#fff09a',
      )
      updateHud()
    }

    const beginCrumble = (platform: Platform) => {
      if (
        platform.kind !== 'crumble' ||
        platform.crumbleStarted
      ) {
        return
      }

      platform.crumbleStarted = true

      this.addTween({
        targets: platform.visual,
        x: platform.visual.x + 2,
        duration: 70,
        yoyo: true,
        repeat: 5,
      })

      this.schedule(1250, () => {
        platform.collidable = false

        this.addTween({
          targets: platform.visual,
          alpha: 0,
          y: platform.visual.y + 24,
          duration: 280,
          ease: 'Sine.easeIn',
        })

        this.schedule(1900, () => {
          platform.collidable = true
          platform.crumbleStarted = false
          platform.visual.setPosition(platform.x, platform.y)
          platform.visual.setAlpha(1)
        })
      })
    }

    const resolvePlatformCollision = (
      platform: Platform,
      previousY: number,
    ) => {
      if (!platform.collidable) return false

      const platformLeft =
        platform.x - platform.width / 2
      const platformRight =
        platform.x + platform.width / 2
      const playerLeft = playerX - playerHalfWidth
      const playerRight = playerX + playerHalfWidth

      if (
        playerRight <= platformLeft + 3 ||
        playerLeft >= platformRight - 3
      ) {
        return false
      }

      const previousBottom = previousY + playerHalfHeight
      const currentBottom = playerY + playerHalfHeight
      const platformTop =
        platform.y + (platform.kind === 'cloud' ? -11 : -18)

      if (
        velocityY >= 0 &&
        previousBottom <= platformTop + 10 &&
        currentBottom >= platformTop - 2 &&
        currentBottom <= platformTop + platform.height + 15
      ) {
        playerY = platformTop - playerHalfHeight
        velocityY = 0
        onGround = true
        canAirDash = true
        standingPlatform = platform
        beginCrumble(platform)
        return true
      }

      return false
    }

    const updatePlatformMovement = () => {
      platforms.forEach((platform) => {
        const previousX = platform.x
        const previousY = platform.y

        if (platform.kind === 'moving-x') {
          platform.x =
            platform.baseX +
            Math.sin(
              elapsedSeconds * platform.speed + platform.phase,
            ) *
              platform.amplitude
        } else if (platform.kind === 'moving-y') {
          platform.y =
            platform.baseY +
            Math.sin(
              elapsedSeconds * platform.speed + platform.phase,
            ) *
              platform.amplitude
        }

        platform.deltaX = platform.x - previousX
        platform.deltaY = platform.y - previousY

        if (
          platform.kind === 'moving-x' ||
          platform.kind === 'moving-y'
        ) {
          platform.visual.setPosition(platform.x, platform.y)
        }

        if (
          onGround &&
          standingPlatform === platform &&
          platform.collidable
        ) {
          playerX += platform.deltaX
          playerY += platform.deltaY
        }
      })
    }

    const updateHazards = () => {
      hazards.forEach((hazard) => {
        if (hazard.kind === 'flame') {
          const cycle = Math.sin(
            elapsedSeconds * hazard.speed + hazard.phase,
          )
          const flicker = Math.sin(
            elapsedSeconds * 11 + hazard.phase * 3,
          )

          hazard.active = cycle > 0.52
          const warning = cycle > -0.18

          const strength = hazard.active
            ? 0.94 + flicker * 0.05
            : warning
              ? 0.36 + Math.max(0, flicker) * 0.08
              : 0.08

          const flame = hazard.visual.getByName(
            'flameSprite',
          ) as Phaser.GameObjects.Sprite | null
          const fallback = hazard.visual.getByName(
            'flameFallback',
          ) as Phaser.GameObjects.Ellipse | null
          const core = hazard.visual.getByName(
            'flameCore',
          ) as Phaser.GameObjects.Ellipse | null
          const glow = hazard.visual.getByName(
            'flameGlow',
          ) as Phaser.GameObjects.Ellipse | null

          flame
            ?.setScale(
              strength,
              0.92 + flicker * 0.04,
            )
            .setAlpha(
              hazard.active ? 1 : warning ? 0.74 : 0.34,
            )

          fallback
            ?.setScale(strength, 1)
            .setAlpha(
              hazard.active ? 0.92 : warning ? 0.62 : 0.18,
            )

          core
            ?.setScale(strength, 1)
            .setAlpha(
              hazard.active ? 1 : warning ? 0.74 : 0.22,
            )

          glow
            ?.setScale(strength, 1)
            .setAlpha(
              hazard.active ? 0.16 : warning ? 0.08 : 0.02,
            )

          return
        }

        if (hazard.kind === 'beam') {
          const cycle = Math.sin(
            elapsedSeconds * hazard.speed + hazard.phase,
          )
          const shimmer = Math.sin(
            elapsedSeconds * 7.5 + hazard.phase * 3,
          )

          hazard.active = cycle > 0.55
          const warning = cycle > 0.08

          const beamSprite =
            hazard.visual.getByName(
              'sunBeamSprite',
            ) as Phaser.GameObjects.Image | null

          beamSprite
            ?.setAlpha(
              hazard.active
                ? 0.8 + shimmer * 0.06
                : warning
                  ? 0.38 + shimmer * 0.03
                  : 0.1,
            )
            .setScale(
              1 + shimmer * 0.025,
              1,
            )

          hazard.visual.setAlpha(1)
          return
        }

        if (hazard.kind === 'rock') {
          const travelTime =
            ((elapsedSeconds * hazard.speed * 0.01 +
              hazard.phase) %
              1 +
              1) %
            1

          hazard.y =
            hazard.baseY + travelTime * hazard.amplitude
          hazard.visual.setPosition(hazard.x, hazard.y)
          hazard.visual.setAngle(
            hazard.visual.angle + hazard.speed * 0.04,
          )
          return
        }

        if (
          hazard.kind === 'guardian' ||
          hazard.kind === 'blade'
        ) {
          hazard.x =
            hazard.baseX +
            Math.sin(
              elapsedSeconds * hazard.speed + hazard.phase,
            ) *
              hazard.amplitude

          hazard.visual.setPosition(hazard.x, hazard.y)

          if (hazard.kind === 'blade') {
            hazard.visual.setAngle(
              Math.sin(
                elapsedSeconds * hazard.speed + hazard.phase,
              ) * 18,
            )
          }
        }
      })
    }

    const checkHazardCollisions = () => {
      if (
        state !== 'playing' ||
        elapsedSeconds < invulnerableUntil
      ) {
        return
      }

      for (const hazard of hazards) {
        if (!hazard.active) continue

        let hazardCenterY = hazard.y
        let hitboxWidth = hazard.width
        let hitboxHeight = hazard.height

        if (hazard.kind === 'spikes') {
          hazardCenterY = hazard.y + hazard.height * 0.7
          hitboxWidth *= 0.72
          hitboxHeight *= 0.52
        } else if (hazard.kind === 'flame') {
          hazardCenterY = hazard.y
          hitboxWidth *= 0.68
          hitboxHeight *= 0.68
        } else if (hazard.kind === 'rock') {
          hazardCenterY = hazard.y
          hitboxWidth *= 0.65
          hitboxHeight *= 0.65
        } else if (hazard.kind === 'guardian') {
          hazardCenterY = hazard.y
          hitboxWidth *= 0.62
          hitboxHeight *= 0.62
        } else if (hazard.kind === 'beam') {
          hazardCenterY = hazard.y + hazard.height / 2
          hitboxWidth *= 0.72
          hitboxHeight *= 0.86
        } else if (hazard.kind === 'blade') {
          hazardCenterY = hazard.y
          hitboxWidth *= 0.62
          hitboxHeight *= 0.62
        }

        if (
          overlapsRect(
            playerX,
            playerY,
            playerWidth,
            playerHeight,
            hazard.x,
            hazardCenterY,
            hitboxWidth,
            hitboxHeight,
          )
        ) {
          const reason =
            hazard.kind === 'spikes'
              ? 'The sacred spikes struck you.'
              : hazard.kind === 'flame'
                ? 'Ra’s flame forced you back.'
                : hazard.kind === 'rock'
                  ? 'A falling temple stone found its mark.'
                  : hazard.kind === 'guardian'
                    ? 'The guardian rejected your approach.'
                    : hazard.kind === 'beam'
                      ? 'The Sun Beam burned too brightly.'
                      : 'The swinging blade ended the climb.'

          damagePlayer(reason)
          return
        }
      }
    }

    const updatePlayerAnimation = (
      movingLeft: boolean,
      movingRight: boolean,
    ) => {
      if (!playerSprite) return

      if (movingLeft) {
        facing = -1
        playerSprite.setFlipX(false)
      } else if (movingRight) {
        facing = 1
        playerSprite.setFlipX(false)
      }

      if (!onGround) {
        playerSprite.stop()
        playerSprite.setFrame(
          facing < 0 ? 5 : 9,
        )
        return
      }

      const animationKey =
        facing < 0
          ? 'player-walk-left'
          : 'player-walk-right'

      if (
        Math.abs(velocityX) > 20 &&
        this.scene.anims.exists(animationKey)
      ) {
        playerSprite.play(animationKey, true)
      } else {
        playerSprite.stop()
        playerSprite.setFrame(
          facing < 0 ? 4 : 8,
        )
      }
    }

    const enlightenPlayer = () => {
      if (
        state !== 'playing' ||
        collectedLights < 3
      ) {
        return
      }

      state = 'enlightened'
      velocityX = 0
      velocityY = 0
      setStatus(
        'Courage, Wisdom, and Balance unite. The Sun recognizes you.',
        '#fff3a4',
      )

      const lightColumn = this.scene.add.rectangle(
        altarX,
        110,
        112,
        360,
        0xfff1a0,
        0.18,
      )
      lightColumn.setOrigin(0.5, 0)
      addWorld(lightColumn, fxLayer)

      const enlightenmentRing = this.scene.add.circle(
        playerX,
        playerY,
        32,
        0x7de0d3,
        0.24,
      )
      enlightenmentRing.setStrokeStyle(5, 0xffd966, 1)
      addWorld(enlightenmentRing, fxLayer)

      this.addTween({
        targets: enlightenmentRing,
        scaleX: 3.4,
        scaleY: 3.4,
        alpha: 0,
        duration: 1150,
        ease: 'Sine.easeOut',
      })

      this.addTween({
        targets: [playerVisual, altar],
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 640,
        yoyo: true,
        ease: 'Sine.easeInOut',
      })

      this.schedule(1450, () => finishTrial(true))
    }

    const gameStep = () => {
      if (
        state === 'failed' ||
        state === 'enlightened'
      ) {
        return
      }

      const deltaSeconds = 1 / 60
      elapsedSeconds += deltaSeconds

      updatePlatformMovement()
      updateHazards()

      fragments.forEach((fragment) => {
        if (fragment.collected) return

        fragment.visual.setY(
          fragment.baseY +
            Math.sin(
              elapsedSeconds * 2.1 + fragment.phase,
            ) * 7,
        )
        fragment.visual.setAngle(
          Math.sin(
            elapsedSeconds * 1.35 + fragment.phase,
          ) * 7,
        )
      })

      checkpoints.forEach((checkpoint) => {
        if (checkpoint.activated) return

        const glowScale =
          1 +
          Math.sin(
            elapsedSeconds * 2 + checkpoint.index,
          ) * 0.08
        checkpoint.visual.setScale(glowScale)
      })

      if (state === 'respawning') {
        worldContainer.setY(viewportTop - cameraY)
        return
      }

      const movingLeft =
        Boolean(keys?.leftA?.isDown) ||
        Boolean(keys?.leftArrow?.isDown)
      const movingRight =
        Boolean(keys?.rightD?.isDown) ||
        Boolean(keys?.rightArrow?.isDown)

      const jumpPressed =
        Boolean(
          keys?.jumpSpace &&
            Phaser.Input.Keyboard.JustDown(
              keys.jumpSpace,
            ),
        ) ||
        Boolean(
          keys?.jumpW &&
            Phaser.Input.Keyboard.JustDown(keys.jumpW),
        ) ||
        Boolean(
          keys?.jumpUp &&
            Phaser.Input.Keyboard.JustDown(keys.jumpUp),
        )

      const dashPressed = Boolean(
        keys?.dashShift &&
          Phaser.Input.Keyboard.JustDown(
            keys.dashShift,
          ),
      )

      if (jumpPressed) {
        jumpBuffer = 0.13
      } else {
        jumpBuffer = Math.max(
          0,
          jumpBuffer - deltaSeconds,
        )
      }

      if (onGround) {
        coyoteTime = 0.11
      } else {
        coyoteTime = Math.max(
          0,
          coyoteTime - deltaSeconds,
        )
      }

      const targetSpeed =
        (movingRight ? 1 : 0) -
        (movingLeft ? 1 : 0)

      const desiredVelocityX = targetSpeed * 210
      const acceleration = onGround ? 1450 : 920
      const difference =
        desiredVelocityX - velocityX
      const maximumChange =
        acceleration * deltaSeconds

      velocityX += Phaser.Math.Clamp(
        difference,
        -maximumChange,
        maximumChange,
      )

      if (
        targetSpeed === 0 &&
        onGround
      ) {
        velocityX *= 0.78
      }

      if (
        jumpBuffer > 0 &&
        coyoteTime > 0
      ) {
        velocityY = -610
        onGround = false
        standingPlatform = undefined
        coyoteTime = 0
        jumpBuffer = 0
        canAirDash = true
        setStatus(
          'Keep climbing. Each landing is another choice.',
          '#ffd966',
        )
      }

      if (
        dashPressed &&
        !onGround &&
        canAirDash
      ) {
        const dashDirection =
          targetSpeed !== 0 ? targetSpeed : facing

        velocityX = dashDirection * 390
        velocityY = Math.min(velocityY, -115)
        canAirDash = false

        const dashFlash = this.scene.add.ellipse(
          playerX - dashDirection * 18,
          playerY,
          44,
          18,
          0x7de0d3,
          0.32,
        )
        addWorld(dashFlash, fxLayer)

        this.addTween({
          targets: dashFlash,
          alpha: 0,
          scaleX: 1.8,
          duration: 260,
          onComplete: () => dashFlash.destroy(),
        })

        setStatus(
          'Air Dash used. Land to restore it.',
          '#7de0d3',
        )
      }

      previousPlayerY = playerY
      velocityY += 1240 * deltaSeconds
      velocityY = Math.min(velocityY, 720)

      playerX += velocityX * deltaSeconds
      playerY += velocityY * deltaSeconds

      playerX = Phaser.Math.Clamp(
        playerX,
        playerHalfWidth + 7,
        worldWidth - playerHalfWidth - 7,
      )

      onGround = false
      standingPlatform = undefined

      const sortedPlatforms = [...platforms].sort(
        (a, b) => a.y - b.y,
      )

      for (const platform of sortedPlatforms) {
        if (
          resolvePlatformCollision(
            platform,
            previousPlayerY,
          )
        ) {
          break
        }
      }

      setPlayerPosition(playerX, playerY)
      updatePlayerAnimation(movingLeft, movingRight)

      fragments.forEach((fragment) => {
        if (fragment.collected) return

        if (
          Phaser.Math.Distance.Between(
            playerX,
            playerY,
            fragment.x,
            fragment.y,
          ) <= 30
        ) {
          collectFragment(fragment)
        }
      })

      checkpoints.forEach((checkpoint) => {
        if (
          Phaser.Math.Distance.Between(
            playerX,
            playerY,
            checkpoint.x,
            checkpoint.y,
          ) <= 34
        ) {
          activateCheckpoint(checkpoint)
        }
      })

      checkHazardCollisions()

      if (
        state === 'playing' &&
        playerY > worldHeight + 70
      ) {
        damagePlayer(
          'You fell into the darkness below.',
        )
      }

      const reachedAltar =
        playerY <= 175 &&
        Math.abs(playerX - altarX) <= 94

      if (reachedAltar) {
        if (collectedLights >= 3) {
          enlightenPlayer()
        } else {
          setStatus(
            `The altar needs all three Light Fragments. ${3 - collectedLights} remain.`,
            '#ffbd63',
          )
        }
      }

      const desiredCameraY = Phaser.Math.Clamp(
        playerY - viewportHeight * 0.67,
        0,
        worldHeight - viewportHeight,
      )

      cameraY = Phaser.Math.Linear(
        cameraY,
        desiredCameraY,
        0.105,
      )

      worldContainer.setY(viewportTop - cameraY)
      updateHud()
    }

    const gameTimer = this.addLoop(16, gameStep)

    this.runtimeCleanups.push(() => {
      gameTimer.remove(false)
      keyboard?.removeCapture([
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.SHIFT,
      ])
    })

    worldContainer.setY(viewportTop - cameraY)
    updateHud()
  }
}