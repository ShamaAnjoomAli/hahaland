import Phaser from 'phaser'
import NPC from '../entities/NPC'
import DialogueBox from '../ui/DialogueBox'
import ObjectiveBox from '../ui/ObjectiveBox'
import GameHUD from '../ui/GameHUD'
import BazaarChallengePopup, {
  type BazaarGameId,
  type BazaarMinigameResult,
} from '../ui/BazaarChallengePopup'
import { startOrResumeSharedCountdown } from '../utils/utility'
import {
  loadGameProgress,
  saveGameProgress,
} from '../utils/progressSave'

type MinigameChoice = {
  label: string
  value: string
  response: string
  success?: boolean
  goldDelta?: number
  reputationDelta?: number
  setFlags?: string[]
  setItems?: string[]
}

type FillerConversationChoice = {
  label: string
  response: string[]
  reputationDelta?: number
}

type FillerConversationConfig = {
  title: string
  greeting: string
  repeatGreeting?: string
  choices: FillerConversationChoice[]
}

type MerchantHighlightHandle = {
  npc: NPC
  outerGlow: Phaser.GameObjects.Sprite
  glow: Phaser.GameObjects.Sprite
  marker: Phaser.GameObjects.Text
  tweens: Phaser.Tweens.Tween[]
}

export default class BazaarScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private keys!: any
  private interactKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key

  private dialogue!: DialogueBox
  private objectiveBox!: ObjectiveBox
  private hud!: GameHUD
  private minigame!: BazaarChallengePopup
  private rewardedFillerBargains = new Set<string>()
  private readonly fillerBargainRegistryKey =
    'hahaland.bazaar.fillerBargains'

  private npcs: NPC[] = []
  private interactPrompt!: Phaser.GameObjects.Container

  private coins = 1000
  private reputation = 0

  private completedMarkets = new Set<string>()
  private readonly completedMarketsRegistryKey =
    'hahaland.bazaar.completedMarkets'

  private merchantHighlights = new Map<string, MerchantHighlightHandle>()

  private worldObjects: Phaser.GameObjects.GameObject[] = []
  private uiCamera!: Phaser.Cameras.Scene2D.Camera

  private minimapConfig = {
    x: 0,
    y: 0,
    width: 180,
    height: 120,
  }
  private remainingSeconds = 3600
  private minimapBackground?: Phaser.GameObjects.Image
  private minimapBorder?: Phaser.GameObjects.Rectangle
  private minimapPlayerDot?: Phaser.GameObjects.Arc
  private minimapNpcDots: Phaser.GameObjects.Arc[] = []

  private mapPixelWidth = 0
  private mapPixelHeight = 0

  private bazaarExitPoint?: {
    x: number
    y: number
  }

  private bazaarExitGlow?: Phaser.GameObjects.Arc
  private bazaarExitRing?: Phaser.GameObjects.Arc
  private bazaarExitArrow?: Phaser.GameObjects.Text
  private bazaarExitLabel?: Phaser.GameObjects.Container
  private bazaarExitLabelText?: Phaser.GameObjects.Text

  private bazaarExitRadius = 90
  private minimapExitDot?: Phaser.GameObjects.Arc

  private gateForeground?: Phaser.GameObjects.Image
  private timerEvent?: Phaser.Time.TimerEvent
  private stopGameTimer?: () => void
  constructor() {
    super('BazaarScene')
  }

  init(data?: {
    coins?: number
    reputation?: number
    resume?: boolean
  }) {
    const savedProgress = loadGameProgress()
  
    if (data?.resume && savedProgress) {
      this.coins = savedProgress.coins
      this.reputation = savedProgress.reputation
      this.remainingSeconds = savedProgress.remainingSeconds
    } else {
      if (typeof data?.coins === 'number') {
        this.coins = data.coins
      }
  
      if (typeof data?.reputation === 'number') {
        this.reputation = data.reputation
      }
  
      if (savedProgress) {
        this.remainingSeconds = savedProgress.remainingSeconds
      }
    }
  
    const savedCompletedMarkets =
      savedProgress?.completedMarkets ??
      this.registry.get(this.completedMarketsRegistryKey)
  
    this.completedMarkets = new Set(
      Array.isArray(savedCompletedMarkets)
        ? savedCompletedMarkets.filter(
            (value): value is string => typeof value === 'string'
          )
        : []
    )

    this.loadFillerBargainFlags()
  }

  create() {
    this.npcs = []
    this.worldObjects = []
    this.merchantHighlights.clear()
    this.minimapNpcDots = []

    const map = this.make.tilemap({
      key: 'egypt_bazaar',
    })

    const background = this.add.image(0, 0, 'bazaar-background')

    background.setOrigin(0, 0)
    background.setDepth(0)

    this.worldObjects.push(background)

    const cachedBazaarMap = this.cache.tilemap.get(
      'egypt_bazaar'
    ) as
      | {
          data?: {
            layers?: Array<{
              name?: string
              type?: string
              x?: number
              y?: number
              offsetx?: number
              offsety?: number
              imagewidth?: number
              imageheight?: number
              opacity?: number
              visible?: boolean
            }>
          }
        }
      | undefined
    
    const foregroundGateLayer =
      cachedBazaarMap?.data?.layers?.find(
        (layer) =>
          layer.type === 'imagelayer' &&
          layer.name === 'ForegroundGate'
      )
    
    const foregroundGateX =
      (foregroundGateLayer?.x ?? 0) +
      (foregroundGateLayer?.offsetx ?? 0)
    
    const foregroundGateY =
      (foregroundGateLayer?.y ?? 0) +
      (foregroundGateLayer?.offsety ?? 0)
    
    this.gateForeground = this.add.image(
      foregroundGateX,
      foregroundGateY,
      'bazaar-gate-foreground'
    )
    
    this.gateForeground.setOrigin(0, 0)
    this.gateForeground.setDepth(9000)
    this.gateForeground.setAlpha(
      foregroundGateLayer?.opacity ?? 1
    )
    this.gateForeground.setVisible(
      foregroundGateLayer?.visible !== false
    )
    
    // Match the size shown in Tiled.
    if (
      foregroundGateLayer?.imagewidth &&
      foregroundGateLayer?.imageheight
    ) {
      this.gateForeground.setDisplaySize(
        foregroundGateLayer.imagewidth,
        foregroundGateLayer.imageheight
      )
    }
    
    this.worldObjects.push(this.gateForeground)

    const mapWidth = map.widthInPixels || background.width

    const mapHeight = map.heightInPixels || background.height

    this.physics.world.setBounds(0, 0, mapWidth, mapHeight)

    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight)

    this.dialogue = new DialogueBox(this)
    this.objectiveBox = new ObjectiveBox(this)
    this.minigame = new BazaarChallengePopup(this)

    if (this.completedMarkets.size >= 7) {
      this.objectiveBox.setText(
        'Objective: Exit the bazaar through the entrance gate.',
      )
    } else if (this.completedMarkets.size > 0) {
      this.objectiveBox.setText(
        `Objective: Bazaar markets completed ${this.completedMarkets.size}/7`,
      )
    } else {
      this.objectiveBox.setText('Objective: Explore the bazaar markets.')
    }

    this.createPlayer(map)
    this.worldObjects.push(this.player)

    this.createNPCsFromMap(map)
    this.createCollisionObjects(map)
    this.createBazaarExitMarker(map)
    this.createInteractPrompt()

    this.cameras.main.startFollow(this.player, true, 0.15, 0.15)

    this.cameras.main.setZoom(0.55)

    this.createBazaarMinimap(mapWidth, mapHeight)

    const hudWidth = 150

    this.hud = new GameHUD(
      this,
      this.minimapConfig.x + this.minimapConfig.width - hudWidth,
      this.minimapConfig.y + this.minimapConfig.height + 6,
      hudWidth,
    )

    this.hud.setCoins(this.coins)
this.hud.setReputation(this.reputation)
this.saveProgress()

    const timerController = startOrResumeSharedCountdown(
      this,
      (remainingSeconds) => {
        this.remainingSeconds = remainingSeconds
        this.hud.setTime(remainingSeconds)
        this.saveProgress()      },
      {
        totalSeconds: this.remainingSeconds,
      },
    )

    this.stopGameTimer = timerController.stop
    this.createUICamera()

    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleUIResize,
      this,
    )
    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.handleUIResize,
      this,
    )

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(
        Phaser.Scale.Events.RESIZE,
        this.handleUIResize,
        this,
      )
      this.stopGameTimer?.()
    })

    this.handleUIResize(this.scale.gameSize)

    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })

    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    )

    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    )

    this.dialogue.show(
      [
        {
          text: 'The bazaar is louder than the fake hotel.',
          portraitKey: 'player',
        },
        {
          text: 'At least here, the scams have signs.',
          portraitKey: 'player',
        },
      ],
      undefined,
      'player',
    )
  }

  update() {
    this.updateBazaarMinimap()

    if (this.minigame.open()) {
      this.player.setVelocity(0)
      this.player.stop()
      return
    }

    if (this.dialogue.isOpen()) {
      this.player.setVelocity(0)

      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.dialogue.next()
      }

      return
    }

    this.updateInteractPrompt()

    if (this.handleBazaarExit()) {
      return
    }
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

    this.player.setDepth(this.player.y)

    this.npcs.forEach((npc) => {
      npc.setDepth(npc.y)
    })

    this.updateMerchantHighlights()

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.interact()
    }
  }

  private saveProgress() {
    saveGameProgress({
      currentScene: 'BazaarScene',
      coins: this.coins,
      reputation: this.reputation,
      remainingSeconds: this.remainingSeconds,
      completedMarkets: [...this.completedMarkets],
    })
  }

  private createPlayer(map: Phaser.Tilemaps.Tilemap) {
    const spawn = this.getSpawnPoint(map, 'BazaarPlayerSpawn')

    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'player')

    this.player.setData('animKey', 'player')
    this.player.setScale(1)
    this.player.setDepth(this.player.y)
    this.player.setCollideWorldBounds(true)
  }

  private createNPCsFromMap(map: Phaser.Tilemaps.Tilemap) {
    const spawnLayer = map.getObjectLayer('Spawns')

    if (!spawnLayer) {
      console.warn('No Spawns layer found.')
      return
    }

    const npcObjects = spawnLayer.objects.filter((obj) => {
      const name = obj.name ?? ''
      const type = obj.type ?? ''
      const objectClass = (obj as any).class ?? ''

      return type === 'npc' || objectClass === 'npc' || name.startsWith('NPC_')
    })

    npcObjects.forEach((obj) => {
      const npcName = obj.name ?? 'NPC'
      const spriteKey = this.getNPCSpriteKey(npcName)

      const npc = new NPC(this, obj.x ?? 100, obj.y ?? 100, spriteKey, [
        'Welcome to the bazaar.',
      ])

      npc.setData('npcName', npcName)
      npc.setData('animKey', spriteKey)
      npc.setFrame(0)
      npc.setScale(1)
      npc.setDepth(npc.y)

      this.npcs.push(npc)
      this.worldObjects.push(npc)

      if (this.getBazaarGameId(npcName)) {
        this.createMerchantHighlight(npc, npcName)
      }

      this.physics.add.collider(this.player, npc)
    })
  }

  private createCollisionObjects(map: Phaser.Tilemaps.Tilemap) {
    const collisionLayer = map.getObjectLayer('CollisionObjects')

    if (!collisionLayer) {
      console.warn('No CollisionObjects layer found.')
      return
    }

    collisionLayer.objects.forEach((obj) => {
      const wall = this.add.rectangle(
        obj.x! + obj.width! / 2,
        obj.y! + obj.height! / 2,
        obj.width!,
        obj.height!,
        0xff0000,
        0,
      )

      this.physics.add.existing(wall, true)

      this.physics.add.collider(
        this.player,
        wall as Phaser.GameObjects.Rectangle,
      )
    })
  }

  private createInteractPrompt() {
    const bg = this.add.rectangle(0, 0, 90, 28, 0x000000, 0.75)

    bg.setStrokeStyle(2, 0xffffff)

    const text = this.add.text(0, 0, 'E Talk', {
      fontSize: '14px',
      color: '#ffffff',
    })

    text.setOrigin(0.5)

    this.interactPrompt = this.add.container(0, 0, [bg, text])

    this.interactPrompt.setDepth(20000)
    this.interactPrompt.setVisible(false)
    this.worldObjects.push(this.interactPrompt)
  }

  private updateInteractPrompt() {
    const nearest = this.getNearestNPC(95)

    if (!nearest) {
      this.interactPrompt.setVisible(false)
      return
    }

    this.interactPrompt.setVisible(true)
    this.interactPrompt.setPosition(nearest.x, nearest.y - 45)
  }

  private getNearestNPC(maxDistance: number) {
    let nearest: NPC | null = null
    let nearestDistance = maxDistance

    this.npcs.forEach((npc) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.x,
        npc.y,
      )

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = npc
      }
    })

    return nearest
  }

  private interact() {
    const nearest = this.getNearestNPC(95)

    if (!nearest) return

    const npcName = nearest.getData('npcName') as string

    const config = this.getMarketConfig(npcName)

    if (!config) {
      const fillerConversation = this.getFillerConversationConfig(npcName)

      if (fillerConversation) {
        this.showFillerConversation(
          npcName,
          nearest.texture.key,
          fillerConversation,
        )
        return
      }

      this.dialogue.show(
        [
          {
            text: 'This shop is busy right now.',
            portraitKey: nearest.texture.key,
          },
          {
            text: 'Come back when the owner stops arguing with a basket.',
            portraitKey: nearest.texture.key,
          },
        ],
        undefined,
        nearest.texture.key,
      )

      return
    }

    this.startMarketMinigame(npcName, nearest.texture.key, config)
  }

  private showFillerConversation(
    npcName: string,
    portraitKey: string,
    config: FillerConversationConfig,
  ) {
    this.interactPrompt.setVisible(false)

    const greeting =
      this.rewardedFillerBargains.has(npcName) && config.repeatGreeting
        ? config.repeatGreeting
        : config.greeting

    this.dialogue.showChoiceList({
      lines: [
        {
          text: greeting,
          portraitKey,
        },
      ],
      portraitKey,
      choices: config.choices.map((choice, index) => ({
        label: choice.label,
        value: String(index),
      })),
      onChoice: (value) => {
        const choiceIndex = Number(value)
        const choice = config.choices[choiceIndex]

        if (!choice) {
          console.warn(
            `Invalid filler conversation choice "${value}" for ${npcName}`,
          )
          return
        }

        this.handleFillerConversationChoice(
          npcName,
          portraitKey,
          choice,
        )
      },
    })
  }

  private handleFillerConversationChoice(
    npcName: string,
    portraitKey: string,
    choice: FillerConversationChoice,
  ) {
    const responseLines = choice.response.map((text) => ({
      text: text.replace(/^Merchant:\s*/, ''),
      portraitKey,
    }))

    if (
      typeof choice.reputationDelta === 'number' &&
      choice.reputationDelta !== 0
    ) {
      if (!this.rewardedFillerBargains.has(npcName)) {
        this.rewardedFillerBargains.add(npcName)
        this.changeReputation(choice.reputationDelta)
        this.saveFillerBargainFlags()

        responseLines.push({
          text: `Reputation +${choice.reputationDelta}`,
          portraitKey: 'player',
        })
      } else {
        responseLines.push({
          text: 'You already earned reputation from this bargain.',
          portraitKey: 'player',
        })
      }
    }

    this.dialogue.show(
      responseLines,
      undefined,
      portraitKey,
    )
  }

  private loadFillerBargainFlags() {
    const registryValue = this.registry.get(this.fillerBargainRegistryKey)
    let storedValue: unknown = registryValue

    if (!Array.isArray(storedValue) && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(this.fillerBargainRegistryKey)
        storedValue = raw ? JSON.parse(raw) : []
      } catch {
        storedValue = []
      }
    }

    this.rewardedFillerBargains = new Set(
      Array.isArray(storedValue)
        ? storedValue.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
    )
  }

  private saveFillerBargainFlags() {
    const values = [...this.rewardedFillerBargains]
    this.registry.set(this.fillerBargainRegistryKey, values)

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          this.fillerBargainRegistryKey,
          JSON.stringify(values),
        )
      } catch {
        // The game still works when browser storage is unavailable.
      }
    }
  }

  private getFillerConversationConfig(
    npcName: string,
  ): FillerConversationConfig | null {
    const conversations: Record<string, FillerConversationConfig> = {
      NPC_PapyrusSeller: {
        title: 'Papyrus & Scrolls',
        greeting:
          'Welcome! I sell knowledge by the scroll and nonsense by the paragraph.',
        repeatGreeting:
          'Back for more knowledge, or have you finally decided to buy the blank scroll?',
        choices: [
          {
            label: 'Do you have any heroic stories?',
            response: [
              'Merchant: Of course.',
              'Most were written by the heroes themselves, so the accuracy is questionable.',
            ],
          },
          {
            label: 'What is your finest scroll?',
            response: [
              'Merchant: A completely blank one.',
              'Not a single spelling mistake.',
            ],
          },
          {
            label: 'It has no writing. Ten coins.',
            response: [
              'Merchant: A cruel but intelligent argument.',
              'Twelve coins. You bargain like a scholar with an empty purse.',
            ],
            reputationDelta: 1,
          },
          {
            label: 'Five coins for the blank scroll.',
            response: [
              'Merchant: For five coins, you may admire it from where you are standing.',
            ],
          },
        ],
      },

      NPC_Herbalist: {
        title: 'Herbs & Teas',
        greeting:
          'Tea for courage, tea for sleep, and tea for pretending you understand taxes.',
        repeatGreeting:
          'Smell first. Sip second. Blame the donkey third.',
        choices: [
          {
            label: 'Which tea sells the most?',
            response: [
              'Merchant: The tax tea.',
              'Nobody knows whether it works, which makes it extremely convincing.',
            ],
          },
          {
            label: 'Do you have anything for tired legs?',
            response: ['Merchant: Yes.', 'A chair.'],
          },
          {
            label: 'Eight coins, and I will not ask what is inside.',
            response: [
              'Merchant: That silence has value.',
              'Nine coins. Do not drink it near birds.',
            ],
            reputationDelta: 1,
          },
          {
            label: 'Three coins.',
            response: [
              'Merchant: For three coins, I can sell you warm water and encouragement.',
            ],
          },
        ],
      },

      NPC_Perfumer: {
        title: 'Perfumes & Oils',
        greeting:
          'One drop for elegance. Two drops for confidence. Three drops and the whole bazaar knows you arrived.',
        repeatGreeting:
          'Please sample responsibly. The last customer attracted six camels.',
        choices: [
          {
            label: 'What is your strongest perfume?',
            response: [
              'Merchant: Desert Thunder.',
              'One drop and your enemies remember you from another district.',
            ],
          },
          {
            label: 'Does this scent last all day?',
            response: [
              'Merchant: It survived a sandstorm, a wedding, and one extremely determined goat.',
            ],
          },
          {
            label: 'Why is that bottle shaking?',
            response: [
              'Merchant: It is excited to meet you.',
              'Please do not open it indoors.',
            ],
          },
          {
            label: 'Do you have something subtle?',
            response: [
              'Merchant: Certainly.',
              'This one only announces you to people within three streets.',
            ],
          },
        ],
      },

      NPC_MapSeller: {
        title: 'Map Seller',
        greeting:
          'Every map I sell is completely accurate. Some locations simply move.',
        repeatGreeting: 'You are here. Probably.',
        choices: [
          {
            label: 'Where am I right now?',
            response: [
              'Merchant: In front of a map seller.',
              'Your navigation skills are improving already.',
            ],
          },
          {
            label: 'Why is there a sea monster drawn here?',
            response: ['Merchant: The corner looked empty.'],
          },
          {
            label: 'This road leads directly into a wall.',
            response: [
              'Merchant: It was an excellent road when I drew it.',
            ],
          },
          {
            label: 'Can I buy half a map?',
            response: [
              'Merchant: Certainly.',
              'Which half would you prefer to be lost in?',
            ],
          },
        ],
      },

      NPC_Jeweler: {
        title: 'Jewelry & Gems',
        greeting:
          'Real gold, polished glass, and several stones whose origins are best left mysterious.',
        repeatGreeting:
          'The ring is still whispering. Ignore it unless it starts discussing prices.',
        choices: [
          {
            label: 'Is that gem real?',
            response: ['Merchant: It is genuinely shiny.'],
          },
          {
            label: 'What is the cheapest thing here?',
            response: ['Merchant: Your reflection. No charge.'],
          },
          {
            label: 'Why is that ring whispering?',
            response: [
              'Merchant: It only does that around customers with money.',
            ],
          },
          {
            label: 'Twenty coins, and I will not test it with my teeth.',
            response: [
              'Merchant: Twenty-four.',
              'Your teeth concern me, but your bargaining does not.',
            ],
            reputationDelta: 1,
          },
        ],
      },

      NPC_TextileSeller: {
        title: 'Silk & Textiles',
        greeting:
          'This silk is lighter than a secret and twice as difficult to keep.',
        repeatGreeting: 'Please do not sneeze near the silk.',
        choices: [
          {
            label: 'Does this colour suit me?',
            response: [
              'Merchant: It suits your future success.',
              'Your present success is still negotiating.',
            ],
          },
          {
            label: 'Is this silk imported?',
            response: [
              'Merchant: Everything is imported when you walk far enough.',
            ],
          },
          {
            label: 'Will it survive a sandstorm?',
            response: [
              'Merchant: Nothing survives a sandstorm.',
              'We simply charge enough to remain optimistic.',
            ],
          },
          {
            label: 'Can I try the scarf?',
            response: [
              'The merchant wraps you in an enormous scarf.',
              'Merchant: Perfect. Now you look expensive and slightly lost.',
            ],
          },
        ],
      },

      NPC_BasketWeaver: {
        title: 'Basket Weaver',
        greeting:
          'Small baskets, large baskets, and one basket that keeps returning after I sell it.',
        repeatGreeting:
          'The returning basket has not returned today. That worries me.',
        choices: [
          {
            label: 'Which basket keeps returning?',
            response: [
              'Merchant: Nice try.',
              'I am not touching it again.',
            ],
          },
          {
            label: 'Can your strongest basket carry a donkey?',
            response: ['Merchant: Yes.', 'Once.'],
          },
          {
            label: 'Why so many different baskets?',
            response: [
              'Merchant: So customers can spend longer pretending they know which one they need.',
            ],
          },
          {
            label: 'What makes a good basket?',
            response: [
              'Merchant: A strong base, tight weaving, and the ability to ignore family gossip.',
            ],
          },
        ],
      },

      NPC_RugSeller: {
        title: 'Carpets & Rugs',
        greeting:
          'This carpet has crossed three deserts, mostly tied to a camel that strongly disliked it.',
        repeatGreeting: 'No, it still does not fly.',
        choices: [
          {
            label: 'Does it fly?',
            response: [
              'Merchant: Only when thrown from a roof, and not for very long.',
            ],
          },
          {
            label: 'Why is there a hole in it?',
            response: [
              'Merchant: Ventilation.',
              'Rare desert craftsmanship.',
            ],
          },
          {
            label: 'It looks extremely old.',
            response: [
              'Merchant: Antique.',
              'Player: It looks damaged.',
              'Merchant: Historic.',
            ],
          },
          {
            label: 'Thirty coins. The camel already used it.',
            response: [
              'Merchant: Thirty-two, and we never discuss the camel again.',
            ],
            reputationDelta: 1,
          },
        ],
      },
    }

    return conversations[npcName] ?? null
  }

  private startMarketMinigame(
    npcName: string,
    portraitKey: string,
    config: {
      title: string
      description: string[]
      choices: MinigameChoice[]
    },
  ) {
    const gameId = this.getBazaarGameId(npcName)

    if (!gameId) {
      this.dialogue.show(
        [
          {
            text: 'This market is not ready yet.',
            portraitKey,
          },
        ],
        undefined,
        portraitKey,
      )

      return
    }

    this.dialogue.show(
      [
        {
          text: config.description[0],
          portraitKey,
        },
        {
          text: config.description[1],
          portraitKey,
        },
      ],
      () => {
        this.minigame.show({
          gameId,
          portraitKey,
          onComplete: (result) => {
            this.applyMinigameReward(result)
            this.completedMarkets.add(npcName)
            this.saveCompletedMarkets()
            this.refreshMerchantHighlight(npcName)
            this.refreshMinimapNpcDot(npcName)

            if (this.completedMarkets.size >= 7) {
              this.objectiveBox.setText(
                'Objective: Exit the bazaar through the entrance gate, or replay markets for more gold and reputation.'
              )
            } else {
              this.objectiveBox.setText(
                `Objective: Bazaar markets completed ${this.completedMarkets.size}/7`
              )
            }

            if (this.completedMarkets.size >= 7) {
              this.dialogue.show(
                [
                  {
                    text: 'You survived the bazaar.',
                    portraitKey: 'player',
                  },
                  {
                    text: 'Your wallet is lighter, but your bargaining soul is stronger.',
                    portraitKey: 'player',
                  },
                  {
                    text: 'You are no longer just a tourist.',
                    portraitKey: 'player',
                  },
                  {
                    text: 'You are a certified bazaar survivor.',
                    portraitKey: 'player',
                  },
                  {
                    text: 'Find the bazaar entrance and return to the city.',
                    portraitKey: 'player',
                  },
                ],
                () => {
                  this.objectiveBox.setText(
                    'Objective: Exit the bazaar through the entrance gate.',
                  )
                },
                'player',
              )
            }
          },
        })
      },
      portraitKey,
    )
  }

  private createMerchantHighlight(npc: NPC, npcName: string) {
    if (this.merchantHighlights.has(npcName)) {
      return
    }

    const color = this.getNpcStatusColor(npcName)

    // Two lightly enlarged copies of the NPC create a restrained aura around the sprite.
    // This avoids the ground circle and keeps the highlight attached to the
    // merchant's silhouette as their animation frame changes.
    const outerGlow = this.add.sprite(
      npc.x,
      npc.y,
      npc.texture.key,
      npc.frame.name,
    )
    outerGlow.setOrigin(npc.originX, npc.originY)
    outerGlow.setScale(npc.scaleX * 1.34, npc.scaleY * 1.34)
    outerGlow.setTintFill(color)
    outerGlow.setAlpha(0.12)
    outerGlow.setBlendMode(Phaser.BlendModes.ADD)

    const glow = this.add.sprite(
      npc.x,
      npc.y,
      npc.texture.key,
      npc.frame.name,
    )
    glow.setOrigin(npc.originX, npc.originY)
    glow.setScale(npc.scaleX * 1.12, npc.scaleY * 1.12)
    glow.setTintFill(color)
    glow.setAlpha(0.3)
    glow.setBlendMode(Phaser.BlendModes.ADD)

    const marker = this.add.text(
      npc.x,
      npc.y - Math.max(34, npc.displayHeight * 0.62),
      '!',
      {
        fontFamily: 'Georgia',
        fontSize: '23px',
        color: '#67ecff',
        stroke: '#000000',
        strokeThickness: 5,
        fontStyle: 'bold',
      },
    )
    marker.setOrigin(0.5)

    this.worldObjects.push(outerGlow, glow, marker)

    this.merchantHighlights.set(npcName, {
      npc,
      outerGlow,
      glow,
      marker,
      tweens: [],
    })

    this.refreshMerchantHighlight(npcName)
    this.updateMerchantHighlightPosition(this.merchantHighlights.get(npcName)!)
  }

  private refreshMerchantHighlight(npcName: string) {
    const highlight = this.merchantHighlights.get(npcName)

    if (!highlight) return

    highlight.tweens.forEach((tween) => {
      tween.remove()
    })
    highlight.tweens = []

    const completed = this.completedMarkets.has(npcName)

    // Bright cyan is intentionally used for merchants that are still
    // available. It stands out clearly against the warm sand and gold
    // colours of the Bazaar. Completed merchants use emerald green.
    const color = completed ? 0x39ff88 : 0x2de2ff

    highlight.outerGlow.setTintFill(color)
    highlight.glow.setTintFill(color)

    // Soft silhouette-only aura. There is deliberately no ellipse or
    // ground ring anywhere in this highlight system.
    highlight.outerGlow.setAlpha(completed ? 0.13 : 0.12)
    highlight.glow.setAlpha(completed ? 0.32 : 0.3)

    highlight.marker.setText(completed ? '✓' : '!')
    highlight.marker.setColor(completed ? '#72ff9b' : '#67ecff')
    highlight.marker.setScale(1)
    highlight.marker.setAlpha(1)

    const glowTween = this.tweens.add({
      targets: highlight.glow,
      alpha: completed ? 0.44 : 0.5,
      scaleX: highlight.npc.scaleX * (completed ? 1.15 : 1.17),
      scaleY: highlight.npc.scaleY * (completed ? 1.15 : 1.17),
      duration: completed ? 1500 : 1050,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const outerGlowTween = this.tweens.add({
      targets: highlight.outerGlow,
      alpha: completed ? 0.22 : 0.25,
      scaleX: highlight.npc.scaleX * (completed ? 1.38 : 1.4),
      scaleY: highlight.npc.scaleY * (completed ? 1.38 : 1.4),
      duration: completed ? 1850 : 1350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const markerTween = this.tweens.add({
      targets: highlight.marker,
      y: highlight.marker.y - 6,
      scaleX: completed ? 1.06 : 1.1,
      scaleY: completed ? 1.06 : 1.1,
      duration: completed ? 1100 : 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    highlight.tweens.push(glowTween, outerGlowTween, markerTween)
  }

  private updateMerchantHighlights() {
    this.merchantHighlights.forEach((highlight) => {
      this.updateMerchantHighlightPosition(highlight)
    })
  }

  private updateMerchantHighlightPosition(highlight: MerchantHighlightHandle) {
    const { npc, outerGlow, glow, marker } = highlight

    outerGlow.setPosition(npc.x, npc.y)
    outerGlow.setFrame(npc.frame.name)
    outerGlow.setFlip(npc.flipX, npc.flipY)

    glow.setPosition(npc.x, npc.y)
    glow.setFrame(npc.frame.name)
    glow.setFlip(npc.flipX, npc.flipY)

    // Do not reset scale while a highlight tween is active. The tween keeps
    // the aura breathing around the NPC; only copy the base scale when no
    // tween currently owns the object.
    if (!this.tweens.isTweening(outerGlow)) {
      outerGlow.setScale(npc.scaleX * 1.34, npc.scaleY * 1.34)
    }

    if (!this.tweens.isTweening(glow)) {
      glow.setScale(npc.scaleX * 1.12, npc.scaleY * 1.12)
    }

    const markerBaseY = npc.y - Math.max(34, npc.displayHeight * 0.62)
    if (!this.tweens.isTweening(marker)) {
      marker.setPosition(npc.x, markerBaseY)
    } else {
      marker.x = npc.x
    }

    outerGlow.setDepth(npc.y - 2)
    glow.setDepth(npc.y - 1)
    marker.setDepth(npc.y + 2)
  }

  private getNpcStatusColor(npcName: string) {
    if (!this.getBazaarGameId(npcName)) {
      return 0x66ccff
    }

    return this.completedMarkets.has(npcName) ? 0x39ff88 : 0x2de2ff
  }

  private refreshMinimapNpcDot(npcName: string) {
    const npcIndex = this.npcs.findIndex(
      (npc) => npc.getData('npcName') === npcName,
    )

    const dot = this.minimapNpcDots[npcIndex]

    if (!dot) return

    dot.setFillStyle(this.getNpcStatusColor(npcName), 1)
  }

  private saveCompletedMarkets() {
    this.registry.set(this.completedMarketsRegistryKey, [
      ...this.completedMarkets,
    ])
    this.saveProgress()

  }

  private getBazaarGameId(npcName: string): BazaarGameId | null {
    const games: Record<string, BazaarGameId> = {
      NPC_3: 'map-bargain',
      NPC_4: 'grain-pact',
      NPC_8: 'spice-memory',
      NPC_7: 'date-trade',
      NPC_10: 'pottery-fraud',
      NPC_11: 'donkey-race',
      NPC_15: 'eagle-delivery',
    }

    return games[npcName] ?? null
  }

  private applyMinigameReward(result: BazaarMinigameResult) {
    if (typeof result.goldDelta === 'number') {
      this.changeCoins(result.goldDelta)
    }

    if (typeof result.reputationDelta === 'number') {
      this.changeReputation(result.reputationDelta)
    }
  }

  private changeCoins(amount: number) {
    this.coins = Math.max(0, this.coins + amount)
    this.hud.setCoins(this.coins)
this.hud.setReputation(this.reputation)
this.saveProgress()
  }

  private changeReputation(amount: number) {
    this.reputation = Phaser.Math.Clamp(
      this.reputation + amount,
      0,
      100
    )
  
    this.hud?.setReputation(this.reputation)
    this.saveProgress()
    console.log('Bazaar reputation:', this.reputation)
  }

  private handleBazaarExit() {
    if (!this.bazaarExitPoint) return false

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.bazaarExitPoint.x,
      this.bazaarExitPoint.y,
    )

    const playerIsNear = distance <= this.bazaarExitRadius

    this.bazaarExitLabelText?.setText(
      playerIsNear ? 'E Return to City' : 'Return to City',
    )

    this.bazaarExitGlow?.setFillStyle(playerIsNear ? 0x00ff66 : 0x00aa44, 0.25)

    if (playerIsNear && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.startReturnToVillage()
      return true
    }

    return false
  }

  private getMarketConfig(npcName: string) {
    const configs: Record<
      string,
      {
        title: string
        description: string[]
        choices: MinigameChoice[]
      }
    > = {
      NPC_3: {
        title: '1. Suspicious Map Bargain',
        description: [
          'The Map Seller waves a papyrus with too many arrows.',
          'Opening price: 300 gold. What do you do?',
        ],
        choices: [
          {
            label: 'Pay 300 gold immediately',
            value: 'pay',
            goldDelta: -300,
            reputationDelta: -2,
            response:
              'Map Seller: Excellent! I respect a customer who fears negotiation.',
          },
          {
            label: 'Say: Too expensive',
            value: 'fair',
            goldDelta: -80,
            reputationDelta: 5,
            response:
              'Map Seller: Fine. 80 gold. Beginner bargain, but acceptable.',
          },
          {
            label: 'Walk away slowly',
            value: 'walk-away',
            goldDelta: -25,
            reputationDelta: 12,
            response:
              'Map Seller: Wait! 300 was pyramid price! Fine, 25 and I will pretend to respect you.',
          },
        ],
      },

      NPC_4: {
        title: '2. Broken Scale Puzzle',
        description: [
          'The Scale Merchant is selling dates with a suspicious scale.',
          'One weight is fake. Which one do you accuse?',
        ],
        choices: [
          {
            label: 'The shiny copper weight',
            value: 'wrong',
            goldDelta: -50,
            reputationDelta: -2,
            response: 'Wrong. The merchant charges you an inspection fee.',
          },
          {
            label: 'The cracked stone weight',
            value: 'correct',
            goldDelta: 350,
            reputationDelta: 20,
            response:
              'Correct. Sand spills from the cracked weight. The crowd gasps.',
          },
          {
            label: 'Accuse the basket',
            value: 'funny',
            goldDelta: 50,
            reputationDelta: 5,
            response:
              'The basket is innocent, but your confidence scares the merchant into a small refund.',
          },
        ],
      },

      NPC_8: {
        title: '3. Spice Memory Challenge',
        description: [
          'The Spice Merchant mixes three spices.',
          'The smell is strong enough to reset your personality.',
        ],
        choices: [
          {
            label: 'Cumin, cinnamon, coriander',
            value: 'correct',
            goldDelta: 220,
            reputationDelta: 10,
            response: 'Correct. Your nose has earned citizenship.',
          },
          {
            label: 'Sand, regret, and heat',
            value: 'funny',
            goldDelta: 40,
            reputationDelta: 5,
            response:
              'Wrong, but emotionally accurate. The seller gives you pity gold.',
          },
          {
            label: 'Premium tourist dust',
            value: 'wrong',
            goldDelta: -40,
            reputationDelta: -1,
            response: 'The seller charges you for insulting the dust.',
          },
        ],
      },

      NPC_7: {
        title: '4. Date Basket Trade',
        description: [
          'The Date Merchant has too many baskets.',
          'Can you turn this into profit?',
        ],
        choices: [
          {
            label: 'Buy low and sell to temple cook',
            value: 'trade',
            goldDelta: 450,
            reputationDelta: 15,
            response:
              'You buy cheap and sell smart. The merchant calls you a dangerous accountant.',
          },
          {
            label: 'Eat the dates',
            value: 'eat',
            goldDelta: -30,
            reputationDelta: 2,
            response: 'Delicious. Financially terrible, but delicious.',
          },
          {
            label: 'Sell the merchant his own dates',
            value: 'chaos',
            goldDelta: 75,
            reputationDelta: 4,
            response:
              'Somehow, the merchant buys one basket back. Nobody understands what happened.',
          },
        ],
      },

      NPC_10: {
        title: '5. Antique Pottery Fraud',
        description: [
          'The Pottery Seller shows three royal antiques.',
          'One still has wet paint. Which is fake?',
        ],
        choices: [
          {
            label: 'The pot marked “painted today”',
            value: 'correct',
            goldDelta: 300,
            reputationDelta: 15,
            response:
              'Correct. The seller says the label was “for transparency.”',
          },
          {
            label: 'The dusty cracked pot',
            value: 'wrong',
            goldDelta: -60,
            reputationDelta: -2,
            response: 'That one was actually ancient. You pay a staring fee.',
          },
          {
            label: 'All pots are emotionally fake',
            value: 'funny',
            goldDelta: 80,
            reputationDelta: 6,
            response:
              'The crowd loves the answer. The seller pays you to stop philosophizing.',
          },
        ],
      },

      NPC_11: {
        title: '6. Donkey Race',
        description: [
          'The Donkey Master presents Royal Thunder.',
          'Royal Thunder is asleep. How do you motivate him?',
        ],
        choices: [
          {
            label: 'Compliment his beautiful knees',
            value: 'correct',
            goldDelta: 700,
            reputationDelta: 25,
            response:
              'Royal Thunder wakes immediately. Nobody knows why knee compliments work, but you win.',
          },
          {
            label: 'Offer him a business partnership',
            value: 'funny',
            goldDelta: 200,
            reputationDelta: 8,
            response:
              'The donkey respects the proposal but requests legal review. You place second.',
          },
          {
            label: 'Shout “Go faster!”',
            value: 'wrong',
            goldDelta: -100,
            reputationDelta: -2,
            response:
              'Royal Thunder stares like a disappointed uncle. Entry fee lost.',
          },
        ],
      },

      NPC_15: {
        title: '7. Eagle Delivery Race',
        description: [
          'The Eagle Keeper needs a message delivered across the bazaar.',
          'The eagle looks smarter than everyone involved.',
        ],
        choices: [
          {
            label: 'Give the eagle clear directions',
            value: 'correct',
            goldDelta: 500,
            reputationDelta: 18,
            response:
              'The eagle delivers perfectly and returns with exact change. Suspiciously professional.',
          },
          {
            label: 'Tell the eagle “follow your dreams”',
            value: 'funny',
            goldDelta: 120,
            reputationDelta: 6,
            response:
              'The eagle circles dramatically, inspires the crowd, and delivers late.',
          },
          {
            label: 'Deliver the message yourself',
            value: 'wrong',
            goldDelta: -70,
            reputationDelta: -1,
            response:
              'You get lost between two identical spice stalls. The eagle judges you silently.',
          },
        ],
      },
    }

    return configs[npcName]
  }

  private getSpawnPoint(map: Phaser.Tilemaps.Tilemap, name: string) {
    const spawnLayer = map.getObjectLayer('Spawns')

    if (!spawnLayer) {
      console.warn('No Spawns layer found.')
      return { x: 100, y: 100 }
    }

    const spawn = spawnLayer.objects.find((obj) => obj.name === name)

    if (!spawn) {
      console.warn(`Spawn not found: ${name}`)
      return { x: 100, y: 100 }
    }

    return {
      x: spawn.x ?? 100,
      y: spawn.y ?? 100,
    }
  }

  private getOptionalSpawnPointFromKey(name: string) {
    const map = this.make.tilemap({
      key: 'egypt_bazaar',
    })

    const spawnLayer = map.getObjectLayer('Spawns')

    if (!spawnLayer) return null

    const spawn = spawnLayer.objects.find((obj) => obj.name === name)

    if (!spawn) return null

    return {
      x: spawn.x ?? 100,
      y: spawn.y ?? 100,
    }
  }

  private getNPCSpriteKey(name: string): string {
    const sprites: Record<string, string> = {
      NPC_3: 'npc3',
      NPC_4: 'npc4',
      NPC_7: 'npc7',
      NPC_8: 'npc8',
      NPC_10: 'npc10',
      NPC_11: 'npc11',
      NPC_15: 'npc15',
    }

    return sprites[name] ?? 'npc1'
  }

  private createBazaarMinimap(mapWidth: number, mapHeight: number) {
    this.mapPixelWidth = mapWidth
    this.mapPixelHeight = mapHeight

    const minimapWidth = 150
const minimapHeight = Math.round(
  minimapWidth * (mapHeight / mapWidth)
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

    this.minimapBackground = this.add.image(x, y, 'bazaar-background')

    this.minimapBackground.setOrigin(0, 0)
    this.minimapBackground.setDisplaySize(minimapWidth, minimapHeight)
    this.minimapBackground.setScrollFactor(0)
    this.minimapBackground.setDepth(20000)
    this.minimapBackground.setAlpha(0.92)

    this.minimapBorder = this.add.rectangle(
      x,
      y,
      minimapWidth,
      minimapHeight,
      0x000000,
      0,
    )

    this.minimapBorder.setOrigin(0)
    this.minimapBorder.setScrollFactor(0)
    this.minimapBorder.setDepth(20001)
    this.minimapBorder.setStrokeStyle(2, 0xffffff, 0.9)

    this.minimapPlayerDot = this.add.circle(x, y, 4, 0xff0000)

    this.minimapPlayerDot.setScrollFactor(0)
    this.minimapPlayerDot.setDepth(20003)

    this.minimapExitDot = this.add.circle(x, y, 6, 0x00ff66)

    this.minimapExitDot.setScrollFactor(0)
    this.minimapExitDot.setDepth(20006)
    this.minimapExitDot.setStrokeStyle(2, 0x000000)

    this.minimapNpcDots = this.npcs.map((npc) => {
      const npcName = npc.getData('npcName') as string

      const dot = this.add.circle(x, y, 3, this.getNpcStatusColor(npcName))

      dot.setScrollFactor(0)
      dot.setDepth(20002)
      dot.setStrokeStyle(1, 0x000000)

      return dot
    })
  }

  private updateBazaarMinimap() {
    if (
      !this.minimapPlayerDot ||
      !this.minimapBackground ||
      !this.minimapBorder
    ) {
      return
    }
    const px = Phaser.Math.Clamp(this.player.x / this.mapPixelWidth, 0, 1)

    const py = Phaser.Math.Clamp(this.player.y / this.mapPixelHeight, 0, 1)

    this.minimapPlayerDot.setPosition(
      this.minimapConfig.x + px * this.minimapConfig.width,
      this.minimapConfig.y + py * this.minimapConfig.height,
    )

    this.npcs.forEach((npc, index) => {
      const dot = this.minimapNpcDots[index]

      if (!dot) return

      const nx = Phaser.Math.Clamp(npc.x / this.mapPixelWidth, 0, 1)

      const ny = Phaser.Math.Clamp(npc.y / this.mapPixelHeight, 0, 1)

      dot.setPosition(
        this.minimapConfig.x + nx * this.minimapConfig.width,
        this.minimapConfig.y + ny * this.minimapConfig.height,
      )
    })

    if (this.minimapExitDot && this.bazaarExitPoint) {
      const ex = Phaser.Math.Clamp(
        this.bazaarExitPoint.x / this.mapPixelWidth,
        0,
        1,
      )

      const ey = Phaser.Math.Clamp(
        this.bazaarExitPoint.y / this.mapPixelHeight,
        0,
        1,
      )

      this.minimapExitDot.setPosition(
        this.minimapConfig.x + ex * this.minimapConfig.width,
        this.minimapConfig.y + ey * this.minimapConfig.height,
      )
    }
  }

  private createBazaarExitMarker(map: Phaser.Tilemaps.Tilemap) {
    const point = this.getSpawnPoint(map, 'BazaarExit')

    this.bazaarExitPoint = point

    this.bazaarExitGlow = this.add.circle(point.x, point.y, 26, 0x00aa44, 0.25)

    this.bazaarExitRing = this.add.circle(point.x, point.y, 22, 0x00aa44, 0)

    this.bazaarExitRing.setStrokeStyle(4, 0xffdd66, 1)

    this.bazaarExitArrow = this.add.text(point.x, point.y - 5, '↑', {
      fontFamily: 'Georgia',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
      fontStyle: 'bold',
    })

    this.bazaarExitArrow.setOrigin(0.5)

    const labelBg = this.add.rectangle(0, 0, 210, 34, 0x000000, 0.78)

    labelBg.setStrokeStyle(2, 0xffdd66, 1)

    this.bazaarExitLabelText = this.add.text(0, 0, 'Return to City', {
      fontFamily: 'Georgia',
      fontSize: '16px',
      color: '#ffdd66',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    })

    this.bazaarExitLabelText.setOrigin(0.5)

    this.bazaarExitLabel = this.add.container(point.x, point.y - 58, [
      labelBg,
      this.bazaarExitLabelText,
    ])

    const objects = [
      this.bazaarExitGlow,
      this.bazaarExitRing,
      this.bazaarExitArrow,
      this.bazaarExitLabel,
    ]

    objects.forEach((obj) => {
      obj.setDepth(9500)
    })

    this.worldObjects.push(...objects)

    this.tweens.add({
      targets: this.bazaarExitGlow,
      scaleX: 1.55,
      scaleY: 1.55,
      alpha: 0.1,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.tweens.add({
      targets: this.bazaarExitRing,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.tweens.add({
      targets: this.bazaarExitArrow,
      y: point.y - 10,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private startReturnToVillage() {
    const width = this.scale.width
    const height = this.scale.height

    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x050505,
      1,
    )

    overlay.setScrollFactor(0)
    overlay.setDepth(90000)

    const title = this.add.text(
      width / 2,
      height / 2 - 30,
      'RETURNING TO CITY',
      {
        fontFamily: 'Georgia',
        fontSize: '38px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
      },
    )

    title.setOrigin(0.5)
    title.setScrollFactor(0)
    title.setDepth(90001)

    saveGameProgress({
      currentScene: 'VillageScene',
      coins: this.coins,
      reputation: this.reputation,
      remainingSeconds: this.remainingSeconds,
      completedMarkets: [...this.completedMarkets],
    })
    
    this.cameras.main.fadeOut(650, 0, 0, 0)

    this.time.delayedCall(850, () => {
      this.scene.start('VillageScene', {
        fromBazaar: true,
        spawnName: 'BazaarReturnSpawn',
        coins: this.coins,
        reputation: this.reputation,
      })
    })
  }

  private handleUIResize(gameSize: { width: number; height: number }) {
    const padding = 12
    const minimapX = gameSize.width - this.minimapConfig.width - padding
    const minimapY = padding

    this.minimapConfig.x = minimapX
    this.minimapConfig.y = minimapY

    this.minimapBackground?.setPosition(minimapX, minimapY)
    this.minimapBorder?.setPosition(minimapX, minimapY)

    this.hud?.container.setPosition(
      minimapX,
      minimapY + this.minimapConfig.height + 6,
    )

    this.uiCamera?.setViewport(0, 0, gameSize.width, gameSize.height)
    this.updateBazaarMinimap()
  }

  private createUICamera() {
    // Explicit UI layer ordering. The dialogue and its choice list must always
    // render above the HUD, minimap and objective box.
    this.dialogue?.container.setDepth(100000)
    this.minigame?.container.setDepth(90000)
    this.hud?.container.setDepth(50000)
    this.objectiveBox?.container.setDepth(40000)

    const uiObjects: Phaser.GameObjects.GameObject[] = []

    const addUIObject = (obj?: Phaser.GameObjects.GameObject | null) => {
      if (obj) {
        uiObjects.push(obj)
      }
    }

    addUIObject(this.dialogue?.container)
    addUIObject(this.objectiveBox?.container)
    addUIObject(this.hud?.container)
    addUIObject(this.minigame?.container)

    addUIObject(this.minimapBackground)
    addUIObject(this.minimapBorder)
    addUIObject(this.minimapPlayerDot)
    addUIObject(this.minimapExitDot)
    this.minimapNpcDots.forEach((dot) => {
      addUIObject(dot)
    })

    if (uiObjects.length > 0) {
      this.cameras.main.ignore(uiObjects)
    }

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height)

    this.uiCamera.setName('BazaarUICamera')
    this.uiCamera.setScroll(0, 0)
    this.uiCamera.setZoom(1)

    const cleanWorldObjects = this.worldObjects.filter(Boolean)

    if (cleanWorldObjects.length > 0) {
      this.uiCamera.ignore(cleanWorldObjects)
    }

    this.worldObjects.push(this.gateForeground)
  }
}
