import Phaser from 'phaser'

export type BazaarGameId =
  | 'map-bargain'
  | 'scale-puzzle'
  | 'spice-memory'
  | 'date-trade'
  | 'pottery-fraud'
  | 'donkey-race'
  | 'eagle-delivery'
  | 'grain-pact'

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
  private lives = 3
  private livesText?: Phaser.GameObjects.Text
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
    this.lives = 3
    this.livesText = undefined

    this.container.removeAll(true)
    this.container.setVisible(true)
    this.createBase()
this.createExitButton()

switch (config.gameId) {
      case 'map-bargain':
        this.ensureReedMarshAssets(() => {
          this.createMapBargainGame()
        })
        break
      case 'scale-puzzle':
        this.createScalePuzzleGame()
        break
      case 'spice-memory':
        this.ensureSpiceRevealAssets(() => {
          this.createSpiceMemoryGame()
        })
        break
      case 'date-trade':
        this.ensureDateQuizAssets(() => {
          this.createDateTradeGame()
        })
        break
      case 'pottery-fraud':
        this.ensurePotteryCobraAssets(() => {
          this.createPotteryFraudGame()
        })
        break
      case 'donkey-race':
        this.ensureDonkeyRaceAssets(() => {
          this.createDonkeyRaceGame()
        })
        break
      case 'eagle-delivery':
        this.ensureEagleDeliveryAssets(() => {
          this.createEagleDeliveryGame()
        })
        break
      case 'grain-pact':
        this.ensureGranaryPactAssets(() => {
          this.createGranaryPactGame()
        })
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

  private createLivesMeter(x: number, y: number, lives = 3) {
    this.lives = lives
  
    this.livesText = this.scene.add.text(
      x,
      y,
      this.getLivesLabel(),
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      }
    )
  
    this.livesText.setOrigin(0.5)
    this.livesText.setScrollFactor(0)
  
    this.container.add(this.livesText)
  }
  
  private getLivesLabel() {
    return `LIVES ${'♥'.repeat(this.lives)}${'♡'.repeat(3 - this.lives)}`
  }
  
  private loseLife(onGameOver: () => void) {
    if (this.resultLocked) return
  
    this.lives = Math.max(0, this.lives - 1)
    this.livesText?.setText(this.getLivesLabel())
  
    this.scene.cameras.main.shake(120, 0.003)
  
    if (this.lives <= 0) {
      onGameOver()
    }
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

  private ensureReedMarshAssets(onReady: () => void) {
    const imageAssets = [
      {
        key: 'reed_marsh_bg',
        path: 'assets/minigames/reed_marsh_trial/marsh_background.png',
      },
      {
        key: 'reed_marsh_reeds',
        path: 'assets/minigames/reed_marsh_trial/reeds_cluster.png',
      },
      {
        key: 'reed_marsh_bow',
        path: 'assets/minigames/reed_marsh_trial/wooden_bow.png',
      },
      {
        key: 'reed_marsh_reticle',
        path: 'assets/minigames/reed_marsh_trial/aiming_reticle.png',
      },
      {
        key: 'reed_marsh_arrow',
        path: 'assets/minigames/reed_marsh_trial/arrow.png',
      },
      {
        key: 'reed_marsh_impact',
        path: 'assets/minigames/reed_marsh_trial/impact_small.png',
      },
      {
        key: 'reed_marsh_golden_burst',
        path: 'assets/minigames/reed_marsh_trial/golden_burst.png',
      },
      {
        key: 'reed_marsh_shadow',
        path: 'assets/minigames/reed_marsh_trial/bird_shadow.png',
      },
    ]

    const sheetAssets = [
      {
        key: 'reed_marsh_duck_sheet',
        path: 'assets/minigames/reed_marsh_trial/bird_duck_normal_sheet.png',
        frameWidth: 627,
        frameHeight: 627,
      },
      {
        key: 'reed_marsh_golden_sheet',
        path: 'assets/minigames/reed_marsh_trial/bird_duck_golden_sheet.png',
        frameWidth: 627,
        frameHeight: 627,
      },
      {
        key: 'reed_marsh_forbidden_sheet',
        path: 'assets/minigames/reed_marsh_trial/bird_sacred_ibis_sheet.png',
        frameWidth: 627,
        frameHeight: 627,
      },
      {
        key: 'reed_marsh_decoy_sheet',
        path: 'assets/minigames/reed_marsh_trial/bird_wooden_decoy_sheet.png',
        frameWidth: 627,
        frameHeight: 627,
      },
    ]

    const missingImages = imageAssets.filter(
      (asset) => !this.scene.textures.exists(asset.key)
    )
    const missingSheets = sheetAssets.filter(
      (asset) => !this.scene.textures.exists(asset.key)
    )

    if (missingImages.length === 0 && missingSheets.length === 0) {
      onReady()
      return
    }

    const session = this.sessionId

    const loadingPanel = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      Math.min(470, this.panelWidth - 80),
      116,
      0x241507,
      0.98
    )
    loadingPanel.setStrokeStyle(3, 0xd4af37, 1)

    const loadingText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'Preparing the Reed Marsh Trial...',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: {
          width: Math.min(410, this.panelWidth - 120),
        },
      }
    )
    loadingText.setOrigin(0.5)

    this.addObject(loadingPanel)
    this.addObject(loadingText)

    let loadFailed = false

    const handleLoadError = (file: Phaser.Loader.File) => {
      if (
        missingImages.some((asset) => asset.key === file.key) ||
        missingSheets.some((asset) => asset.key === file.key)
      ) {
        loadFailed = true
      }
    }

    const handleComplete = () => {
      this.scene.load.off('loaderror', handleLoadError)

      if (!this.isVisible || session !== this.sessionId) {
        return
      }

      loadingPanel.destroy()
      loadingText.destroy()

      const stillMissingImages = missingImages.filter(
        (asset) => !this.scene.textures.exists(asset.key)
      )
      const stillMissingSheets = missingSheets.filter(
        (asset) => !this.scene.textures.exists(asset.key)
      )
      const stillMissing = [...stillMissingImages, ...stillMissingSheets]

      if (loadFailed || stillMissing.length > 0) {
        const missingNames = stillMissing
          .map((asset) => asset.path)
          .join('\n')

        const errorText = this.addStatusText(
          `Could not load the Reed Marsh artwork.

${missingNames}

Copy the reed_marsh_trial folder into public/assets/minigames/.`,
          this.scene.scale.height / 2,
          '#ffbd63'
        )
        errorText.setFontSize(14)
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

    missingImages.forEach((asset) => {
      this.scene.load.image(asset.key, asset.path)
    })
    missingSheets.forEach((asset) => {
      this.scene.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      })
    })

    this.scene.load.start()
  }

  private ensureSpiceRevealAssets(onReady: () => void) {
    const assets = [
      {
        key: 'spice_reveal_cinnamon',
        path: 'assets/minigames/spice_reveal/spice_01_cinnamon.png',
      },
      {
        key: 'spice_reveal_cardamom',
        path: 'assets/minigames/spice_reveal/spice_02_cardamom.png',
      },
      {
        key: 'spice_reveal_saffron',
        path: 'assets/minigames/spice_reveal/spice_03_saffron.png',
      },
      {
        key: 'spice_reveal_cloves',
        path: 'assets/minigames/spice_reveal/spice_04_cloves.png',
      },
      {
        key: 'spice_reveal_cumin',
        path: 'assets/minigames/spice_reveal/spice_05_cumin.png',
      },
      {
        key: 'spice_reveal_black_pepper',
        path: 'assets/minigames/spice_reveal/spice_06_black_pepper.png',
      },
      {
        key: 'spice_reveal_turmeric',
        path: 'assets/minigames/spice_reveal/spice_07_turmeric.png',
      },
      {
        key: 'spice_reveal_star_anise',
        path: 'assets/minigames/spice_reveal/spice_08_star_anise.png',
      },
      ...Array.from({ length: 8 }, (_value, index) => ({
        key: `spice_reveal_tile_${index + 1}`,
        path: `assets/minigames/spice_reveal/tile_${String(index + 1).padStart(2, '0')}.png`,
      })),
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
      Math.min(455, this.panelWidth - 80),
      112,
      0x241507,
      0.98
    )
    loadingPanel.setStrokeStyle(3, 0xd4af37, 1)

    const loadingText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'Preparing the Spice Merchant mystery tablets...',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: {
          width: Math.min(400, this.panelWidth - 120),
        },
      }
    )
    loadingText.setOrigin(0.5)

    this.addObject(loadingPanel)
    this.addObject(loadingText)

    let loadFailed = false

    const handleLoadError = (file: Phaser.Loader.File) => {
      if (
        missingAssets.some(
          (asset) => asset.key === file.key
        )
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

      const stillMissing = missingAssets.filter(
        (asset) => !this.scene.textures.exists(asset.key)
      )

      if (loadFailed || stillMissing.length > 0) {
        const missingNames = stillMissing
          .map((asset) => asset.path)
          .join('\n')

        const errorText = this.addStatusText(
          `Could not load the Spice Reveal artwork.\n\n${missingNames}\n\nCopy the spice_reveal folder into public/assets/minigames/.`,
          this.scene.scale.height / 2,
          '#ffbd63'
        )
        errorText.setFontSize(15)
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

  private ensurePotteryCobraAssets(onReady: () => void) {
    const assets = [
      {
        key: 'pottery_cobra_bg',
        path: 'assets/minigames/pottery_cobra/pottery_stall_bg.jpg',
      },
      {
        key: 'pottery_closed_eye',
        path: 'assets/minigames/pottery_cobra/pot_closed_eye.png',
      },
      {
        key: 'pottery_closed_scarab',
        path: 'assets/minigames/pottery_cobra/pot_closed_scarab.png',
      },
      {
        key: 'pottery_closed_lotus',
        path: 'assets/minigames/pottery_cobra/pot_closed_lotus.png',
      },
      {
        key: 'pottery_closed_falcon',
        path: 'assets/minigames/pottery_cobra/pot_closed_falcon.png',
      },
      {
        key: 'pottery_closed_sun',
        path: 'assets/minigames/pottery_cobra/pot_closed_sun.png',
      },
      {
        key: 'pottery_reveal_cobra',
        path: 'assets/minigames/pottery_cobra/pot_reveal_cobra.png',
      },
      {
        key: 'pottery_reveal_treasure',
        path: 'assets/minigames/pottery_cobra/pot_reveal_treasure.png',
      },
      {
        key: 'pottery_reveal_empty',
        path: 'assets/minigames/pottery_cobra/pot_reveal_empty.png',
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
      Math.min(455, this.panelWidth - 80),
      112,
      0x241507,
      0.98
    )
    loadingPanel.setStrokeStyle(3, 0xd4af37, 1)

    const loadingText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'Preparing the Cobra in the Clay challenge...',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: {
          width: Math.min(400, this.panelWidth - 120),
        },
      }
    )
    loadingText.setOrigin(0.5)

    this.addObject(loadingPanel)
    this.addObject(loadingText)

    let loadFailed = false

    const handleLoadError = (file: Phaser.Loader.File) => {
      if (missingAssets.some((asset) => asset.key === file.key)) {
        loadFailed = true
      }
    }

    const handleComplete = () => {
      this.scene.load.off('loaderror', handleLoadError)

      if (!this.isVisible || session !== this.sessionId) {
        return
      }

      loadingPanel.destroy()
      loadingText.destroy()

      const stillMissing = missingAssets.filter(
        (asset) => !this.scene.textures.exists(asset.key)
      )

      if (loadFailed || stillMissing.length > 0) {
        const missingNames = stillMissing
          .map((asset) => asset.path)
          .join('\n')

        const errorText = this.addStatusText(
          `Could not load the Pottery challenge artwork.\n\n${missingNames}\n\nCopy the pottery_cobra folder into public/assets/minigames/.`,
          this.scene.scale.height / 2,
          '#ffbd63'
        )
        errorText.setFontSize(15)
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
      {
        key: 'race_cart_img',
        path: 'assets/minigames/wooden_market_cart_with_blue_canopy.png',
      },
      {
        key: 'race_dates_img',
        path: 'assets/minigames/wicker_basket_filled_with_dates.png',
      },
      {
        key: 'race_watermelon_img',
        path: 'assets/minigames/polished_top_down_watermelon_illustration.png',
      },
      {
        key: 'race_chicken_img',
        path: 'assets/minigames/surprised_chicken_from_above.png',
      },
      {
        key: 'race_chocolate_dates_img',
        path: 'assets/minigames/chocolate_coated_dates_cluster.png',
      },
      {
        key: 'race_golden_date_img',
        path: 'assets/minigames/golden_confection_with_magical_glow.png',
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
          `Could not load:\n${missingNames}\n\nCopy every donkey-race PNG from the ZIP into public/assets/minigames/.`,
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

  private ensureEagleDeliveryAssets(onReady: () => void) {
    const backgroundKey = 'eagle_egypt_bg_v2'
    const spriteKey = 'eagle_cartoon_v3'

    const needsBackground =
      !this.scene.textures.exists(backgroundKey)
    const needsSprite =
      !this.scene.textures.exists(spriteKey)

    if (!needsBackground && !needsSprite) {
      onReady()
      return
    }

    const session = this.sessionId

    const loadingPanel = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      Math.min(430, this.panelWidth - 80),
      108,
      0x241507,
      0.98
    )
    loadingPanel.setStrokeStyle(3, 0xd4af37, 1)

    const loadingText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'Preparing the Nile sky and royal falcon...',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: {
          width: Math.min(380, this.panelWidth - 120),
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
        file.key === backgroundKey ||
        file.key === spriteKey
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

      if (
        loadFailed ||
        !this.scene.textures.exists(backgroundKey) ||
        !this.scene.textures.exists(spriteKey)
      ) {
        const errorText = this.addStatusText(
          'Could not load the Eagle Delivery assets.\n\nCheck public/assets/minigames/egypt_sky_background_v2.png and eagle_cartoon_4frame.png.',
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

    if (needsBackground) {
      this.scene.load.image(
        backgroundKey,
        'assets/minigames/egypt_sky_background_v2.png'
      )
    }

    if (needsSprite) {
      this.scene.load.spritesheet(
        spriteKey,
        'assets/minigames/eagle_cartoon_4frame.png',
        {
          frameWidth: 320,
          frameHeight: 192,
        }
      )
    }

    if (!this.scene.load.isLoading()) {
      this.scene.load.start()
    }
  }

  private ensureDateQuizAssets(onReady: () => void) {
    const assets = [
      {
        key: 'date_quiz_majdoul',
        path: 'assets/minigames/date_quiz/ancient_date_on_papyrus_parchment.png',
      },
      {
        key: 'date_quiz_coffee',
        path: 'assets/minigames/date_quiz/antique_arabic_coffee_scene_on_parchment.png',
      },
      {
        key: 'date_quiz_varieties_abc_1',
        path: 'assets/minigames/date_quiz/egyptian_themed_date_comparison_chart.png',
      },
      {
        key: 'date_quiz_stuffed_almond',
        path: 'assets/minigames/date_quiz/ancient_egyptian_date_on_parchment.png',
      },
      {
        key: 'date_quiz_sukkari',
        path: 'assets/minigames/date_quiz/ancient_egypt_fruit_icon.png',
      },
      {
        key: 'date_quiz_seed',
        path: 'assets/minigames/date_quiz/ancient_scroll_with_dates_and_egyptian_motifs.png',
      },
      {
        key: 'date_quiz_varieties_abc_2',
        path: 'assets/minigames/date_quiz/ancient_egyptian_date_fruits_chart.png',
      },
      {
        key: 'date_quiz_seedless',
        path: 'assets/minigames/date_quiz/ancient_egyptian_date_fruit_illustration.png',
      },
      {
        key: 'date_quiz_ajwa',
        path: 'assets/minigames/date_quiz/ancient_egyptian_date_fruits_chart.png',
      },
      {
        key: 'date_quiz_size_comparison',
        path: 'assets/minigames/date_quiz/ancient_papyrus_with_dates_arrangement.png',
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
      Math.min(440, this.panelWidth - 80),
      110,
      0x241507,
      0.98
    )
    loadingPanel.setStrokeStyle(3, 0xd4af37, 1)

    const loadingText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'Unrolling the Date Merchant papyrus cards...',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: {
          width: Math.min(390, this.panelWidth - 120),
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
        missingAssets.some(
          (asset) => asset.key === file.key
        )
      ) {
        loadFailed = true
      }
    }

    const handleComplete = () => {
      this.scene.load.off(
        'loaderror',
        handleLoadError
      )

      if (
        !this.isVisible ||
        session !== this.sessionId
      ) {
        return
      }

      loadingPanel.destroy()
      loadingText.destroy()

      const stillMissing = missingAssets.filter(
        (asset) =>
          !this.scene.textures.exists(asset.key)
      )

      if (loadFailed || stillMissing.length > 0) {
        const missingNames = stillMissing
          .map((asset) => asset.path)
          .join('\n')

        const errorText = this.addStatusText(
          `Could not load the Date Quiz artwork.\n\n${missingNames}\n\nCopy the date_quiz folder into public/assets/minigames/.`,
          this.scene.scale.height / 2,
          '#ffbd63'
        )
        errorText.setFontSize(15)
        return
      }

      onReady()
    }

    this.scene.load.once(
      'complete',
      handleComplete
    )
    this.scene.load.on(
      'loaderror',
      handleLoadError
    )

    this.runtimeCleanups.push(() => {
      this.scene.load.off(
        'complete',
        handleComplete
      )
      this.scene.load.off(
        'loaderror',
        handleLoadError
      )
    })

    missingAssets.forEach((asset) => {
      this.scene.load.image(
        asset.key,
        asset.path
      )
    })

    if (!this.scene.load.isLoading()) {
      this.scene.load.start()
    }
  }


  private ensureGranaryPactAssets(onReady: () => void) {
    const images = [
      { key: 'granary_pact_bg', path: 'assets/minigames/granary_pact/granary_bg.png' },
      { key: 'granary_cat_icon', path: 'assets/minigames/granary_pact/cat_icon.png' },
      { key: 'granary_mouse_icon', path: 'assets/minigames/granary_pact/mouse_icon.png' },
      { key: 'granary_jar_upright', path: 'assets/minigames/granary_pact/jar_upright.png' },
      { key: 'granary_jar_fallen', path: 'assets/minigames/granary_pact/jar_fallen.png' },
      { key: 'granary_gate_closed', path: 'assets/minigames/granary_pact/gate_closed.png' },
      { key: 'granary_gate_open', path: 'assets/minigames/granary_pact/gate_open.png' },
      { key: 'granary_hole_open', path: 'assets/minigames/granary_pact/hole_open.png' },
      { key: 'granary_lever_up', path: 'assets/minigames/granary_pact/lever_up.png' },
      { key: 'granary_lever_down', path: 'assets/minigames/granary_pact/lever_down.png' },
      { key: 'granary_rope_intact', path: 'assets/minigames/granary_pact/rope_intact.png' },
      { key: 'granary_rope_cut', path: 'assets/minigames/granary_pact/rope_cut.png' },
      { key: 'granary_bridge_up', path: 'assets/minigames/granary_pact/bridge_up.png' },
      { key: 'granary_bridge_down', path: 'assets/minigames/granary_pact/bridge_down.png' },
      { key: 'granary_sack_ground', path: 'assets/minigames/granary_pact/sack_ground.png' },
      { key: 'granary_cart_locked', path: 'assets/minigames/granary_pact/cart_locked.png' },
      { key: 'granary_cart_unlocked', path: 'assets/minigames/granary_pact/cart_unlocked.png' },
      { key: 'granary_cart_loaded', path: 'assets/minigames/granary_pact/cart_loaded.png' },
      { key: 'granary_cart_moving', path: 'assets/minigames/granary_pact/cart_moving.png' },
      { key: 'granary_wheel_peg', path: 'assets/minigames/granary_pact/wheel_peg.png' },
    ]

    const sheets = [
      { key: 'granary_cat_sheet', path: 'assets/minigames/granary_pact/cat_sheet.png', frameWidth: 256, frameHeight: 256 },
      { key: 'granary_mouse_sheet', path: 'assets/minigames/granary_pact/mouse_sheet.png', frameWidth: 256, frameHeight: 256 },
    ]

    const missingImages = images.filter((asset) => !this.scene.textures.exists(asset.key))
    const missingSheets = sheets.filter((asset) => !this.scene.textures.exists(asset.key))
    if (missingImages.length === 0 && missingSheets.length === 0) {
      onReady()
      return
    }

    const session = this.sessionId
    const loadingPanel = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      Math.min(455, this.panelWidth - 80),
      112,
      0x241507,
      0.98
    )
    loadingPanel.setStrokeStyle(3, 0xd4af37, 1)

    const loadingText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'Preparing the Granary Pact artwork...',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      }
    )
    loadingText.setOrigin(0.5)
    this.addObject(loadingPanel)
    this.addObject(loadingText)

    let loadFailed = false
    const allMissing = [...missingImages, ...missingSheets]

    const handleLoadError = (file: Phaser.Loader.File) => {
      if (allMissing.some((asset) => asset.key === file.key)) loadFailed = true
    }

    const handleComplete = () => {
      this.scene.load.off('loaderror', handleLoadError)
      if (!this.isVisible || session !== this.sessionId) return
      loadingPanel.destroy()
      loadingText.destroy()

      const stillMissing = allMissing.filter((asset) => !this.scene.textures.exists(asset.key))
      if (loadFailed || stillMissing.length > 0) {
        const names = stillMissing.map((asset) => asset.path).join('\n')
        const errorText = this.addStatusText(
          `Could not load the Granary Pact artwork.\n\n${names}`,
          this.scene.scale.height / 2,
          '#ffbd63'
        )
        errorText.setFontSize(14)
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

    missingImages.forEach((asset) => this.scene.load.image(asset.key, asset.path))
    missingSheets.forEach((asset) => {
      this.scene.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      })
    })

    if (!this.scene.load.isLoading()) this.scene.load.start()
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
  // 1. BOW MERCHANT — REED MARSH TRIAL
  // ---------------------------------------------------------------------------

  private createMapBargainGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('1. Bow Merchant — Reed Marsh Trial')
    this.addInstruction(
      'Watch the reeds. Hit the ducks. Avoid the bomb.',
      top + 86
    )

    type TrialState = 'ready' | 'round-intro' | 'playing' | 'round-pause' | 'finished'
    type BirdKind = 'duck' | 'fastDuck' | 'goldenDuck' | 'forbiddenBird' | 'decoy'
    type FlightPattern = 'left-right' | 'right-left' | 'diagonal-up' | 'curve' | 'foreground'

    type BirdTarget = {
      sprite: Phaser.GameObjects.Sprite
      shadow?: Phaser.GameObjects.Image
      kind: BirdKind
      pattern: FlightPattern
      x: number
      y: number
      startY: number
      direction: -1 | 1
      speed: number
      verticalSpeed: number
      curveAmount: number
      phase: number
      elapsed: number
      hitRadius: number
      points: number
    }

    type RoundSettings = {
      duration: number
      warning: number
      spawnMin: number
      spawnMax: number
      sizeScale: number
      patterns: FlightPattern[]
      birdPool: BirdKind[]
      introText: string
    }

    type SpawnSpot = {
      x: number
      y: number
      hintDirection: -1 | 1
    }

    const settings = {
      arrows: 12,
      targetScore: 120,
      shotCooldown: 380,
      comboThreshold: 3,
      comboMultiplier: 1.25,
    }

    const soundKeys = {
      bowRelease: 'reed_marsh_sfx_bow_release',
      reedWarning: 'reed_marsh_sfx_reed_warning',
      hit: 'reed_marsh_sfx_hit',
      golden: 'reed_marsh_sfx_golden',
      fail: 'reed_marsh_sfx_fail',
    }

    const playSound = (key: string) => {
      if (!this.scene.cache.audio.exists(key)) return
      this.scene.sound.play(key)
    }

    const readRegistryNumber = (keys: string[]) => {
      for (const key of keys) {
        const value = this.scene.registry.get(key)
        const parsed = Number(value)
        if (Number.isFinite(parsed)) return parsed
      }
      return 0
    }

    const perception = Phaser.Math.Clamp(readRegistryNumber(['perception', 'playerPerception']), 0, 5)
    const dexterity = Phaser.Math.Clamp(readRegistryNumber(['dexterity', 'playerDexterity']), 0, 5)
    const bowUpgrade = Phaser.Math.Clamp(readRegistryNumber(['bowUpgradeLevel', 'bowUpgrade']), 0, 5)
    const shotCooldown = Math.max(220, settings.shotCooldown - bowUpgrade * 28)

    const rounds: RoundSettings[] = [
      {
        duration: 15000,
        warning: 980,
        spawnMin: 1350,
        spawnMax: 1800,
        sizeScale: 1.06,
        patterns: ['left-right', 'right-left'],
        birdPool: ['duck', 'duck', 'duck', 'duck'],
        introText: 'Slow ducks. Watch for the rustle.',
      },
      {
        duration: 15000,
        warning: 720,
        spawnMin: 1000,
        spawnMax: 1450,
        sizeScale: 1,
        patterns: ['left-right', 'right-left', 'diagonal-up', 'curve'],
        birdPool: ['duck', 'duck', 'fastDuck', 'fastDuck', 'forbiddenBird'],
        introText: 'Faster ducks. Bombs begin appearing.',
      },
      {
        duration: 15000,
        warning: 520,
        spawnMin: 860,
        spawnMax: 1220,
        sizeScale: 0.94,
        patterns: ['left-right', 'right-left', 'diagonal-up', 'curve', 'foreground'],
        birdPool: ['duck', 'fastDuck', 'fastDuck', 'goldenDuck', 'forbiddenBird', 'forbiddenBird'],
        introText: 'Bonus ducks are rare. Avoid the bomb.',
      },
    ]

    const playLeft = this.getPanelLeft() + 34
    const playRight = this.getPanelRight() - 34
    const hudY = top + 128
    const hudHeight = 44
    const playTop = top + 170
    const statusY = bottom - 60
    const playBottom = statusY - 24
    const playWidth = playRight - playLeft
    const playHeight = playBottom - playTop
    const playCenterX = (playLeft + playRight) / 2
    const playCenterY = (playTop + playBottom) / 2

    let state: TrialState = 'ready'
    let roundIndex = -1
    let roundToken = 0
    let roundTime = 0
    let nextSpawnTime = 0
    let score = 0
    let arrows = settings.arrows
    let combo = 0
    let shotLocked = false
    let activeFailureObjects: Phaser.GameObjects.GameObject[] = []
    let activeRoundObjects: Phaser.GameObjects.GameObject[] = []

    const birds: BirdTarget[] = []
    const spawnSpots: SpawnSpot[] = [
      { x: playLeft + playWidth * 0.18, y: playBottom - 140, hintDirection: 1 },
      { x: playLeft + playWidth * 0.34, y: playBottom - 155, hintDirection: 1 },
      { x: playLeft + playWidth * 0.52, y: playBottom - 148, hintDirection: 1 },
      { x: playLeft + playWidth * 0.69, y: playBottom - 152, hintDirection: -1 },
      { x: playLeft + playWidth * 0.84, y: playBottom - 138, hintDirection: -1 },
    ]

    const background = this.scene.add.image(playCenterX, playCenterY, 'reed_marsh_bg')
    background.setDisplaySize(playWidth, playHeight)
    this.addObject(background)

    const reedClusters = spawnSpots.map((spot, index) => {
      const reeds = this.scene.add.image(
        spot.x,
        playBottom - 7 - (index % 2) * 5,
        'reed_marsh_reeds'
      )
      reeds.setOrigin(0.5, 1)
      reeds.setDisplaySize(58, 86)
      reeds.setAlpha(0.88)
      this.addObject(reeds)
      return { spot, reeds }
    })

    const playBorder = this.scene.add.rectangle(playCenterX, playCenterY, playWidth, playHeight, 0x000000, 0)
    playBorder.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(playBorder)

    const createHudCard = (x: number, cardWidth: number, bandColor: number) => {
      const shadow = this.scene.add.rectangle(x + 3, hudY + 3, cardWidth, hudHeight, 0x000000, 0.3)
      const card = this.scene.add.rectangle(x, hudY, cardWidth, hudHeight, 0xf0dfb5, 1)
      card.setStrokeStyle(3, 0xb8862e, 1)
      const band = this.scene.add.rectangle(x, hudY - hudHeight / 2 + 6, cardWidth - 10, 8, bandColor, 1)
      this.addObject(shadow)
      this.addObject(card)
      this.addObject(band)
    }

    const hudGap = 12
    const hudCardWidth = (playWidth - hudGap) / 2
    const leftHudX = playLeft + hudCardWidth / 2
    const rightHudX = playRight - hudCardWidth / 2
    createHudCard(leftHudX, hudCardWidth, 0x245d78)
    createHudCard(rightHudX, hudCardWidth, 0x8f2d2d)

    const createHudText = (x: number, text: string, color = '#3b2b1a') => {
      const value = this.scene.add.text(x, hudY + 4, text, {
        fontFamily: 'Georgia',
        fontSize: `${Phaser.Math.Clamp(hudCardWidth / 20, 13, 16)}px`,
        color,
        stroke: '#fff6d8',
        strokeThickness: 2,
        fontStyle: 'bold',
        align: 'center',
      })
      value.setOrigin(0.5)
      this.addObject(value)
      return value
    }

    const roundScoreText = createHudText(leftHudX, 'ROUND 1/3  •  SCORE 0/120')
    const arrowsTimerText = createHudText(rightHudX, `ARROWS ${arrows}  •  15.0s`)

    const comboBadge = this.scene.add.text(playRight - 14, playTop + 14, '', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#ffd966',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
      align: 'right',
    })
    comboBadge.setOrigin(1, 0)
    comboBadge.setVisible(false)
    this.addObject(comboBadge)

    const statusPanel = this.scene.add.rectangle(width / 2, statusY, this.panelWidth - 120, 30, 0xead8aa, 0.98)
    statusPanel.setStrokeStyle(2, 0xb8862e, 1)
    const statusText = this.scene.add.text(width / 2, statusY, 'The bow merchant waits for you to begin.', {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#245d78',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: this.panelWidth - 150 },
    })
    statusText.setOrigin(0.5)
    this.addObject(statusPanel)
    this.addObject(statusText)

    const bow = this.scene.add.image(playCenterX, playBottom - 3, 'reed_marsh_bow')
    bow.setOrigin(0.5, 1)
    bow.setDisplaySize(Math.min(142, playWidth * 0.2), Math.min(108, playHeight * 0.31))
    this.addObject(bow)

    const reticle = this.scene.add.image(playCenterX, playCenterY - 25, 'reed_marsh_reticle')
    reticle.setDisplaySize(40, 40)
    this.addObject(reticle)

    const inputZone = this.scene.add.rectangle(playCenterX, playCenterY, playWidth, playHeight, 0xffffff, 0.001)
    inputZone.setInteractive({ useHandCursor: true })
    this.addObject(inputZone)

    const ensureAnimation = (key: string, texture: string, frameRate: number) => {
      if (this.scene.anims.exists(key)) return
      this.scene.anims.create({
        key,
        frames: this.scene.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
        frameRate,
        repeat: -1,
      })
    }

    ensureAnimation('reed_marsh_duck_fly', 'reed_marsh_duck_sheet', 10)
    ensureAnimation('reed_marsh_fast_duck_fly', 'reed_marsh_duck_sheet', 14)
    ensureAnimation('reed_marsh_golden_duck_fly', 'reed_marsh_golden_sheet', 12)
    ensureAnimation('reed_marsh_forbidden_fly', 'reed_marsh_forbidden_sheet', 10)
    ensureAnimation('reed_marsh_decoy_fly', 'reed_marsh_decoy_sheet', 8)

    const updateHud = () => {
      roundScoreText.setText(`ROUND ${Math.max(1, roundIndex + 1)}/3  •  SCORE ${score}/${settings.targetScore}`)
      arrowsTimerText.setText(`ARROWS ${arrows}  •  ${Math.max(0, roundTime / 1000).toFixed(1)}s`)
      arrowsTimerText.setColor(roundTime <= 3500 ? '#a92f2f' : '#3b2b1a')
      if (combo >= 2) {
        comboBadge.setVisible(true)
        comboBadge.setText(combo >= settings.comboThreshold ? `COMBO ${combo}  ×${settings.comboMultiplier}` : `COMBO ${combo}`)
      } else {
        comboBadge.setVisible(false)
      }
    }

    const removeBirdReference = (bird: BirdTarget) => {
      const index = birds.indexOf(bird)
      if (index >= 0) birds.splice(index, 1)
    }

    const destroyBird = (bird: BirdTarget) => {
      removeBirdReference(bird)
      bird.sprite.destroy()
      bird.shadow?.destroy()
    }

    const clearBirds = () => {
      [...birds].forEach(destroyBird)
    }

    const resetCombo = () => {
      combo = 0
      updateHud()
    }

    const birdTexture = (kind: BirdKind) => {
      switch (kind) {
        case 'goldenDuck':
          return 'reed_marsh_golden_sheet'
        case 'forbiddenBird':
          return 'reed_marsh_forbidden_sheet'
        case 'decoy':
          return 'reed_marsh_decoy_sheet'
        case 'fastDuck':
        case 'duck':
        default:
          return 'reed_marsh_duck_sheet'
      }
    }

    const birdAnimation = (kind: BirdKind) => {
      switch (kind) {
        case 'goldenDuck':
          return 'reed_marsh_golden_duck_fly'
        case 'forbiddenBird':
          return 'reed_marsh_forbidden_fly'
        case 'decoy':
          return 'reed_marsh_decoy_fly'
        case 'fastDuck':
          return 'reed_marsh_fast_duck_fly'
        case 'duck':
        default:
          return 'reed_marsh_duck_fly'
      }
    }

    const birdPoints = (kind: BirdKind) => {
      switch (kind) {
        case 'fastDuck':
          return 20
        case 'goldenDuck':
          return 50
        case 'forbiddenBird':
          return -30
        case 'decoy':
          return 0
        case 'duck':
        default:
          return 10
      }
    }

    const birdDimensions = (kind: BirdKind, scale: number, pattern: FlightPattern) => {
      let birdWidth = 82
      let birdHeight = 50
      if (kind === 'fastDuck') {
        birdWidth = 76
        birdHeight = 46
      }
      if (kind === 'goldenDuck') {
        birdWidth = 80
        birdHeight = 48
      }
      if (kind === 'forbiddenBird') {
        birdWidth = 56
        birdHeight = 56
      }
      if (kind === 'decoy') {
        birdWidth = 56
        birdHeight = 56
      }
      if (pattern === 'foreground') {
        birdWidth *= 1.15
        birdHeight *= 1.15
      }
      return { width: birdWidth * scale, height: birdHeight * scale }
    }

    const chooseSpotForPattern = (pattern: FlightPattern) => {
      if (pattern === 'left-right') return Phaser.Utils.Array.GetRandom(spawnSpots.slice(0, 3))
      if (pattern === 'right-left') return Phaser.Utils.Array.GetRandom(spawnSpots.slice(2))
      return Phaser.Utils.Array.GetRandom(spawnSpots)
    }

    const spawnBird = (spot: SpawnSpot, kind: BirdKind, pattern: FlightPattern, roundSettings: RoundSettings, token: number) => {
      if (state !== 'playing' || token !== roundToken) return

      let direction: -1 | 1 = spot.hintDirection
      if (pattern === 'left-right') direction = 1
      if (pattern === 'right-left') direction = -1

      const spawnInsetX = 42
      const spawnInsetY = 34
      const startX = pattern === 'foreground'
        ? (direction > 0 ? playLeft + spawnInsetX : playRight - spawnInsetX)
        : Phaser.Math.Clamp(spot.x, playLeft + spawnInsetX, playRight - spawnInsetX)
      const startY = pattern === 'foreground'
        ? Phaser.Math.Clamp(playBottom - Phaser.Math.Between(120, 170), playTop + spawnInsetY, playBottom - spawnInsetY)
        : Phaser.Math.Clamp(spot.y - Phaser.Math.Between(28, 60), playTop + spawnInsetY, playBottom - spawnInsetY)

      const shadow = this.scene.add.image(startX, Math.min(playBottom - 24, startY + 40), 'reed_marsh_shadow')
      shadow.setDisplaySize(60, 18)
      shadow.setAlpha(0.32)
      this.addObject(shadow)

      const sprite = this.scene.add.sprite(startX, startY, birdTexture(kind), 0)
      const size = birdDimensions(kind, roundSettings.sizeScale, pattern)
      sprite.setDisplaySize(size.width, size.height)
      sprite.setFlipX(direction > 0)
      sprite.play(birdAnimation(kind), true)
      this.addObject(sprite)

      const baseSpeed = kind === 'fastDuck' ? 238 : kind === 'goldenDuck' ? 214 : kind === 'forbiddenBird' ? 188 : kind === 'decoy' ? 188 : 165
      const patternMultiplier = pattern === 'foreground' ? 1.28 : pattern === 'diagonal-up' ? 1.1 : pattern === 'curve' ? 1.05 : 1

      birds.push({
        sprite,
        shadow,
        kind,
        pattern,
        x: startX,
        y: startY,
        startY,
        direction,
        speed: baseSpeed * patternMultiplier,
        verticalSpeed: pattern === 'diagonal-up' ? (kind === 'fastDuck' ? 96 : 78) : 0,
        curveAmount: Phaser.Math.Between(22, 48),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        elapsed: 0,
        hitRadius: Math.max(25, size.width * 0.38),
        points: birdPoints(kind),
      })

      this.container.bringToTop(bow)
      this.container.bringToTop(reticle)
    }

    const showWarning = (spot: SpawnSpot, roundSettings: RoundSettings, token: number) => {
      if (state !== 'playing' || token !== roundToken) return
      const warningDuration = Math.round(roundSettings.warning * (1 + perception * 0.08))
      playSound(soundKeys.reedWarning)

      const reedEntry = reedClusters.find((entry) => entry.spot === spot)
      if (!reedEntry) return

      const reeds = reedEntry.reeds
      this.scene.tweens.killTweensOf(reeds)
      reeds.setPosition(
        spot.x,
        playBottom - 7 - (spawnSpots.indexOf(spot) % 2) * 5
      )
      reeds.setAngle(0)

      this.addTween({
        targets: reeds,
        x: spot.x + 4,
        angle: spot.hintDirection > 0 ? 4 : -4,
        duration: Math.max(80, Math.round(warningDuration * 0.16)),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          reeds.setPosition(
            spot.x,
            playBottom - 7 - (spawnSpots.indexOf(spot) % 2) * 5
          )
          reeds.setAngle(0)
        },
      })
    }

    const warnAndSpawn = (token: number, roundSettings: RoundSettings) => {
      if (state !== 'playing' || token !== roundToken) return
      const pattern = Phaser.Utils.Array.GetRandom(roundSettings.patterns)
      const spot = chooseSpotForPattern(pattern)
      const kind = Phaser.Utils.Array.GetRandom(roundSettings.birdPool)
      const warningDuration = Math.round(roundSettings.warning * (1 + perception * 0.08))
      showWarning(spot, roundSettings, token)
      this.schedule(warningDuration, () => {
        spawnBird(spot, kind, pattern, roundSettings, token)
      })
    }

    const spawnImpact = (x: number, y: number, golden = false) => {
      const key = golden ? 'reed_marsh_golden_burst' : 'reed_marsh_impact'
      const effect = this.scene.add.image(x, y, key)
      effect.setDisplaySize(golden ? 92 : 48, golden ? 92 : 48)
      this.addObject(effect)
      this.container.bringToTop(effect)
      this.addTween({
        targets: effect,
        alpha: 0,
        scaleX: 1.35,
        scaleY: 1.35,
        duration: golden ? 480 : 210,
        onComplete: () => effect.destroy(),
      })
    }

    const finishSuccess = () => {
      if (state === 'finished') return
      state = 'finished'
      roundToken += 1
      clearBirds()
      statusText.setText('The bow merchant lowers his hood and nods with approval.')
      const rewardKey = 'reedMarshTrialRewardGranted'
      const alreadyRewarded = Boolean(this.scene.registry.get(rewardKey))
      if (!alreadyRewarded) this.scene.registry.set(rewardKey, true)
      this.complete({
        success: true,
        goldDelta: alreadyRewarded ? 0 : 180,
        reputationDelta: alreadyRewarded ? 0 : 18,
        itemKey: alreadyRewarded ? undefined : 'featheredArrow',
        response: `“Your eyes are sharp and your hand is steady. Take these arrows—you have earned them.” Final score: ${score}/${settings.targetScore}.`,
      }, 850)
    }

    const hideFailurePanel = () => {
      activeFailureObjects.forEach((object) => object.destroy())
      activeFailureObjects = []
    }

    const resetTrialValues = () => {
      roundToken += 1
      clearBirds()
      hideFailurePanel()
      activeRoundObjects.forEach((object) => object.destroy())
      activeRoundObjects = []
      score = 0
      arrows = settings.arrows
      combo = 0
      roundIndex = -1
      roundTime = 0
      nextSpawnTime = 0
      shotLocked = false
      state = 'ready'
      reticle.setPosition(playCenterX, playCenterY - 25)
      updateHud()
    }

    const showFailurePanel = () => {
      if (state === 'finished') return
      state = 'finished'
      roundToken += 1
      clearBirds()
      resetCombo()
      const panel = this.scene.add.rectangle(playCenterX, playCenterY, Math.min(520, playWidth - 70), 190, 0xead8aa, 0.98)
      panel.setStrokeStyle(4, 0xc08e34, 1)
      const title = this.scene.add.text(playCenterX, playCenterY - 58, 'THE MARSH REMAINS PATIENT', {
        fontFamily: 'Georgia',
        fontSize: '21px',
        color: '#8d3926',
        stroke: '#fff7df',
        strokeThickness: 2,
        fontStyle: 'bold',
        align: 'center',
      })
      title.setOrigin(0.5)
      const dialogue = this.scene.add.text(playCenterX, playCenterY - 10, `“The marsh is patient, hunter. Steady your hand and try again.”
Score: ${score}/${settings.targetScore}`, {
        fontFamily: 'Georgia',
        fontSize: '17px',
        color: '#3b2917',
        align: 'center',
        wordWrap: { width: Math.min(460, playWidth - 105) },
      })
      dialogue.setOrigin(0.5)
      this.addObject(panel)
      this.addObject(title)
      this.addObject(dialogue)
      const retryButton = this.createButton(playCenterX - 125, playCenterY + 63, 210, 48, 'RETRY TRIAL', () => {
        resetTrialValues()
        startTrial()
      }, 0x27633a, 16)
      const exitButton = this.createButton(playCenterX + 125, playCenterY + 63, 210, 48, 'LEAVE MARSH', () => {
        this.complete({
          success: false,
          goldDelta: 0,
          reputationDelta: 0,
          response: `“The marsh is patient, hunter. Steady your hand and try again.” Final score: ${score}/${settings.targetScore}.`,
        }, 100)
      }, 0x8b3a27, 16)
      activeFailureObjects = [panel, title, dialogue, retryButton.bg, retryButton.text, exitButton.bg, exitButton.text]
      this.container.bringToTop(panel)
      this.container.bringToTop(title)
      this.container.bringToTop(dialogue)
      this.container.bringToTop(retryButton.bg)
      this.container.bringToTop(retryButton.text)
      this.container.bringToTop(exitButton.bg)
      this.container.bringToTop(exitButton.text)
    }

    const endRound = () => {
      if (state !== 'playing') return
      state = 'round-pause'
      roundToken += 1
      clearBirds()
      if (score >= settings.targetScore) {
        finishSuccess()
        return
      }
      if (roundIndex >= rounds.length - 1) {
        showFailurePanel()
        return
      }
      statusText.setText(`Round ${roundIndex + 1} complete. Take a breath and prepare for the next flight.`)
      this.schedule(1450, () => beginNextRound())
    }

    const beginNextRound = () => {
      if (state === 'finished') return
      roundIndex += 1
      if (roundIndex >= rounds.length) {
        showFailurePanel()
        return
      }
      state = 'round-intro'
      roundToken += 1
      const token = roundToken
      const roundSettings = rounds[roundIndex]
      roundTime = roundSettings.duration
      nextSpawnTime = 420
      updateHud()
      const bannerPanel = this.scene.add.rectangle(playCenterX, playCenterY - 6, 336, 96, 0xead8aa, 0.98)
      bannerPanel.setStrokeStyle(4, 0xc08e34, 1)
      const bannerText = this.scene.add.text(playCenterX, playCenterY - 6, `ROUND ${roundIndex + 1}
${roundSettings.introText}`, {
        fontFamily: 'Georgia',
        fontSize: '20px',
        color: '#6f4512',
        stroke: '#fff7df',
        strokeThickness: 2,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 280 },
      })
      bannerText.setOrigin(0.5)
      this.addObject(bannerPanel)
      this.addObject(bannerText)
      activeRoundObjects.push(bannerPanel, bannerText)
      this.container.bringToTop(bannerPanel)
      this.container.bringToTop(bannerText)
      this.schedule(1250, () => {
        if (token !== roundToken || state === 'finished') return
        bannerPanel.destroy()
        bannerText.destroy()
        activeRoundObjects = activeRoundObjects.filter((object) => object !== bannerPanel && object !== bannerText)
        state = 'playing'
        statusText.setText(`Round ${roundIndex + 1}: hit ducks and avoid the bomb.`)
      })
    }

    const startTrial = () => {
      state = 'ready'
      beginNextRound()
    }

    const introPanel = this.scene.add.rectangle(playCenterX, playCenterY, Math.min(520, playWidth - 70), 190, 0xead8aa, 0.98)
    introPanel.setStrokeStyle(4, 0xc08e34, 1)
    const introTitle = this.scene.add.text(playCenterX, playCenterY - 58, 'REED MARSH TRIAL', {
      fontFamily: 'Georgia',
      fontSize: '26px',
      color: '#6f4512',
      stroke: '#fff7df',
      strokeThickness: 2,
      fontStyle: 'bold',
    })
    introTitle.setOrigin(0.5)
    const introText = this.scene.add.text(playCenterX, playCenterY - 6, 'Watch the reeds. Aim carefully.\nHit the ducks. Avoid the bomb.\n12 arrows • 3 rounds • Target score 120', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#3b2917',
      align: 'center',
      wordWrap: { width: Math.min(450, playWidth - 110) },
    })
    introText.setOrigin(0.5)
    this.addObject(introPanel)
    this.addObject(introTitle)
    this.addObject(introText)
    const startButton = this.createButton(playCenterX, playCenterY + 62, 235, 50, 'START TRIAL', () => {
      introPanel.destroy()
      introTitle.destroy()
      introText.destroy()
      startButton.bg.destroy()
      startButton.text.destroy()
      startTrial()
    }, 0x8b5a2b, 17)

    const bounds = new Phaser.Geom.Rectangle(playLeft, playTop, playWidth, playHeight)

    const moveReticle = (pointer: Phaser.Input.Pointer) => {
      if (!Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) return
      reticle.setPosition(Phaser.Math.Clamp(pointer.x, playLeft + 24, playRight - 24), Phaser.Math.Clamp(pointer.y, playTop + 24, playBottom - 24))
    }

    const hitTargetAt = (x: number, y: number) => {
      let selected: BirdTarget | undefined
      let closestDistance = Number.MAX_SAFE_INTEGER
      birds.forEach((bird) => {
        const distance = Phaser.Math.Distance.Between(x, y, bird.x, bird.y)
        if (distance <= bird.hitRadius && distance < closestDistance) {
          selected = bird
          closestDistance = distance
        }
      })
      return selected
    }

    const animateBirdHit = (bird: BirdTarget) => {
      removeBirdReference(bird)
      bird.shadow?.destroy()
      this.addTween({
        targets: bird.sprite,
        y: bird.y + 105,
        angle: bird.direction > 0 ? 68 : -68,
        alpha: 0.2,
        duration: 390,
        ease: 'Quad.easeIn',
        onComplete: () => bird.sprite.destroy(),
      })
    }

    const animateBirdEscape = (bird: BirdTarget, forbidden = false) => {
      removeBirdReference(bird)
      bird.shadow?.destroy()
      this.addTween({
        targets: bird.sprite,
        x: bird.x + bird.direction * 145,
        y: bird.y - 82,
        angle: bird.direction > 0 ? -20 : 20,
        alpha: forbidden ? 1 : 0.4,
        duration: 430,
        ease: 'Sine.easeOut',
        onComplete: () => bird.sprite.destroy(),
      })
    }

    const resolveShot = (targetX: number, targetY: number) => {
      const bird = hitTargetAt(targetX, targetY)
      if (!bird) {
        playSound(soundKeys.fail)
        resetCombo()
        spawnImpact(targetX, targetY)
        statusText.setText('Missed. Lead the duck instead of chasing it.')
      } else if (bird.kind === 'forbiddenBird') {
        playSound(soundKeys.fail)
        score = Math.max(0, score - 30)
        resetCombo()
        spawnImpact(targetX, targetY)
        statusText.setText('That was a bomb! Avoid it. −30')
        animateBirdEscape(bird, true)
      } else if (bird.kind === 'decoy') {
        playSound(soundKeys.fail)
        resetCombo()
        spawnImpact(targetX, targetY)
        statusText.setText('Bomb! One arrow wasted.')
        animateBirdEscape(bird)
      } else {
        playSound(bird.kind === 'goldenDuck' ? soundKeys.golden : soundKeys.hit)
        combo += 1
        const multiplier = combo >= settings.comboThreshold ? settings.comboMultiplier : 1
        const gained = Math.round(bird.points * multiplier)
        score += gained
        spawnImpact(targetX, targetY, bird.kind === 'goldenDuck')
        statusText.setText(bird.kind === 'goldenDuck' ? `Golden duck! +${gained}` : multiplier > 1 ? `Combo hit! +${gained}` : `Clean hit! +${gained}`)
        animateBirdHit(bird)
      }
      updateHud()
      if (score >= settings.targetScore) {
        finishSuccess()
        return
      }
      if (arrows <= 0 && state !== 'finished') {
        this.schedule(450, () => showFailurePanel())
      }
    }

    const fireArrow = () => {
      if (state !== 'playing' || shotLocked || arrows <= 0 || this.resultLocked) return
      shotLocked = true
      playSound(soundKeys.bowRelease)
      arrows -= 1
      updateHud()
      this.addTween({
        targets: bow,
        y: bow.y - 9,
        angle: -3,
        duration: 70,
        yoyo: true,
        onComplete: () => bow.setAngle(0),
      })
      const arrow = this.scene.add.image(playCenterX, playBottom - 44, 'reed_marsh_arrow')
      arrow.setDisplaySize(68, 14)
      arrow.setRotation(Phaser.Math.Angle.Between(playCenterX, playBottom - 44, reticle.x, reticle.y))
      this.addObject(arrow)
      this.container.bringToTop(arrow)
      this.container.bringToTop(reticle)
      this.container.bringToTop(comboBadge)
      const targetX = reticle.x
      const targetY = reticle.y
      const distance = Phaser.Math.Distance.Between(arrow.x, arrow.y, targetX, targetY)
      const travelDuration = Phaser.Math.Clamp(Math.round(distance * 0.5), 95, 220)
      this.addTween({
        targets: arrow,
        x: targetX,
        y: targetY,
        duration: travelDuration,
        ease: 'Linear',
        onComplete: () => {
          if (arrow.active) arrow.destroy()
          if (state === 'finished') return
          resolveShot(targetX, targetY)
        },
      })
      this.schedule(shotCooldown, () => {
        shotLocked = false
      })
    }

    const pointerMove = (pointer: Phaser.Input.Pointer) => {
      moveReticle(pointer)
    }

    const pointerDown = (pointer: Phaser.Input.Pointer) => {
      if (!Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) return
      moveReticle(pointer)
      fireArrow()
    }

    this.scene.input.on('pointermove', pointerMove)
    this.scene.input.on('pointerdown', pointerDown)
    this.runtimeCleanups.push(() => {
      this.scene.input.off('pointermove', pointerMove)
      this.scene.input.off('pointerdown', pointerDown)
    })

    const updateTrial = (_time: number, delta: number) => {
      if (state !== 'playing') return
      const dt = Math.min(delta, 34) / 1000
      roundTime = Math.max(0, roundTime - delta)
      nextSpawnTime -= delta
      if (nextSpawnTime <= 0) {
        const roundSettings = rounds[roundIndex]
        const token = roundToken
        warnAndSpawn(token, roundSettings)
        nextSpawnTime = Phaser.Math.Between(roundSettings.spawnMin, roundSettings.spawnMax)
      }
      for (let index = birds.length - 1; index >= 0; index -= 1) {
        const bird = birds[index]
        bird.elapsed += dt
        const reticleDistance = Phaser.Math.Distance.Between(reticle.x, reticle.y, bird.x, bird.y)
        const dexteritySlow = reticleDistance <= 88 ? Math.max(0.82, 1 - dexterity * 0.035) : 1
        const currentSpeed = bird.speed * dexteritySlow
        if (bird.pattern === 'left-right' || bird.pattern === 'right-left') {
          bird.x += bird.direction * currentSpeed * dt
          bird.y += Math.sin(bird.elapsed * 8 + bird.phase) * 0.6
        } else if (bird.pattern === 'diagonal-up') {
          bird.x += bird.direction * currentSpeed * dt
          bird.y -= bird.verticalSpeed * dexteritySlow * dt
        } else if (bird.pattern === 'curve') {
          bird.x += bird.direction * currentSpeed * dt
          bird.y = bird.startY - Math.sin(bird.elapsed * 2.7 + bird.phase) * bird.curveAmount - bird.elapsed * 15
        } else {
          bird.x += bird.direction * currentSpeed * 1.12 * dt
          bird.y = bird.startY + Math.sin(bird.elapsed * 10 + bird.phase) * 5
        }

        const halfW = Math.max(14, bird.sprite.displayWidth * 0.5 - 2)
        const halfH = Math.max(14, bird.sprite.displayHeight * 0.5 - 2)
        const minX = playLeft + halfW
        const maxX = playRight - halfW
        const minY = playTop + halfH
        const maxY = playBottom - halfH

        const wouldLeaveX = bird.x < minX || bird.x > maxX
        const wouldLeaveY = bird.y < minY || bird.y > maxY

        bird.x = Phaser.Math.Clamp(bird.x, minX, maxX)
        bird.y = Phaser.Math.Clamp(bird.y, minY, maxY)

        bird.sprite.setPosition(bird.x, bird.y)
        bird.sprite.setAngle(Math.sin(bird.elapsed * 10 + bird.phase) * 3 * bird.direction)
        bird.shadow?.setPosition(bird.x, Math.min(playBottom - 24, bird.startY + 40))

        const shouldRemove =
          ((bird.pattern === 'left-right' || bird.pattern === 'right-left' || bird.pattern === 'foreground') && wouldLeaveX) ||
          (bird.pattern === 'diagonal-up' && (wouldLeaveX || wouldLeaveY)) ||
          (bird.pattern === 'curve' && (wouldLeaveX || wouldLeaveY))

        if (shouldRemove) destroyBird(bird)
      }
      updateHud()
      if (roundTime <= 0) endRound()
    }

    this.scene.events.on('update', updateTrial)
    this.runtimeCleanups.push(() => {
      this.scene.events.off('update', updateTrial)
      clearBirds()
    })

    updateHud()
    this.container.bringToTop(bow)
    this.container.bringToTop(reticle)
    this.container.bringToTop(comboBadge)
    this.container.bringToTop(introPanel)
    this.container.bringToTop(introTitle)
    this.container.bringToTop(introText)
    this.container.bringToTop(startButton.bg)
    this.container.bringToTop(startButton.text)
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

    this.addTitle('3. Spice Merchant — Mystery Tablet Reveal')
    this.addInstruction(
      'Reveal the Egyptian tablets and identify the hidden spice before the 12-second sand runs out.',
      top + 86
    )

    type SpiceRound = {
      name: string
      imageKey: string
      tileKey: string
      options: string[]
      correctIndex: number
      fact: string
    }

    const rounds = Phaser.Utils.Array.Shuffle<SpiceRound>([
      {
        name: 'Cinnamon',
        imageKey: 'spice_reveal_cinnamon',
        tileKey: 'spice_reveal_tile_1',
        options: ['Cinnamon', 'Turmeric', 'Cloves'],
        correctIndex: 0,
        fact: 'Cinnamon comes from the fragrant inner bark of cinnamon trees.',
      },
      {
        name: 'Cardamom',
        imageKey: 'spice_reveal_cardamom',
        tileKey: 'spice_reveal_tile_2',
        options: ['Cumin', 'Cardamom', 'Black pepper'],
        correctIndex: 1,
        fact: 'Cardamom pods hide aromatic seeds used in coffee, tea, and desserts.',
      },
      {
        name: 'Saffron',
        imageKey: 'spice_reveal_saffron',
        tileKey: 'spice_reveal_tile_3',
        options: ['Star anise', 'Saffron', 'Cinnamon'],
        correctIndex: 1,
        fact: 'Saffron is collected from delicate crocus flowers and is prized for its colour.',
      },
      {
        name: 'Cloves',
        imageKey: 'spice_reveal_cloves',
        tileKey: 'spice_reveal_tile_4',
        options: ['Cloves', 'Cardamom', 'Cumin'],
        correctIndex: 0,
        fact: 'Cloves are dried flower buds with a powerful warm aroma.',
      },
      {
        name: 'Cumin',
        imageKey: 'spice_reveal_cumin',
        tileKey: 'spice_reveal_tile_5',
        options: ['Black pepper', 'Cumin', 'Turmeric'],
        correctIndex: 1,
        fact: 'Cumin seeds add an earthy flavour to many Middle Eastern dishes.',
      },
      {
        name: 'Black pepper',
        imageKey: 'spice_reveal_black_pepper',
        tileKey: 'spice_reveal_tile_6',
        options: ['Saffron', 'Cloves', 'Black pepper'],
        correctIndex: 2,
        fact: 'Black peppercorns are dried berries and were once traded like treasure.',
      },
      {
        name: 'Turmeric',
        imageKey: 'spice_reveal_turmeric',
        tileKey: 'spice_reveal_tile_7',
        options: ['Turmeric', 'Cinnamon', 'Cardamom'],
        correctIndex: 0,
        fact: 'Turmeric is a golden root spice famous for its bright colour.',
      },
      {
        name: 'Star anise',
        imageKey: 'spice_reveal_star_anise',
        tileKey: 'spice_reveal_tile_8',
        options: ['Cumin', 'Star anise', 'Cloves'],
        correctIndex: 1,
        fact: 'Star anise has a sweet liquorice-like aroma and a distinctive star shape.',
      },
    ])

    const totalRounds = rounds.length
    const roundDuration = 12
    const gridSize = 8
    const totalTiles = gridSize * gridSize

    let roundIndex = 0
    let hearts = 3
    let score = 0
    let correctAnswers = 0
    let secondsRemaining = roundDuration
    let revealedTiles = 0
    let roundLocked = true
    let started = false
    let roundTimer: Phaser.Time.TimerEvent | undefined
    let currentRound = rounds[0]

    const hudY = top + 130
    const hudHeight = 42
    const sideHudWidth = 145
    const centerHudWidth = 190

    const leftHudX = this.getPanelLeft() + 98
    const centerHudX = width / 2
    const rightHudX = this.getPanelRight() - 98

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

    createHudCard(leftHudX, sideHudWidth, 0x8b5a2b)
    createHudCard(centerHudX, centerHudWidth, 0x245d78)
    createHudCard(rightHudX, sideHudWidth, 0x8f2d2d)

    const roundText = this.scene.add.text(
      leftHudX,
      hudY + 4,
      `ROUND 1 / ${totalRounds}`,
      {
        fontFamily: 'Georgia',
        fontSize: '15px',
        color: '#74420d',
        stroke: '#fff4cf',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    roundText.setOrigin(0.5)

    const scoreText = this.scene.add.text(
      centerHudX,
      hudY + 4,
      'SCORE 0',
      {
        fontFamily: 'Georgia',
        fontSize: '17px',
        color: '#245d78',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    scoreText.setOrigin(0.5)

    const heartsText = this.scene.add.text(
      rightHudX,
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

    this.addObject(roundText)
    this.addObject(scoreText)
    this.addObject(heartsText)

    const timerY = top + 165
    const timerWidth = this.panelWidth - 118

    const timerTrack = this.scene.add.rectangle(
      width / 2,
      timerY,
      timerWidth,
      12,
      0x2b2118,
      1
    )
    timerTrack.setStrokeStyle(2, 0xd4af37, 1)

    const timerFill = this.scene.add.rectangle(
      width / 2 - timerWidth / 2 + 2,
      timerY,
      timerWidth - 4,
      8,
      0x4fa4c7,
      1
    )
    timerFill.setOrigin(0, 0.5)

    const timerText = this.scene.add.text(
      this.getPanelRight() - 46,
      timerY,
      '12.0s',
      {
        fontFamily: 'Georgia',
        fontSize: '13px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
      }
    )
    timerText.setOrigin(1, 0.5)

    this.addObject(timerTrack)
    this.addObject(timerFill)
    this.addObject(timerText)

    const feedbackY = top + 194
    const feedbackText = this.scene.add.text(
      width / 2,
      feedbackY,
      'Reveal a few tablets, then make your guess.',
      {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        fontStyle: 'bold',
        wordWrap: { width: this.panelWidth - 100 },
      }
    )
    feedbackText.setOrigin(0.5)
    this.addObject(feedbackText)

    const answerY = bottom - 55
    const puzzleSize = Math.min(
      286,
      this.panelWidth - 245,
      answerY - (top + 216) - 40
    )
    const puzzleCenterY = top + 216 + puzzleSize / 2

    const puzzleShadow = this.scene.add.rectangle(
      width / 2 + 5,
      puzzleCenterY + 6,
      puzzleSize + 12,
      puzzleSize + 12,
      0x000000,
      0.35
    )

    const puzzleBorder = this.scene.add.rectangle(
      width / 2,
      puzzleCenterY,
      puzzleSize + 12,
      puzzleSize + 12,
      0x2b1809,
      1
    )
    puzzleBorder.setStrokeStyle(4, 0xd4af37, 1)

    const puzzleImage = this.scene.add.image(
      width / 2,
      puzzleCenterY,
      currentRound.imageKey
    )
    puzzleImage.setDisplaySize(puzzleSize, puzzleSize)

    this.addObject(puzzleShadow)
    this.addObject(puzzleBorder)
    this.addObject(puzzleImage)

    const tileContainer = this.scene.add.container(
      width / 2,
      puzzleCenterY
    )
    this.addObject(tileContainer)

    const answerGap = 16
    const answerWidth = Math.min(
      216,
      (this.panelWidth - 92 - answerGap * 2) / 3
    )
    const answerX = [
      width / 2 - answerWidth - answerGap,
      width / 2,
      width / 2 + answerWidth + answerGap,
    ]

    const answerButtons: ButtonHandle[] = []

    const setAnswerButtonsVisible = (visible: boolean) => {
      answerButtons.forEach((button) => {
        button.bg.setVisible(visible)
        button.text.setVisible(visible)
      })
    }

    const updateHud = () => {
      roundText.setText(
        `ROUND ${roundIndex + 1} / ${totalRounds}`
      )
      scoreText.setText(`SCORE ${score}`)
      heartsText.setText(
        Array.from(
          { length: 3 },
          (_value, index) => (index < hearts ? '♥' : '♡')
        ).join(' ')
      )
    }

    const updateTimer = () => {
      const ratio = Phaser.Math.Clamp(
        secondsRemaining / roundDuration,
        0,
        1
      )

      timerFill.width = Math.max(
        1,
        (timerWidth - 4) * ratio
      )

      timerFill.setFillStyle(
        secondsRemaining <= 3
          ? 0xc23d35
          : secondsRemaining <= 6
            ? 0xd39a2f
            : 0x4fa4c7,
        1
      )

      timerText.setText(`${secondsRemaining.toFixed(1)}s`)
      timerText.setColor(
        secondsRemaining <= 3 ? '#ff7770' : '#ffd966'
      )
    }

    const stopRoundTimer = () => {
      roundTimer?.remove(false)
      roundTimer = undefined
    }

    const revealAllTiles = () => {
      const remainingTiles = tileContainer.list.filter(
        (object) => object.active
      )

      remainingTiles.forEach((object) => {
        const tile = object as Phaser.GameObjects.Image
        tile.disableInteractive()
      })

      if (remainingTiles.length === 0) return

      this.addTween({
        targets: remainingTiles,
        alpha: 0,
        scaleX: 0.82,
        scaleY: 0.82,
        duration: 260,
        stagger: 4,
        ease: 'Sine.easeOut',
      })
    }

    const styleAnswerButtons = (
      selectedIndex: number | undefined,
      correctIndex: number
    ) => {
      answerButtons.forEach((button, index) => {
        button.setEnabled(false)
        button.text.setAlpha(1)

        if (index === correctIndex) {
          button.bg.setFillStyle(0x27633a, 1)
          button.bg.setStrokeStyle(3, 0x72ff9b, 1)
          return
        }

        if (
          selectedIndex !== undefined &&
          index === selectedIndex
        ) {
          button.bg.setFillStyle(0x7d2d2d, 1)
          button.bg.setStrokeStyle(3, 0xff7770, 1)
        }
      })
    }

    const finishGame = (completedAllRounds: boolean) => {
      stopRoundTimer()
      roundLocked = true

      const success =
        completedAllRounds &&
        correctAnswers >= 5 &&
        hearts > 0

      const goldReward = success
        ? 180 + correctAnswers * 55 + Math.floor(score / 18)
        : Math.max(35, correctAnswers * 32 + Math.floor(score / 35))

      const reputationReward = success
        ? 8 + correctAnswers * 2
        : Math.max(0, correctAnswers - 2)

      this.complete(
        {
          success,
          goldDelta: goldReward,
          reputationDelta: reputationReward,
          response: success
            ? `You identified ${correctAnswers} of ${totalRounds} spices and scored ${score}. The Spice Merchant names you Keeper of the Mystery Shelf.`
            : `You identified ${correctAnswers} of ${totalRounds} spices and scored ${score}. The remaining tablets keep their secrets for another day.`,
        },
        350
      )
    }

    const startRoundTimer = () => {
      stopRoundTimer()

      roundTimer = this.scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          if (
            roundLocked ||
            !this.isVisible ||
            this.resultLocked
          ) {
            return
          }

          secondsRemaining = Math.max(
            0,
            secondsRemaining - 0.1
          )
          updateTimer()

          if (secondsRemaining > 0) return

          roundLocked = true
          stopRoundTimer()
          hearts = Math.max(0, hearts - 1)
          updateHud()
          revealAllTiles()
          styleAnswerButtons(undefined, currentRound.correctIndex)

          feedbackText.setColor('#ffbd63')
          feedbackText.setText(
            `Time! The hidden spice was ${currentRound.name}. ${currentRound.fact}`
          )

          if (hearts <= 0) {
            this.schedule(2900, () => finishGame(false))
            return
          }

          if (roundIndex >= totalRounds - 1) {
            this.schedule(2900, () => finishGame(true))
            return
          }

          this.schedule(2900, () => {
            roundIndex += 1
            prepareRound(true)
          })
        },
      })

      this.timers.push(roundTimer)
    }

    const revealTile = (tile: Phaser.GameObjects.Image) => {
      if (
        roundLocked ||
        tile.getData('revealed') === true ||
        this.resultLocked
      ) {
        return
      }

      tile.setData('revealed', true)
      tile.disableInteractive()
      revealedTiles += 1

      this.addTween({
        targets: tile,
        alpha: 0,
        scaleX: 0.65,
        scaleY: 0.65,
        angle: Phaser.Math.Between(-12, 12),
        duration: 130,
        ease: 'Back.easeIn',
        onComplete: () => tile.destroy(),
      })
    }

    const handleAnswer = (selectedIndex: number) => {
      if (roundLocked || this.resultLocked) return

      roundLocked = true
      stopRoundTimer()
      revealAllTiles()

      const correct =
        selectedIndex === currentRound.correctIndex

      styleAnswerButtons(
        selectedIndex,
        currentRound.correctIndex
      )

      if (correct) {
        correctAnswers += 1

        const unopenedTiles = Math.max(
          0,
          totalTiles - revealedTiles
        )

        const earned =
          100 +
          Math.ceil(secondsRemaining) * 10 +
          unopenedTiles * 2

        score += earned
        feedbackText.setColor('#72ff9b')
        feedbackText.setText(
          `Correct! +${earned} points. ${currentRound.fact}`
        )
      } else {
        hearts = Math.max(0, hearts - 1)
        feedbackText.setColor('#ff7770')
        feedbackText.setText(
          `Not quite — it was ${currentRound.name}. ${currentRound.fact}`
        )
      }

      updateHud()

      if (hearts <= 0) {
        this.schedule(2900, () => finishGame(false))
        return
      }

      if (roundIndex >= totalRounds - 1) {
        this.schedule(2900, () => finishGame(true))
        return
      }

      this.schedule(2900, () => {
        roundIndex += 1
        prepareRound(true)
      })
    }

    answerX.forEach((x, index) => {
      const button = this.createButton(
        x,
        answerY,
        answerWidth,
        48,
        `OPTION ${index + 1}`,
        () => handleAnswer(index),
        0x8b5a2b,
        15
      )
      answerButtons.push(button)
    })

    let startButton: ButtonHandle

    const prepareRound = (activateImmediately: boolean) => {
      stopRoundTimer()
      roundLocked = true
      currentRound = rounds[roundIndex]
      secondsRemaining = roundDuration
      revealedTiles = 0

      puzzleImage.setTexture(currentRound.imageKey)
      puzzleImage.setDisplaySize(puzzleSize, puzzleSize)

      tileContainer.removeAll(true)

      const cellWidth = puzzleSize / gridSize
      const cellHeight = puzzleSize / gridSize

      for (let row = 0; row < gridSize; row += 1) {
        for (let column = 0; column < gridSize; column += 1) {
          const tile = this.scene.add.image(
            -puzzleSize / 2 + cellWidth * (column + 0.5),
            -puzzleSize / 2 + cellHeight * (row + 0.5),
            currentRound.tileKey
          )

          tile.setDisplaySize(
            cellWidth + 1.2,
            cellHeight + 1.2
          )
          tile.setInteractive({ useHandCursor: true })
          tile.setData('revealed', false)
          tile.on('pointerdown', () => revealTile(tile))
          tileContainer.add(tile)
        }
      }

      answerButtons.forEach((button, index) => {
        button.text.setText(
          `${String.fromCharCode(65 + index)}. ${currentRound.options[index]}`
        )
        button.setSelected(false)
        button.setEnabled(true)
        button.bg.setScale(1)
        button.text.setScale(1)
        button.bg.setAlpha(1)
        button.text.setAlpha(1)
      })

      feedbackText.setColor('#ffd966')
      feedbackText.setText('What spice is hidden beneath the tablets?')

      updateHud()
      updateTimer()

      if (activateImmediately) {
        setAnswerButtonsVisible(true)
        startButton.bg.setVisible(false)
        startButton.text.setVisible(false)
        roundLocked = false
        startRoundTimer()
      } else {
        setAnswerButtonsVisible(false)
        startButton.bg.setVisible(true)
        startButton.text.setVisible(true)
      }

      this.container.bringToTop(tileContainer)
      this.container.bringToTop(feedbackText)
      answerButtons.forEach((button) => {
        this.container.bringToTop(button.bg)
        this.container.bringToTop(button.text)
      })
    }

    const beginGame = () => {
      if (started) return

      started = true
      startButton.setEnabled(false)
      startButton.bg.setVisible(false)
      startButton.text.setVisible(false)
      setAnswerButtonsVisible(true)
      roundLocked = false
      feedbackText.setText(
        'Reveal strategically. You can guess at any time.'
      )
      startRoundTimer()
    }

    startButton = this.createButton(
      width / 2,
      answerY,
      260,
      50,
      'BEGIN MYSTERY REVEAL',
      beginGame,
      0x27633a,
      16
    )

    prepareRound(false)
    this.container.bringToTop(startButton.bg)
    this.container.bringToTop(startButton.text)
  }

  // ---------------------------------------------------------------------------
  // 4. DATE MERCHANT — DRAG/DROP ORDER RUSH
  // ---------------------------------------------------------------------------

  private createDateTradeGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('4. Date Merchant — Date Quiz')
    this.addInstruction(
      'Study the papyrus picture and choose the correct answer.',
      top + 86
    )

    type QuizState =
      | 'ready'
      | 'playing'
      | 'feedback'
      | 'finished'

    type QuizQuestion = {
      imageKey: string
      prompt: string
      options: [string, string, string]
      answerIndex: number
      explanation: string
    }

    const questions: QuizQuestion[] = [
      {
        imageKey: 'date_quiz_majdoul',
        prompt: 'Which date variety is shown?',
        options: ['Majdoul', 'Ajwa', 'Sukkari'],
        answerIndex: 0,
        explanation:
          'Majdoul dates are usually large, elongated, soft, and deep brown.',
      },
      {
        imageKey: 'date_quiz_coffee',
        prompt: 'Which drink is traditionally served with dates?',
        options: ['Arabic coffee', 'Tomato juice', 'Lemon soda'],
        answerIndex: 0,
        explanation:
          'Dates and Arabic coffee are a classic hospitality pairing.',
      },
      {
        imageKey: 'date_quiz_varieties_abc_1',
        prompt: 'Which labelled date is Ajwa?',
        options: ['A', 'B', 'C'],
        answerIndex: 0,
        explanation:
          'Ajwa is the small, very dark date labelled A.',
      },
      {
        imageKey: 'date_quiz_stuffed_almond',
        prompt: 'What filling is shown inside this stuffed date?',
        options: ['Almond', 'Olive', 'Pepper'],
        answerIndex: 0,
        explanation:
          'A whole almond is a classic crunchy filling for stuffed dates.',
      },
      {
        imageKey: 'date_quiz_sukkari',
        prompt: 'Which golden date variety is shown?',
        options: ['Sukkari', 'Safawi', 'Ajwa'],
        answerIndex: 0,
        explanation:
          'Sukkari dates are known for their golden colour and sweet flavour.',
      },
      {
        imageKey: 'date_quiz_seed',
        prompt: 'What is naturally found inside a whole date?',
        options: ['A seed', 'A pearl', 'A coffee bean'],
        answerIndex: 0,
        explanation:
          'A whole date naturally contains one seed, also called a pit.',
      },
      {
        imageKey: 'date_quiz_varieties_abc_2',
        prompt: 'Which labelled date is Sukkari?',
        options: ['A', 'B', 'C'],
        answerIndex: 1,
        explanation:
          'Sukkari is the light golden date labelled B.',
      },
      {
        imageKey: 'date_quiz_seedless',
        prompt: 'What was removed to make this date seedless?',
        options: ['The seed', 'The skin', 'The sweetness'],
        answerIndex: 0,
        explanation:
          'Seedless dates are prepared by carefully removing the date pit.',
      },
      {
        imageKey: 'date_quiz_ajwa',
        prompt: 'Which labelled date is the small, very dark Ajwa?',
        options: ['A', 'B', 'C'],
        answerIndex: 2,
        explanation:
          'Ajwa is the small, very dark date labelled C.',
      },
      {
        imageKey: 'date_quiz_size_comparison',
        prompt: 'Which variety is usually the largest?',
        options: ['Majdoul', 'Ajwa', 'Sukkari'],
        answerIndex: 0,
        explanation:
          'Majdoul is commonly recognised as one of the largest date varieties.',
      },
    ]
    

    let state: QuizState = 'ready'
    let currentQuestionIndex = 0
    let correctAnswers = 0
    let hearts = 3
    let score = 0

    let currentImage:
      | Phaser.GameObjects.Image
      | undefined

    const answerButtons: ButtonHandle[] = []

    // Match the boxed HUD used by the Eagle and Donkey games.
    const hudY = top + 130
    const hudHeight = 42
    const sideHudWidth = 145
    const centerHudWidth = 190

    const leftHudX = this.getPanelLeft() + 98
    const centerHudX = width / 2
    const rightHudX = this.getPanelRight() - 98

    const hudObjects: Phaser.GameObjects.GameObject[] = []

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

      hudObjects.push(shadow, card, band)
    }

    createHudCard(
      leftHudX,
      sideHudWidth,
      0x8b5a2b
    )
    createHudCard(
      centerHudX,
      centerHudWidth,
      0x245d78
    )
    createHudCard(
      rightHudX,
      sideHudWidth,
      0x8f2d2d
    )

    const questionCounterText = this.scene.add.text(
      leftHudX,
      hudY + 4,
      'QUESTION 0 / 10',
      {
        fontFamily: 'Georgia',
        fontSize: '14px',
        color: '#74420d',
        stroke: '#fff4cf',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    questionCounterText.setOrigin(0.5)

    const scoreText = this.scene.add.text(
      centerHudX,
      hudY + 4,
      'SCORE 0',
      {
        fontFamily: 'Georgia',
        fontSize: '17px',
        color: '#245d78',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    scoreText.setOrigin(0.5)

    const heartsText = this.scene.add.text(
      rightHudX,
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

    this.addObject(questionCounterText)
    this.addObject(scoreText)
    this.addObject(heartsText)

    hudObjects.push(
      questionCounterText,
      scoreText,
      heartsText
    )

    // Fixed layout:
    // question above the image,
    // image in the middle,
    // MCQs always above the footer.
    const answerY = bottom - 58
    const questionY = hudY + hudHeight / 2 + 31
    const imageTop = questionY + 34
    const imageBottom = answerY - 38
    const imageCenterY =
      (imageTop + imageBottom) / 2

    const questionText = this.scene.add.text(
      width / 2,
      questionY,
      'Ten illustrated questions await.',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 2,
        wordWrap: {
          width: this.panelWidth - 90,
          useAdvancedWrap: true,
        },
      }
    )
    questionText.setOrigin(0.5)

    this.addObject(questionText)

    const imageMaxWidth = Math.min(
      465,
      this.panelWidth - 110
    )

    const imageMaxHeight = Math.max(
      130,
      imageBottom - imageTop
    )

    const answerGap = 12
    const answerWidth = Math.min(
      205,
      (
        this.panelWidth -
        88 -
        answerGap * 2
      ) / 3
    )

    const answerX = [
      width / 2 - answerWidth - answerGap,
      width / 2,
      width / 2 + answerWidth + answerGap,
    ]

    const clearAnswerButtons = () => {
      answerButtons.forEach((button) => {
        if (button.bg.active) {
          button.bg.destroy()
        }

        if (button.text.active) {
          button.text.destroy()
        }
      })

      answerButtons.length = 0
    }

    const showImage = (imageKey: string) => {
      if (currentImage?.active) {
        currentImage.destroy()
      }

      const texture = this.scene.textures.get(
        imageKey
      )

      const source = texture.getSourceImage() as {
        width: number
        height: number
      }

      const scale = Math.min(
        imageMaxWidth / source.width,
        imageMaxHeight / source.height
      )

      currentImage = this.scene.add.image(
        width / 2,
        imageCenterY,
        imageKey
      )

      currentImage.setDisplaySize(
        source.width * scale,
        source.height * scale
      )

      this.addObject(currentImage)

      // The generated picture already contains papyrus edges,
      // so no extra frame, card, shadow, or border is added.
      hudObjects.forEach((object) => {
        this.container.bringToTop(object)
      })
      this.container.bringToTop(questionText)
    }

    const updateHud = () => {
      questionCounterText.setText(
        state === 'ready'
          ? 'QUESTION 0 / 10'
          : `QUESTION ${Math.min(
              currentQuestionIndex + 1,
              questions.length
            )} / ${questions.length}`
      )

      scoreText.setText(`SCORE ${score}`)

      heartsText.setText(
        Array.from(
          { length: 3 },
          (_value, index) =>
            index < hearts ? '♥' : '♡'
        ).join(' ')
      )
    }

    const loseHeart = () => {
      hearts = Math.max(0, hearts - 1)
      updateHud()

      this.scene.cameras.main.shake(
        95,
        0.003
      )

      if (hearts <= 0) {
        questionText.setColor('#ff7770')
        questionText.setText(
          'No hearts left. The Date Merchant closes the papyrus and starts judging quietly.'
        )

        this.schedule(1700, () => {
          finishQuiz()
        })

        return true
      }

      return false
    }

    const styleAnswerButtons = (
      selectedIndex: number,
      correctIndex: number
    ) => {
      answerButtons.forEach(
        (button, index) => {
          button.bg.disableInteractive()
          button.text.setAlpha(1)

          if (index === correctIndex) {
            button.bg.setFillStyle(
              0x27633a,
              1
            )
            button.bg.setStrokeStyle(
              4,
              0x72ff9b,
              1
            )
            return
          }

          if (index === selectedIndex) {
            button.bg.setFillStyle(
              0x7a2f2f,
              1
            )
            button.bg.setStrokeStyle(
              4,
              0xff7c72,
              1
            )
            return
          }

          button.bg.setFillStyle(
            0x33271f,
            0.92
          )
          button.bg.setStrokeStyle(
            2,
            0x6f6256,
            0.8
          )
          button.text.setAlpha(0.5)
        }
      )
    }

    const finishQuiz = () => {
      if (state === 'finished') return

      state = 'finished'
      clearAnswerButtons()

      const perfect =
        correctAnswers === questions.length

      const success =
        correctAnswers >= 6

      const goldReward = Math.max(
        50,
        correctAnswers * 60 +
          Math.floor(score / 20)
      )

      const reputationReward =
        correctAnswers >= 9
          ? 24
          : correctAnswers >= 7
            ? 17
            : correctAnswers >= 6
              ? 10
              : correctAnswers >= 4
                ? 2
                : -2

      const response = perfect
        ? 'Perfect 10/10! The Date Merchant awards you the Golden Date and names you Grand Scholar of the Palm.'
        : correctAnswers >= 8
          ? `Excellent work: ${correctAnswers}/10 correct. The merchant is genuinely impressed.`
          : correctAnswers >= 6
            ? `You passed with ${correctAnswers}/10 correct. The merchant nods respectfully and offers you his finest dates.`
            : `You scored ${correctAnswers}/10. The merchant gives you a practice basket and recommends more studying.`

      this.complete(
        {
          success,
          goldDelta: goldReward,
          reputationDelta: reputationReward,
          itemKey:
            perfect
              ? 'goldenDate'
              : undefined,
          response,
        },
        550
      )
    }

    const showNextQuestion = () => {
      if (
        currentQuestionIndex >=
        questions.length - 1
      ) {
        finishQuiz()
        return
      }

      currentQuestionIndex += 1
      renderQuestion()
    }

    const handleAnswer = (
      selectedIndex: number
    ) => {
      if (
        state !== 'playing' ||
        this.resultLocked
      ) {
        return
      }

      state = 'feedback'

      const question =
        questions[currentQuestionIndex]

      const correct =
        selectedIndex ===
        question.answerIndex

      styleAnswerButtons(
        selectedIndex,
        question.answerIndex
      )

      if (correct) {
        correctAnswers += 1
        score += 100

        questionText.setColor('#72ff9b')
        questionText.setText(
          `Correct! ${question.explanation}`
        )
      } else {
        questionText.setColor('#ff9b8f')
        questionText.setText(
          `Answer: ${question.options[question.answerIndex]}. ${question.explanation}`
        )

        const gameEnded = loseHeart()

        if (gameEnded) {
          return
        }
      }

      updateHud()

      const feedbackDelay = correct ? 3500 : 2800

      this.schedule(feedbackDelay, () => {
        showNextQuestion()
      })
    }

    const renderQuestion = () => {
      state = 'playing'
      clearAnswerButtons()

      const question =
        questions[currentQuestionIndex]

      questionText.setColor('#ffd966')
      questionText.setText(
        question.prompt
      )

      showImage(question.imageKey)

      question.options.forEach(
        (option, index) => {
          const label =
            `${String.fromCharCode(
              65 + index
            )}. ${option}`

          const button = this.createButton(
            answerX[index],
            answerY,
            answerWidth,
            42,
            label,
            () => {
              handleAnswer(index)
            },
            0x7b4b20,
            label.length > 18
              ? 12
              : 14
          )

          answerButtons.push(button)
        }
      )

      updateHud()

      answerButtons.forEach((button) => {
        this.container.bringToTop(button.bg)
        this.container.bringToTop(button.text)
      })
    }

    let startButton: ButtonHandle

    const startQuiz = () => {
      if (state !== 'ready') return

      startButton.bg.setVisible(false)
      startButton.text.setVisible(false)
      startButton.setEnabled(false)

      currentQuestionIndex = 0
      renderQuestion()
    }

    showImage(
      'date_quiz_size_comparison'
    )

    startButton = this.createButton(
      width / 2,
      answerY,
      255,
      44,
      'BEGIN DATE QUIZ',
      startQuiz,
      0x8b5a2b,
      16
    )

    updateHud()

    this.container.bringToTop(
      startButton.bg
    )
    this.container.bringToTop(
      startButton.text
    )
  }

  // ---------------------------------------------------------------------------
  // 5. POTTERY SELLER — INSPECT, ROTATE, TAP, ACCUSE
  // ---------------------------------------------------------------------------

  private createPotteryFraudGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('5. Pottery Seller — Cobra in the Clay')
    this.addInstruction(
      'Inspect the sealed jars at your own pace. First seal the cobra, then open the treasure jar.',
      top + 86
    )

    type PotContent = 'cobra' | 'treasure' | 'empty'
    type PotStage =
      | 'ready'
      | 'cobra'
      | 'treasure'
      | 'transition'
      | 'finished'
    type InspectionTool = 'touch' | 'tap' | 'watch' | 'smell'

    type PotView = {
      container: Phaser.GameObjects.Container
      glow: Phaser.GameObjects.Image
      image: Phaser.GameObjects.Image
      label: Phaser.GameObjects.Text
      closedKey: string
      content: PotContent
      locked: boolean
      opened: boolean
      ruledOutCobra: boolean
      baseScale: number
    }

    const roundPotCounts = [3, 4, 5]
    const roundInspectionLimits = [5, 5, 4]
    const closedPotKeys = [
      'pottery_closed_eye',
      'pottery_closed_scarab',
      'pottery_closed_lotus',
      'pottery_closed_falcon',
      'pottery_closed_sun',
    ]

    const hudY = top + 130
    const hudHeight = 42

    // Keep every interaction row inside the popup. The previous layout used
    // the clue text as a loose vertical anchor, which caused the jar labels,
    // inspection counter, tool buttons, and action buttons to overlap on
    // scaled canvases.
    const actionY = bottom - 34
    const toolY = actionY - 49
    const statusPanelHeight = 52
    const statusPanelY = toolY - 49

    const playTop = top + 166
    const playBottom = statusPanelY - statusPanelHeight / 2 - 10
    const playLeft = this.getPanelLeft() + 30
    const playRight = this.getPanelRight() - 30
    const playWidth = playRight - playLeft
    const playHeight = playBottom - playTop
    const playCenterY = (playTop + playBottom) / 2

    let stage: PotStage = 'ready'
    let roundIndex = 0
    let hearts = 3
    let score = 0
    let inspectionsLeft = roundInspectionLimits[0]
    let selectedIndex = -1
    let solvedRounds = 0
    let cobraIndex = -1
    let treasureIndex = -1
    let decoyIndex = -1
    let decoyTool: InspectionTool = 'touch'
    let potViews: PotView[] = []
    let usedInspections = new Set<string>()

    const backgroundSource = this.scene.textures
      .get('pottery_cobra_bg')
      .getSourceImage() as { width: number; height: number }

    const backgroundScale = Math.max(
      playWidth / backgroundSource.width,
      playHeight / backgroundSource.height
    )

    const background = this.scene.add.image(
      width / 2,
      playCenterY - playHeight * 0.06,
      'pottery_cobra_bg'
    )
    background.setScale(backgroundScale)

    const backgroundMaskShape = this.scene.make.graphics({
      x: 0,
      y: 0,
      add: false,
    })
    backgroundMaskShape.setScrollFactor(0)
    backgroundMaskShape.fillStyle(0xffffff, 1)
    backgroundMaskShape.fillRect(
      playLeft,
      playTop,
      playWidth,
      playHeight
    )

    const backgroundMask = backgroundMaskShape.createGeometryMask()
    background.setMask(backgroundMask)
    this.addObject(background)

    this.runtimeCleanups.push(() => {
      background.clearMask(false)
      backgroundMask.destroy()
      backgroundMaskShape.destroy()
    })

    const backgroundShade = this.scene.add.rectangle(
      width / 2,
      playCenterY,
      playWidth,
      playHeight,
      0x1b0d05,
      0.08
    )
    this.addObject(backgroundShade)

    const playBorder = this.scene.add.rectangle(
      width / 2,
      playCenterY,
      playWidth,
      playHeight,
      0x000000,
      0
    )
    playBorder.setStrokeStyle(3, 0xd4af37, 1)
    this.addObject(playBorder)

    const leftHudX = this.getPanelLeft() + 98
    const centerHudX = width / 2
    const rightHudX = this.getPanelRight() - 98
    const sideHudWidth = 145
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

    createHudCard(leftHudX, sideHudWidth, 0x8b5a2b)
    createHudCard(centerHudX, centerHudWidth, 0x245d78)
    createHudCard(rightHudX, sideHudWidth, 0x8f2d2d)

    const roundText = this.scene.add.text(
      leftHudX,
      hudY + 4,
      'ROUND 1 / 3',
      {
        fontFamily: 'Georgia',
        fontSize: '15px',
        color: '#7a460f',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    roundText.setOrigin(0.5)

    const scoreText = this.scene.add.text(
      centerHudX,
      hudY + 4,
      'SCORE 0',
      {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: '#245d78',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontStyle: 'bold',
      }
    )
    scoreText.setOrigin(0.5)

    const heartsText = this.scene.add.text(
      rightHudX,
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

    this.addObject(roundText)
    this.addObject(scoreText)
    this.addObject(heartsText)


    const statusPanel = this.scene.add.rectangle(
      width / 2,
      statusPanelY,
      this.panelWidth - 72,
      statusPanelHeight,
      0x241507,
      0.97
    )
    statusPanel.setStrokeStyle(2, 0x9b682c, 1)

    const inspectionsText = this.scene.add.text(
      width / 2,
      statusPanelY - 14,
      'INSPECTIONS 5',
      {
        fontFamily: 'Georgia',
        fontSize: '12px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
      }
    )
    inspectionsText.setOrigin(0.5)

    const clueText = this.scene.add.text(
      width / 2,
      statusPanelY + 9,
      'Choose a jar and use an inspection tool.',
      {
        fontFamily: 'Georgia',
        fontSize: '13px',
        color: '#f5ead7',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
        lineSpacing: 1,
        wordWrap: {
          width: this.panelWidth - 112,
          useAdvancedWrap: true,
        },
      }
    )
    clueText.setOrigin(0.5)

    this.addObject(statusPanel)
    this.addObject(inspectionsText)
    this.addObject(clueText)

    let sealButton: ButtonHandle
    let treasureButton: ButtonHandle
    let startButton: ButtonHandle
    const toolButtons: ButtonHandle[] = []

    const setButtonVisible = (button: ButtonHandle, visible: boolean) => {
      button.bg.setVisible(visible)
      button.text.setVisible(visible)
    }

    const contentTexture = (content: PotContent) => {
      if (content === 'cobra') return 'pottery_reveal_cobra'
      if (content === 'treasure') return 'pottery_reveal_treasure'
      return 'pottery_reveal_empty'
    }

    const fitPotTexture = (view: PotView, textureKey: string) => {
      view.image.setTexture(textureKey)
      view.glow.setTexture(textureKey)

      const source = this.scene.textures
        .get(textureKey)
        .getSourceImage() as { width: number; height: number }

      const count = roundPotCounts[roundIndex]
      const maxWidth = count >= 5 ? 92 : count === 4 ? 104 : 118
      const maxHeight = Math.min(136, playHeight * 0.56)
      const scale = Math.min(
        maxWidth / source.width,
        maxHeight / source.height
      )

      view.baseScale = scale
      view.image.setScale(scale)
      view.glow.setScale(scale * 1.06)

      // Keep the jar label inside the framed play area, even when the browser
      // stretches the Phaser canvas with CSS.
      const labelY = Math.min(
        66,
        Math.max(48, playBottom - view.container.y - 14)
      )
      view.label.setY(labelY)
    }

    const refreshPotVisuals = () => {
      potViews.forEach((view, index) => {
        view.image.clearTint()
        view.glow.clearTint()
        view.glow.setAlpha(0)
        view.glow.setScale(view.baseScale * 1.06)
        view.label.setColor('#ffffff')

        if (view.locked) {
          view.glow.setTint(0xff5f5f)
          view.glow.setAlpha(0.52)
          view.label.setColor('#ff8f8f')
          return
        }

        if (view.opened && view.content === 'treasure') {
          view.glow.setTint(0xffd966)
          view.glow.setAlpha(0.58)
          view.label.setColor('#ffd966')
          return
        }

        if (view.opened) {
          view.image.setAlpha(0.72)
          view.glow.setTint(0x8f8f8f)
          view.glow.setAlpha(0.25)
          view.label.setColor('#aaaaaa')
          return
        }

        view.image.setAlpha(1)

        if (index === selectedIndex) {
          const selectedColor =
            stage === 'treasure' ? 0xffd966 : 0x4fdcff
          view.glow.setTint(selectedColor)
          view.glow.setAlpha(0.56)
          view.glow.setScale(view.baseScale * 1.1)
          view.label.setColor(
            stage === 'treasure' ? '#ffd966' : '#72eaff'
          )
        } else if (view.ruledOutCobra && stage === 'cobra') {
          view.glow.setTint(0x4fa4c7)
          view.glow.setAlpha(0.22)
          view.label.setColor('#9ed9ef')
        }
      })
    }

    const updateHud = () => {
      roundText.setText(`ROUND ${roundIndex + 1} / 3`)
      scoreText.setText(`SCORE ${score}`)
      heartsText.setText(
        Array.from(
          { length: 3 },
          (_value, index) => (index < hearts ? '♥' : '♡')
        ).join(' ')
      )

      inspectionsText.setText(`INSPECTIONS ${inspectionsLeft}`)

    }

    const updateControls = () => {
      const active = stage === 'cobra' || stage === 'treasure'
      const selected = selectedIndex >= 0 ? potViews[selectedIndex] : undefined

      toolButtons.forEach((button) => {
        button.setEnabled(
          active &&
            inspectionsLeft > 0 &&
            Boolean(selected) &&
            !selected?.locked &&
            !selected?.opened
        )
      })

      sealButton.setEnabled(
        stage === 'cobra' &&
          Boolean(selected) &&
          !selected?.locked &&
          !selected?.opened &&
          !selected?.ruledOutCobra
      )

      treasureButton.setEnabled(
        stage === 'treasure' &&
          Boolean(selected) &&
          !selected?.locked &&
          !selected?.opened
      )
    }

    const setGameControlsVisible = (visible: boolean) => {
      toolButtons.forEach((button) => setButtonVisible(button, visible))
      setButtonVisible(sealButton, visible)
      setButtonVisible(treasureButton, visible)
    }

    const selectPot = (index: number) => {
      if (stage !== 'cobra' && stage !== 'treasure') return

      const view = potViews[index]
      if (view.locked || view.opened) return

      selectedIndex = index
      clueText.setText(
        stage === 'cobra'
          ? `Jar ${index + 1} selected. Inspect it or seal it as the cobra jar.`
          : `Jar ${index + 1} selected. Inspect it or open it for treasure.`
      )

      refreshPotVisuals()
      updateControls()
    }

    const destroyCurrentPots = () => {
      potViews.forEach((view) => view.container.destroy(true))
      potViews = []
    }

    const revealPot = (
      index: number,
      permanent: boolean,
      forcedContent?: PotContent
    ) => {
      const view = potViews[index]
      const revealContent = forcedContent ?? view.content
      fitPotTexture(view, contentTexture(revealContent))

      if (permanent) {
        view.opened = revealContent !== 'cobra'
        view.locked = revealContent === 'cobra'
      }

      refreshPotVisuals()
    }

    const restoreClosedPot = (index: number) => {
      const view = potViews[index]
      if (!view || view.locked || view.opened || stage === 'finished') return
      fitPotTexture(view, view.closedKey)
      refreshPotVisuals()
    }

    const getClue = (
      view: PotView,
      tool: InspectionTool,
      index: number
    ) => {
      const isDecoy = index === decoyIndex && tool === decoyTool

      if (tool === 'touch') {
        if (view.content === 'cobra') {
          return 'The clay feels strangely warm. Something alive may be coiled inside.'
        }
        if (view.content === 'treasure') {
          return 'The jar is cool but unusually heavy near the base.'
        }
        return isDecoy
          ? 'The sun has warmed this empty jar, but the heat fades quickly.'
          : 'Cool, dry clay. Nothing inside seems to be producing heat.'
      }

      if (tool === 'tap') {
        if (view.content === 'cobra') {
          return 'A soft scrape answers the tap... followed by a tiny hiss.'
        }
        if (view.content === 'treasure') {
          return 'A bright metallic clink rings from deep inside the jar.'
        }
        return isDecoy
          ? 'A loose pottery chip rattles once, then the jar goes silent.'
          : 'A clean hollow echo returns. The jar sounds empty.'
      }

      if (tool === 'watch') {
        if (view.content === 'cobra') {
          return 'The lid shifts by itself and a line of dust trembles along the rim.'
        }
        if (view.content === 'treasure') {
          return 'The jar stays completely still despite its heavy contents.'
        }
        return isDecoy
          ? 'The lid twitches when a floorboard creaks nearby. Probably a false alarm.'
          : 'No movement. Even the dust remains perfectly still.'
      }

      if (view.content === 'cobra') {
        return 'A faint musky animal scent escapes from beneath the lid.'
      }
      if (view.content === 'treasure') {
        return 'Incense, old leather, and metal drift from the sealed jar.'
      }
      return isDecoy
        ? 'A trace of old incense lingers on the clay, but the jar itself smells empty.'
        : 'Only dry clay and dust. There is no scent from inside.'
    }

    const finishGame = (forcedFailure = false) => {
      if (stage === 'finished') return

      stage = 'finished'
      updateControls()

      const success = !forcedFailure && solvedRounds >= 2 && hearts > 0
      const gold = success
        ? 280 + Math.floor(score / 6) + hearts * 75
        : Math.max(50, Math.floor(score / 10))
      const reputation = success
        ? 10 + solvedRounds * 4 + hearts * 2
        : Math.max(0, solvedRounds * 2)

      this.complete(
        {
          success,
          goldDelta: gold,
          reputationDelta: reputation,
          response: success
            ? `You solved ${solvedRounds} of 3 pottery trials with ${hearts} heart${
                hearts === 1 ? '' : 's'
              } left and ${score} points. The merchant now stores every jar at arm's length.`
            : `You solved ${solvedRounds} of 3 pottery trials and scored ${score}. The cobra is safely contained, but your pottery licence is under review.`,
        },
        850
      )
    }

    const loseHeart = (message: string) => {
      hearts -= 1
      score = Math.max(0, score - 35)
      clueText.setText(message)
      this.scene.cameras.main.shake(170, 0.007)
      updateHud()

      if (hearts <= 0) {
        finishGame(true)
        return true
      }

      return false
    }

    const prepareRound = (nextRound: number, beginImmediately: boolean) => {
      stage = beginImmediately ? 'cobra' : 'ready'
      roundIndex = nextRound
      selectedIndex = -1
      usedInspections = new Set<string>()
      inspectionsLeft = roundInspectionLimits[roundIndex]

      destroyCurrentPots()

      const potCount = roundPotCounts[roundIndex]
      const shuffledKeys = Phaser.Utils.Array.Shuffle([...closedPotKeys])
      cobraIndex = Phaser.Math.Between(0, potCount - 1)

      do {
        treasureIndex = Phaser.Math.Between(0, potCount - 1)
      } while (treasureIndex === cobraIndex)

      const emptyIndexes = Array.from(
        { length: potCount },
        (_value, index) => index
      ).filter(
        (index) => index !== cobraIndex && index !== treasureIndex
      )

      decoyIndex =
        roundIndex === 0 || emptyIndexes.length === 0
          ? -1
          : Phaser.Utils.Array.GetRandom(emptyIndexes)
      decoyTool = Phaser.Utils.Array.GetRandom([
        'touch',
        'tap',
        'watch',
        'smell',
      ] as InspectionTool[])

      const contents: PotContent[] = Array.from(
        { length: potCount },
        () => 'empty' as PotContent
      )
      contents[cobraIndex] = 'cobra'
      contents[treasureIndex] = 'treasure'

      const spacing =
        potCount <= 1
          ? 0
          : Math.min(142, (playWidth - 118) / (potCount - 1))
      const startX = width / 2 - (spacing * (potCount - 1)) / 2
      // Lift the jars slightly so their labels never collide with the status
      // panel below the play field.
      const potY = playTop + playHeight * 0.5

      for (let index = 0; index < potCount; index += 1) {
        const x = startX + spacing * index
        const closedKey = shuffledKeys[index]
        const potContainer = this.scene.add.container(x, potY)

        const glow = this.scene.add.image(0, 0, closedKey)
        glow.setTint(0x4fdcff)
        glow.setAlpha(0)

        const potImage = this.scene.add.image(0, 0, closedKey)
        potImage.setInteractive({ useHandCursor: true })

        const label = this.scene.add.text(
          0,
          60,
          `JAR ${index + 1}`,
          {
            fontFamily: 'Georgia',
            fontSize: '13px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold',
          }
        )
        label.setOrigin(0.5)

        potContainer.add([glow, potImage, label])
        this.addObject(potContainer)

        const view: PotView = {
          container: potContainer,
          glow,
          image: potImage,
          label,
          closedKey,
          content: contents[index],
          locked: false,
          opened: false,
          ruledOutCobra: false,
          baseScale: 1,
        }

        potViews.push(view)
        fitPotTexture(view, closedKey)

        const handleSelect = () => selectPot(index)
        potImage.on('pointerdown', handleSelect)
        this.runtimeCleanups.push(() => {
          potImage.off('pointerdown', handleSelect)
        })
      }

      clueText.setText(
        beginImmediately
          ? 'Find the cobra first. Select a jar and inspect it carefully.'
          : 'The jars are sealed. There is no timer, so begin when you are ready.'
      )

      refreshPotVisuals()
      updateHud()
      updateControls()
    }

    const advanceRound = () => {
      if (roundIndex >= roundPotCounts.length - 1) {
        finishGame(false)
        return
      }

      prepareRound(roundIndex + 1, true)
      clueText.setText('A new set of jars arrives. Find the cobra first.')
    }

    const inspectSelected = (tool: InspectionTool) => {
      if (stage !== 'cobra' && stage !== 'treasure') return

      if (selectedIndex < 0) {
        clueText.setText('Select a jar before using an inspection tool.')
        return
      }

      const view = potViews[selectedIndex]
      if (view.locked || view.opened) return

      const inspectionKey = `${selectedIndex}:${tool}`
      if (usedInspections.has(inspectionKey)) {
        clueText.setText(
          `You already used ${tool.toUpperCase()} on Jar ${selectedIndex + 1}. Try another clue.`
        )
        return
      }

      if (inspectionsLeft <= 0) {
        clueText.setText('No inspections remain. Trust your deductions.')
        updateControls()
        return
      }

      usedInspections.add(inspectionKey)
      inspectionsLeft -= 1
      score += 5

      if (tool === 'touch') {
        this.addTween({
          targets: view.image,
          scaleX: view.baseScale * 1.045,
          scaleY: view.baseScale * 0.975,
          duration: 110,
          yoyo: true,
        })
      } else if (tool === 'tap') {
        this.addTween({
          targets: view.container,
          x: '+=4',
          duration: 55,
          yoyo: true,
          repeat: 3,
        })
      } else if (tool === 'watch') {
        this.addTween({
          targets: view.image,
          angle: view.content === 'cobra' ? 3 : 1,
          duration: 110,
          yoyo: true,
          repeat: view.content === 'cobra' ? 2 : 0,
        })
      } else {
        this.addTween({
          targets: view.image,
          alpha: 0.68,
          duration: 130,
          yoyo: true,
        })
      }

      clueText.setText(
        `Jar ${selectedIndex + 1}: ${getClue(
          view,
          tool,
          selectedIndex
        )}`
      )

      updateHud()
      updateControls()
    }

    const sealCobra = () => {
      if (stage !== 'cobra' || selectedIndex < 0) return

      const view = potViews[selectedIndex]
      if (view.ruledOutCobra || view.locked || view.opened) return

      if (view.content === 'cobra') {
        stage = 'transition'
        score +=
          150 + roundIndex * 25 + inspectionsLeft * 15
        revealPot(selectedIndex, true, 'cobra')
        clueText.setText(
          'Correct! The cobra rises from the jar, and the lid is sealed safely.'
        )
        updateHud()
        updateControls()

        this.schedule(3200, () => {
          if (stage === 'finished') return

          stage = 'treasure'
          selectedIndex = -1
          clueText.setText(
            'Now select the jar containing the hidden treasure.'
          )
          refreshPotVisuals()
          updateHud()
          updateControls()
        })
        return
      }

      view.ruledOutCobra = true
      revealPot(selectedIndex, false)
      const ended = loseHeart(
        view.content === 'treasure'
          ? 'Wrong jar! You found the treasure early, but the cobra is still loose.'
          : 'Wrong jar! It is empty, and the merchant charges one heart for the broken seal.'
      )

      if (ended) return

      const wrongIndex = selectedIndex
      selectedIndex = -1
      updateControls()

      this.schedule(2200, () => {
        restoreClosedPot(wrongIndex)
        clueText.setText('Keep searching. The cobra is still hidden.')
        updateControls()
      })
    }

    const openTreasure = () => {
      if (stage !== 'treasure' || selectedIndex < 0) return

      const view = potViews[selectedIndex]
      if (view.locked || view.opened) return

      if (view.content === 'treasure') {
        stage = 'transition'
        score +=
          220 + roundIndex * 35 + inspectionsLeft * 12
        solvedRounds += 1
        revealPot(selectedIndex, true, 'treasure')
        clueText.setText(
          'Treasure found! Coins, jewels, and dates spill from the jar.'
        )
        updateHud()
        updateControls()

        this.schedule(4000, advanceRound)
        return
      }

      revealPot(selectedIndex, true, 'empty')
      const ended = loseHeart(
        'Empty jar! The cobra is safe, but the treasure remains hidden.'
      )

      selectedIndex = -1
      updateControls()

      if (!ended) {
        this.schedule(2200, () => {
          clueText.setText('Choose another sealed jar for the treasure.')
        })
      }
    }

    const toolGap = 10
    const toolButtonWidth = Math.min(
      118,
      (this.panelWidth - 76 - toolGap * 3) / 4
    )
    const toolStep = toolButtonWidth + toolGap
    const toolX = [
      width / 2 - toolStep * 1.5,
      width / 2 - toolStep * 0.5,
      width / 2 + toolStep * 0.5,
      width / 2 + toolStep * 1.5,
    ]

    toolButtons.push(
      this.createButton(
        toolX[0],
        toolY,
        toolButtonWidth,
        36,
        'TOUCH',
        () => inspectSelected('touch'),
        0x245d78,
        12
      )
    )
    toolButtons.push(
      this.createButton(
        toolX[1],
        toolY,
        toolButtonWidth,
        36,
        'TAP',
        () => inspectSelected('tap'),
        0x245d78,
        12
      )
    )
    toolButtons.push(
      this.createButton(
        toolX[2],
        toolY,
        toolButtonWidth,
        36,
        'WATCH',
        () => inspectSelected('watch'),
        0x245d78,
        12
      )
    )
    toolButtons.push(
      this.createButton(
        toolX[3],
        toolY,
        toolButtonWidth,
        36,
        'SMELL',
        () => inspectSelected('smell'),
        0x245d78,
        12
      )
    )

    const actionGap = 16
    const actionButtonWidth = Math.min(
      235,
      (this.panelWidth - 90 - actionGap) / 2
    )
    const actionOffset = actionButtonWidth / 2 + actionGap / 2

    sealButton = this.createButton(
      width / 2 - actionOffset,
      actionY,
      actionButtonWidth,
      38,
      'SEAL THE COBRA',
      sealCobra,
      0x7a3422,
      13
    )

    treasureButton = this.createButton(
      width / 2 + actionOffset,
      actionY,
      actionButtonWidth,
      38,
      'OPEN FOR TREASURE',
      openTreasure,
      0x8b5a2b,
      13
    )

    startButton = this.createButton(
      width / 2,
      actionY,
      250,
      40,
      'BEGIN COBRA HUNT',
      () => {
        if (stage !== 'ready') return

        setButtonVisible(startButton, false)
        setGameControlsVisible(true)
        stage = 'cobra'
        clueText.setText('Find the cobra first. Select a jar and inspect it carefully.')
        updateControls()
      },
      0x8b5a2b,
      15
    )

    setGameControlsVisible(false)
    prepareRound(0, false)

    updateHud()
    this.container.bringToTop(startButton.bg)
    this.container.bringToTop(startButton.text)
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
      'Switch lanes, dodge market hazards, and collect dates, chocolate dates, and golden dates.',
      top + 86
    )

    type RaceState = 'ready' | 'countdown' | 'playing' | 'finished'
    type EntityKind =
      | 'cart'
      | 'watermelon'
      | 'chicken'
      | 'dates'
      | 'chocolate-dates'
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
    let nextRoyalRushAt = 5
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
      'REWARDS 0',
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
      'Use LEFT / RIGHT or A / D. Press SPACE to jump and collect rewards.',
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

      const addRaceImage = (
        textureKey: string,
        displayWidth: number,
        displayHeight: number,
        shadowWidthRatio = 0.72,
        shadowYOffset = 0.2
      ) => {
        const shadow = this.scene.add.ellipse(
          0,
          displayHeight * shadowYOffset,
          displayWidth * shadowWidthRatio,
          Math.max(8, displayHeight * 0.16),
          0x000000,
          0.24
        )

        const image = this.scene.add.image(0, 0, textureKey)
        image.setDisplaySize(displayWidth, displayHeight)

        entityContainer.add([shadow, image])
        return image
      }

      if (kind === 'cart') {
        const cartWidth = Math.min(82, laneWidth * 0.56)
        const cartHeight = cartWidth * 1.62

        addRaceImage(
          'race_cart_img',
          cartWidth,
          cartHeight,
          0.78,
          0.29
        )

        hitWidth = cartWidth * 0.72
        hitHeight = cartHeight * 0.72
      }

      if (kind === 'watermelon') {
        jumpable = true

        addRaceImage(
          'race_watermelon_img',
          46,
          48,
          0.72,
          0.25
        )

        hitWidth = 36
        hitHeight = 36
      }

      if (kind === 'chicken') {
        jumpable = true

        addRaceImage(
          'race_chicken_img',
          46,
          62,
          0.68,
          0.26
        )

        hitWidth = 32
        hitHeight = 42
      }

      if (kind === 'dates') {
        collectible = true
        dangerous = false
        jumpable = false

        addRaceImage(
          'race_dates_img',
          48,
          48,
          0.66,
          0.25
        )

        hitWidth = 36
        hitHeight = 34
      }

      if (kind === 'chocolate-dates') {
        collectible = true
        dangerous = false
        jumpable = false

        addRaceImage(
          'race_chocolate_dates_img',
          46,
          47,
          0.62,
          0.25
        )

        hitWidth = 34
        hitHeight = 33
      }

      if (kind === 'golden-date') {
        collectible = true
        dangerous = false
        jumpable = false

        addRaceImage(
          'race_golden_date_img',
          40,
          58,
          0.62,
          0.28
        )

        hitWidth = 29
        hitHeight = 42

        this.addTween({
          targets: entityContainer,
          scaleX: 1.1,
          scaleY: 1.1,
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
      [{ kind: 'cart', lane: 2 }],
      [
        { kind: 'chocolate-dates', lane: 0 },
        { kind: 'cart', lane: 2, offsetY: -82 },
      ],
      [{ kind: 'chicken', lane: 1, laneVelocity: 48 }],
      [
        { kind: 'cart', lane: 0 },
        { kind: 'dates', lane: 2, offsetY: -78 },
      ],
      [{ kind: 'watermelon', lane: 2, laneVelocity: -58 }],
      [
        { kind: 'chocolate-dates', lane: 1 },
        { kind: 'chicken', lane: 0, offsetY: -82, laneVelocity: 52 },
      ],
      [{ kind: 'golden-date', lane: 1 }],
      [
        { kind: 'cart', lane: 0 },
        { kind: 'watermelon', lane: 2, laneVelocity: -55 },
      ],
      [
        { kind: 'dates', lane: 2 },
        { kind: 'cart', lane: 0, offsetY: -82 },
      ],
      [
        { kind: 'chocolate-dates', lane: 0 },
        { kind: 'watermelon', lane: 2, offsetY: -76, laneVelocity: -62 },
      ],
      [{ kind: 'chicken', lane: 2, laneVelocity: -50 }],
      [
        { kind: 'cart', lane: 1 },
        { kind: 'dates', lane: 0, offsetY: -80 },
      ],
      [
        { kind: 'watermelon', lane: 0, laneVelocity: 62 },
        { kind: 'chocolate-dates', lane: 2, offsetY: -72 },
      ],
      [{ kind: 'golden-date', lane: 2 }],
      [
        { kind: 'cart', lane: 2 },
        { kind: 'dates', lane: 1, offsetY: -78 },
      ],
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

      datesText.setText(`REWARDS ${datesCollected}`)

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
                : 'Switch lanes, jump hazards, and collect date rewards.'
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
            : 'Fresh bazaar dates collected! +90'
        )
      }

      if (entity.kind === 'chocolate-dates') {
        datesCollected += 2
        score += royalRush ? 280 : 140

        status.setText(
          royalRush
            ? 'Chocolate-date combo! Royal Rush score doubled.'
            : 'Chocolate dates collected! +140'
        )
      }

      if (entity.kind === 'golden-date') {
        datesCollected += 3
        score += 300
        hearts = Math.min(3, hearts + 1)

        status.setText(
          'Golden date! +300, three reward points, and one heart restored.'
        )
      }

      if (datesCollected >= nextRoyalRushAt) {
        nextRoyalRushAt += 5
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
        entity.kind === 'chicken'
          ? 'Chicken chaos! Royal Thunder loses a heart.'
          : entity.kind === 'watermelon'
            ? 'Watermelon crash! Royal Thunder loses a heart.'
            : 'Market-cart collision! Royal Thunder loses a heart.'
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
            )}% of the rally and earned ${datesCollected} reward point${
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
          }, ${datesCollected} reward point${
            datesCollected === 1 ? '' : 's'
          }, and ${score} race score. Royal Thunder immediately demands a royal stable.`,
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
          'Switch lanes, jump hazards, and collect date rewards.'
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

    const backgroundKey = 'eagle_egypt_bg_v2'
    const backgroundSource = this.scene.textures
      .get(backgroundKey)
      .getSourceImage() as {
        width: number
        height: number
      }

    const playCenterY = (playTop + playBottom) / 2

    // Cover the full flight window without stretching or letterboxing.
    const backgroundScale = Math.max(
      playWidth / backgroundSource.width,
      playHeight / backgroundSource.height
    )

    const playBg = this.scene.add.image(
      width / 2,
      playCenterY - Math.min(16, playHeight * 0.055),
      backgroundKey
    )
    playBg.setScale(backgroundScale)

    const backgroundMaskShape = this.scene.make.graphics({
      x: 0,
      y: 0,
      add: false,
    })
    backgroundMaskShape.setScrollFactor(0)
    backgroundMaskShape.fillStyle(0xffffff, 1)
    backgroundMaskShape.fillRect(
      playLeft,
      playTop,
      playWidth,
      playHeight
    )

    const backgroundMask =
      backgroundMaskShape.createGeometryMask()

    playBg.setMask(backgroundMask)
    this.addObject(playBg)

    this.runtimeCleanups.push(() => {
      playBg.clearMask(false)
      backgroundMask.destroy()
      backgroundMaskShape.destroy()
    })

    const backgroundTint = this.scene.add.rectangle(
      width / 2,
      playCenterY,
      playWidth,
      playHeight,
      0x102638,
      0.055
    )
    this.addObject(backgroundTint)

    const playBorder = this.scene.add.rectangle(
      width / 2,
      playCenterY,
      playWidth,
      playHeight,
      0x000000,
      0
    )
    playBorder.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(playBorder)

    // Capture clicks across the whole visible game area, not only the
    // rendered pixels of the background.
    const playInputZone = this.scene.add.rectangle(
      width / 2,
      playCenterY,
      playWidth,
      playHeight,
      0xffffff,
      0.001
    )
    playInputZone.setInteractive({ useHandCursor: true })
    this.addObject(playInputZone)

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

    const eagleAnimationKey = 'eagle-cartoon-fly-v3'

    if (!this.scene.anims.exists(eagleAnimationKey)) {
      this.scene.anims.create({
        key: eagleAnimationKey,
        frames: this.scene.anims.generateFrameNumbers(
          'eagle_cartoon_v3',
          {
            start: 0,
            end: 3,
          }
        ),
        frameRate: 5,
        repeat: -1,
        yoyo: true,
      })
    }

    const eagle = this.scene.add.sprite(
      eagleX,
      (playTop + playBottom) / 2,
      'eagle_cartoon_v3',
      0
    )
    eagle.setDisplaySize(112, 67)
    eagle.play(eagleAnimationKey)
    eagle.anims.pause()

    const eagleBaseScaleX = eagle.scaleX
    const eagleBaseScaleY = eagle.scaleY

    this.addObject(eagle)

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

      velocityY = -270

      this.scene.tweens.killTweensOf(eagle)

      this.addTween({
        targets: eagle,
        scaleX: eagleBaseScaleX * 1.055,
        scaleY: eagleBaseScaleY * 0.9,
        duration: 70,
        yoyo: true,
        ease: 'Sine.easeOut',
      })
    }

    const finishFlight = (success: boolean) => {
      if (state === 'finished') return

      state = 'finished'
      eagle.anims.pause()

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
      velocityY = -190
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
        eagle.anims.resume()
        velocityY = -175
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

    playInputZone.on('pointerdown', handleControl)
    this.runtimeCleanups.push(() => {
      playInputZone.off('pointerdown', handleControl)
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
      velocityY += 610 * dt
      velocityY = Math.min(velocityY, 355)
      eagle.y += velocityY * dt
      eagle.setRotation(
        Phaser.Math.Clamp(velocityY / 760, -0.38, 0.48)
      )

      if (eagle.y < playTop + 25) {
        eagle.y = playTop + 25
        takeHit('Too high! The falcon clips a royal banner.')
      } else if (eagle.y > playBottom - 25) {
        eagle.y = playBottom - 25
        takeHit('Too low! A rooftop basket explodes into dates.')
      }

      const eagleHitbox = new Phaser.Geom.Rectangle(
        eagle.x - 31,
        eagle.y - 15,
        62,
        30
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

  // ---------------------------------------------------------------------------
  // 8. GRAIN MERCHANT — THE GRANARY PACT
  // ---------------------------------------------------------------------------

  private createGranaryPactGame() {
    const width = this.scene.scale.width
    const top = this.getPanelTop()
    const bottom = this.getPanelBottom()

    this.addTitle('8. Grain Merchant — The Granary Pact')
    this.addInstruction(
      'Choose CAT or MOUSE, then use the action button to complete each task.',
      top + 82
    )

    type Friend = 'cat' | 'mouse'
    type PactState = 'ready' | 'playing' | 'animating' | 'transition' | 'finished'
    type ActionName =
      | 'pushJar'
      | 'crawlTunnel'
      | 'pullLever'
      | 'chewRope'
      | 'crossBridge'
      | 'carrySack'
      | 'loadCart'
      | 'removePeg'
      | 'pushCart'

    type PactStep = {
      actor: Friend
      action: string
      objective: string
      hint: string
      animation: ActionName
    }

    const rounds: Array<{
      shortTitle: string
      title: string
      intro: string
      steps: PactStep[]
    }> = [
      {
        shortTitle: 'GATE',
        title: 'Open the Store Gate',
        intro: 'Clear the tunnel, send the mouse behind the gate, then open it.',
        steps: [
          {
            actor: 'cat',
            action: 'PUSH JAR',
            objective: 'Move the grain jar away from the tunnel.',
            hint: 'The jar is too heavy for the mouse.',
            animation: 'pushJar',
          },
          {
            actor: 'mouse',
            action: 'ENTER TUNNEL',
            objective: 'Use the tunnel to reach the other side of the gate.',
            hint: 'Only the mouse can fit through the opening.',
            animation: 'crawlTunnel',
          },
          {
            actor: 'mouse',
            action: 'PULL LEVER',
            objective: 'Pull the lever and let the cat through.',
            hint: 'The lever is behind the locked gate.',
            animation: 'pullLever',
          },
        ],
      },
      {
        shortTitle: 'BRIDGE',
        title: 'Recover the Grain Sack',
        intro: 'Release the raised bridge, cross it, and bring the sack back.',
        steps: [
          {
            actor: 'mouse',
            action: 'CHEW ROPE',
            objective: 'Cut the tether holding the bridge upright.',
            hint: 'The mouse can chew through the rope.',
            animation: 'chewRope',
          },
          {
            actor: 'cat',
            action: 'CROSS BRIDGE',
            objective: 'Cross the lowered bridge to the grain sack.',
            hint: 'The cat is steady enough to cross safely.',
            animation: 'crossBridge',
          },
          {
            actor: 'cat',
            action: 'CARRY SACK',
            objective: 'Carry the recovered grain sack back.',
            hint: 'The sack is too heavy for the mouse.',
            animation: 'carrySack',
          },
        ],
      },
      {
        shortTitle: 'CART',
        title: 'Complete the Delivery',
        intro: 'Load the cart, release its wheel, and push it into storage.',
        steps: [
          {
            actor: 'cat',
            action: 'LOAD CART',
            objective: 'Lift the final sack into the empty cart.',
            hint: 'Use the cat’s strength.',
            animation: 'loadCart',
          },
          {
            actor: 'mouse',
            action: 'REMOVE PEG',
            objective: 'Pull the small locking peg from the wheel.',
            hint: 'The mouse can reach the tiny mechanism.',
            animation: 'removePeg',
          },
          {
            actor: 'cat',
            action: 'PUSH CART',
            objective: 'Push the loaded cart into the storage area.',
            hint: 'One final team effort will finish the rescue.',
            animation: 'pushCart',
          },
        ],
      },
    ]

    const playLeft = this.getPanelLeft() + 30
    const playRight = this.getPanelRight() - 30
    const sceneWidth = playRight - playLeft
    const sceneCenterX = (playLeft + playRight) / 2

    const hudY = top + 118
    const progressY = top + 151
    const objectiveY = top + 184
    const objectiveHeight = 44
    const sceneTop = top + 211
    const controlsY = bottom - 50
    const statusY = controlsY - 52
    const sceneBottom = statusY - 24
    const sceneHeight = sceneBottom - sceneTop
    const sceneCenterY = (sceneTop + sceneBottom) / 2
    const floorY = sceneBottom - 18

    let state: PactState = 'ready'
    let roundIndex = 0
    let stepIndex = 0
    let friendship = 3
    let completedStages = 0
    let score = 0
    let selectedFriend: Friend = 'cat'
    let activeTarget: Phaser.GameObjects.Image | undefined

    const ensureAnimation = (
      key: string,
      texture: string,
      start: number,
      end: number,
      frameRate: number,
      repeat: number
    ) => {
      if (this.scene.anims.exists(key)) return
      this.scene.anims.create({
        key,
        frames: this.scene.anims.generateFrameNumbers(texture, { start, end }),
        frameRate,
        repeat,
      })
    }

    ensureAnimation('granary-v6-cat-idle', 'granary_cat_sheet', 0, 3, 4, -1)
    ensureAnimation('granary-v6-cat-walk', 'granary_cat_sheet', 4, 7, 7, -1)
    ensureAnimation('granary-v6-cat-push', 'granary_cat_sheet', 8, 11, 3, 0)
    ensureAnimation('granary-v6-cat-carry', 'granary_cat_sheet', 12, 15, 5, -1)
    ensureAnimation('granary-v6-cat-cart', 'granary_cat_sheet', 16, 19, 5, -1)
    ensureAnimation('granary-v6-cat-celebrate', 'granary_cat_sheet', 20, 23, 6, -1)

    ensureAnimation('granary-v6-mouse-idle', 'granary_mouse_sheet', 0, 3, 4, -1)
    ensureAnimation('granary-v6-mouse-walk', 'granary_mouse_sheet', 4, 7, 7, -1)
    ensureAnimation('granary-v6-mouse-crawl', 'granary_mouse_sheet', 8, 11, 3, 0)
    ensureAnimation('granary-v6-mouse-chew', 'granary_mouse_sheet', 12, 15, 3, 0)
    ensureAnimation('granary-v6-mouse-pull', 'granary_mouse_sheet', 16, 19, 3, 0)
    ensureAnimation('granary-v6-mouse-celebrate', 'granary_mouse_sheet', 20, 23, 6, -1)

    const hudPanel = this.scene.add.rectangle(sceneCenterX, hudY, sceneWidth, 36, 0xead8aa, 1)
    hudPanel.setStrokeStyle(3, 0xd4af37, 1)
    this.addObject(hudPanel)

    const hudText = this.scene.add.text(sceneCenterX, hudY, '', {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#4c321a',
      stroke: '#8a8a8a',
      strokeThickness: 1,
      fontStyle: 'bold',
      align: 'center',
    })
    hudText.setOrigin(0.5)
    this.addObject(hudText)

    const progressConnectors: Phaser.GameObjects.Rectangle[] = []
    const progressMarkers: Array<{
      circle: Phaser.GameObjects.Arc
      number: Phaser.GameObjects.Text
      label: Phaser.GameObjects.Text
    }> = []
    const progressStartX = sceneCenterX - sceneWidth * 0.34
    const progressGap = sceneWidth * 0.34

    for (let index = 0; index < 3; index += 1) {
      const markerX = progressStartX + index * progressGap
      if (index < 2) {
        const connector = this.scene.add.rectangle(
          markerX + progressGap / 2,
          progressY,
          progressGap - 48,
          4,
          0x6f5630,
          1
        )
        this.addObject(connector)
        progressConnectors.push(connector)
      }

      const circle = this.scene.add.circle(markerX, progressY, 14, 0x4a3722, 1)
      circle.setStrokeStyle(3, 0x8f6f3c, 1)
      const number = this.scene.add.text(markerX, progressY, `${index + 1}`, {
        fontFamily: 'Georgia',
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#333333',
        strokeThickness: 3,
        fontStyle: 'bold',
      })
      number.setOrigin(0.5)
      const label = this.scene.add.text(markerX + 21, progressY, rounds[index].shortTitle, {
        fontFamily: 'Georgia',
        fontSize: '11px',
        color: '#bca888',
        stroke: '#333333',
        strokeThickness: 2,
        fontStyle: 'bold',
      })
      label.setOrigin(0, 0.5)

      this.addObject(circle)
      this.addObject(number)
      this.addObject(label)
      progressMarkers.push({ circle, number, label })
    }

    const objectivePanel = this.scene.add.rectangle(
      sceneCenterX,
      objectiveY,
      sceneWidth,
      objectiveHeight,
      0x241507,
      0.98
    )
    objectivePanel.setStrokeStyle(2, 0x9b682c, 1)
    this.addObject(objectivePanel)

    const objectiveText = this.scene.add.text(sceneCenterX, objectiveY, '', {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#f4ead8',
      stroke: '#333333',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: sceneWidth - 34 },
    })
    objectiveText.setOrigin(0.5)
    this.addObject(objectiveText)

    const sceneFrame = this.scene.add.rectangle(
      sceneCenterX,
      sceneCenterY,
      sceneWidth,
      sceneHeight,
      0x2a1809,
      1
    )
    sceneFrame.setStrokeStyle(4, 0xd4af37, 1)
    this.addObject(sceneFrame)

    const background = this.scene.add.image(sceneCenterX, sceneCenterY, 'granary_pact_bg')
    background.setDisplaySize(sceneWidth - 8, sceneHeight - 8)
    this.addObject(background)

    const stageShade = this.scene.add.rectangle(
      sceneCenterX,
      sceneCenterY,
      sceneWidth - 8,
      sceneHeight - 8,
      0x120904,
      0.08
    )
    this.addObject(stageShade)

    const targetPointer = this.scene.add.text(sceneCenterX, floorY - 110, '▼', {
      fontFamily: 'Georgia',
      fontSize: '20px',
      color: '#ffd966',
      stroke: '#3b2b1a',
      strokeThickness: 3,
      fontStyle: 'bold',
    })
    targetPointer.setOrigin(0.5)
    targetPointer.setVisible(false)
    this.addObject(targetPointer)
    this.addTween({
      targets: targetPointer,
      y: '+=6',
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const addProp = (key: string) => {
      const prop = this.scene.add.image(sceneCenterX, floorY, key)
      prop.setOrigin(0.5, 1)
      prop.setVisible(false)
      this.addObject(prop)
      return prop
    }

    const entranceHole = addProp('granary_hole_open')
    const exitHole = addProp('granary_hole_open')
    const jar = addProp('granary_jar_upright')
    const gateClosed = addProp('granary_gate_closed')
    const gateOpen = addProp('granary_gate_open')
    const lever = addProp('granary_lever_up')
    const rope = addProp('granary_rope_intact')
    const ropeCut = addProp('granary_rope_cut')
    const bridgeUp = addProp('granary_bridge_up')
    const bridgeDown = addProp('granary_bridge_down')
    const sack = addProp('granary_sack_ground')
    const cart = addProp('granary_cart_locked')
    const wheelPeg = addProp('granary_wheel_peg')

    const props = [
      entranceHole,
      exitHole,
      jar,
      gateClosed,
      gateOpen,
      lever,
      rope,
      ropeCut,
      bridgeUp,
      bridgeDown,
      sack,
      cart,
      wheelPeg,
    ]

    const catSprite = this.scene.add.sprite(sceneCenterX - 160, floorY, 'granary_cat_sheet', 0)
    catSprite.setOrigin(0.5, 1)
    catSprite.setDisplaySize(122, 122)
    catSprite.play('granary-v6-cat-idle')
    this.addObject(catSprite)

    const mouseSprite = this.scene.add.sprite(sceneCenterX - 72, floorY, 'granary_mouse_sheet', 0)
    mouseSprite.setOrigin(0.5, 1)
    mouseSprite.setDisplaySize(90, 90)
    mouseSprite.play('granary-v6-mouse-idle')
    this.addObject(mouseSprite)

    const catAction = this.scene.add.sprite(sceneCenterX, floorY, 'granary_cat_sheet', 8)
    catAction.setOrigin(0.5, 1)
    catAction.setVisible(false)
    this.addObject(catAction)

    const mouseAction = this.scene.add.sprite(sceneCenterX, floorY, 'granary_mouse_sheet', 8)
    mouseAction.setOrigin(0.5, 1)
    mouseAction.setVisible(false)
    this.addObject(mouseAction)

    const statusPanel = this.scene.add.rectangle(sceneCenterX, statusY, sceneWidth, 38, 0x241507, 0.98)
    statusPanel.setStrokeStyle(2, 0x9b682c, 1)
    this.addObject(statusPanel)

    const statusText = this.scene.add.text(sceneCenterX, statusY, '', {
      fontFamily: 'Georgia',
      fontSize: '13px',
      color: '#f4ead8',
      stroke: '#333333',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: sceneWidth - 34 },
    })
    statusText.setOrigin(0.5)
    this.addObject(statusText)

    const catIconX = sceneCenterX - 174
    const mouseIconX = sceneCenterX - 101
    const iconY = controlsY
    const actionX = sceneCenterX + 108

    const catRing = this.scene.add.circle(catIconX, iconY, 29, 0x18232b, 1)
    catRing.setStrokeStyle(4, 0x6c5a42, 0.8)
    catRing.setInteractive({ useHandCursor: true })
    this.addObject(catRing)

    const catIcon = this.scene.add.image(catIconX, iconY, 'granary_cat_icon')
    catIcon.setDisplaySize(54, 54)
    catIcon.setInteractive({ useHandCursor: true })
    this.addObject(catIcon)

    const mouseRing = this.scene.add.circle(mouseIconX, iconY, 29, 0x18232b, 1)
    mouseRing.setStrokeStyle(4, 0x6c5a42, 0.8)
    mouseRing.setInteractive({ useHandCursor: true })
    this.addObject(mouseRing)

    const mouseIcon = this.scene.add.image(mouseIconX, iconY, 'granary_mouse_icon')
    mouseIcon.setDisplaySize(54, 54)
    mouseIcon.setInteractive({ useHandCursor: true })
    this.addObject(mouseIcon)

    let actionButton: ButtonHandle
    let startButton: ButtonHandle

    const setButtonVisible = (button: ButtonHandle, visible: boolean) => {
      button.bg.setVisible(visible)
      button.text.setVisible(visible)
    }

    const setCharacterControlsVisible = (visible: boolean) => {
      catRing.setVisible(visible)
      catIcon.setVisible(visible)
      mouseRing.setVisible(visible)
      mouseIcon.setVisible(visible)
    }

    const currentRound = () => rounds[roundIndex]
    const currentStep = () => rounds[roundIndex]?.steps[stepIndex]

    const clearTargetInteractions = () => {
      props.forEach((prop) => prop.disableInteractive())
      activeTarget = undefined
      targetPointer.setVisible(false)
    }

    const setActiveTarget = (target: Phaser.GameObjects.Image) => {
      clearTargetInteractions()
      activeTarget = target
      targetPointer.setPosition(
        target.x,
        Math.max(sceneTop + 18, target.y - target.displayHeight - 9)
      )
      targetPointer.setVisible(state === 'playing')
      this.container.bringToTop(targetPointer)
    }

    const hideProps = () => {
      clearTargetInteractions()
      props.forEach((prop) => {
        prop.setVisible(false)
        prop.setAlpha(1)
        prop.setAngle(0)
      })
    }

    const setMainCharacter = (
      sprite: Phaser.GameObjects.Sprite,
      x: number,
      y: number,
      size: number,
      animation: string
    ) => {
      sprite.setVisible(true)
      sprite.setPosition(x, y)
      sprite.setDisplaySize(size, size)
      sprite.setAlpha(1)
      sprite.setAngle(0)
      sprite.play(animation, true)
    }

    const stopActionSprites = () => {
      catAction.stop().setVisible(false)
      mouseAction.stop().setVisible(false)
    }

    const updateSelection = () => {
      const catSelected = selectedFriend === 'cat'
      catRing.setStrokeStyle(catSelected ? 5 : 3, catSelected ? 0x72d6ff : 0x6c5a42, catSelected ? 1 : 0.65)
      mouseRing.setStrokeStyle(catSelected ? 3 : 5, catSelected ? 0x6c5a42 : 0x72ff9b, catSelected ? 0.65 : 1)
      catIcon.setDisplaySize(catSelected ? 58 : 50, catSelected ? 58 : 50)
      mouseIcon.setDisplaySize(catSelected ? 50 : 58, catSelected ? 50 : 58)
      catIcon.setAlpha(catSelected ? 1 : 0.55)
      mouseIcon.setAlpha(catSelected ? 0.55 : 1)
    }

    const updateProgress = () => {
      progressMarkers.forEach((marker, index) => {
        const complete = index < roundIndex
        const current = index === roundIndex
        marker.circle.setFillStyle(complete ? 0x2f6b42 : current ? 0x245d78 : 0x4a3722, 1)
        marker.circle.setStrokeStyle(3, complete ? 0x72ff9b : current ? 0x8ed6ff : 0x8f6f3c, 1)
        marker.label.setColor(complete ? '#9dffb0' : current ? '#ffffff' : '#a99572')
        marker.number.setText(complete ? '✓' : `${index + 1}`)
      })
      progressConnectors.forEach((connector, index) => {
        connector.setFillStyle(index < roundIndex ? 0x5cab73 : 0x6f5630, 1)
      })
    }

    const updateHud = () => {
      const hearts = Array.from({ length: 3 }, (_value, index) => (index < friendship ? '♥' : '♡')).join(' ')
      hudText.setText(`FRIENDSHIP ${hearts}   •   STAGES ${completedStages}/3   •   SCORE ${score}`)
      updateProgress()

      if (state === 'ready') {
        objectiveText.setText('Three connected scenes: open the gate, recover the sack, complete the delivery.')
        statusText.setText('Cat uses strength. Mouse reaches tunnels and mechanisms.')
        return
      }

      const round = currentRound()
      const step = currentStep()
      if (!round || !step) return
      objectiveText.setText(`${round.title}  •  ${step.objective}`)
      statusText.setText(step.hint)
      actionButton.text.setText(step.action)
    }

    const setInteractionsEnabled = (enabled: boolean) => {
      actionButton.setEnabled(enabled)
      if (enabled) {
        catRing.setInteractive({ useHandCursor: true })
        catIcon.setInteractive({ useHandCursor: true })
        mouseRing.setInteractive({ useHandCursor: true })
        mouseIcon.setInteractive({ useHandCursor: true })
        targetPointer.setVisible(Boolean(activeTarget))
      } else {
        catRing.disableInteractive()
        catIcon.disableInteractive()
        mouseRing.disableInteractive()
        mouseIcon.disableInteractive()
        targetPointer.setVisible(false)
      }
    }

    const setupReadyScene = () => {
      hideProps()
      stopActionSprites()
      setMainCharacter(catSprite, sceneCenterX - 54, floorY, 108, 'granary-v6-cat-idle')
      setMainCharacter(mouseSprite, sceneCenterX + 46, floorY, 78, 'granary-v6-mouse-idle')
    }

    const setupGateScene = () => {
      hideProps()
      stopActionSprites()

      const tunnelX = playLeft + sceneWidth * 0.43
      const jarX = tunnelX + 32
      const gateX = playLeft + sceneWidth * 0.73
      const exitX = gateX + 66
      const leverX = playRight - 38

      entranceHole.setPosition(tunnelX, floorY + 1).setDisplaySize(82, 64)
      exitHole.setPosition(exitX, floorY + 1).setDisplaySize(58, 46)
      jar.setPosition(jarX, floorY + 2)
      gateClosed.setPosition(gateX, floorY + 2).setDisplaySize(92, 76)
      gateOpen.setPosition(gateX, floorY + 2).setDisplaySize(92, 76)
      lever.setPosition(leverX, floorY + 1).setDisplaySize(40, 50)

      // The tunnel and lever are visible from the start so the physical puzzle
      // reads clearly before the first action.
      entranceHole.setVisible(true)
      exitHole.setVisible(true).setAlpha(stepIndex >= 2 ? 1 : 0.48)

      jar.setTexture(stepIndex >= 1 ? 'granary_jar_fallen' : 'granary_jar_upright')
      jar.setDisplaySize(stepIndex >= 1 ? 90 : 60, stepIndex >= 1 ? 57 : 78)
      jar.setPosition(stepIndex >= 1 ? tunnelX + 76 : jarX, floorY + 2)
      jar.setVisible(true)

      gateClosed.setVisible(stepIndex < 3)
      gateOpen.setVisible(stepIndex >= 3)
      lever.setTexture(stepIndex >= 3 ? 'granary_lever_down' : 'granary_lever_up')
      lever.setVisible(true)

      if (stepIndex === 0) {
        setMainCharacter(catSprite, playLeft + 62, floorY, 104, 'granary-v6-cat-idle')
        setMainCharacter(mouseSprite, playLeft + 132, floorY, 74, 'granary-v6-mouse-idle')
        setActiveTarget(jar)
      } else if (stepIndex === 1) {
        setMainCharacter(catSprite, tunnelX - 88, floorY, 104, 'granary-v6-cat-idle')
        setMainCharacter(mouseSprite, playLeft + 132, floorY, 74, 'granary-v6-mouse-idle')
        setActiveTarget(entranceHole)
      } else {
        setMainCharacter(catSprite, tunnelX - 88, floorY, 104, 'granary-v6-cat-idle')
        setMainCharacter(mouseSprite, exitX + 10, floorY, 72, 'granary-v6-mouse-idle')
        setActiveTarget(lever)
      }
    }

    const setupBridgeScene = () => {
      hideProps()
      stopActionSprites()

      const bridgeX = sceneCenterX + 10
      const ropeX = bridgeX
      const sackX = playRight - 52

      bridgeUp.setPosition(bridgeX, floorY + 2).setDisplaySize(300, 105)
      bridgeDown.setPosition(bridgeX, floorY + 2).setDisplaySize(300, 62)
      rope.setPosition(ropeX, floorY - 91).setDisplaySize(218, 40).setAngle(0)
      ropeCut.setPosition(ropeX, floorY - 91).setDisplaySize(218, 40).setAngle(0)
      sack.setPosition(sackX, floorY + 2).setDisplaySize(58, 66)

      bridgeUp.setVisible(stepIndex === 0)
      bridgeDown.setVisible(stepIndex >= 1)
      rope.setVisible(stepIndex === 0)
      ropeCut.setVisible(false)
      sack.setVisible(stepIndex < 3)

      if (stepIndex === 0) {
        setMainCharacter(catSprite, playLeft + 58, floorY, 102, 'granary-v6-cat-idle')
        setMainCharacter(mouseSprite, playLeft + 124, floorY, 72, 'granary-v6-mouse-idle')
        setActiveTarget(rope)
      } else if (stepIndex === 1) {
        setMainCharacter(catSprite, playLeft + 58, floorY, 102, 'granary-v6-cat-idle')
        setMainCharacter(mouseSprite, ropeX - 54, floorY, 72, 'granary-v6-mouse-idle')
        setActiveTarget(bridgeDown)
      } else {
        setMainCharacter(catSprite, sackX - 62, floorY, 102, 'granary-v6-cat-idle')
        setMainCharacter(mouseSprite, ropeX - 54, floorY, 72, 'granary-v6-mouse-idle')
        setActiveTarget(sack)
      }
    }

    const setupCartScene = () => {
      hideProps()
      stopActionSprites()

      const sackX = sceneCenterX - 30
      const cartX = playRight - 82

      sack.setPosition(sackX, floorY + 2).setDisplaySize(60, 69)
      cart.setPosition(cartX, floorY + 3).setDisplaySize(132, 95)
      wheelPeg.setPosition(cartX - 40, floorY - 15).setDisplaySize(30, 44)

      // Once loaded, the cart remains visibly loaded through the peg and push steps.
      cart.setTexture(stepIndex === 0 ? 'granary_cart_locked' : 'granary_cart_loaded')
      cart.setVisible(true)
      sack.setVisible(stepIndex === 0)
      wheelPeg.setVisible(stepIndex === 1)

      if (stepIndex === 0) {
        setMainCharacter(catSprite, playLeft + 60, floorY, 102, 'granary-v6-cat-idle')
        setMainCharacter(mouseSprite, playLeft + 126, floorY, 72, 'granary-v6-mouse-idle')
        setActiveTarget(sack)
      } else if (stepIndex === 1) {
        setMainCharacter(catSprite, cartX - 88, floorY, 102, 'granary-v6-cat-idle')
        setMainCharacter(mouseSprite, playLeft + 126, floorY, 72, 'granary-v6-mouse-idle')
        setActiveTarget(wheelPeg)
      } else {
        setMainCharacter(catSprite, cartX - 92, floorY, 102, 'granary-v6-cat-idle')
        setMainCharacter(mouseSprite, cartX - 62, floorY, 72, 'granary-v6-mouse-idle')
        setActiveTarget(cart)
      }
    }

    const configureScene = () => {
      if (state === 'ready') {
        setupReadyScene()
        return
      }
      if (roundIndex >= rounds.length) return
      if (roundIndex === 0) setupGateScene()
      else if (roundIndex === 1) setupBridgeScene()
      else setupCartScene()
    }

    const selectFriend = (friend: Friend) => {
      if (state !== 'playing') return
      selectedFriend = friend
      updateSelection()
    }

    catRing.on('pointerdown', () => selectFriend('cat'))
    catIcon.on('pointerdown', () => selectFriend('cat'))
    mouseRing.on('pointerdown', () => selectFriend('mouse'))
    mouseIcon.on('pointerdown', () => selectFriend('mouse'))

    const showCatAction = (x: number, size: number, animation: string) => {
      catSprite.setVisible(false)
      catAction.setVisible(true)
      catAction.setPosition(x, floorY)
      catAction.setDisplaySize(size, size)
      catAction.play(animation, true)
    }

    const showMouseAction = (x: number, size: number, animation: string) => {
      mouseSprite.setVisible(false)
      mouseAction.setVisible(true)
      mouseAction.setPosition(x, floorY)
      mouseAction.setDisplaySize(size, size)
      mouseAction.play(animation, true)
    }

    const playOnce = (
      sprite: Phaser.GameObjects.Sprite,
      animation: string,
      onComplete: () => void
    ) => {
      const handler = () => {
        sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, handler)
        onComplete()
      }
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, handler)
      sprite.play(animation, true)
    }

    const runActionAnimation = (step: PactStep, done: () => void) => {
      clearTargetInteractions()

      if (step.animation === 'pushJar') {
        const jarStartX = jar.x
        const jarEndX = entranceHole.x + 76
        catSprite.play('granary-v6-cat-walk', true)
        this.addTween({
          targets: catSprite,
          x: jarStartX - 54,
          duration: 620,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            catSprite.play('granary-v6-cat-idle', true)
            const originalScaleX = catSprite.scaleX
            const originalScaleY = catSprite.scaleY
            this.addTween({
              targets: catSprite,
              x: jarStartX - 38,
              scaleX: originalScaleX * 1.05,
              scaleY: originalScaleY * 0.96,
              duration: 420,
              yoyo: true,
              repeat: 1,
              ease: 'Sine.easeInOut',
            })
            this.addTween({
              targets: jar,
              x: jarEndX,
              y: floorY + 7,
              angle: 82,
              duration: 1320,
              ease: 'Cubic.easeInOut',
              onComplete: () => {
                jar.setTexture('granary_jar_fallen')
                jar.setDisplaySize(90, 57)
                jar.setPosition(jarEndX, floorY + 2)
                jar.setAngle(0)
                catSprite.play('granary-v6-cat-idle', true)
                done()
              },
            })
          },
        })
        return
      }

      if (step.animation === 'crawlTunnel') {
        const entranceX = entranceHole.x
        const exitX = exitHole.x
        mouseSprite.play('granary-v6-mouse-walk', true)
        this.addTween({
          targets: mouseSprite,
          x: entranceX - 26,
          duration: 560,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            mouseSprite.play('granary-v6-mouse-idle', true)
            const normalScaleX = mouseSprite.scaleX
            const normalScaleY = mouseSprite.scaleY
            this.addTween({
              targets: mouseSprite,
              x: entranceX + 4,
              alpha: 0,
              scaleX: normalScaleX * 0.38,
              scaleY: normalScaleY * 0.38,
              duration: 650,
              ease: 'Sine.easeIn',
              onComplete: () => {
                mouseSprite.setPosition(exitX - 8, floorY)
                mouseSprite.setAlpha(0)
                mouseSprite.setScale(normalScaleX * 0.38, normalScaleY * 0.38)
                exitHole.setAlpha(1)
                this.addTween({
                  targets: mouseSprite,
                  x: exitX + 10,
                  alpha: 1,
                  scaleX: normalScaleX,
                  scaleY: normalScaleY,
                  duration: 650,
                  ease: 'Sine.easeOut',
                  onComplete: () => {
                    mouseSprite.play('granary-v6-mouse-idle', true)
                    done()
                  },
                })
              },
            })
          },
        })
        return
      }

      if (step.animation === 'pullLever') {
        const leverX = lever.x
        mouseSprite.play('granary-v6-mouse-walk', true)
        this.addTween({
          targets: mouseSprite,
          x: leverX - 24,
          duration: 440,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            mouseSprite.play('granary-v6-mouse-idle', true)
            this.addTween({
              targets: mouseSprite,
              x: leverX - 13,
              angle: -7,
              duration: 230,
              yoyo: true,
              repeat: 2,
              ease: 'Sine.easeInOut',
            })
            this.schedule(420, () => {
              lever.setTexture('granary_lever_down')
              gateOpen.setAlpha(0).setVisible(true)
              this.addTween({ targets: gateClosed, alpha: 0, duration: 520 })
              this.addTween({
                targets: gateOpen,
                alpha: 1,
                duration: 520,
                onComplete: () => {
                  gateClosed.setVisible(false).setAlpha(1)
                  catSprite.play('granary-v6-cat-walk', true)
                  this.addTween({
                    targets: catSprite,
                    x: gateOpen.x + 36,
                    duration: 900,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                      catSprite.play('granary-v6-cat-idle', true)
                      done()
                    },
                  })
                },
              })
            })
          },
        })
        return
      }

      if (step.animation === 'chewRope') {
        const ropeLeftX = rope.x - rope.displayWidth / 2 + 38
        mouseSprite.play('granary-v6-mouse-walk', true)
        this.addTween({
          targets: mouseSprite,
          x: ropeLeftX,
          duration: 600,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            mouseSprite.play('granary-v6-mouse-idle', true)
            const baseScaleX = mouseSprite.scaleX
            const baseScaleY = mouseSprite.scaleY
            this.addTween({
              targets: mouseSprite,
              x: mouseSprite.x + 6,
              angle: { from: -3, to: 3 },
              scaleX: baseScaleX * 1.04,
              scaleY: baseScaleY * 0.97,
              duration: 120,
              yoyo: true,
              repeat: 5,
            })
            this.addTween({
              targets: rope,
              alpha: { from: 1, to: 0.62 },
              duration: 180,
              yoyo: true,
              repeat: 3,
              onComplete: () => {
                rope.setVisible(false).setAlpha(1)
                ropeCut.setVisible(true)
                bridgeDown.setAlpha(0).setPosition(bridgeUp.x, bridgeUp.y - 24).setVisible(true)
                this.addTween({ targets: bridgeUp, alpha: 0, y: bridgeUp.y + 18, duration: 760, ease: 'Sine.easeIn' })
                this.addTween({
                  targets: bridgeDown,
                  alpha: 1,
                  y: floorY + 2,
                  duration: 760,
                  ease: 'Bounce.easeOut',
                  onComplete: () => {
                    bridgeUp.setVisible(false).setAlpha(1)
                    ropeCut.setVisible(false)
                    mouseSprite.setAngle(0)
                    mouseSprite.play('granary-v6-mouse-idle', true)
                    done()
                  },
                })
              },
            })
          },
        })
        return
      }

      if (step.animation === 'crossBridge') {
        const deckY = floorY - 24
        const bridgeLeftX = bridgeDown.x - bridgeDown.displayWidth * 0.34
        const bridgeRightX = bridgeDown.x + bridgeDown.displayWidth * 0.34
        catSprite.play('granary-v6-cat-walk', true)
        this.addTween({
          targets: catSprite,
          x: bridgeLeftX,
          y: deckY,
          duration: 420,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.addTween({
              targets: catSprite,
              x: bridgeRightX,
              y: deckY,
              duration: 1050,
              ease: 'Linear',
              onComplete: () => {
                this.addTween({
                  targets: catSprite,
                  x: sack.x - 54,
                  y: floorY,
                  duration: 360,
                  ease: 'Sine.easeOut',
                  onComplete: () => {
                    catSprite.play('granary-v6-cat-idle', true)
                    done()
                  },
                })
              },
            })
          },
        })
        return
      }

      if (step.animation === 'carrySack') {
        const sackX = sack.x
        const deckY = floorY - 24
        const bridgeRightX = bridgeDown.x + bridgeDown.displayWidth * 0.34
        const bridgeLeftX = bridgeDown.x - bridgeDown.displayWidth * 0.34
        catSprite.play('granary-v6-cat-walk', true)
        this.addTween({
          targets: catSprite,
          x: sackX - 34,
          duration: 360,
          onComplete: () => {
            sack.setVisible(false)
            catSprite.setVisible(false)
            catAction.setVisible(true)
            catAction.setPosition(sackX - 18, floorY)
            catAction.setDisplaySize(120, 120)
            catAction.play('granary-v6-cat-carry', true)
            this.addTween({
              targets: catAction,
              x: bridgeRightX,
              y: deckY,
              duration: 420,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                this.addTween({
                  targets: catAction,
                  x: bridgeLeftX,
                  y: deckY,
                  duration: 1050,
                  ease: 'Linear',
                  onComplete: () => {
                    this.addTween({
                      targets: catAction,
                      x: playLeft + 92,
                      y: floorY,
                      duration: 360,
                      ease: 'Sine.easeOut',
                      onComplete: () => {
                        catAction.setVisible(false)
                        setMainCharacter(catSprite, playLeft + 92, floorY, 102, 'granary-v6-cat-idle')
                        done()
                      },
                    })
                  },
                })
              },
            })
          },
        })
        return
      }

      if (step.animation === 'loadCart') {
        const sackX = sack.x
        const cartX = cart.x
        catSprite.play('granary-v6-cat-walk', true)
        this.addTween({
          targets: catSprite,
          x: sackX - 38,
          duration: 520,
          onComplete: () => {
            sack.setVisible(false)
            catSprite.setVisible(false)
            catAction.setVisible(true)
            catAction.setPosition(sackX - 18, floorY)
            catAction.setDisplaySize(120, 120)
            catAction.play('granary-v6-cat-carry', true)
            this.addTween({
              targets: catAction,
              x: cartX - 78,
              duration: 1050,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                catAction.setVisible(false)
                cart.setTexture('granary_cart_loaded').setDisplaySize(138, 100)
                setMainCharacter(catSprite, cartX - 88, floorY, 102, 'granary-v6-cat-idle')
                done()
              },
            })
          },
        })
        return
      }

      if (step.animation === 'removePeg') {
        const pegX = wheelPeg.x
        mouseSprite.play('granary-v6-mouse-walk', true)
        this.addTween({
          targets: mouseSprite,
          x: pegX - 32,
          duration: 650,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            mouseSprite.play('granary-v6-mouse-idle', true)
            this.addTween({
              targets: mouseSprite,
              angle: { from: 0, to: -10 },
              x: mouseSprite.x - 10,
              duration: 260,
              yoyo: true,
              repeat: 1,
            })
            this.addTween({
              targets: wheelPeg,
              x: wheelPeg.x - 38,
              y: wheelPeg.y + 26,
              angle: -70,
              alpha: 0,
              duration: 760,
              ease: 'Cubic.easeOut',
              onComplete: () => {
                wheelPeg.setVisible(false).setAlpha(1)
                cart.setTexture('granary_cart_loaded').setDisplaySize(138, 100)
                done()
              },
            })
          },
        })
        return
      }

      const cartX = cart.x
      catSprite.play('granary-v6-cat-walk', true)
      this.addTween({
        targets: catSprite,
        x: cartX - 82,
        duration: 420,
        onComplete: () => {
          cart.setTexture('granary_cart_moving').setDisplaySize(138, 100)
          catSprite.play('granary-v6-cat-walk', true)
          mouseSprite.play('granary-v6-mouse-walk', true)
          const travel = sceneWidth * 0.25
          this.addTween({
            targets: cart,
            x: cart.x + travel,
            duration: 1700,
            ease: 'Sine.easeInOut',
          })
          this.addTween({
            targets: catSprite,
            x: catSprite.x + travel,
            duration: 1700,
            ease: 'Sine.easeInOut',
          })
          this.addTween({
            targets: mouseSprite,
            x: mouseSprite.x + travel,
            duration: 1700,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              cart.setVisible(false)
              setMainCharacter(catSprite, sceneCenterX - 46, floorY, 108, 'granary-v6-cat-celebrate')
              setMainCharacter(mouseSprite, sceneCenterX + 46, floorY, 78, 'granary-v6-mouse-idle')
              done()
            },
          })
        },
      })

    }

    const finishGame = (success: boolean) => {
      if (state === 'finished') return
      state = 'finished'
      clearTargetInteractions()
      setInteractionsEnabled(false)
      setButtonVisible(actionButton, false)
      setButtonVisible(startButton, false)
      setCharacterControlsVisible(false)
      hideProps()
      stopActionSprites()

      if (success) {
        objectiveText.setText('GRANARY RESCUED')
        statusText.setText('The cat and mouse celebrate their teamwork.')
        setMainCharacter(catSprite, sceneCenterX - 46, floorY, 108, 'granary-v6-cat-celebrate')
        setMainCharacter(mouseSprite, sceneCenterX + 46, floorY, 78, 'granary-v6-mouse-idle')
        this.container.bringToTop(catSprite)
        this.container.bringToTop(mouseSprite)
        this.addTween({
          targets: mouseSprite,
          y: floorY - 10,
          angle: { from: -4, to: 4 },
          duration: 230,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
        })
      }

      this.complete(
        {
          success,
          response: success
            ? 'The gate opens, the grain is recovered, and the final cart reaches storage.'
            : 'The friends lose their rhythm. The grain merchant asks you to try again.',
          goldDelta: success ? 45 : 0,
          reputationDelta: success ? 3 : 0,
          itemKey: success ? 'grain_bundle' : undefined,
        },
        success ? 1650 : 750
      )
    }

    const advanceStep = () => {
      const round = currentRound()
      if (!round) {
        finishGame(true)
        return
      }

      stepIndex += 1

      if (stepIndex >= round.steps.length) {
        completedStages += 1
        score += 30
        roundIndex += 1
        stepIndex = 0

        if (roundIndex >= rounds.length) {
          updateProgress()
          hudText.setText(`FRIENDSHIP ${Array.from({ length: 3 }, (_value, index) => (index < friendship ? '♥' : '♡')).join(' ')}   •   STAGES 3/3   •   SCORE ${score}`)
          finishGame(true)
          return
        }

        state = 'transition'
        clearTargetInteractions()
        objectiveText.setText(`${round.shortTitle} COMPLETE  •  NEXT: ${currentRound().title}`)
        statusText.setText(currentRound().intro)
        this.schedule(950, () => {
          state = 'playing'
          configureScene()
          setInteractionsEnabled(true)
          updateSelection()
          updateHud()
        })
        return
      }

      state = 'playing'
      configureScene()
      setInteractionsEnabled(true)
      updateSelection()
      updateHud()
    }

    const performAction = () => {
      if (state !== 'playing') return
      const step = currentStep()

      if (selectedFriend !== step.actor) {
        friendship -= 1
        score = Math.max(0, score - 8)
        updateHud()
        statusText.setText(selectedFriend === 'cat' ? 'This task needs the mouse.' : 'This task needs the cat.')
        const wrongTarget = selectedFriend === 'cat' ? catSprite : mouseSprite
        this.addTween({
          targets: wrongTarget,
          angle: { from: -6, to: 6 },
          duration: 75,
          repeat: 3,
          yoyo: true,
        })
        if (friendship <= 0) finishGame(false)
        return
      }

      state = 'animating'
      score += 20
      setInteractionsEnabled(false)
      statusText.setText(`Working together: ${step.action.toLowerCase()}...`)
      runActionAnimation(step, advanceStep)
    }

    const startGame = () => {
      if (state !== 'ready') return
      state = 'playing'
      roundIndex = 0
      stepIndex = 0
      friendship = 3
      completedStages = 0
      score = 0
      selectedFriend = 'cat'
      setButtonVisible(startButton, false)
      setButtonVisible(actionButton, true)
      setCharacterControlsVisible(true)
      configureScene()
      setInteractionsEnabled(true)
      updateSelection()
      updateHud()
    }

    actionButton = this.createButton(
      actionX,
      controlsY,
      250,
      42,
      'DO TASK',
      performAction,
      0x8b5a2b,
      14
    )

    startButton = this.createButton(
      sceneCenterX,
      controlsY,
      282,
      42,
      'BEGIN THE GRANARY PACT',
      startGame,
      0x8b5a2b,
      14
    )

    setButtonVisible(actionButton, false)
    setCharacterControlsVisible(false)
    setupReadyScene()
    updateSelection()
    updateHud()
  }


  private createExitButton() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height
  
    const size = 30
  
    const x =
      width / 2 + this.panelWidth / 2 - 24
  
    const y =
      height / 2 - this.panelHeight / 2 + 24
  
    const bg = this.scene.add.rectangle(
      x,
      y,
      size,
      size,
      0x5a1111,
      1
    )
  
    bg.setStrokeStyle(2, 0xffffff, 0.85)
    bg.setScrollFactor(0)
    bg.setInteractive({
      useHandCursor: true,
    })
  
    const text = this.scene.add.text(
      x,
      y - 1,
      '×',
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
      }
    )
  
    text.setOrigin(0.5)
    text.setScrollFactor(0)
  
    bg.on('pointerover', () => {
      bg.setFillStyle(0x8a1c1c, 1)
    })
  
    bg.on('pointerout', () => {
      bg.setFillStyle(0x5a1111, 1)
    })
  
    bg.on('pointerdown', () => {
      if (this.resultLocked) return
      this.hide()
    })
  
    this.container.add([bg, text])
  }

}