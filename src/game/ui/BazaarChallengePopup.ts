import Phaser from 'phaser'

export type BazaarGameId =
  | 'map-bargain'
  | 'scale-puzzle'
  | 'spice-memory'
  | 'date-trade'
  | 'pottery-fraud'
  | 'donkey-race'
  | 'eagle-delivery'

export type BazaarMinigameResult = {
  success: boolean
  response: string
  goldDelta: number
  reputationDelta: number
  itemKey?: string
}

type BazaarChallengeConfig = {
  gameId: BazaarGameId
  portraitKey?: string
  onComplete: (result: BazaarMinigameResult) => void
}

type ButtonHandle = {
  bg: Phaser.GameObjects.Rectangle
  text: Phaser.GameObjects.Text
  setEnabled: (enabled: boolean) => void
  setSelected: (selected: boolean) => void
}

type MeterHandle = {
  fill: Phaser.GameObjects.Rectangle
  valueText: Phaser.GameObjects.Text
  update: (value: number, suffix?: string) => void
}

export default class BazaarChallengePopup {
  public container: Phaser.GameObjects.Container

  private scene: Phaser.Scene
  private isVisible = false
  private currentOnComplete?: (result: BazaarMinigameResult) => void
  private resultLocked = false

  private panelWidth = 760
  private panelHeight = 600
  private sessionId = 0
  private timers: Phaser.Time.TimerEvent[] = []
  private tweens: Phaser.Tweens.Tween[] = []
  private runtimeCleanups: Array<() => void> = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.container = scene.add.container(0, 0)
    this.container.setDepth(85000)
    this.container.setScrollFactor(0)
    this.container.setVisible(false)
  }

  open() {
    return this.isVisible
  }

  show(config: BazaarChallengeConfig) {
    this.cleanupRuntime()
    this.sessionId += 1
    this.isVisible = true
    this.resultLocked = false
    this.currentOnComplete = config.onComplete

    this.container.removeAll(true)
    this.container.setVisible(true)
    this.createBase()

    switch (config.gameId) {
      case 'map-bargain':
        this.createMapBargainGame()
        break
      case 'scale-puzzle':
        this.createScalePuzzleGame()
        break
      case 'spice-memory':
        this.createSpiceMemoryGame()
        break
      case 'date-trade':
        this.createDateTradeGame()
        break
      case 'pottery-fraud':
        this.createPotteryFraudGame()
        break
      case 'donkey-race':
        this.ensureDonkeyRaceAssets(() => {
          this.createDonkeyRaceGame()
        })
        break
      case 'eagle-delivery':
        this.createEagleDeliveryGame()
        break
    }
  }

  hide() {
    this.sessionId += 1
    this.cleanupRuntime()
    this.isVisible = false
    this.resultLocked = false
    this.currentOnComplete = undefined
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

  private addObject<T extends Phaser.GameObjects.GameObject>(object: T) {
    const scrollObject = object as T & {
      setScrollFactor?: (x: number, y?: number) => T
    }

    scrollObject.setScrollFactor?.(0)
    this.container.add(object)
    return object
  }

  private ensureDonkeyRaceAssets(onReady: () => void) {
    const assets = [
      {
        key: 'bazaar_race_bg',
        path: 'assets/minigames/bazaar_race_bg.png',
      },
      {
        key: 'donkey_topview',
        path: 'assets/minigames/donkey_topview.png',
      },
    ]

    const missingAssets = assets.filter(
      (asset) => !this.scene.textures.exists(asset.key)
    )

    if (missingAssets.length === 0) {
      onReady()
      return
    }

    const session = this.sessionId
    const loadingPanel = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      Math.min(420, this.panelWidth - 80),
      105,
      0x241507,
      0.98
    )
    loadingPanel.setStrokeStyle(3, 0xd4af37, 1)

    const loadingText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'Loading Royal Thunder and the Bazaar road...',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: {
          width: Math.min(370, this.panelWidth - 120),
        },
      }
    )
    loadingText.setOrigin(0.5)

    this.addObject(loadingPanel)
    this.addObject(loadingText)

    let loadFailed = false

    const handleLoadError = (
      file: Phaser.Loader.File
    ) => {
      if (
        missingAssets.some((asset) => asset.key === file.key)
      ) {
        loadFailed = true
      }
    }

    const handleComplete = () => {
      this.scene.load.off('loaderror', handleLoadError)

      if (
        !this.isVisible ||
        session !== this.sessionId
      ) {
        return
      }

      loadingPanel.destroy()
      loadingText.destroy()

      if (loadFailed) {
        const missingNames = missingAssets
          .filter(
            (asset) =>
              !this.scene.textures.exists(asset.key)
          )
          .map((asset) => asset.path)
          .join('\n')

        const errorText = this.addStatusText(
          `Could not load:\n${missingNames}\n\nCheck that both PNG files are inside public/assets/minigames/.`,
          this.scene.scale.height / 2,
          '#ffbd63'
        )
        errorText.setFontSize(16)
        return
      }

      onReady()
    }

    this.scene.load.once('complete', handleComplete)
    this.scene.load.on('loaderror', handleLoadError)

    this.runtimeCleanups.push(() => {
      this.scene.load.off('complete', handleComplete)
      this.scene.load.off('loaderror', handleLoadError)
    })

    missingAssets.forEach((asset) => {
      this.scene.load.image(asset.key, asset.path)
    })

    if (!this.scene.load.isLoading()) {
      this.scene.load.start()
    }
  }

  private createBase() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.panelWidth = Math.min(760, width - 30)
    this.panelHeight = Math.min(600, height - 24)

    const overlay = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.7
    )
    overlay.setInteractive()

    const shadow = this.scene.add.rectangle(
      width / 2 + 8,
      height / 2 + 10,
      this.panelWidth,
      this.panelHeight,
      0x000000,
      0.48
    )

    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      this.panelWidth,
      this.panelHeight,
      0x181006,
      0.99
    )
    panel.setStrokeStyle(4, 0xffd966, 1)

    const topBar = this.scene.add.rectangle(
      width / 2,
      this.getPanelTop() + 34,
      this.panelWidth,
      68,
      0x42260b,
      1
    )
    topBar.setStrokeStyle(2, 0x8f5b20, 1)

    const footer = this.scene.add.rectangle(
      width / 2,
      this.getPanelBottom() - 18,
      this.panelWidth - 8,
      30,
      0x2b1908,
      0.95
    )

    this.addObject(overlay)
    this.addObject(shadow)
    this.addObject(panel)
    this.addObject(topBar)
    this.addObject(footer)
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

  private addTitle(text: string) {
    const title = this.scene.add.text(
      this.scene.scale.width / 2,
      this.getPanelTop() + 34,
      text,
      {
        fontFamily: 'Georgia',
        fontSize: `${Math.min(28, Math.max(21, this.panelWidth / 28))}px`,
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 5,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: this.panelWidth - 50 },
      }
    )

    title.setOrigin(0.5)
    return this.addObject(title)
  }

  private addInstruction(text: string, y = this.getPanelTop() + 88) {
    const body = this.scene.add.text(this.scene.scale.width / 2, y, text, {
      fontFamily: 'Georgia',
      fontSize: '17px',
      color: '#f5ead7',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: this.panelWidth - 70 },
    })

    body.setOrigin(0.5)
    return this.addObject(body)
  }

  private addStatusText(text: string, y: number, color = '#ffffff') {
    const status = this.scene.add.text(this.scene.scale.width / 2, y, text, {
      fontFamily: 'Georgia',
      fontSize: '17px',
      color,
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: this.panelWidth - 80 },
    })

    status.setOrigin(0.5)
    return this.addObject(status)
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    color = 0x4b2b0b,
    fontSize = 15
  ): ButtonHandle {
    let enabled = true
    let selected = false

    const bg = this.scene.add.rectangle(x, y, width, height, color, 1)
    bg.setStrokeStyle(3, 0xffd966, 1)
    bg.setInteractive({ useHandCursor: true })

    const text = this.scene.add.text(x, y, label, {
      fontFamily: 'Georgia',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: width - 12 },
    })
    text.setOrigin(0.5)

    const refresh = () => {
      if (!enabled) {
        bg.setFillStyle(0x2d2a25, 0.9)
        bg.setStrokeStyle(2, 0x777777, 0.8)
        text.setAlpha(0.55)
        bg.disableInteractive()
        return
      }

      bg.setInteractive({ useHandCursor: true })
      bg.setFillStyle(selected ? 0x27633a : color, 1)
      bg.setStrokeStyle(3, selected ? 0x72ff9b : 0xffd966, 1)
      text.setAlpha(1)
    }

    bg.on('pointerover', () => {
      if (!enabled) return
      if (!selected) bg.setFillStyle(0x6b3d10, 1)
      this.addTween({
        targets: [bg, text],
        scaleX: 1.035,
        scaleY: 1.035,
        duration: 90,
      })
    })

    bg.on('pointerout', () => {
      if (!enabled) return
      bg.setFillStyle(selected ? 0x27633a : color, 1)
      this.addTween({
        targets: [bg, text],
        scaleX: 1,
        scaleY: 1,
        duration: 90,
      })
    })

    bg.on('pointerdown', () => {
      if (!enabled || this.resultLocked) return
      this.addTween({
        targets: [bg, text],
        scaleX: 0.97,
        scaleY: 0.97,
        duration: 60,
        yoyo: true,
      })
      onClick()
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
      setSelected: (value: boolean) => {
        selected = value
        refresh()
      },
    }
  }

  private createMeter(
    x: number,
    y: number,
    width: number,
    label: string,
    value: number,
    max: number,
    color: number
  ): MeterHandle {
    const labelText = this.scene.add.text(x - width / 2, y - 19, label, {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#f5ead7',
      stroke: '#000000',
      strokeThickness: 3,
    })
    labelText.setOrigin(0, 0.5)

    const track = this.scene.add.rectangle(x, y, width, 18, 0x2a2118, 1)
    track.setStrokeStyle(2, 0xd0a34a, 1)

    const fill = this.scene.add.rectangle(
      x - width / 2 + 2,
      y,
      Math.max(1, (width - 4) * Phaser.Math.Clamp(value / max, 0, 1)),
      14,
      color,
      1
    )
    fill.setOrigin(0, 0.5)

    const valueText = this.scene.add.text(x + width / 2, y - 19, `${value}/${max}`, {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    })
    valueText.setOrigin(1, 0.5)

    this.addObject(labelText)
    this.addObject(track)
    this.addObject(fill)
    this.addObject(valueText)

    return {
      fill,
      valueText,
      update: (nextValue: number, suffix = '') => {
        const safeValue = Phaser.Math.Clamp(nextValue, 0, max)
        fill.width = Math.max(1, (width - 4) * (safeValue / max))
        valueText.setText(`${Math.round(safeValue)}/${max}${suffix}`)
      },
    }
  }

  private complete(result: BazaarMinigameResult, delay = 350) {
    if (this.resultLocked) return
    this.resultLocked = true

    this.schedule(delay, () => this.showResult(result))
  }

  private showResult(result: BazaarMinigameResult) {
    this.cleanupRuntime()
    this.container.removeAll(true)
    this.createBase()

    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()
    const panelHeight = bottom - top
    const success = result.success

    this.addTitle('Bazaar Trial Result')

    // Responsive vertical anchors. These remain separated even when the
    // internal Phaser canvas is shorter than the CSS-rendered canvas.
    const badgeRadius = Phaser.Math.Clamp(panelHeight * 0.075, 34, 43)
    const badgeY = top + Math.max(92, panelHeight * 0.18)
    const resultTitleY = top + Math.max(156, panelHeight * 0.31)

    const buttonHeight = 46
    const buttonY = bottom - 40
    const rewardY = buttonY - 70

    const responseHeight = Phaser.Math.Clamp(panelHeight * 0.18, 82, 98)
    const responseY = Math.min(
      top + panelHeight * 0.53,
      rewardY - responseHeight / 2 - 28
    )

    const badge = this.scene.add.circle(
      width / 2,
      badgeY,
      badgeRadius,
      success ? 0x205936 : 0x743519,
      1
    )
    badge.setStrokeStyle(4, success ? 0x72ff9b : 0xffbd63, 1)

    const badgeText = this.scene.add.text(
      width / 2,
      badgeY,
      success ? '✓' : '!',
      {
        fontFamily: 'Georgia',
        fontSize: `${Math.round(badgeRadius * 1.05)}px`,
        color: success ? '#72ff9b' : '#ffbd63',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
      }
    )
    badgeText.setOrigin(0.5)

    const resultTitle = this.scene.add.text(
      width / 2,
      resultTitleY,
      success ? 'CHALLENGE COMPLETE' : 'BAZAAR CHAOS',
      {
        fontFamily: 'Georgia',
        fontSize: '27px',
        color: success ? '#72ff9b' : '#ffd966',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
        align: 'center',
      }
    )
    resultTitle.setOrigin(0.5)

    const responsePanel = this.scene.add.rectangle(
      width / 2,
      responseY,
      this.panelWidth - 150,
      responseHeight,
      0x241507,
      0.98
    )
    responsePanel.setStrokeStyle(3, 0x9b682c, 1)

    const response = this.scene.add.text(
      width / 2,
      responseY,
      result.response,
      {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        lineSpacing: 4,
        wordWrap: {
          width: this.panelWidth - 205,
          useAdvancedWrap: true,
        },
      }
    )
    response.setOrigin(0.5)

    const rewardGap = 14
    const rewardCardWidth = Math.min(
      220,
      (this.panelWidth - 100 - rewardGap) / 2
    )
    const rewardCardHeight = 48
    const rewardLeftX = width / 2 - rewardCardWidth / 2 - rewardGap / 2
    const rewardRightX = width / 2 + rewardCardWidth / 2 + rewardGap / 2

    const goldShadow = this.scene.add.rectangle(
      rewardLeftX + 3,
      rewardY + 3,
      rewardCardWidth,
      rewardCardHeight,
      0x000000,
      0.28
    )
    const goldCard = this.scene.add.rectangle(
      rewardLeftX,
      rewardY,
      rewardCardWidth,
      rewardCardHeight,
      0xead8aa,
      1
    )
    goldCard.setStrokeStyle(3, 0xd4af37, 1)

    const reputationShadow = this.scene.add.rectangle(
      rewardRightX + 3,
      rewardY + 3,
      rewardCardWidth,
      rewardCardHeight,
      0x000000,
      0.28
    )
    const reputationCard = this.scene.add.rectangle(
      rewardRightX,
      rewardY,
      rewardCardWidth,
      rewardCardHeight,
      0xead8aa,
      1
    )
    reputationCard.setStrokeStyle(3, 0xd4af37, 1)

    const goldText = this.scene.add.text(
      rewardLeftX,
      rewardY,
      `GOLD  ${result.goldDelta >= 0 ? '+' : ''}${result.goldDelta}`,
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#74420d',
        stroke: '#fff4cf',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    goldText.setOrigin(0.5)

    const reputationText = this.scene.add.text(
      rewardRightX,
      rewardY,
      `REPUTATION  ${
        result.reputationDelta >= 0 ? '+' : ''
      }${result.reputationDelta}`,
      {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: '#245d78',
        stroke: '#fff4cf',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    reputationText.setOrigin(0.5)

    this.addObject(badge)
    this.addObject(badgeText)
    this.addObject(resultTitle)
    this.addObject(responsePanel)
    this.addObject(response)
    this.addObject(goldShadow)
    this.addObject(goldCard)
    this.addObject(reputationShadow)
    this.addObject(reputationCard)
    this.addObject(goldText)
    this.addObject(reputationText)

    this.addTween({
      targets: [badge, badgeText],
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 280,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
    })

    this.resultLocked = false

    this.createButton(
      width / 2,
      buttonY,
      220,
      buttonHeight,
      'Continue',
      () => {
        this.currentOnComplete?.(result)
        this.hide()
      },
      0x27633a,
      17
    )
  }

  // ---------------------------------------------------------------------------
  // 1. MAP SELLER — NEGOTIATION DUEL
  // ---------------------------------------------------------------------------

  private createMapBargainGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('1. Map Seller — Bargaining Duel')
    this.addInstruction(
      'Lower the price without emptying the seller’s patience. Repeating a tactic makes it weaker.'
    )

    let price = 300
    let patience = 72
    let confidence = 20
    let turns = 0
    const uses: Record<string, number> = {
      compliment: 0,
      damage: 0,
      offer: 0,
    }

    const merchantCard = this.scene.add.rectangle(width / 2, top + 142, this.panelWidth - 90, 62, 0x2d1c0c, 1)
    merchantCard.setStrokeStyle(2, 0x9f6d2c, 1)

    const merchantSpeech = this.scene.add.text(
      width / 2,
      top + 142,
      '“Royal secret map. Only 300 gold because I like your... wallet.”',
      {
        fontFamily: 'Georgia',
        fontSize: '17px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
        wordWrap: { width: this.panelWidth - 120 },
      }
    )
    merchantSpeech.setOrigin(0.5)

    const priceText = this.scene.add.text(width / 2, top + 206, '300 GOLD', {
      fontFamily: 'Georgia',
      fontSize: '34px',
      color: '#ffd966',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold',
    })
    priceText.setOrigin(0.5)

    this.addObject(merchantCard)
    this.addObject(merchantSpeech)
    this.addObject(priceText)

    const patienceMeter = this.createMeter(width / 2 - 180, top + 268, 260, 'Seller patience', patience, 100, 0xe07a35)
    const confidenceMeter = this.createMeter(width / 2 + 180, top + 268, 260, 'Walk-away power', confidence, 100, 0x4ab7e8)
    const turnText = this.addStatusText('Turn 0/6 — Build leverage, then accept or walk away.', top + 302, '#f5ead7')

    const updateUI = () => {
      priceText.setText(`${price} GOLD`)
      patienceMeter.update(patience)
      confidenceMeter.update(confidence)
      turnText.setText(`Turn ${turns}/6 — ${confidence >= 55 ? 'The seller looks nervous.' : 'The seller still thinks you are trapped.'}`)
    }

    const checkPatience = () => {
      if (patience > 0) return false

      this.complete({
        success: false,
        goldDelta: 0,
        reputationDelta: -3,
        response: 'You pushed too hard. The seller rolls up the map and bans your entire bloodline from the stall.',
      })
      return true
    }

    const afterTactic = (message: string) => {
      turns += 1
      merchantSpeech.setText(message)
      updateUI()
      this.addTween({ targets: merchantCard, scaleX: 1.015, duration: 110, yoyo: true })
      if (checkPatience()) return

      if (turns >= 6) {
        merchantSpeech.setText('“Final offer. Decide before I remember another tourist.”')
      }
    }

    const columns = [width / 2 - 225, width / 2, width / 2 + 225]
    const row1 = bottom - 155
    const row2 = bottom - 88
    const buttonWidth = Math.min(205, (this.panelWidth - 95) / 3)

    this.createButton(columns[0], row1, buttonWidth, 54, 'Compliment the map', () => {
      uses.compliment += 1
      const firstUse = uses.compliment === 1
      patience = Math.min(100, patience + (firstUse ? 18 : 5))
      confidence = Math.min(100, confidence + (firstUse ? 12 : 3))
      afterTactic(
        firstUse
          ? '“Finally, a customer with taste. The papyrus is only slightly stolen.”'
          : '“Yes, yes. You already praised it. Compliments now require payment.”'
      )
    })

    this.createButton(columns[1], row1, buttonWidth, 54, 'Point out damage', () => {
      uses.damage += 1
      const reduction = uses.damage === 1 ? 50 : uses.damage === 2 ? 25 : 10
      price = Math.max(25, price - reduction)
      patience -= uses.damage === 1 ? 10 : 16
      confidence = Math.min(100, confidence + 14)
      afterTactic(
        uses.damage === 1
          ? '“That is not a tear. It is a historic ventilation feature.”'
          : '“Stop inspecting the history so closely.”'
      )
    })

    this.createButton(columns[2], row1, buttonWidth, 54, 'Make a low offer', () => {
      uses.offer += 1
      const reduction = uses.offer === 1 ? 65 : uses.offer === 2 ? 35 : 15
      price = Math.max(25, price - reduction)
      patience -= uses.offer === 1 ? 17 : 24
      confidence = Math.min(100, confidence + 18)
      afterTactic(
        uses.offer === 1
          ? '“That offer has insulted me, my ancestors, and one nearby camel.”'
          : '“You bargain like a tax collector with no hobbies.”'
      )
    })

    this.createButton(columns[0], row2, buttonWidth, 54, 'Walk away slowly', () => {
      if (confidence < 55 && price > 150) {
        merchantSpeech.setText('“Goodbye! There are twelve tourists behind you.”')
        this.complete({
          success: false,
          goldDelta: 0,
          reputationDelta: -1,
          response: 'You walked away before building leverage. The seller actually let you leave, which feels strangely insulting.',
        }, 700)
        return
      }

      this.resultLocked = true
      const prices = [price, Math.max(90, price - 45), Math.max(50, price - 90), 25]
      const lines = [
        '“Fine. Walk. I enjoy losing customers.”',
        '“Wait. Special afternoon price!”',
        '“Stop walking so confidently!”',
        '“Twenty-five gold! Final! My children will study accounting!”',
      ]

      prices.forEach((nextPrice, index) => {
        this.schedule(index * 1100, () => {
          price = nextPrice
          priceText.setText(`${price} GOLD`)
          merchantSpeech.setText(lines[index])
          this.scene.cameras.main.shake(80, 0.002)
        })
      })

      this.schedule(4700, () => {
        this.showResult({
          success: true,
          goldDelta: -25,
          reputationDelta: 18,
          itemKey: 'suspiciousMap',
          response: 'Perfect walk-away. The seller chases you through half the stall and sells the “royal” map for 25 gold.',
        })
      })
    }, 0x6d3c0d)

    this.createButton(columns[1], row2, buttonWidth, 54, 'Accept current deal', () => {
      const strongDeal = price <= 90
      const fairDeal = price <= 170

      this.complete({
        success: fairDeal,
        goldDelta: -price,
        reputationDelta: strongDeal ? 14 : fairDeal ? 7 : -2,
        itemKey: strongDeal ? 'suspiciousMap' : undefined,
        response: strongDeal
          ? `You close at ${price} gold. The seller respects you and immediately pretends he planned this.`
          : fairDeal
            ? `You settle at ${price} gold. Not legendary, but your wallet survives.`
            : `You accept ${price} gold. The seller rings a tiny bell labeled “easy customer.”`,
      })
    }, 0x27633a)

    this.createButton(columns[2], row2, buttonWidth, 54, 'Reset negotiation', () => {
      price = 300
      patience = 72
      confidence = 20
      turns = 0
      uses.compliment = 0
      uses.damage = 0
      uses.offer = 0
      merchantSpeech.setText('“Royal secret map. Only 300 gold because I like your... wallet.”')
      updateUI()
    }, 0x3c4657)
  }

  // ---------------------------------------------------------------------------
  // 2. SCALE MERCHANT — DRAG AND TEST WEIGHTS
  // ---------------------------------------------------------------------------

  private createScalePuzzleGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('2. Scale Merchant — Catch the Fake Weight')
    this.addInstruction('Drag weights onto the test pan. Compare the reading, then accuse the selected weight.')

    const fakeIndex = Phaser.Math.Between(0, 2)
    let selectedIndex = -1
    let testing = false

    const readout = this.addStatusText('Test pan ready. All three weights claim to be 2.00 kg.', top + 132, '#ffd966')

    const beam = this.scene.add.rectangle(width / 2, top + 225, 330, 16, 0xa86f2c, 1)
    beam.setStrokeStyle(2, 0x000000, 1)
    const pole = this.scene.add.rectangle(width / 2, top + 270, 18, 110, 0x80501e, 1)
    pole.setStrokeStyle(2, 0x000000, 1)
    const leftPan = this.scene.add.ellipse(width / 2 - 130, top + 257, 112, 36, 0x6b441b, 1)
    leftPan.setStrokeStyle(3, 0xffd966, 1)
    const testZone = this.scene.add.ellipse(width / 2 + 130, top + 257, 112, 36, 0x274458, 1)
    testZone.setStrokeStyle(3, 0x66ccff, 1)
    const panLabel = this.scene.add.text(width / 2 + 130, top + 257, 'TEST PAN', {
      fontFamily: 'Georgia',
      fontSize: '13px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    })
    panLabel.setOrigin(0.5)

    this.addObject(pole)
    this.addObject(beam)
    this.addObject(leftPan)
    this.addObject(testZone)
    this.addObject(panLabel)

    const homes = [width / 2 - 180, width / 2, width / 2 + 180]
    const weightY = bottom - 122
    const weightObjects: Array<{
      bg: Phaser.GameObjects.Rectangle
      label: Phaser.GameObjects.Text
      homeX: number
    }> = []

    const refreshSelection = () => {
      weightObjects.forEach((weight, index) => {
        weight.bg.setStrokeStyle(4, index === selectedIndex ? 0x72ff9b : 0xffd966, 1)
      })
    }

    homes.forEach((homeX, index) => {
      const bg = this.scene.add.rectangle(homeX, weightY, 112, 72, 0x5d5a54, 1)
      bg.setStrokeStyle(4, 0xffd966, 1)
      bg.setInteractive({ useHandCursor: true, draggable: true })

      const label = this.scene.add.text(homeX, weightY, `WEIGHT ${String.fromCharCode(65 + index)}\n2.00 kg`, {
        fontFamily: 'Georgia',
        fontSize: '15px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      })
      label.setOrigin(0.5)

      this.scene.input.setDraggable(bg)

      bg.on('pointerdown', () => {
        if (testing || this.resultLocked) return
        selectedIndex = index
        refreshSelection()
      })

      bg.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (testing || this.resultLocked) return
        bg.setPosition(dragX, dragY)
        label.setPosition(dragX, dragY)
      })

      bg.on('dragend', () => {
        if (testing || this.resultLocked) return
        selectedIndex = index
        refreshSelection()

        const droppedOnPan = Phaser.Geom.Rectangle.Contains(testZone.getBounds(), bg.x, bg.y)
        if (!droppedOnPan) {
          this.addTween({ targets: [bg, label], x: homeX, y: weightY, duration: 220, ease: 'Back.easeOut' })
          return
        }

        testing = true
        const isFake = index === fakeIndex
        readout.setText(`Testing Weight ${String.fromCharCode(65 + index)}...`)

        this.addTween({
          targets: beam,
          angle: isFake ? -11 : 0,
          duration: 450,
          ease: 'Sine.easeInOut',
        })
        this.addTween({
          targets: [bg, label],
          x: testZone.x,
          y: testZone.y - 24,
          duration: 220,
        })

        this.schedule(750, () => {
          readout.setText(
            isFake
              ? `Weight ${String.fromCharCode(65 + index)} reads 1.31 kg — too light!`
              : `Weight ${String.fromCharCode(65 + index)} reads 2.00 kg — balanced.`
          )
          this.scene.cameras.main.shake(isFake ? 160 : 60, isFake ? 0.004 : 0.001)
        })

        this.schedule(1250, () => {
          this.addTween({
            targets: [bg, label],
            x: homeX,
            y: weightY,
            duration: 260,
            ease: 'Back.easeOut',
            onComplete: () => {
              testing = false
            },
          })
          this.addTween({ targets: beam, angle: 0, duration: 260 })
        })
      })

      this.addObject(bg)
      this.addObject(label)
      weightObjects.push({ bg, label, homeX })
    })

    this.createButton(width / 2, bottom - 52, 235, 50, 'Accuse selected weight', () => {
      if (selectedIndex < 0) {
        readout.setText('Select or test a weight first.')
        return
      }

      const correct = selectedIndex === fakeIndex
      this.complete({
        success: correct,
        goldDelta: correct ? 350 : -60,
        reputationDelta: correct ? 20 : -3,
        response: correct
          ? `Correct. Weight ${String.fromCharCode(65 + selectedIndex)} is hollow. Sand spills out and the crowd begins chanting “refund.”`
          : `Wrong. Weight ${String.fromCharCode(65 + selectedIndex)} is honest. The merchant charges an accusation fee with impressive speed.`,
      })
    }, 0x27633a, 17)
  }

  // ---------------------------------------------------------------------------
  // 3. SPICE MERCHANT — THREE-ROUND MEMORY/RHYTHM GAME
  // ---------------------------------------------------------------------------

  private createSpiceMemoryGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('3. Spice Merchant — Memory Rush')
    this.addInstruction('Watch each glowing bowl, then repeat the sequence. Bowls shuffle after every round.')

    const spices = [
      { name: 'Cumin', code: 'CU', color: 0xd49a2f },
      { name: 'Cinnamon', code: 'CI', color: 0x9a3c25 },
      { name: 'Cardamom', code: 'CA', color: 0x4d8f52 },
      { name: 'Pepper', code: 'PE', color: 0x4e4a48 },
    ]

    let round = 1
    let mistakes = 0
    let sequence: number[] = []
    let inputIndex = 0
    let acceptingInput = false

    const roundText = this.addStatusText('Round 1/3', top + 132, '#ffd966')
    const status = this.addStatusText('Get ready...', top + 165)
    const hearts = this.scene.add.text(this.getPanelRight() - 75, top + 132, '♥ ♥', {
      fontFamily: 'Arial',
      fontSize: '25px',
      color: '#ff6b6b',
      stroke: '#000000',
      strokeThickness: 4,
    })
    hearts.setOrigin(0.5)
    this.addObject(hearts)

    const positions = [width / 2 - 225, width / 2 - 75, width / 2 + 75, width / 2 + 225]
    const bowlY = top + 290
    const bowlObjects: Array<{
      bowl: Phaser.GameObjects.Ellipse
      label: Phaser.GameObjects.Text
      spiceIndex: number
    }> = []

    const flashSpice = (spiceIndex: number) => {
      const entry = bowlObjects.find((item) => item.spiceIndex === spiceIndex)
      if (!entry) return

      entry.bowl.setStrokeStyle(7, 0xffffff, 1)
      this.addTween({
        targets: [entry.bowl, entry.label],
        scaleX: 1.16,
        scaleY: 1.16,
        duration: 180,
        yoyo: true,
        onComplete: () => entry.bowl.setStrokeStyle(4, 0xffd966, 1),
      })
    }

    const shuffleBowls = () => {
      const shuffledPositions = Phaser.Utils.Array.Shuffle([...positions])
      bowlObjects.forEach((entry, index) => {
        this.addTween({
          targets: [entry.bowl, entry.label],
          x: shuffledPositions[index],
          duration: 420,
          ease: 'Sine.easeInOut',
        })
      })
    }

    const playSequence = () => {
      acceptingInput = false
      inputIndex = 0
      status.setText('WATCH')
      sequence = Array.from({ length: round + 2 }, () => Phaser.Math.Between(0, spices.length - 1))

      sequence.forEach((spiceIndex, index) => {
        this.schedule(650 + index * 650, () => flashSpice(spiceIndex))
      })

      this.schedule(650 + sequence.length * 650, () => {
        acceptingInput = true
        status.setText('YOUR TURN')
      })
    }

    const handleChoice = (spiceIndex: number) => {
      if (!acceptingInput || this.resultLocked) return
      flashSpice(spiceIndex)

      if (spiceIndex !== sequence[inputIndex]) {
        acceptingInput = false
        mistakes += 1
        hearts.setText(mistakes === 1 ? '♥ ♡' : '♡ ♡')
        status.setText('Wrong spice! The merchant sneezes dramatically.')
        this.scene.cameras.main.shake(180, 0.005)

        if (mistakes >= 2) {
          this.complete({
            success: false,
            goldDelta: -40,
            reputationDelta: -1,
            response: 'Two mistakes. Your final blend tastes like a cupboard argument. The merchant sells it to a tourist anyway.',
          }, 900)
          return
        }

        this.schedule(1100, playSequence)
        return
      }

      inputIndex += 1
      status.setText(`Correct ${inputIndex}/${sequence.length}`)

      if (inputIndex < sequence.length) return

      acceptingInput = false
      if (round >= 3) {
        this.complete({
          success: true,
          goldDelta: 280,
          reputationDelta: 16,
          response: 'Three perfect blends. The Spice Merchant declares your nose “legally impressive.”',
        }, 700)
        return
      }

      round += 1
      roundText.setText(`Round ${round}/3`)
      status.setText('Correct! The bowls are moving...')
      shuffleBowls()
      this.schedule(900, playSequence)
    }

    spices.forEach((spice, index) => {
      const bowl = this.scene.add.ellipse(positions[index], bowlY, 126, 92, spice.color, 1)
      bowl.setStrokeStyle(4, 0xffd966, 1)
      bowl.setInteractive({ useHandCursor: true })

      const label = this.scene.add.text(positions[index], bowlY, `${spice.code}\n${spice.name}`, {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      })
      label.setOrigin(0.5)

      bowl.on('pointerdown', () => handleChoice(index))
      bowl.on('pointerover', () => {
        if (acceptingInput) bowl.setStrokeStyle(5, 0xffffff, 1)
      })
      bowl.on('pointerout', () => bowl.setStrokeStyle(4, 0xffd966, 1))

      this.addObject(bowl)
      this.addObject(label)
      bowlObjects.push({ bowl, label, spiceIndex: index })
    })

    const tip = this.scene.add.text(width / 2, bottom - 70, 'Tip: color + abbreviation + position all matter.', {
      fontFamily: 'Georgia',
      fontSize: '15px',
      color: '#d7c7ad',
      stroke: '#000000',
      strokeThickness: 3,
    })
    tip.setOrigin(0.5)
    this.addObject(tip)

    this.schedule(900, playSequence)
  }

  // ---------------------------------------------------------------------------
  // 4. DATE MERCHANT — DRAG/DROP ORDER RUSH
  // ---------------------------------------------------------------------------

  private createDateTradeGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('4. Date Merchant — Market Order Rush')
    this.addInstruction('Drag the requested dates into the customer bag. Wrong dates cost time and patience.')

    const dateTypes = [
      { name: 'Majdoul', short: 'M', color: 0x6f341f },
      { name: 'Sukkari', short: 'S', color: 0xc78c3b },
      { name: 'Ajwa', short: 'A', color: 0x352522 },
      { name: 'Stuffed', short: 'N', color: 0x8c4f2b },
    ]

    let timeLeft = 25
    let completedOrders = 0
    let mistakes = 0
    let currentOrder: number[] = []
    let packed: Record<number, number> = {}
    let acceptingOrders = false

    const timerText = this.scene.add.text(this.getPanelRight() - 80, top + 126, '25.0s', {
      fontFamily: 'Georgia',
      fontSize: '25px',
      color: '#ffd966',
      stroke: '#000000',
      strokeThickness: 5,
      fontStyle: 'bold',
    })
    timerText.setOrigin(0.5)

    const scoreText = this.scene.add.text(this.getPanelLeft() + 115, top + 126, 'Orders 0/5', {
      fontFamily: 'Georgia',
      fontSize: '20px',
      color: '#72ff9b',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    })
    scoreText.setOrigin(0.5)

    const orderCard = this.scene.add.rectangle(width / 2, top + 175, this.panelWidth - 120, 70, 0x2d1d0e, 1)
    orderCard.setStrokeStyle(3, 0xd6a13b, 1)
    const orderText = this.scene.add.text(width / 2, top + 175, '', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: this.panelWidth - 150 },
    })
    orderText.setOrigin(0.5)

    const bag = this.scene.add.rectangle(width / 2, top + 300, 210, 145, 0x8b653f, 1)
    bag.setStrokeStyle(5, 0xffd966, 1)
    const bagLabel = this.scene.add.text(width / 2, top + 300, 'CUSTOMER BAG\nDROP HERE', {
      fontFamily: 'Georgia',
      fontSize: '19px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    })
    bagLabel.setOrigin(0.5)

    const feedback = this.addStatusText('First customer is approaching...', top + 397)

    this.addObject(timerText)
    this.addObject(scoreText)
    this.addObject(orderCard)
    this.addObject(orderText)
    this.addObject(bag)
    this.addObject(bagLabel)

    const orderSummary = () => {
      const requirements = new Map<number, number>()
      currentOrder.forEach((type) => requirements.set(type, (requirements.get(type) ?? 0) + 1))

      const pieces = [...requirements.entries()].map(([type, required]) => {
        const current = packed[type] ?? 0
        return `${dateTypes[type].name} ${current}/${required}`
      })
      orderText.setText(`ORDER: ${pieces.join('   +   ')}`)
    }

    const makeOrder = () => {
      acceptingOrders = true
      const size = completedOrders >= 3 ? 3 : 2
      currentOrder = Array.from({ length: size }, () => Phaser.Math.Between(0, dateTypes.length - 1))
      packed = {}
      orderSummary()
      feedback.setText(`Customer ${completedOrders + 1}: “Please do not improvise.”`)
    }

    const orderComplete = () => {
      acceptingOrders = false
      completedOrders += 1
      scoreText.setText(`Orders ${completedOrders}/5`)
      feedback.setText('Order complete! The customer pays before checking the bag.')

      this.addTween({ targets: bag, scaleX: 1.08, scaleY: 1.08, duration: 120, yoyo: true, repeat: 1 })

      if (completedOrders >= 5) {
        this.complete({
          success: true,
          goldDelta: 500 - mistakes * 25,
          reputationDelta: Math.max(8, 24 - mistakes * 3),
          response: `Five orders served with ${mistakes} mistake${mistakes === 1 ? '' : 's'}. The merchant offers you a management position and immediately takes it back.`,
        }, 700)
        return
      }

      this.schedule(650, makeOrder)
    }

    const processDrop = (typeIndex: number) => {
      if (!acceptingOrders || this.resultLocked) return

      const required = currentOrder.filter((type) => type === typeIndex).length
      const current = packed[typeIndex] ?? 0

      if (current >= required) {
        mistakes += 1
        timeLeft = Math.max(0, timeLeft - 2)
        feedback.setText(`Wrong bag! No more ${dateTypes[typeIndex].name} needed. -2 seconds.`)
        bag.setStrokeStyle(5, 0xff6b6b, 1)
        this.scene.cameras.main.shake(130, 0.004)
        this.schedule(350, () => bag.setStrokeStyle(5, 0xffd966, 1))
        return
      }

      packed[typeIndex] = current + 1
      orderSummary()
      feedback.setText(`${dateTypes[typeIndex].name} packed correctly.`)
      bag.setStrokeStyle(5, 0x72ff9b, 1)
      this.schedule(250, () => bag.setStrokeStyle(5, 0xffd966, 1))

      const packedCount = Object.values(packed).reduce((sum, value) => sum + value, 0)
      if (packedCount >= currentOrder.length) orderComplete()
    }

    const sourceY = bottom - 95
    const sourceX = [width / 2 - 240, width / 2 - 80, width / 2 + 80, width / 2 + 240]

    dateTypes.forEach((dateType, typeIndex) => {
      const homeX = sourceX[typeIndex]
      const token = this.scene.add.ellipse(homeX, sourceY, 112, 66, dateType.color, 1)
      token.setStrokeStyle(4, 0xffd966, 1)
      token.setInteractive({ useHandCursor: true, draggable: true })

      const label = this.scene.add.text(homeX, sourceY, `${dateType.short}\n${dateType.name}`, {
        fontFamily: 'Georgia',
        fontSize: '15px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      })
      label.setOrigin(0.5)

      this.scene.input.setDraggable(token)
      token.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (this.resultLocked) return
        token.setPosition(dragX, dragY)
        label.setPosition(dragX, dragY)
      })

      token.on('dragend', () => {
        if (this.resultLocked) return
        const insideBag = Phaser.Geom.Rectangle.Contains(bag.getBounds(), token.x, token.y)
        if (insideBag) processDrop(typeIndex)

        this.addTween({
          targets: [token, label],
          x: homeX,
          y: sourceY,
          duration: 220,
          ease: 'Back.easeOut',
        })
      })

      this.addObject(token)
      this.addObject(label)
    })

    makeOrder()
    this.addLoop(100, () => {
      if (this.resultLocked) return
      timeLeft = Math.max(0, timeLeft - 0.1)
      timerText.setText(`${timeLeft.toFixed(1)}s`)
      timerText.setColor(timeLeft <= 7 ? '#ff6b6b' : '#ffd966')

      if (timeLeft > 0) return

      this.complete({
        success: completedOrders >= 3,
        goldDelta: completedOrders * 85 - mistakes * 20,
        reputationDelta: completedOrders >= 3 ? completedOrders * 3 : -2,
        response:
          completedOrders >= 3
            ? `Time! You completed ${completedOrders} orders. The queue applauds because nobody expected competence.`
            : `Time! Only ${completedOrders} orders survived. The remaining customers form a small but organized complaint committee.`,
      })
    })
  }

  // ---------------------------------------------------------------------------
  // 5. POTTERY SELLER — INSPECT, ROTATE, TAP, ACCUSE
  // ---------------------------------------------------------------------------

  private createPotteryFraudGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('5. Pottery Seller — Spot the Fake')
    this.addInstruction('Select a pot and inspect it. You have five inspections before making an accusation.')

    const fakeIndex = Phaser.Math.Between(0, 3)
    let selectedIndex = -1
    let inspections = 5

    const inspectionText = this.addStatusText('Select a pot, then use Tap, Rotate, or Magnify.', top + 135, '#ffd966')
    const tokensText = this.scene.add.text(this.getPanelRight() - 105, top + 135, 'Inspections: 5', {
      fontFamily: 'Georgia',
      fontSize: '17px',
      color: '#72ff9b',
      stroke: '#000000',
      strokeThickness: 4,
    })
    tokensText.setOrigin(0.5)
    this.addObject(tokensText)

    const potX = [width / 2 - 240, width / 2 - 80, width / 2 + 80, width / 2 + 240]
    const potY = top + 285
    const pots: Array<{
      body: Phaser.GameObjects.Ellipse
      neck: Phaser.GameObjects.Rectangle
      label: Phaser.GameObjects.Text
      crack: Phaser.GameObjects.Rectangle
    }> = []

    const refreshSelection = () => {
      pots.forEach((pot, index) => {
        pot.body.setStrokeStyle(5, index === selectedIndex ? 0x72ff9b : 0xffd966, 1)
        pot.label.setColor(index === selectedIndex ? '#72ff9b' : '#ffffff')
      })
    }

    potX.forEach((x, index) => {
      const neck = this.scene.add.rectangle(x, potY - 62, 50, 42, 0xa86331, 1)
      neck.setStrokeStyle(3, 0x4a2714, 1)
      const body = this.scene.add.ellipse(x, potY, 116, 142, 0xb87138, 1)
      body.setStrokeStyle(5, 0xffd966, 1)
      body.setInteractive({ useHandCursor: true })
      const band = this.scene.add.rectangle(x, potY, 108, 18, 0x4f7c7a, 1)
      const label = this.scene.add.text(x, potY + 93, `POT ${index + 1}`, {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      })
      label.setOrigin(0.5)

      const crack = this.scene.add.rectangle(x - 4, potY + 5, 4, 55, 0x2a140a, 1)
      crack.setAngle(-28)
      crack.setVisible(false)

      body.on('pointerdown', () => {
        if (this.resultLocked) return
        selectedIndex = index
        refreshSelection()
        inspectionText.setText(`Pot ${index + 1} selected.`)
      })

      this.addObject(neck)
      this.addObject(body)
      this.addObject(band)
      this.addObject(crack)
      this.addObject(label)
      pots.push({ body, neck, label, crack })
    })

    const inspect = (tool: 'tap' | 'rotate' | 'magnify') => {
      if (selectedIndex < 0) {
        inspectionText.setText('Select a pot first.')
        return
      }
      if (inspections <= 0) {
        inspectionText.setText('No inspections left. Make your accusation.')
        return
      }

      inspections -= 1
      tokensText.setText(`Inspections: ${inspections}`)
      const pot = pots[selectedIndex]
      const fake = selectedIndex === fakeIndex

      if (tool === 'tap') {
        this.addTween({ targets: [pot.body, pot.neck], x: '+=5', duration: 55, yoyo: true, repeat: 3 })
        inspectionText.setText(
          fake
            ? `Pot ${selectedIndex + 1}: THUD... something inside is packed with sand.`
            : `Pot ${selectedIndex + 1}: RING... clear, solid ceramic.`
        )
      }

      if (tool === 'rotate') {
        this.addTween({
          targets: [pot.body, pot.neck],
          angle: 360,
          duration: 620,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            pot.body.setAngle(0)
            pot.neck.setAngle(0)
          },
        })
        inspectionText.setText(
          fake
            ? `Pot ${selectedIndex + 1}: the maker mark is wet paint over a copied stamp.`
            : `Pot ${selectedIndex + 1}: old maker mark matches the genuine workshop.`
        )
      }

      if (tool === 'magnify') {
        if (fake) pot.crack.setVisible(true)
        this.addTween({ targets: pot.body, scaleX: 1.12, scaleY: 1.12, duration: 170, yoyo: true })
        inspectionText.setText(
          fake
            ? `Pot ${selectedIndex + 1}: a hairline crack hides beneath the glaze.`
            : `Pot ${selectedIndex + 1}: glaze is clean, aged, and annoyingly legitimate.`
        )
      }
    }

    const buttonY = bottom - 72
    const spacing = Math.min(165, this.panelWidth / 4.55)
    this.createButton(width / 2 - spacing * 1.5, buttonY, 145, 50, 'Tap pot', () => inspect('tap'))
    this.createButton(width / 2 - spacing * 0.5, buttonY, 145, 50, 'Rotate pot', () => inspect('rotate'))
    this.createButton(width / 2 + spacing * 0.5, buttonY, 145, 50, 'Magnify', () => inspect('magnify'))
    this.createButton(width / 2 + spacing * 1.5, buttonY, 145, 50, 'Accuse', () => {
      if (selectedIndex < 0) {
        inspectionText.setText('Select the pot you want to accuse.')
        return
      }

      const correct = selectedIndex === fakeIndex
      this.complete({
        success: correct,
        goldDelta: correct ? 420 : -90,
        reputationDelta: correct ? 22 : -4,
        response: correct
          ? `Pot ${selectedIndex + 1} is fake. The wet decoration slides off before the seller finishes denying it.`
          : `Pot ${selectedIndex + 1} is genuine. The seller hugs it and invoices you for emotional distress.`,
      })
    }, 0x27633a)
  }

  // ---------------------------------------------------------------------------
  // 6. DONKEY MASTER — THREE-ROUND TIMING GAME
  // ---------------------------------------------------------------------------

  private createDonkeyRaceGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('6. Donkey Master — Royal Thunder Rally')
    this.addInstruction(
      'Switch lanes, jump market hazards, collect dates, and race to the temple gate.',
      top + 86
    )

    type RaceState = 'ready' | 'countdown' | 'playing' | 'finished'
    type EntityKind =
      | 'cart'
      | 'pottery'
      | 'date-basket'
      | 'watermelon'
      | 'chicken'
      | 'dates'
      | 'golden-date'

    type RaceEntity = {
      container: Phaser.GameObjects.Container
      kind: EntityKind
      lane: number
      active: boolean
      jumpable: boolean
      collectible: boolean
      dangerous: boolean
      passed: boolean
      laneVelocity: number
      hitWidth: number
      hitHeight: number
    }

    const backgroundLeft = this.getPanelLeft() + 34
    const backgroundRight = this.getPanelRight() - 34
    const backgroundWidth = backgroundRight - backgroundLeft

    // Match the playable lanes to the actual paved road in the background
    // image instead of letting the donkey drive over the market stalls.
    // The outer 17.2% on each side contains the market stalls.
    // Only the centre section is the three-lane road.
    const roadLeft = backgroundLeft + backgroundWidth * 0.172
    const roadRight = backgroundLeft + backgroundWidth * 0.828
    const roadTop = top + 178

    const controlY = bottom - 42
    const statusY = controlY - 42
    const roadBottom = statusY - 24

    const roadWidth = roadRight - roadLeft
    const roadHeight = roadBottom - roadTop
    const laneWidth = roadWidth / 3

    const laneX = [
      roadLeft + laneWidth * 0.5,
      roadLeft + laneWidth * 1.5,
      roadLeft + laneWidth * 2.5,
    ]

    const donkeyY = roadBottom - 54
    const finishDistance = 4100

    let state: RaceState = 'ready'
    let currentLane = 1
    let hearts = 3
    let datesCollected = 0
    let score = 0
    let distance = 0
    let speed = 155
    let spawnCooldown = 0.8
    let patternIndex = 0
    let invulnerable = false
    let jumping = false
    let royalRush = false
    let royalRushTime = 0
    let finishGateVisible = false

    const raceBackgroundKey = 'bazaar_race_bg'
    const donkeyImageKey = 'donkey_topview'
    const hasRaceBackground = this.scene.textures.exists(raceBackgroundKey)
    const hasDonkeyImage = this.scene.textures.exists(donkeyImageKey)

    // Use two full-width images rather than a TileSprite. A TileSprite
    // centres/crops this particular texture, hiding the Bazaar stalls.
    // The two images scroll and wrap while a mask limits them to the
    // race viewport.
    const raceBackgroundSegments: Phaser.GameObjects.Image[] = []
    let raceBackgroundSegmentHeight = roadHeight

    const roadBackdrop = this.scene.add.rectangle(
      width / 2,
      (roadTop + roadBottom) / 2,
      this.panelWidth - 62,
      roadHeight + 10,
      0xc99d55,
      1
    )
    roadBackdrop.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(roadBackdrop)

    if (hasRaceBackground) {
      const backgroundSource = this.scene.textures
        .get(raceBackgroundKey)
        .getSourceImage() as { width: number; height: number }

      // Preserve the complete image width so both market sides stay visible.
      // The image is taller than the race window, so two copies are wrapped
      // vertically to create continuous forward movement.
      raceBackgroundSegmentHeight =
        backgroundWidth *
        (backgroundSource.height / backgroundSource.width)

      const backgroundMaskShape = this.scene.make.graphics({
        x: 0,
        y: 0,
        add: false,
      })
      backgroundMaskShape.setScrollFactor(0)
      backgroundMaskShape.fillStyle(0xffffff, 1)
      backgroundMaskShape.fillRect(
        backgroundLeft,
        roadTop,
        backgroundWidth,
        roadHeight
      )

      const backgroundMask =
        backgroundMaskShape.createGeometryMask()

      const firstBackgroundY =
        roadBottom - raceBackgroundSegmentHeight / 2

      for (let index = 0; index < 2; index += 1) {
        const backgroundSegment = this.scene.add.image(
          width / 2,
          firstBackgroundY -
            index * raceBackgroundSegmentHeight,
          raceBackgroundKey
        )

        backgroundSegment.setDisplaySize(
          backgroundWidth,
          raceBackgroundSegmentHeight
        )
        backgroundSegment.setMask(backgroundMask)

        this.addObject(backgroundSegment)
        raceBackgroundSegments.push(backgroundSegment)
      }

      this.runtimeCleanups.push(() => {
        raceBackgroundSegments.forEach((segment) => {
          segment.clearMask(false)
        })
        backgroundMask.destroy()
        backgroundMaskShape.destroy()
      })
    } else {
      const leftSand = this.scene.add.rectangle(
        (this.getPanelLeft() + roadLeft) / 2,
        (roadTop + roadBottom) / 2,
        roadLeft - this.getPanelLeft() - 4,
        roadHeight,
        0xc89548,
        1
      )

      const rightSand = this.scene.add.rectangle(
        (roadRight + this.getPanelRight()) / 2,
        (roadTop + roadBottom) / 2,
        this.getPanelRight() - roadRight - 4,
        roadHeight,
        0xc89548,
        1
      )

      const fallbackRoad = this.scene.add.rectangle(
        width / 2,
        (roadTop + roadBottom) / 2,
        roadWidth,
        roadHeight,
        0x5c4635,
        1
      )
      fallbackRoad.setStrokeStyle(3, 0x2b1a10, 1)

      this.addObject(leftSand)
      this.addObject(rightSand)
      this.addObject(fallbackRoad)

      const scenery = this.scene.add.graphics()

      scenery.fillStyle(0x8d542b, 1)
      scenery.fillTriangle(
        this.getPanelLeft() + 20,
        roadTop + 86,
        roadLeft - 6,
        roadTop + 28,
        roadLeft - 6,
        roadTop + 112
      )
      scenery.fillTriangle(
        this.getPanelRight() - 20,
        roadTop + 92,
        roadRight + 6,
        roadTop + 35,
        roadRight + 6,
        roadTop + 118
      )

      scenery.fillStyle(0x245d78, 1)
      scenery.fillRect(
        this.getPanelLeft() + 24,
        roadTop + 84,
        roadLeft - this.getPanelLeft() - 32,
        8
      )
      scenery.fillRect(
        roadRight + 8,
        roadTop + 90,
        this.getPanelRight() - roadRight - 32,
        8
      )

      scenery.fillStyle(0x6e4b2a, 0.9)
      scenery.fillTriangle(
        this.getPanelLeft() + 18,
        roadBottom - 18,
        this.getPanelLeft() + 48,
        roadBottom - 72,
        roadLeft - 8,
        roadBottom - 18
      )
      scenery.fillTriangle(
        roadRight + 8,
        roadBottom - 18,
        this.getPanelRight() - 46,
        roadBottom - 80,
        this.getPanelRight() - 15,
        roadBottom - 18
      )

      this.addObject(scenery)
    }

    const laneLines: Phaser.GameObjects.Rectangle[] = []

    // The image background already contains lane markers. Only draw generated
    // markers when the fallback road is being used.
    if (!hasRaceBackground) {
      for (let divider = 1; divider <= 2; divider += 1) {
        const dividerX = roadLeft + laneWidth * divider

        for (let row = 0; row < 6; row += 1) {
          const dash = this.scene.add.rectangle(
            dividerX,
            roadTop + 18 + row * (roadHeight / 5),
            5,
            34,
            0xe8d4a5,
            0.85
          )

          this.addObject(dash)
          laneLines.push(dash)
        }
      }
    }

    const hudY = top + 130
    const hudHeight = 42
    const hudCardWidth = 145
    const centerHudWidth = 190

    const createHudCard = (
      x: number,
      cardWidth: number,
      bandColor: number
    ) => {
      const shadow = this.scene.add.rectangle(
        x + 3,
        hudY + 3,
        cardWidth,
        hudHeight,
        0x000000,
        0.3
      )

      const card = this.scene.add.rectangle(
        x,
        hudY,
        cardWidth,
        hudHeight,
        0xf0dfb5,
        1
      )
      card.setStrokeStyle(3, 0xb8862e, 1)

      const band = this.scene.add.rectangle(
        x,
        hudY - hudHeight / 2 + 6,
        cardWidth - 10,
        8,
        bandColor,
        1
      )

      this.addObject(shadow)
      this.addObject(card)
      this.addObject(band)
    }

    const leftHudX = this.getPanelLeft() + 98
    const centerHudX = width / 2
    const rightHudX = this.getPanelRight() - 98

    createHudCard(leftHudX, hudCardWidth, 0x8f2d2d)
    createHudCard(centerHudX, centerHudWidth, 0x245d78)
    createHudCard(rightHudX, hudCardWidth, 0x8b5a2b)

    const heartsText = this.scene.add.text(
      leftHudX,
      hudY + 4,
      '♥ ♥ ♥',
      {
        fontFamily: 'Georgia',
        fontSize: '20px',
        color: '#9b2525',
        stroke: '#3c160e',
        strokeThickness: 3,
        fontStyle: 'bold',
      }
    )
    heartsText.setOrigin(0.5)

    const progressText = this.scene.add.text(
      centerHudX,
      hudY + 4,
      'RACE 0%',
      {
        fontFamily: 'Georgia',
        fontSize: '17px',
        color: '#245d78',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    progressText.setOrigin(0.5)

    const datesText = this.scene.add.text(
      rightHudX,
      hudY + 4,
      'DATES 0',
      {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: '#7a460f',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    datesText.setOrigin(0.5)

    this.addObject(heartsText)
    this.addObject(progressText)
    this.addObject(datesText)

    const speedTrack = this.scene.add.rectangle(
      centerHudX,
      hudY + 31,
      centerHudWidth - 18,
      8,
      0x33271f,
      1
    )
    speedTrack.setStrokeStyle(1, 0xd4af37, 1)

    const speedFill = this.scene.add.rectangle(
      centerHudX - (centerHudWidth - 22) / 2,
      hudY + 31,
      18,
      5,
      0x4fa4c7,
      1
    )
    speedFill.setOrigin(0, 0.5)

    this.addObject(speedTrack)
    this.addObject(speedFill)

    const statusPanel = this.scene.add.rectangle(
      width / 2,
      statusY,
      this.panelWidth - 160,
      28,
      0xead8aa,
      0.98
    )
    statusPanel.setStrokeStyle(2, 0xb8862e, 1)

    const status = this.scene.add.text(
      width / 2,
      statusY,
      'Use LEFT / RIGHT or A / D. Press SPACE to jump.',
      {
        fontFamily: 'Georgia',
        fontSize: '14px',
        color: '#245d78',
        fontStyle: 'bold',
        align: 'center',
      }
    )
    status.setOrigin(0.5)

    this.addObject(statusPanel)
    this.addObject(status)

    const donkey = this.scene.add.container(laneX[currentLane], donkeyY)

    const donkeyShadow = this.scene.add.ellipse(
      0,
      30,
      54,
      16,
      0x000000,
      0.28
    )
    donkey.add(donkeyShadow)

    const donkeyDisplayWidth = Math.min(78, laneWidth * 0.48)
    const donkeyDisplayHeight = donkeyDisplayWidth * 1.25

    if (hasDonkeyImage) {
      const donkeyImage = this.scene.add.image(
        0,
        -donkeyDisplayHeight * 0.08,
        donkeyImageKey
      )
      donkeyImage.setDisplaySize(
        donkeyDisplayWidth,
        donkeyDisplayHeight
      )
      donkey.add(donkeyImage)
    } else {
      const donkeyBody = this.scene.add.ellipse(
        0,
        0,
        55,
        34,
        0x8a5a35,
        1
      )
      donkeyBody.setStrokeStyle(3, 0x3a2415, 1)

      const donkeyHead = this.scene.add.ellipse(
        0,
        -24,
        30,
        27,
        0x9b6b43,
        1
      )
      donkeyHead.setStrokeStyle(3, 0x3a2415, 1)

      const leftEar = this.scene.add.triangle(
        -9,
        -43,
        -15,
        -8,
        -2,
        -20,
        4,
        0,
        0x9b6b43,
        1
      )
      leftEar.setStrokeStyle(2, 0x3a2415, 1)

      const rightEar = this.scene.add.triangle(
        9,
        -43,
        -4,
        0,
        2,
        -20,
        15,
        -8,
        0x9b6b43,
        1
      )
      rightEar.setStrokeStyle(2, 0x3a2415, 1)

      const muzzle = this.scene.add.ellipse(
        0,
        -18,
        19,
        12,
        0xd1a07a,
        1
      )
      muzzle.setStrokeStyle(2, 0x3a2415, 1)

      const leftEye = this.scene.add.circle(
        -6,
        -29,
        2.3,
        0x111111,
        1
      )
      const rightEye = this.scene.add.circle(
        6,
        -29,
        2.3,
        0x111111,
        1
      )

      donkey.add([
        donkeyBody,
        donkeyHead,
        leftEar,
        rightEar,
        muzzle,
        leftEye,
        rightEye,
      ])
    }

    this.addObject(donkey)

    const rushAura = this.scene.add.ellipse(
      donkey.x,
      donkey.y,
      86,
      108,
      0xffd966,
      0.13
    )
    rushAura.setStrokeStyle(4, 0xffd966, 0.8)
    rushAura.setVisible(false)
    this.addObject(rushAura)

    const countdownText = this.scene.add.text(
      width / 2,
      (roadTop + roadBottom) / 2,
      '3',
      {
        fontFamily: 'Georgia',
        fontSize: '68px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 9,
        fontStyle: 'bold',
      }
    )
    countdownText.setOrigin(0.5)
    countdownText.setVisible(false)
    this.addObject(countdownText)

    const finishGate = this.scene.add.container(
      width / 2,
      roadTop - 58
    )
    finishGate.setVisible(false)

    const gateLeft = this.scene.add.rectangle(
      -roadWidth * 0.31,
      18,
      28,
      88,
      0xc79a4f,
      1
    )
    gateLeft.setStrokeStyle(3, 0x5b3618, 1)

    const gateRight = this.scene.add.rectangle(
      roadWidth * 0.31,
      18,
      28,
      88,
      0xc79a4f,
      1
    )
    gateRight.setStrokeStyle(3, 0x5b3618, 1)

    const gateTop = this.scene.add.rectangle(
      0,
      -24,
      roadWidth * 0.69,
      36,
      0x8b5a2b,
      1
    )
    gateTop.setStrokeStyle(3, 0xd4af37, 1)

    const gateText = this.scene.add.text(
      0,
      -24,
      'FINISH',
      {
        fontFamily: 'Georgia',
        fontSize: '17px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      }
    )
    gateText.setOrigin(0.5)

    finishGate.add([gateLeft, gateRight, gateTop, gateText])
    this.addObject(finishGate)

    const entities: RaceEntity[] = []

    const destroyEntity = (entity: RaceEntity) => {
      entity.active = false
      entity.container.destroy(true)
    }

    const createDateShape = (
      parent: Phaser.GameObjects.Container,
      x: number,
      y: number,
      golden = false
    ) => {
      const date = this.scene.add.ellipse(
        x,
        y,
        13,
        21,
        golden ? 0xffd45c : 0x6d321f,
        1
      )
      date.setStrokeStyle(
        2,
        golden ? 0xfff0a1 : 0x32170e,
        1
      )

      const shine = this.scene.add.ellipse(
        x - 2,
        y - 3,
        3,
        8,
        golden ? 0xffffff : 0xa96945,
        0.7
      )

      parent.add([date, shine])
    }

    const createEntity = (
      kind: EntityKind,
      lane: number,
      y: number,
      laneVelocity = 0
    ) => {
      const entityContainer = this.scene.add.container(laneX[lane], y)

      let jumpable = false
      let collectible = false
      let dangerous = true
      let hitWidth = laneWidth * 0.58
      let hitHeight = 40

      if (kind === 'cart') {
        const cart = this.scene.add.rectangle(
          0,
          0,
          laneWidth * 0.62,
          42,
          0x8b5a2b,
          1
        )
        cart.setStrokeStyle(3, 0x3a2415, 1)

        const canopy = this.scene.add.rectangle(
          0,
          -17,
          laneWidth * 0.55,
          12,
          0x245d78,
          1
        )
        canopy.setStrokeStyle(2, 0xd4af37, 1)

        const wheelLeft = this.scene.add.circle(
          -laneWidth * 0.2,
          20,
          7,
          0x2b211a,
          1
        )
        const wheelRight = this.scene.add.circle(
          laneWidth * 0.2,
          20,
          7,
          0x2b211a,
          1
        )

        entityContainer.add([cart, canopy, wheelLeft, wheelRight])
        hitHeight = 48
      }

      if (kind === 'pottery') {
        jumpable = true

        for (let index = 0; index < 3; index += 1) {
          const pot = this.scene.add.ellipse(
            (index - 1) * 17,
            index === 1 ? -3 : 5,
            24,
            35,
            index === 1 ? 0xb56935 : 0x9f532d,
            1
          )
          pot.setStrokeStyle(2, 0x4a2813, 1)
          entityContainer.add(pot)
        }

        hitWidth = laneWidth * 0.48
        hitHeight = 34
      }

      if (kind === 'date-basket') {
        jumpable = true

        const basket = this.scene.add.rectangle(
          0,
          5,
          laneWidth * 0.52,
          29,
          0x9a6a3e,
          1
        )
        basket.setStrokeStyle(3, 0x4a2a16, 1)

        for (let index = 0; index < 5; index += 1) {
          createDateShape(
            entityContainer,
            (index - 2) * 11,
            -7 + Math.abs(index - 2) * 2
          )
        }

        entityContainer.addAt(basket, 0)
        hitWidth = laneWidth * 0.54
        hitHeight = 33
      }

      if (kind === 'watermelon') {
        jumpable = true

        const melon = this.scene.add.circle(
          0,
          0,
          17,
          0x4e8a43,
          1
        )
        melon.setStrokeStyle(3, 0x214e27, 1)

        const stripe = this.scene.add.rectangle(
          0,
          0,
          5,
          31,
          0x87b45c,
          1
        )
        stripe.setAngle(20)

        entityContainer.add([melon, stripe])
        hitWidth = 34
        hitHeight = 34
      }

      if (kind === 'chicken') {
        jumpable = true

        const body = this.scene.add.ellipse(
          0,
          3,
          28,
          21,
          0xf4e7cd,
          1
        )
        body.setStrokeStyle(2, 0x473529, 1)

        const head = this.scene.add.circle(
          10,
          -7,
          8,
          0xffffff,
          1
        )
        head.setStrokeStyle(2, 0x473529, 1)

        const beak = this.scene.add.triangle(
          20,
          -6,
          0,
          -4,
          8,
          0,
          0,
          4,
          0xf0ad36,
          1
        )

        const comb = this.scene.add.circle(
          10,
          -16,
          3,
          0xd24734,
          1
        )

        entityContainer.add([body, head, beak, comb])
        hitWidth = 34
        hitHeight = 28
      }

      if (kind === 'dates') {
        collectible = true
        dangerous = false
        jumpable = false

        createDateShape(entityContainer, -14, 2)
        createDateShape(entityContainer, 0, -5)
        createDateShape(entityContainer, 14, 2)

        hitWidth = 44
        hitHeight = 32
      }

      if (kind === 'golden-date') {
        collectible = true
        dangerous = false
        jumpable = false

        const glow = this.scene.add.circle(
          0,
          0,
          24,
          0xffd966,
          0.18
        )
        glow.setStrokeStyle(2, 0xffe88a, 0.8)
        entityContainer.add(glow)

        createDateShape(entityContainer, 0, 0, true)

        hitWidth = 34
        hitHeight = 42

        this.addTween({
          targets: entityContainer,
          scaleX: 1.13,
          scaleY: 1.13,
          duration: 360,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }

      this.addObject(entityContainer)

      const entity: RaceEntity = {
        container: entityContainer,
        kind,
        lane,
        active: true,
        jumpable,
        collectible,
        dangerous,
        passed: false,
        laneVelocity,
        hitWidth,
        hitHeight,
      }

      entities.push(entity)
      return entity
    }

    const patterns: Array<
      Array<{
        kind: EntityKind
        lane: number
        offsetY?: number
        laneVelocity?: number
      }>
    > = [
      [{ kind: 'dates', lane: 1 }],
      [{ kind: 'date-basket', lane: 0 }],
      [{ kind: 'cart', lane: 2 }],
      [
        { kind: 'pottery', lane: 0 },
        { kind: 'dates', lane: 2, offsetY: -72 },
      ],
      [{ kind: 'chicken', lane: 1, laneVelocity: 48 }],
      [
        { kind: 'cart', lane: 0 },
        { kind: 'dates', lane: 1, offsetY: -80 },
      ],
      [{ kind: 'watermelon', lane: 2, laneVelocity: -58 }],
      [
        { kind: 'date-basket', lane: 1 },
        { kind: 'dates', lane: 0, offsetY: -76 },
      ],
      [
        { kind: 'pottery', lane: 0 },
        { kind: 'cart', lane: 2 },
      ],
      [{ kind: 'golden-date', lane: 1 }],
      [
        { kind: 'cart', lane: 0 },
        { kind: 'date-basket', lane: 1 },
      ],
      [
        { kind: 'dates', lane: 2 },
        { kind: 'chicken', lane: 0, offsetY: -82, laneVelocity: 52 },
      ],
      [
        { kind: 'pottery', lane: 1 },
        { kind: 'dates', lane: 0, offsetY: -72 },
      ],
      [
        { kind: 'watermelon', lane: 0, laneVelocity: 62 },
        { kind: 'dates', lane: 2, offsetY: -72 },
      ],
      [
        { kind: 'date-basket', lane: 0 },
        { kind: 'pottery', lane: 2 },
      ],
      [{ kind: 'golden-date', lane: 2 }],
    ]

    const spawnPattern = () => {
      if (finishGateVisible) return

      const pattern = patterns[patternIndex % patterns.length]
      patternIndex += 1

      pattern.forEach((entry) => {
        createEntity(
          entry.kind,
          entry.lane,
          roadTop - 35 + (entry.offsetY ?? 0),
          entry.laneVelocity ?? 0
        )
      })
    }

    const updateHud = () => {
      heartsText.setText(
        Array.from(
          { length: 3 },
          (_value, index) => (index < hearts ? '♥' : '♡')
        ).join(' ')
      )

      const progress = Phaser.Math.Clamp(
        Math.floor((distance / finishDistance) * 100),
        0,
        100
      )

      progressText.setText(
        royalRush ? `ROYAL RUSH  ${progress}%` : `RACE ${progress}%`
      )

      datesText.setText(`DATES ${datesCollected}`)

      const speedRatio = Phaser.Math.Clamp(
        (speed - 140) / 100,
        0,
        1
      )
      speedFill.width = Math.max(
        8,
        (centerHudWidth - 22) * speedRatio
      )

      speedFill.setFillStyle(
        royalRush ? 0xffd966 : 0x4fa4c7,
        1
      )
    }

    const moveToLane = (direction: -1 | 1) => {
      if (
        (state !== 'playing' && state !== 'ready') ||
        this.resultLocked
      ) {
        return
      }

      currentLane = Phaser.Math.Clamp(
        currentLane + direction,
        0,
        2
      )

      this.scene.tweens.killTweensOf(donkey)

      this.addTween({
        targets: donkey,
        x: laneX[currentLane],
        duration: 105,
        ease: 'Sine.easeOut',
      })

      rushAura.x = laneX[currentLane]
    }

    const jump = () => {
      if (
        state !== 'playing' ||
        jumping ||
        this.resultLocked
      ) {
        return
      }

      jumping = true
      status.setText('Royal Thunder jumps with questionable elegance.')

      this.addTween({
        targets: donkey,
        y: donkeyY - 52,
        duration: 210,
        yoyo: true,
        ease: 'Sine.easeOut',
        onComplete: () => {
          donkey.y = donkeyY
          jumping = false

          if (state === 'playing') {
            status.setText(
              royalRush
                ? 'ROYAL RUSH! Small hazards cannot stop you.'
                : 'Switch lanes, jump hazards, and collect dates.'
            )
          }
        },
      })

      this.addTween({
        targets: donkey,
        angle: -6,
        duration: 210,
        yoyo: true,
        ease: 'Sine.easeInOut',
      })
    }

    const startRoyalRush = () => {
      if (royalRush) return

      royalRush = true
      royalRushTime = 4.8
      rushAura.setVisible(true)

      status.setText(
        'ROYAL RUSH! Date power protects Royal Thunder.'
      )

      this.addTween({
        targets: rushAura,
        scaleX: 1.18,
        scaleY: 1.18,
        alpha: 0.28,
        duration: 240,
        yoyo: true,
        repeat: -1,
      })

      updateHud()
    }

    const collectEntity = (entity: RaceEntity) => {
      if (!entity.active) return

      if (entity.kind === 'dates') {
        datesCollected += 1
        score += royalRush ? 180 : 90

        status.setText(
          royalRush
            ? 'Date combo! Royal Rush score doubled.'
            : 'Fresh bazaar dates collected!'
        )
      }

      if (entity.kind === 'golden-date') {
        datesCollected += 2
        score += 250
        hearts = Math.min(3, hearts + 1)

        status.setText(
          'Golden date! One heart restored and the crowd cheers.'
        )
      }

      if (datesCollected > 0 && datesCollected % 5 === 0) {
        startRoyalRush()
      }

      updateHud()

      this.addTween({
        targets: entity.container,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 150,
        onComplete: () => destroyEntity(entity),
      })
    }

    const hitEntity = (entity: RaceEntity) => {
      if (
        !entity.active ||
        invulnerable ||
        state !== 'playing'
      ) {
        return
      }

      if (jumping && entity.jumpable) {
        score += royalRush ? 180 : 100
        status.setText('Perfect jump! +100')
        destroyEntity(entity)
        return
      }

      if (
        royalRush &&
        entity.kind !== 'cart'
      ) {
        score += 140
        status.setText('ROYAL RUSH smash! +140')
        this.scene.cameras.main.shake(80, 0.003)

        this.addTween({
          targets: entity.container,
          angle: 35,
          scaleX: 1.35,
          scaleY: 1.35,
          alpha: 0,
          duration: 180,
          onComplete: () => destroyEntity(entity),
        })
        return
      }

      invulnerable = true
      hearts -= 1
      speed = Math.max(145, speed - 28)

      updateHud()
      status.setText(
        entity.kind === 'date-basket'
          ? 'Crash! Dates scatter across the road.'
          : entity.kind === 'pottery'
            ? 'Crash! A pottery merchant begins calculating damages.'
            : entity.kind === 'chicken'
              ? 'Chicken chaos! Royal Thunder loses a heart.'
              : 'Market collision! Royal Thunder loses a heart.'
      )

      this.scene.cameras.main.shake(190, 0.008)

      this.addTween({
        targets: donkey,
        alpha: 0.22,
        duration: 85,
        yoyo: true,
        repeat: 5,
      })

      destroyEntity(entity)

      if (hearts <= 0) {
        state = 'finished'

        this.complete(
          {
            success: false,
            goldDelta: Math.max(
              60,
              Math.floor(distance / 24) + datesCollected * 20
            ),
            reputationDelta: Math.max(
              1,
              Math.floor(distance / finishDistance * 8)
            ),
            response: `Royal Thunder reached ${Math.floor(
              distance / finishDistance * 100
            )}% of the rally and collected ${datesCollected} date${
              datesCollected === 1 ? '' : 's'
            }. Three market crashes ended the race.`,
          },
          800
        )

        return
      }

      this.schedule(950, () => {
        invulnerable = false
        donkey.setAlpha(1)

        if (state === 'playing') {
          status.setText(
            'Recover! The temple finish gate is still ahead.'
          )
        }
      })
    }

    const finishRace = () => {
      if (state === 'finished') return

      state = 'finished'

      const finalGold =
        280 +
        datesCollected * 35 +
        hearts * 85 +
        Math.floor(score / 18)

      const finalReputation =
        10 +
        hearts * 3 +
        Math.min(8, datesCollected)

      status.setText(
        'Royal Thunder crosses the temple gate in glorious confusion.'
      )

      this.complete(
        {
          success: true,
          goldDelta: finalGold,
          reputationDelta: finalReputation,
          response: `Rally complete with ${hearts} heart${
            hearts === 1 ? '' : 's'
          }, ${datesCollected} date${
            datesCollected === 1 ? '' : 's'
          }, and ${score} points. Royal Thunder immediately demands a royal stable.`,
        },
        900
      )
    }

    let startButton: ButtonHandle

    const startCountdown = () => {
      if (state !== 'ready') return

      state = 'countdown'
      startButton.bg.setVisible(false)
      startButton.text.setVisible(false)
      startButton.setEnabled(false)
      countdownText.setVisible(true)
      status.setText('The bazaar road is clearing... mostly.')

      const steps = ['3', '2', '1', 'RIDE!']

      steps.forEach((step, index) => {
        this.schedule(index * 650, () => {
          countdownText.setText(step)
          countdownText.setScale(step === 'RIDE!' ? 0.7 : 1)

          this.addTween({
            targets: countdownText,
            scaleX: step === 'RIDE!' ? 1 : 1.22,
            scaleY: step === 'RIDE!' ? 1 : 1.22,
            duration: 160,
            yoyo: true,
          })
        })
      })

      this.schedule(2000, () => {
        state = 'playing'
        status.setText(
          'Switch lanes, jump hazards, and collect dates.'
        )
        spawnPattern()
      })

      this.schedule(2500, () => {
        countdownText.setVisible(false)
      })
    }

    const keyLeft = () => moveToLane(-1)
    const keyRight = () => moveToLane(1)
    const keyJump = () => jump()

    const keyboard = this.scene.input.keyboard

    if (keyboard) {
      keyboard.on('keydown-LEFT', keyLeft)
      keyboard.on('keydown-A', keyLeft)
      keyboard.on('keydown-RIGHT', keyRight)
      keyboard.on('keydown-D', keyRight)
      keyboard.on('keydown-SPACE', keyJump)

      this.runtimeCleanups.push(() => {
        keyboard.off('keydown-LEFT', keyLeft)
        keyboard.off('keydown-A', keyLeft)
        keyboard.off('keydown-RIGHT', keyRight)
        keyboard.off('keydown-D', keyRight)
        keyboard.off('keydown-SPACE', keyJump)
      })
    }

    const updateRace = (_time: number, delta: number) => {
      if (state !== 'playing') return

      const dt = Math.min(delta, 34) / 1000

      speed = Math.min(
        royalRush ? 245 : 220,
        speed + dt * (royalRush ? 7 : 2.3)
      )

      distance += speed * dt
      score += Math.floor(speed * dt * (royalRush ? 0.9 : 0.45))

      if (raceBackgroundSegments.length > 0) {
        raceBackgroundSegments.forEach((segment) => {
          segment.y += speed * dt
        })

        raceBackgroundSegments.forEach((segment) => {
          const segmentTop =
            segment.y - raceBackgroundSegmentHeight / 2

          if (segmentTop >= roadBottom) {
            const otherSegment =
              raceBackgroundSegments[0] === segment
                ? raceBackgroundSegments[1]
                : raceBackgroundSegments[0]

            segment.y =
              otherSegment.y - raceBackgroundSegmentHeight
          }
        })
      }

      rushAura.setPosition(donkey.x, donkey.y)

      if (royalRush) {
        royalRushTime -= dt

        if (royalRushTime <= 0) {
          royalRush = false
          rushAura.setVisible(false)
          rushAura.setScale(1)
          rushAura.setAlpha(1)

          status.setText(
            'Royal Rush ended. Keep collecting dates.'
          )
        }
      }

      laneLines.forEach((dash) => {
        dash.y += speed * dt

        if (dash.y > roadBottom + 20) {
          dash.y = roadTop - 20
        }
      })

      spawnCooldown -= dt

      if (
        spawnCooldown <= 0 &&
        !finishGateVisible
      ) {
        spawnPattern()
        spawnCooldown = Phaser.Math.Clamp(
          1.02 - speed / 500,
          0.56,
          0.78
        )
      }

      if (
        !finishGateVisible &&
        distance >= finishDistance - 720
      ) {
        finishGateVisible = true
        finishGate.setVisible(true)
        finishGate.y = roadTop - 58
        status.setText(
          'Temple finish gate ahead! Hold your lane.'
        )
      }

      if (finishGateVisible) {
        finishGate.y += speed * dt

        if (finishGate.y >= donkeyY - 20) {
          distance = finishDistance
          updateHud()
          finishRace()
          return
        }
      }

      const donkeyBounds = new Phaser.Geom.Rectangle(
        donkey.x - donkeyDisplayWidth * 0.3,
        donkey.y - donkeyDisplayHeight * 0.47,
        donkeyDisplayWidth * 0.6,
        jumping
          ? donkeyDisplayHeight * 0.32
          : donkeyDisplayHeight * 0.72
      )

      entities.forEach((entity) => {
        if (!entity.active) return

        entity.container.y += speed * dt

        if (entity.laneVelocity !== 0) {
          entity.container.x += entity.laneVelocity * dt

          if (
            entity.container.x < laneX[0] ||
            entity.container.x > laneX[2]
          ) {
            entity.laneVelocity *= -1
            entity.container.x = Phaser.Math.Clamp(
              entity.container.x,
              laneX[0],
              laneX[2]
            )
          }

          entity.container.rotation += dt * 1.5
        }

        const entityBounds = new Phaser.Geom.Rectangle(
          entity.container.x - entity.hitWidth / 2,
          entity.container.y - entity.hitHeight / 2,
          entity.hitWidth,
          entity.hitHeight
        )

        if (
          Phaser.Geom.Intersects.RectangleToRectangle(
            donkeyBounds,
            entityBounds
          )
        ) {
          if (entity.collectible) {
            collectEntity(entity)
          } else if (entity.dangerous) {
            hitEntity(entity)
          }
        }

        if (
          entity.active &&
          !entity.passed &&
          entity.container.y > donkeyY + 38
        ) {
          entity.passed = true

          if (
            entity.dangerous &&
            Math.abs(entity.container.x - donkey.x) <
              laneWidth * 0.75
          ) {
            score += 55
            status.setText('Near miss! +55')
          }
        }

        if (
          entity.active &&
          entity.container.y > roadBottom + 70
        ) {
          destroyEntity(entity)
        }
      })

      updateHud()
    }

    this.scene.events.on('update', updateRace)
    this.runtimeCleanups.push(() => {
      this.scene.events.off('update', updateRace)
    })

    const buttonWidth = 150

    this.createButton(
      width / 2 - 175,
      controlY,
      buttonWidth,
      42,
      '← LEFT',
      () => moveToLane(-1),
      0x245d78,
      15
    )

    startButton = this.createButton(
      width / 2,
      controlY,
      buttonWidth,
      42,
      'START RALLY',
      startCountdown,
      0x8b5a2b,
      15
    )

    this.createButton(
      width / 2 + 175,
      controlY,
      buttonWidth,
      42,
      'RIGHT →',
      () => moveToLane(1),
      0x245d78,
      15
    )

    const jumpZone = this.scene.add.rectangle(
      width / 2,
      (roadTop + roadBottom) / 2,
      roadWidth,
      roadHeight,
      0x000000,
      0
    )
    jumpZone.setInteractive({ useHandCursor: true })
    this.addObject(jumpZone)

    const pointerJump = () => {
      if (state === 'ready') {
        startCountdown()
      } else {
        jump()
      }
    }

    jumpZone.on('pointerdown', pointerJump)
    this.runtimeCleanups.push(() => {
      jumpZone.off('pointerdown', pointerJump)
    })

    updateHud()
    this.container.bringToTop(donkey)
    this.container.bringToTop(rushAura)
    this.container.bringToTop(countdownText)
  }

  // ---------------------------------------------------------------------------
  // 7. EAGLE KEEPER — FLAPPY-STYLE SKY COURIER DASH
  // ---------------------------------------------------------------------------

  private createEagleDeliveryGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('7. Eagle Keeper — Nile Falcon Courier')
    this.addInstruction(
      'Click or press SPACE to flap through all 6 sun rings.',
      top + 86
    )

    type FlightState = 'ready' | 'countdown' | 'playing' | 'finished'
    type FlightObstacle = {
      topBlock: Phaser.GameObjects.Rectangle
      bottomBlock: Phaser.GameObjects.Rectangle
      ring: Phaser.GameObjects.Arc
      ringLabel: Phaser.GameObjects.Text
      x: number
      gapY: number
      baseGapY: number
      gapSize: number
      width: number
      passed: boolean
      bobAmount: number
      bobSpeed: number
      phase: number
      isFinal: boolean
    }

    const playLeft = this.getPanelLeft() + 34
    const playRight = this.getPanelRight() - 34

    const hudY = top + 130
    const hudHeight = 42
    const playTop = hudY + hudHeight / 2 + 20

    const buttonY = bottom - 38
    const statusY = buttonY - 48
    const playBottom = statusY - 25

    const playWidth = playRight - playLeft
    const playHeight = playBottom - playTop
    const eagleX = playLeft + 122

    let state: FlightState = 'ready'
    let velocityY = 0
    let hearts = 3
    let ringsPassed = 0
    let score = 0
    let speed = 142
    let invulnerable = false
    let elapsed = 0

    const playBg = this.scene.add.rectangle(
      width / 2,
      (playTop + playBottom) / 2,
      playWidth,
      playHeight,
      0x1f4e6b,
      1
    )
    playBg.setStrokeStyle(4, 0xd4af37, 1)
    playBg.setInteractive({ useHandCursor: true })
    this.addObject(playBg)

    const skyArt = this.scene.add.graphics()

    skyArt.fillGradientStyle(
      0x204e6a,
      0x204e6a,
      0xe1a04d,
      0xe1a04d,
      1
    )
    skyArt.fillRect(playLeft, playTop, playWidth, playHeight)

    skyArt.fillStyle(0xd1a354, 1)
    skyArt.fillRect(playLeft, playBottom - 34, playWidth, 34)

    skyArt.fillStyle(0x6e4b2a, 0.95)
    skyArt.fillTriangle(
      playLeft + 72,
      playBottom - 34,
      playLeft + 146,
      playBottom - Math.min(145, playHeight * 0.72),
      playLeft + 220,
      playBottom - 34
    )
    skyArt.fillTriangle(
      playLeft + 185,
      playBottom - 34,
      playLeft + 257,
      playBottom - Math.min(122, playHeight * 0.62),
      playLeft + 329,
      playBottom - 34
    )
    skyArt.fillTriangle(
      playRight - 220,
      playBottom - 34,
      playRight - 157,
      playBottom - Math.min(113, playHeight * 0.58),
      playRight - 94,
      playBottom - 34
    )

    skyArt.fillStyle(0x7a5630, 0.9)
    skyArt.fillRect(playRight - 120, playBottom - 80, 16, 46)
    skyArt.fillRect(playRight - 96, playBottom - 88, 16, 54)
    skyArt.fillRect(playRight - 72, playBottom - 74, 16, 40)

    skyArt.fillStyle(0xffd966, 0.96)
    skyArt.fillCircle(playRight - 78, playTop + 55, 24)

    skyArt.lineStyle(2, 0xf4cf61, 0.75)
    skyArt.strokeRect(
      playLeft + 5,
      playTop + 5,
      playWidth - 10,
      playHeight - 10
    )

    this.addObject(skyArt)

    // HUD cards are intentionally explicit rather than generated through a
    // helper, preventing width/height arguments from being confused with x/y.
    const leftHudX = playLeft + 67
    const centerHudX = width / 2
    const rightHudX = playRight - 72

    const leftHudWidth = 122
    const centerHudWidth = 190
    const rightHudWidth = 142

    const leftHudShadow = this.scene.add.rectangle(
      leftHudX + 3,
      hudY + 3,
      leftHudWidth,
      hudHeight,
      0x000000,
      0.3
    )
    const leftHudCard = this.scene.add.rectangle(
      leftHudX,
      hudY,
      leftHudWidth,
      hudHeight,
      0xf0dfb5,
      1
    )
    leftHudCard.setStrokeStyle(3, 0xb8862e, 1)
    const leftHudBand = this.scene.add.rectangle(
      leftHudX,
      hudY - hudHeight / 2 + 6,
      leftHudWidth - 10,
      8,
      0x245d78,
      1
    )

    const centerHudShadow = this.scene.add.rectangle(
      centerHudX + 3,
      hudY + 3,
      centerHudWidth,
      hudHeight,
      0x000000,
      0.3
    )
    const centerHudCard = this.scene.add.rectangle(
      centerHudX,
      hudY,
      centerHudWidth,
      hudHeight,
      0xf0dfb5,
      1
    )
    centerHudCard.setStrokeStyle(3, 0xb8862e, 1)
    const centerHudBand = this.scene.add.rectangle(
      centerHudX,
      hudY - hudHeight / 2 + 6,
      centerHudWidth - 10,
      8,
      0x245d78,
      1
    )

    const rightHudShadow = this.scene.add.rectangle(
      rightHudX + 3,
      hudY + 3,
      rightHudWidth,
      hudHeight,
      0x000000,
      0.3
    )
    const rightHudCard = this.scene.add.rectangle(
      rightHudX,
      hudY,
      rightHudWidth,
      hudHeight,
      0xf0dfb5,
      1
    )
    rightHudCard.setStrokeStyle(3, 0xb8862e, 1)
    const rightHudBand = this.scene.add.rectangle(
      rightHudX,
      hudY - hudHeight / 2 + 6,
      rightHudWidth - 10,
      8,
      0x245d78,
      1
    )

    this.addObject(leftHudShadow)
    this.addObject(leftHudCard)
    this.addObject(leftHudBand)
    this.addObject(centerHudShadow)
    this.addObject(centerHudCard)
    this.addObject(centerHudBand)
    this.addObject(rightHudShadow)
    this.addObject(rightHudCard)
    this.addObject(rightHudBand)

    const heartsText = this.scene.add.text(
      leftHudX,
      hudY + 4,
      '♥ ♥ ♥',
      {
        fontFamily: 'Georgia',
        fontSize: '20px',
        color: '#9b2525',
        stroke: '#3c160e',
        strokeThickness: 3,
        fontStyle: 'bold',
      }
    )
    heartsText.setOrigin(0.5)

    const progressText = this.scene.add.text(
      centerHudX,
      hudY + 4,
      'DELIVERY 0 / 6',
      {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: '#245d78',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    progressText.setOrigin(0.5)

    const scoreText = this.scene.add.text(
      rightHudX,
      hudY + 4,
      'SCORE 0',
      {
        fontFamily: 'Georgia',
        fontSize: '15px',
        color: '#245d78',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    scoreText.setOrigin(0.5)

    this.addObject(heartsText)
    this.addObject(progressText)
    this.addObject(scoreText)

    const statusPanel = this.scene.add.rectangle(
      width / 2,
      statusY,
      this.panelWidth - 185,
      30,
      0xead8aa,
      0.98
    )
    statusPanel.setStrokeStyle(2, 0xb8862e, 1)

    const status = this.scene.add.text(
      width / 2,
      statusY,
      'Click the sky or press SPACE to flap.',
      {
        fontFamily: 'Georgia',
        fontSize: '14px',
        color: '#245d78',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: this.panelWidth - 215 },
      }
    )
    status.setOrigin(0.5)

    this.addObject(statusPanel)
    this.addObject(status)

    const countdownText = this.scene.add.text(
      width / 2,
      (playTop + playBottom) / 2,
      '3',
      {
        fontFamily: 'Georgia',
        fontSize: '68px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 9,
        fontStyle: 'bold',
        align: 'center',
      }
    )
    countdownText.setOrigin(0.5)
    countdownText.setVisible(false)
    this.addObject(countdownText)

    const eagle = this.scene.add.container(
      eagleX,
      (playTop + playBottom) / 2
    )

    const rearWing = this.scene.add.triangle(
      -9,
      1,
      -25,
      -11,
      -2,
      -4,
      -8,
      11,
      0xd4c089,
      1
    )
    rearWing.setStrokeStyle(2, 0x3a2b20, 1)

    const body = this.scene.add.ellipse(0, 0, 34, 20, 0xf2e2b8, 1)
    body.setStrokeStyle(2, 0x3a2b20, 1)

    const wing = this.scene.add.triangle(
      -3,
      1,
      -19,
      13,
      4,
      4,
      10,
      -12,
      0xe7d39d,
      1
    )
    wing.setStrokeStyle(2, 0x3a2b20, 1)

    const head = this.scene.add.circle(15, -4, 8, 0xffffff, 1)
    head.setStrokeStyle(2, 0x3a2b20, 1)

    const beak = this.scene.add.triangle(
      25,
      -4,
      0,
      -5,
      10,
      0,
      0,
      5,
      0xf5b642,
      1
    )

    const eye = this.scene.add.circle(18, -6, 1.8, 0x111111, 1)

    const packageBox = this.scene.add.rectangle(
      -1,
      13,
      17,
      12,
      0xb76b2e,
      1
    )
    packageBox.setStrokeStyle(2, 0x4a2813, 1)

    const packageRibbon = this.scene.add.rectangle(
      -1,
      13,
      3,
      12,
      0xffd966,
      1
    )

    eagle.add([
      rearWing,
      body,
      wing,
      head,
      beak,
      eye,
      packageBox,
      packageRibbon,
    ])
    this.addObject(eagle)

    const wingTween = this.addTween({
      targets: wing,
      angle: { from: -12, to: 15 },
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    wingTween.pause()

    const obstacles: FlightObstacle[] = []
    const obstacleColors = [
      0x9b5b2c,
      0x72533a,
      0xa66a34,
      0x655144,
      0x8f552b,
      0x4f704c,
    ]
    const gapCenters = [0.42, 0.62, 0.36, 0.56, 0.44, 0.6]

    const updateObstacleGeometry = (obstacle: FlightObstacle) => {
      const topHeight = Math.max(
        8,
        obstacle.gapY - obstacle.gapSize / 2 - playTop
      )
      const lowerY = obstacle.gapY + obstacle.gapSize / 2
      const bottomHeight = Math.max(8, playBottom - lowerY)

      obstacle.topBlock.setPosition(
        obstacle.x,
        playTop + topHeight / 2
      )
      obstacle.topBlock.setDisplaySize(obstacle.width, topHeight)

      obstacle.bottomBlock.setPosition(
        obstacle.x,
        lowerY + bottomHeight / 2
      )
      obstacle.bottomBlock.setDisplaySize(obstacle.width, bottomHeight)

      obstacle.ring.setPosition(obstacle.x, obstacle.gapY)
      obstacle.ringLabel.setPosition(obstacle.x, obstacle.gapY)

      const insideFlightArea =
        obstacle.x + obstacle.width / 2 >= playLeft &&
        obstacle.x - obstacle.width / 2 <= playRight

      obstacle.topBlock.setVisible(insideFlightArea)
      obstacle.bottomBlock.setVisible(insideFlightArea)
      obstacle.ring.setVisible(insideFlightArea)
      obstacle.ringLabel.setVisible(insideFlightArea)
    }

    for (let index = 0; index < 6; index += 1) {
      const isFinal = index === 5
      const obstacleWidth = isFinal ? 72 : 58
      const gapSize = isFinal
        ? Math.min(124, playHeight * 0.55)
        : Math.min(
            Math.max(96, 132 - index * 5),
            playHeight * 0.54
          )
      const x = playRight + 235 + index * 285
      const gapY = playTop + playHeight * gapCenters[index]
      const color = isFinal ? 0x3f7f50 : obstacleColors[index]

      const topBlock = this.scene.add.rectangle(
        x,
        playTop,
        obstacleWidth,
        40,
        color,
        1
      )
      topBlock.setStrokeStyle(3, 0x2b160a, 1)

      const bottomBlock = this.scene.add.rectangle(
        x,
        playBottom,
        obstacleWidth,
        40,
        color,
        1
      )
      bottomBlock.setStrokeStyle(3, 0x2b160a, 1)

      const ring = this.scene.add.circle(
        x,
        gapY,
        isFinal ? 35 : 30,
        0x000000,
        0
      )
      ring.setStrokeStyle(
        isFinal ? 7 : 6,
        isFinal ? 0x72ff9b : 0xd4af37,
        1
      )

      const ringLabel = this.scene.add.text(
        x,
        gapY,
        isFinal ? 'DELIVER' : `${index + 1}`,
        {
          fontFamily: 'Georgia',
          fontSize: isFinal ? '10px' : '15px',
          color: '#fff6cf',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold',
        }
      )
      ringLabel.setOrigin(0.5)

      this.addObject(topBlock)
      this.addObject(bottomBlock)
      this.addObject(ring)
      this.addObject(ringLabel)

      const obstacle: FlightObstacle = {
        topBlock,
        bottomBlock,
        ring,
        ringLabel,
        x,
        gapY,
        baseGapY: gapY,
        gapSize,
        width: obstacleWidth,
        passed: false,
        bobAmount:
          index === 2 || index === 4
            ? Math.min(18, playHeight * 0.08)
            : 0,
        bobSpeed: index === 2 ? 1.8 : 1.35,
        phase: index * 0.9,
        isFinal,
      }

      obstacles.push(obstacle)
      updateObstacleGeometry(obstacle)
    }

    const refreshHud = () => {
      heartsText.setText(
        Array.from(
          { length: 3 },
          (_value, index) => (index < hearts ? '♥' : '♡')
        ).join(' ')
      )
      progressText.setText(`DELIVERY ${ringsPassed} / 6`)
      scoreText.setText(`SCORE ${score}`)
    }

    const flap = () => {
      if (state !== 'playing' || this.resultLocked) return

      velocityY = -292

      this.addTween({
        targets: eagle,
        scaleX: 1.08,
        scaleY: 0.92,
        duration: 75,
        yoyo: true,
      })
    }

    const finishFlight = (success: boolean) => {
      if (state === 'finished') return

      state = 'finished'
      wingTween.pause()

      if (success) {
        status.setText('Royal parcel delivered safely to the Nile tower.')

        this.addTween({
          targets: eagle,
          x: playRight - 62,
          y: playTop + 58,
          angle: 0,
          duration: 650,
          ease: 'Sine.easeInOut',
        })

        this.complete(
          {
            success: true,
            goldDelta: hearts === 3 ? 600 : hearts === 2 ? 470 : 350,
            reputationDelta:
              hearts === 3 ? 24 : hearts === 2 ? 19 : 14,
            response:
              hearts === 3
                ? `Flawless delivery. You cleared all 6 rings with ${score} points and the royal parcel did not even wobble.`
                : `Delivery complete with ${hearts} heart${
                    hearts === 1 ? '' : 's'
                  } left and ${score} points. The falcon demands premium seed mix.`,
          },
          900
        )
      } else {
        status.setText(
          'The parcel survives. The falcon’s royal pride does not.'
        )

        this.complete(
          {
            success: false,
            goldDelta: Math.max(40, ringsPassed * 45),
            reputationDelta: Math.max(0, ringsPassed * 2),
            response: `You cleared ${ringsPassed} of 6 delivery rings and scored ${score}. Three collisions ended the flight early.`,
          },
          900
        )
      }
    }

    const takeHit = (message: string) => {
      if (invulnerable || state !== 'playing') return

      invulnerable = true
      hearts -= 1
      velocityY = -185
      refreshHud()
      status.setText(message)
      this.scene.cameras.main.shake(180, 0.007)

      this.addTween({
        targets: eagle,
        alpha: 0.18,
        duration: 90,
        yoyo: true,
        repeat: 5,
      })

      if (hearts <= 0) {
        finishFlight(false)
        return
      }

      this.schedule(1050, () => {
        invulnerable = false
        eagle.setAlpha(1)

        if (state === 'playing') {
          status.setText('Recover and keep flying through the sun rings.')
        }
      })
    }

    let startButton: ButtonHandle

    const startCountdown = () => {
      if (state !== 'ready') return

      state = 'countdown'
      startButton.bg.setVisible(false)
      startButton.text.setVisible(false)
      startButton.setEnabled(false)
      countdownText.setVisible(true)
      status.setText('The Nile winds are rising...')

      const steps = ['3', '2', '1', 'FLY!']

      steps.forEach((step, index) => {
        this.schedule(index * 700, () => {
          countdownText.setText(step)
          countdownText.setScale(step === 'FLY!' ? 0.75 : 1)

          this.addTween({
            targets: countdownText,
            scaleX: step === 'FLY!' ? 1 : 1.25,
            scaleY: step === 'FLY!' ? 1 : 1.25,
            duration: 170,
            yoyo: true,
          })
        })
      })

      this.schedule(2150, () => {
        state = 'playing'
        wingTween.resume()
        velocityY = -210
        status.setText('CLICK THE SKY OR PRESS SPACE TO FLAP')
      })

      this.schedule(2700, () => {
        countdownText.setVisible(false)
      })
    }

    const handleControl = () => {
      if (state === 'ready') {
        startCountdown()
        return
      }

      flap()
    }

    playBg.on('pointerdown', handleControl)
    this.runtimeCleanups.push(() => {
      playBg.off('pointerdown', handleControl)
    })

    const keyboard = this.scene.input.keyboard

    if (keyboard) {
      keyboard.on('keydown-SPACE', handleControl)
      this.runtimeCleanups.push(() => {
        keyboard.off('keydown-SPACE', handleControl)
      })
    }

    const updateFlight = (_time: number, delta: number) => {
      if (state !== 'playing') return

      const dt = Math.min(delta, 34) / 1000
      elapsed += dt
      velocityY += 700 * dt
      eagle.y += velocityY * dt
      eagle.setRotation(
        Phaser.Math.Clamp(velocityY / 760, -0.38, 0.48)
      )

      if (eagle.y < playTop + 15) {
        eagle.y = playTop + 15
        takeHit('Too high! The falcon clips a royal banner.')
      } else if (eagle.y > playBottom - 15) {
        eagle.y = playBottom - 15
        takeHit('Too low! A rooftop basket explodes into dates.')
      }

      const eagleHitbox = new Phaser.Geom.Rectangle(
        eagle.x - 14,
        eagle.y - 10,
        28,
        21
      )

      obstacles.forEach((obstacle) => {
        obstacle.x -= speed * dt

        if (obstacle.bobAmount > 0) {
          obstacle.gapY =
            obstacle.baseGapY +
            Math.sin(
              elapsed * obstacle.bobSpeed + obstacle.phase
            ) *
              obstacle.bobAmount
        }

        updateObstacleGeometry(obstacle)

        if (
          !obstacle.passed &&
          obstacle.x + obstacle.width / 2 < eagleX - 10
        ) {
          obstacle.passed = true
          ringsPassed += 1

          const centerDistance = Math.abs(eagle.y - obstacle.gapY)
          const perfect = centerDistance <= 21

          score += perfect ? 175 : 110
          speed = Math.min(188, speed + 7)

          obstacle.ring.setStrokeStyle(6, 0x72ff9b, 1)
          obstacle.ringLabel.setColor('#72ff9b')

          refreshHud()
          status.setText(
            perfect
              ? 'Perfect sun ring! +175'
              : 'Sun ring cleared! +110'
          )

          if (ringsPassed >= 6) {
            finishFlight(true)
          }
        }

        if (
          invulnerable ||
          obstacle.passed ||
          state !== 'playing'
        ) {
          return
        }

        const hitTop =
          Phaser.Geom.Intersects.RectangleToRectangle(
            eagleHitbox,
            obstacle.topBlock.getBounds()
          )

        const hitBottom =
          Phaser.Geom.Intersects.RectangleToRectangle(
            eagleHitbox,
            obstacle.bottomBlock.getBounds()
          )

        if (hitTop || hitBottom) {
          takeHit(
            obstacle.isFinal
              ? 'You clipped the Nile delivery tower!'
              : 'Impact! The royal parcel nearly slips loose.'
          )
        }
      })
    }

    this.scene.events.on('update', updateFlight)
    this.runtimeCleanups.push(() => {
      this.scene.events.off('update', updateFlight)
    })

    startButton = this.createButton(
      width / 2,
      buttonY,
      252,
      44,
      'BEGIN FALCON FLIGHT',
      startCountdown,
      0x8b5a2b,
      16
    )

    refreshHud()
    this.container.bringToTop(eagle)
    this.container.bringToTop(countdownText)
  }
}