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
  // 1. GATE OF TRUTH
  // ---------------------------------------------------------------------------
  private createGateOfTruth() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    type TruthRound = {
      title: string
      imageKey: string
      watchLine: string
      question: string
      tablets: [string, string, string]
      correctIndex: number
      truthReaction: string
    }

    const rounds: TruthRound[] = [
      {
        title: 'Round 1 — The Golden Scarab',
        imageKey: 'temple-truth-round-1',
        watchLine: 'Look for the candles, vases, statues, chest, and golden scarab.',
        question: 'Which tablet tells the truth?',
        tablets: [
          'There are three burning candles.',
          'The blue vase is on the right side.',
          'There are no jackal statues.',
        ],
        correctIndex: 0,
        truthReaction: 'Correct. Three candles were burning in the chamber.',
      },
      {
        title: 'Round 2 — The Twin Scarabs',
        imageKey: 'temple-truth-round-2',
        watchLine: 'Look for the two floor scarabs, the jars, and the wall torches.',
        question: 'Which tablet tells the truth?',
        tablets: [
          'Two golden scarabs sit on the floor.',
          'The green jar is on the left side.',
          'There are no stone tablets on the wall.',
        ],
        correctIndex: 0,
        truthReaction: 'Correct. Two golden scarabs were on the floor.',
      },
      {
        title: 'Round 3 — The Bowl of Light',
        imageKey: 'temple-truth-round-3',
        watchLine: 'Look for the cat statue, coin stack, blue vase, and golden bowl.',
        question: 'Choose the true tablet.',
        tablets: [
          'A black cat statue is near the front right.',
          'The coin stack is on the left side.',
          'The blue vase is on the right side.',
        ],
        correctIndex: 0,
        truthReaction: 'Correct. The black cat statue guarded the front-right step.',
      },
      {
        title: 'Round 4 — The Eye Floor',
        imageKey: 'temple-truth-round-4',
        watchLine: 'Look for the chest, purple vase, fire bowls, and Eye symbol.',
        question: 'Which statement is true?',
        tablets: [
          'The treasure chest is on the left side.',
          'The purple vase is on the left side.',
          'There are no fire bowls in the chamber.',
        ],
        correctIndex: 0,
        truthReaction: 'Correct. The treasure chest was on the left side.',
      },
      {
        title: 'Round 5 — Final Judgment',
        imageKey: 'temple-truth-round-5',
        watchLine: 'Final round. Remember the red vase, blue vase, chest, and scarabs.',
        question: 'Only one tablet is true. Which one?',
        tablets: [
          'The red vase is on the left side.',
          'The blue vase is on the left side.',
          'There are no scarabs on the floor.',
        ],
        correctIndex: 0,
        truthReaction: 'Correct. The red vase was on the left side.',
      },
    ]

    this.addTitle(TRIAL_TITLES['truth-gate'])
    this.addInstruction(
      'Observe the chamber for 8 seconds. Then the image will disappear and three stone tablets will appear.',
      top + 86,
    )

    let roundIndex = 0
    let hearts = 3
    let score = 0
    let answerButtons: ButtonHandle[] = []
    let phaseObjects: Phaser.GameObjects.GameObject[] = []
    let countdownTimer: Phaser.Time.TimerEvent | undefined

    const hud = this.addStatusText('', top + 121)

    const titleY = top + 151
    const visualTop = top + 180
    const buttonHeight = 72
    const buttonY = bottom - 76
    const buttonTop = buttonY - buttonHeight / 2
    const statusY = buttonTop - 20

    // Observation hint goes in the empty bottom area BELOW the image frame.
    // It should never cover the chamber image.
    const captionY = buttonY
    const imageBottom = statusY - 20
    const imageWidth = this.panelWidth - 72
    const imageHeight = Math.max(236, imageBottom - visualTop)
    const imageX = width / 2
    const imageY = visualTop + imageHeight / 2

    const imageFrame = this.scene.add.rectangle(
      imageX,
      imageY,
      imageWidth + 10,
      imageHeight + 10,
      0x0f0802,
      1,
    )
    imageFrame.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(imageFrame)

    const status = this.addStatusText('', statusY, '#ffd966')

    const addPhaseObject = <T extends Phaser.GameObjects.GameObject>(object: T) => {
      this.addObject(object)
      phaseObjects.push(object)
      return object
    }

    const destroyPhaseObjects = () => {
      countdownTimer?.remove(false)
      countdownTimer = undefined

      answerButtons.forEach((button) => button.destroy())
      answerButtons = []

      phaseObjects.forEach((object) => {
        if (object.active) object.destroy()
      })
      phaseObjects = []
    }

    const setHud = () => {
      hud.setText(
        `ROUND ${roundIndex + 1} / ${rounds.length}     HEARTS ${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}     SCORE ${score}`,
      )
    }

    const createLargeObservationImage = (round: TruthRound) => {
      const hasTexture = this.scene.textures.exists(round.imageKey)

      if (!hasTexture) {
        const fallback = addPhaseObject(
          this.scene.add.rectangle(imageX, imageY, imageWidth, imageHeight, 0x241507, 1),
        )
        fallback.setStrokeStyle(2, 0x8f5b20, 1)

        const fallbackText = addPhaseObject(
          this.scene.add.text(imageX, imageY, `Missing image asset\n${round.imageKey}`, {
            fontFamily: 'Georgia',
            fontSize: '18px',
            color: '#ffd966',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
          }),
        )
        fallbackText.setOrigin(0.5)
        return
      }

      const image = addPhaseObject(this.scene.add.image(imageX, imageY, round.imageKey))
      const source = this.scene.textures.get(round.imageKey).getSourceImage() as HTMLImageElement
      const sourceWidth = source.width || image.width || 1
      const sourceHeight = source.height || image.height || 1
      const scale = Math.min(imageWidth / sourceWidth, imageHeight / sourceHeight)

      image.setDisplaySize(sourceWidth * scale, sourceHeight * scale)

      // Keep the hint BELOW the image, not on top of it.
      const captionBg = addPhaseObject(
        this.scene.add.rectangle(
          imageX,
          captionY,
          imageWidth - 36,
          34,
          0x120a04,
          0.92,
        ),
      )
      captionBg.setStrokeStyle(2, 0xd4af37, 0.75)

      const caption = addPhaseObject(
        this.scene.add.text(imageX, captionY, round.watchLine, {
          fontFamily: 'Georgia',
          fontSize: '14px',
          color: '#fff7cf',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: imageWidth - 78, useAdvancedWrap: true },
        }),
      )
      caption.setOrigin(0.5)
    }

    const showObservation = () => {
      destroyPhaseObjects()
      setHud()

      const round = rounds[roundIndex]
      status.setText('OBSERVE CAREFULLY...')
      status.setColor('#ffd966')

      const roundTitle = addPhaseObject(
        this.scene.add.text(imageX, titleY, round.title, {
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

      createLargeObservationImage(round)

      const countdownBg = addPhaseObject(
        this.scene.add.circle(
          imageX + imageWidth / 2 - 42,
          imageY - imageHeight / 2 + 42,
          28,
          0x120a04,
          0.9,
        ),
      )
      countdownBg.setStrokeStyle(3, 0xffd966, 0.95)

      const countdownText = addPhaseObject(
        this.scene.add.text(countdownBg.x, countdownBg.y, '8', {
          fontFamily: 'Georgia',
          fontSize: '28px',
          color: '#fff7cf',
          stroke: '#000000',
          strokeThickness: 5,
          fontStyle: 'bold',
        }),
      )
      countdownText.setOrigin(0.5)

      this.addTween({
        targets: countdownBg,
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: 0.72,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      let secondsLeft = 8

      countdownTimer = this.addLoop(1000, () => {
        secondsLeft -= 1
        countdownText.setText(String(Math.max(0, secondsLeft)))

        this.addTween({
          targets: countdownText,
          scaleX: 1.25,
          scaleY: 1.25,
          duration: 130,
          yoyo: true,
          ease: 'Sine.easeOut',
        })

        if (secondsLeft <= 0) {
          countdownTimer?.remove(false)
          countdownTimer = undefined
          showQuestion()
        }
      })
    }

    const showQuestion = () => {
      // Fully remove the observation image before showing answers.
      destroyPhaseObjects()
      setHud()

      const round = rounds[roundIndex]

      const roundTitle = addPhaseObject(
        this.scene.add.text(imageX, titleY, round.title, {
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

      const questionPanel = addPhaseObject(
        this.scene.add.rectangle(imageX, imageY, imageWidth, imageHeight, 0x120a04, 0.98),
      )
      questionPanel.setStrokeStyle(3, 0xd4af37, 1)

      const hiddenIcon = addPhaseObject(
        this.scene.add.text(imageX, imageY - 62, '𓂀', {
          fontFamily: 'Georgia',
          fontSize: '46px',
          color: '#ffd966',
          stroke: '#000000',
          strokeThickness: 6,
          fontStyle: 'bold',
        }),
      )
      hiddenIcon.setOrigin(0.5)

      const question = addPhaseObject(
        this.scene.add.text(imageX, imageY - 8, round.question, {
          fontFamily: 'Georgia',
          fontSize: '21px',
          color: '#ffe7a3',
          stroke: '#000000',
          strokeThickness: 5,
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: imageWidth - 90, useAdvancedWrap: true },
        }),
      )
      question.setOrigin(0.5)

      const hint = addPhaseObject(
        this.scene.add.text(imageX, imageY + 58, 'The chamber is hidden. Choose the one true memory.', {
          fontFamily: 'Georgia',
          fontSize: '15px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center',
          wordWrap: { width: imageWidth - 90, useAdvancedWrap: true },
        }),
      )
      hint.setOrigin(0.5)

      this.addTween({
        targets: [hiddenIcon, question, hint],
        alpha: { from: 0, to: 1 },
        y: '-=6',
        duration: 320,
        ease: 'Sine.easeOut',
      })

      status.setText('Choose the truthful tablet.')
      status.setColor('#ffd966')

      const gap = 10
      const buttonWidth = Math.min(215, (this.panelWidth - 94 - gap * 2) / 3)
      const xs = [
        width / 2 - buttonWidth - gap,
        width / 2,
        width / 2 + buttonWidth + gap,
      ]

      answerButtons = round.tablets.map((label, index) =>
        this.createButton({
          x: xs[index],
          y: buttonY,
          width: buttonWidth,
          height: buttonHeight,
          label,
          fontSize: 12,
          color: 0x4d2d10,
          onClick: () => choose(index),
        }),
      )
    }

    const choose = (index: number) => {
      const round = rounds[roundIndex]
      answerButtons.forEach((button) => button.setEnabled(false))

      if (index === round.correctIndex) {
        score += 120 + roundIndex * 35
        status.setText(round.truthReaction)
        status.setColor('#72ff9b')
        this.scene.cameras.main.shake(80, 0.0012)

        if (roundIndex >= rounds.length - 1) {
          const reward = this.baseReward('truth-gate', true, score)
          this.complete(
            {
              trialId: 'truth-gate',
              success: true,
              response:
                'You saw truth through noise and lies. A ruler must observe before judging, and remember before choosing.',
              ...reward,
            },
            1050,
          )
          return
        }

        roundIndex += 1
        this.schedule(1150, showObservation)
        return
      }

      hearts -= 1
      status.setText('That tablet lied. The chamber rejects careless judgment.')
      status.setColor('#ff7770')
      setHud()
      this.scene.cameras.main.shake(170, 0.004)

      if (hearts <= 0) {
        const reward = this.baseReward('truth-gate', false, score)
        this.complete(
          {
            trialId: 'truth-gate',
            success: false,
            response:
              'The temple does not punish mistakes. It punishes blindness. Observe again and return sharper.',
            ...reward,
          },
          1000,
        )
        return
      }

      this.schedule(1050, showObservation)
    }

    showObservation()
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
        cover: 0,
        shield: 0,
        bell: 0,
        oil: 0,
        raise: 0,
        fail: 0,
        success: 0,
      }

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
      create('candle-player-cover', 8, 11, 7, 0)
      create('candle-player-shield', 12, 15, 7, 0)
      create('candle-player-bell', 16, 19, 7, 0)
      create('candle-player-oil', 20, 23, 7, 0)
      create('candle-player-raise', 24, 27, 6, 0)
      create('candle-player-fail', 28, 31, 8, 0)
      create('candle-player-success', 32, 35, 5, 0)
    }

    ensureCandlePlayerAnimations()

    this.addTitle(TRIAL_TITLES['candle-of-ra'])
    this.addInstruction(
      'Protect the sacred candle through 5 checkpoints. Choose the right action before time runs out.',
      top + 86,
    )

    const contentTop = top + 126
    const gameplayWidth = this.panelWidth - 72
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
    const timerBarWidth = 126
    const timerX = gameplayX + gameplayWidth / 2 - 92
    const timerY = gameplayY - gameplayHeight / 2 + 28

    let phase: CandlePhase = 'walking'
    let checkpointIndex = 0
    let hearts = 3
    let score = 0
    let remainingMs = 0
    let choiceTimer: Phaser.Time.TimerEvent | undefined
    let currentObstacle: Phaser.GameObjects.Image | Phaser.GameObjects.Text | undefined
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
      pathY + 24,
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
      const container = this.scene.add.container(x, pathY + 24)
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

    const timerPanel = this.scene.add.rectangle(timerX, timerY, 154, 46, 0x000000, 0.58)
    timerPanel.setStrokeStyle(2, 0xd4af37, 0.85)
    this.addObject(timerPanel)

    const timerText = this.scene.add.text(timerX, timerY - 11, '', {
      fontFamily: 'Georgia',
      fontSize: '15px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
      align: 'center',
    })
    timerText.setOrigin(0.5)
    this.addObject(timerText)

    const timerBg = this.scene.add.rectangle(timerX, timerY + 13, timerBarWidth, 10, 0x000000, 0.72)
    timerBg.setStrokeStyle(1, 0xffffff, 0.45)
    this.addObject(timerBg)

    const timerFill = this.scene.add.rectangle(
      timerX - timerBarWidth / 2,
      timerY + 13,
      timerBarWidth,
      10,
      0xffd966,
      0.95,
    )
    timerFill.setOrigin(0, 0.5)
    this.addObject(timerFill)

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

    const status = this.scene.add.text(
      gameplayX - gameplayWidth / 2 + 18,
      gameplayY - gameplayHeight / 2 + 24,
      '',
      {
        fontFamily: 'Georgia',
        fontSize: '15px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
        align: 'left',
        wordWrap: { width: gameplayWidth - 190, useAdvancedWrap: true },
      },
    )
    status.setOrigin(0, 0.5)
    this.addObject(status)

    const gameplayMessage = this.scene.add.text(
      gameplayX - gameplayWidth / 2 + 18,
      stageTop + 56,
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
      status.setText(
        `CHECKPOINT ${checkpointIndex + 1} / ${checkpoints.length}     FLAME ${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}     SCORE ${score}`,
      )
    }

    const updateTimer = () => {
      const maxMs = 12000
      const ratio = Phaser.Math.Clamp(remainingMs / maxMs, 0, 1)
      timerText.setText(phase === 'awaiting' ? `${Math.ceil(remainingMs / 1000)}s` : '')
      timerFill.displayWidth = timerBarWidth * ratio
      timerFill.setFillStyle(ratio <= 0.25 ? 0xff7770 : 0xffd966, 0.95)
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
      const obstacleX = checkpoint.id === 'altar' ? checkpointXs[checkpointIndex] + 56 : playerGroup.x + 84
      const obstacleY = checkpoint.id === 'altar' ? playerY - 10 : playerY - 52

      if (key) {
        const obstacle = this.scene.add.image(obstacleX, obstacleY, key)
        const size = checkpoint.id === 'altar' ? 124 : checkpoint.id === 'ghost' ? 100 : 92
        obstacle.setDisplaySize(size, size)
        obstacle.setAlpha(0.92)
        this.addObject(obstacle)
        currentObstacle = obstacle

        this.addTween({
          targets: obstacle,
          y: obstacle.y - 8,
          alpha: checkpoint.id === 'altar' ? 1 : 0.65,
          duration: 560,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      } else {
        const fallback =
          checkpoint.id === 'wind'
            ? '〰'
            : checkpoint.id === 'dust'
              ? '☁'
              : checkpoint.id === 'ghost'
                ? '☠'
                : checkpoint.id === 'weak'
                  ? '◔'
                  : '☀'

        const obstacle = this.scene.add.text(obstacleX, obstacleY, fallback, {
          fontFamily: 'Georgia',
          fontSize: '54px',
          color: '#ffe7a3',
          stroke: '#000000',
          strokeThickness: 6,
          fontStyle: 'bold',
        })
        obstacle.setOrigin(0.5)
        this.addObject(obstacle)
        currentObstacle = obstacle
      }

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
      timerText.setText('')
      timerFill.displayWidth = 0

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
        showEffectAtPlayer(['candle-ra-fx-success-glow', 'candle-ra-fx-correct-sparkle'], '✦', true)
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
        showEffectAtPlayer(['candle-ra-fx-candle-saved', 'candle-ra-fx-correct-sparkle', 'candle-ra-fx-success-glow'], '✓', true)

        if (checkpoint.id === 'weak') {
          updateFlameFromHearts()
        }

        if (checkpoint.id === 'altar') {
          showEffectAtPlayer(['candle-ra-fx-success-glow', 'candle-ra-fx-correct-sparkle'], '☀', true)
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
        this.schedule(1250, () => playPlayerAnimation('candle-player-idle', true))
        this.schedule(1650, advanceAfterSuccess)
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

    this.addTitle(TRIAL_TITLES['glyph-memory'])
    this.addInstruction('Watch the glowing symbols. Repeat the sequence to awaken the wall.', top + 88)

    const symbols = ['☀', '𓂀', '𓆣', '𓅓', '𓋹']
    let round = 1
    let inputIndex = 0
    let sequence: string[] = []
    let score = 0
    let hearts = 3
    let buttons: ButtonHandle[] = []

    const wall = this.scene.add.rectangle(width / 2, top + 240, this.panelWidth - 100, 206, 0x221608, 1)
    wall.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(wall)

    const sequenceText = this.scene.add.text(width / 2, top + 218, '', {
      fontFamily: 'Georgia',
      fontSize: '38px',
      color: '#ffe7a3',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    })
    sequenceText.setOrigin(0.5)
    this.addObject(sequenceText)

    const status = this.addStatusText('', top + 354)
    const hud = this.addStatusText('', top + 128)

    const updateHud = () => {
      hud.setText(`ROUND ${round} / 5     HEARTS ${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}     SCORE ${score}`)
    }

    const destroyButtons = () => {
      buttons.forEach((button) => button.destroy())
      buttons = []
    }

    const showInput = () => {
      sequenceText.setText('Repeat the wall')
      status.setText(`Tap symbol ${inputIndex + 1} of ${sequence.length}`)
      destroyButtons()
      const gap = 10
      const buttonWidth = Math.min(88, (this.panelWidth - 110 - gap * (symbols.length - 1)) / symbols.length)
      const startX = width / 2 - ((buttonWidth + gap) * (symbols.length - 1)) / 2
      buttons = symbols.map((symbol, index) =>
        this.createButton({
          x: startX + index * (buttonWidth + gap),
          y: bottom - 88,
          width: buttonWidth,
          height: 60,
          label: symbol,
          fontSize: 24,
          onClick: () => choose(symbol),
        }),
      )
    }

    const startRound = () => {
      inputIndex = 0
      sequence = Array.from({ length: round + 1 }, () => Phaser.Utils.Array.GetRandom(symbols))
      updateHud()
      destroyButtons()
      status.setText('Memorize the glowing order.')
      sequenceText.setText(sequence.join('  →  '))
      this.schedule(1450 + round * 250, showInput)
    }

    const choose = (symbol: string) => {
      if (symbol === sequence[inputIndex]) {
        inputIndex += 1
        score += 40
        if (inputIndex >= sequence.length) {
          status.setText('Correct. The wall remembers you.')
          status.setColor('#72ff9b')
          if (round >= 5) {
            const reward = this.baseReward('glyph-memory', true, score)
            this.complete({
              trialId: 'glyph-memory',
              success: true,
              response: 'The ancient signs obey your memory. A ruler must remember what the walls have already taught.',
              ...reward,
            }, 850)
            return
          }
          round += 1
          this.schedule(900, () => {
            status.setColor('#ffd966')
            startRound()
          })
          return
        }
        status.setText(`Good. Tap symbol ${inputIndex + 1} of ${sequence.length}`)
        return
      }

      hearts -= 1
      status.setText('Wrong glyph. The chamber groans.')
      status.setColor('#ff7770')
      this.scene.cameras.main.shake(140, 0.004)
      if (hearts <= 0) {
        const reward = this.baseReward('glyph-memory', false, score)
        this.complete({
          trialId: 'glyph-memory',
          success: false,
          response: 'The symbols fade before the sequence is complete. Memory is a staircase; climb it again.',
          ...reward,
        }, 850)
        return
      }
      this.schedule(700, () => {
        status.setColor('#ffd966')
        startRound()
      })
    }

    startRound()
  }

  // ---------------------------------------------------------------------------
  // 4. TREASURY OF FALSE GOLD
  // ---------------------------------------------------------------------------
  private createFalseGold() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle(TRIAL_TITLES['false-gold'])
    this.addInstruction('Sort royal coins from counterfeits. Real coins have a clean sun stamp and balanced edge.', top + 88)

    type Coin = {
      clue: string
      real: boolean
    }

    const coins: Coin[] = Phaser.Utils.Array.Shuffle([
      { clue: 'Clean sun stamp, balanced edge, steady shine', real: true },
      { clue: 'Crooked sun stamp, chipped edge, too bright', real: false },
      { clue: 'Royal wing mark, even weight, warm gold', real: true },
      { clue: 'Wrong bird mark, light weight, green stain', real: false },
      { clue: 'Temple mint dot, smooth rim, soft shine', real: true },
      { clue: 'Double stamp, rough rim, suspicious glitter', real: false },
      { clue: 'Sun disk centered, scarab mark, balanced edge', real: true },
      { clue: 'Stamp upside down, cracked rim, hollow sound', real: false },
    ])

    let index = 0
    let correct = 0
    let mistakes = 0
    let score = 0

    const tray = this.scene.add.rectangle(width / 2, top + 245, this.panelWidth - 110, 214, 0x2b1908, 1)
    tray.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(tray)

    const coin = this.scene.add.circle(width / 2, top + 220, 44, 0xffd966, 1)
    coin.setStrokeStyle(5, 0x8b5a2b, 1)
    this.addObject(coin)

    const coinMark = this.scene.add.text(width / 2, top + 220, '☀', {
      fontFamily: 'Georgia',
      fontSize: '34px',
      color: '#74420d',
      fontStyle: 'bold',
    })
    coinMark.setOrigin(0.5)
    this.addObject(coinMark)

    const clueText = this.addStatusText('', top + 306)
    const hud = this.addStatusText('', top + 128)

    const render = () => {
      const current = coins[index]
      hud.setText(`COIN ${index + 1} / ${coins.length}     CORRECT ${correct}     MISTAKES ${mistakes} / 3`)
      clueText.setText(current.clue)
      coin.setFillStyle(current.real ? 0xffd966 : 0xd2b66a, 1)
      coinMark.setText(current.real ? '☀' : Phaser.Utils.Array.GetRandom(['?', '☾', '✕']))
    }

    const finish = () => {
      const success = correct >= 6 && mistakes < 3
      const reward = this.baseReward('false-gold', success, score)
      this.complete({
        trialId: 'false-gold',
        success,
        response: success
          ? 'You separated wealth from deception. A king must know that not everything shining deserves trust.'
          : 'Too many false coins entered the royal chest. Judgment must be sharper than greed.',
        ...reward,
      })
    }

    const sort = (realChoice: boolean) => {
      const current = coins[index]
      if (realChoice === current.real) {
        correct += 1
        score += 60
        clueText.setColor('#72ff9b')
      } else {
        mistakes += 1
        clueText.setColor('#ff7770')
        this.scene.cameras.main.shake(120, 0.003)
      }

      index += 1
      if (index >= coins.length || mistakes >= 3) {
        this.schedule(420, finish)
        return
      }

      this.schedule(420, () => {
        clueText.setColor('#ffd966')
        render()
      })
    }

    this.createButton({ x: width / 2 - 130, y: bottom - 82, width: 210, height: 58, label: 'ROYAL COIN', color: 0x27633a, onClick: () => sort(true) })
    this.createButton({ x: width / 2 + 130, y: bottom - 82, width: 210, height: 58, label: 'COUNTERFEIT', color: 0x7a2c22, onClick: () => sort(false) })

    render()
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
