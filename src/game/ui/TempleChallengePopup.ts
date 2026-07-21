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

    type Round = {
      title: string
      clues: string[]
      tablets: [string, string, string]
      correctIndex: number
    }

    const rounds: Round[] = [
      {
        title: 'The Golden Scarab',
        clues: ['1 golden scarab', '2 Anubis statues', '3 candles'],
        tablets: ['There are three Anubis statues.', 'The scarab is golden.', 'There are five candles.'],
        correctIndex: 1,
      },
      {
        title: 'The Candle Count',
        clues: ['4 candles', '1 blue vase', '2 cracked stones'],
        tablets: ['Four candles burn in this chamber.', 'The vase is red.', 'There are three cracked stones.'],
        correctIndex: 0,
      },
      {
        title: 'The Wall Sign',
        clues: ['Sun symbol on the left wall', 'Moon symbol on the right wall', 'Scarab tile in the center'],
        tablets: ['The sun is painted on the right wall.', 'The moon is painted on the left wall.', 'The scarab tile is in the center.'],
        correctIndex: 2,
      },
      {
        title: 'The Broken Vase',
        clues: ['Broken vase near the door', '1 torch is unlit', '2 gold bowls'],
        tablets: ['The broken vase was near the door.', 'Both torches were burning.', 'There are three gold bowls.'],
        correctIndex: 0,
      },
      {
        title: 'The Final Judgment',
        clues: ['2 jackal statues', '4 burning candles', '1 blue scarab'],
        tablets: ['Four candles are burning.', 'Three jackals guard the door.', 'The scarab is gold.'],
        correctIndex: 0,
      },
    ]

    this.addTitle(TRIAL_TITLES['truth-gate'])
    this.addInstruction('Observe the chamber. Three tablets speak. Only one tells the truth.', top + 88)

    let roundIndex = 0
    let hearts = 3
    let score = 0
    let buttons: ButtonHandle[] = []

    const hud = this.addStatusText('', top + 126)
    const chamber = this.scene.add.rectangle(width / 2, top + 226, this.panelWidth - 92, 172, 0x241507, 1)
    chamber.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(chamber)

    const clueTitle = this.scene.add.text(width / 2, top + 166, '', {
      fontFamily: 'Georgia',
      fontSize: '17px',
      color: '#ffe7a3',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
      align: 'center',
    })
    clueTitle.setOrigin(0.5)
    this.addObject(clueTitle)

    const clueText = this.scene.add.text(width / 2, top + 232, '', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      lineSpacing: 7,
      align: 'center',
      wordWrap: { width: this.panelWidth - 140 },
    })
    clueText.setOrigin(0.5)
    this.addObject(clueText)

    const status = this.addStatusText('Choose the truthful tablet.', bottom - 178, '#ffd966')

    const destroyButtons = () => {
      buttons.forEach((button) => button.destroy())
      buttons = []
    }

    const render = () => {
      destroyButtons()
      const round = rounds[roundIndex]
      hud.setText(`ROUND ${roundIndex + 1} / ${rounds.length}     HEARTS ${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}     SCORE ${score}`)
      clueTitle.setText(round.title)
      clueText.setText(round.clues.map((clue) => `◆ ${clue}`).join('\n'))
      status.setText('Choose the only truthful tablet.')
      status.setColor('#ffd966')

      const gap = 12
      const buttonWidth = Math.min(210, (this.panelWidth - 92 - gap * 2) / 3)
      const y = bottom - 100
      const xs = [width / 2 - buttonWidth - gap, width / 2, width / 2 + buttonWidth + gap]

      buttons = round.tablets.map((label, index) =>
        this.createButton({
          x: xs[index],
          y,
          width: buttonWidth,
          height: 88,
          label,
          fontSize: 12,
          onClick: () => choose(index),
        }),
      )
    }

    const choose = (index: number) => {
      const round = rounds[roundIndex]
      buttons.forEach((button) => button.setEnabled(false))

      if (index === round.correctIndex) {
        score += 100 + roundIndex * 20
        status.setText('Truth chosen. The gate glows wider.')
        status.setColor('#72ff9b')
        this.scene.cameras.main.shake(80, 0.001)
        if (roundIndex >= rounds.length - 1) {
          const reward = this.baseReward('truth-gate', true, score)
          this.complete({
            trialId: 'truth-gate',
            success: true,
            response: 'You saw truth through noise and lies. A ruler must see clearly before choosing power.',
            ...reward,
          }, 900)
          return
        }
        roundIndex += 1
        this.schedule(900, render)
        return
      }

      hearts -= 1
      status.setText('That tablet lied. The chamber shakes.')
      status.setColor('#ff7770')
      this.scene.cameras.main.shake(160, 0.004)
      hud.setText(`ROUND ${roundIndex + 1} / ${rounds.length}     HEARTS ${'♥'.repeat(hearts)}${'♡'.repeat(3 - hearts)}     SCORE ${score}`)

      if (hearts <= 0) {
        const reward = this.baseReward('truth-gate', false, score)
        this.complete({
          trialId: 'truth-gate',
          success: false,
          response: 'The temple does not punish mistakes. It punishes blindness. Look again and return sharper.',
          ...reward,
        }, 900)
        return
      }

      this.schedule(850, render)
    }

    render()
  }

  // ---------------------------------------------------------------------------
  // 2. CANDLE OF RA
  // ---------------------------------------------------------------------------
  private createCandleOfRa() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle(TRIAL_TITLES['candle-of-ra'])
    this.addInstruction('Protect the sacred flame. Shield it from the wind until the altar is reached.', top + 88)

    let flame = 100
    let distance = 0
    let seconds = 20
    let currentWind: 'left' | 'right' | 'dust' = 'left'
    let shield: 'left' | 'right' | 'cover' | 'none' = 'none'
    let score = 0

    const chamber = this.scene.add.rectangle(width / 2, top + 245, this.panelWidth - 100, 218, 0x1b1208, 1)
    chamber.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(chamber)

    const flameGlow = this.scene.add.circle(width / 2, top + 236, 54, 0xffd966, 0.16)
    const flameBody = this.scene.add.triangle(width / 2, top + 236, 0, 42, 28, -30, 56, 42, 0xffa42e, 1)
    flameBody.setStrokeStyle(2, 0xffe7a3, 1)
    this.addObject(flameGlow)
    this.addObject(flameBody)

    const status = this.addStatusText('', top + 130)
    const windText = this.addStatusText('', top + 342, '#9ee8ff')
    const meterText = this.addStatusText('', bottom - 160)

    const updateUi = () => {
      flame = Phaser.Math.Clamp(flame, 0, 100)
      distance = Phaser.Math.Clamp(distance, 0, 100)
      flameGlow.setScale(0.55 + flame / 75)
      flameBody.setScale(0.65 + flame / 115)
      flameBody.setFillStyle(flame > 35 ? 0xffa42e : 0xd34b22, 1)
      status.setText(`FLAME ${Math.round(flame)}%     PATH ${Math.round(distance)}%     TIME ${seconds}s`)
      meterText.setText(`Current shield: ${shield === 'none' ? 'none' : shield.toUpperCase()}`)
      windText.setText(
        currentWind === 'left'
          ? 'Wind blows from the LEFT. Shield left.'
          : currentWind === 'right'
            ? 'Wind blows from the RIGHT. Shield right.'
            : 'Dust falls from above. Cover the flame.',
      )
    }

    const nextWind = () => {
      currentWind = Phaser.Utils.Array.GetRandom(['left', 'right', 'dust'])
      shield = 'none'
      updateUi()
    }

    const finish = (success: boolean) => {
      const finalScore = Math.round(flame + distance + score)
      const reward = this.baseReward('candle-of-ra', success, finalScore)
      this.complete({
        trialId: 'candle-of-ra',
        success,
        response: success
          ? 'You carried light through pressure and wind. A king must protect hope when the air turns against it.'
          : 'The flame faded before the altar. Patience is also a royal skill. Try again with calmer hands.',
        ...reward,
      })
    }

    this.addLoop(1000, () => {
      seconds -= 1
      const protectedFromWind =
        (currentWind === 'left' && shield === 'left') ||
        (currentWind === 'right' && shield === 'right') ||
        (currentWind === 'dust' && shield === 'cover')

      if (protectedFromWind) {
        flame += 4
        distance += 12
        score += 10
      } else {
        flame -= currentWind === 'dust' ? 12 : 9
        distance += 6
      }

      if (seconds % 3 === 0) nextWind()
      updateUi()

      if (flame <= 0) finish(false)
      if (distance >= 100) finish(true)
      if (seconds <= 0 && distance < 100) finish(false)
    })

    const y = bottom - 82
    this.createButton({ x: width / 2 - 186, y, width: 158, height: 56, label: 'Shield Left', onClick: () => { shield = 'left'; updateUi() } })
    this.createButton({ x: width / 2, y, width: 158, height: 56, label: 'Cover Flame', onClick: () => { shield = 'cover'; updateUi() } })
    this.createButton({ x: width / 2 + 186, y, width: 158, height: 56, label: 'Shield Right', onClick: () => { shield = 'right'; updateUi() } })

    nextWind()
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
