import Phaser from 'phaser'
import NPC from '../entities/NPC'
import Dialogue from '../script/dialogue.json'
import Objective from '../script/objectives.json'
import DialogueBox from '../ui/DialogueBox'
import ObjectiveBox from '../ui/ObjectiveBox'
import GameHUD from '../ui/GameHUD'
import MinigamePopup, { type MinigameChoice } from '../ui/MinigamePopup'
import {
  startOrResumeSharedCountdown,
} from '../utils/utility'

type ObjectiveStep = {
  objectiveText: string
  targetNpc: string
  dialogue: string[]
  nextStepId?: string
  completeObjectiveText?: string
}

type ObjectivesData = {
  initialStepId: string
  steps: Record<string, ObjectiveStep>
}

type MerchantOffer = {
  npcName: string
  label: string
  price: number
  pitch: string
  reaction: string
}

type StoryStage =
  | 'intro'
  | 'travellingToFakeHotel'
  | 'fakeHotelNight'
  | 'leaveFakeHotel'
  | 'findRealHotel'
  | 'bazaarTraining'
  | 'bazaarQuests'
  | 'pyramidQuest'
  | 'templeQuest'
  | 'emperorEnding'

/**
 * Main gameplay scene for the village map.
 * Loads the Tiled map, spawns the player, handles collisions, camera follow, and movement.
 */
export default class VillageScene extends Phaser.Scene {
  /** The player sprite with arcade physics enabled. */
  private player!: Phaser.Physics.Arcade.Sprite

  /** WASD keyboard bindings used for player movement. */
  private keys!: any

  private npcs: NPC[] = []

  /** NPC Interaction. */
  private interactKey!: Phaser.Input.Keyboard.Key

  /** NPC Interaction. */
  private dialogue!: DialogueBox

  /** NPC dialogue hide */
  private spaceKey!: Phaser.Input.Keyboard.Key

  /** NPC Highlight for interaction */
  private interactPrompt!: Phaser.GameObjects.Container

  /** Minimap */
  private minimap!: Phaser.Cameras.Scene2D.Camera
  private minimapBorder!: Phaser.GameObjects.Rectangle
  private minimapPlayerDot!: Phaser.GameObjects.Arc

  private mapPixelWidth = 0
  private mapPixelHeight = 0

  private minimapConfig = {
    x: 0,
    y: 0,
    width: 220,
    height: 140,
  }

  // Objective box to show user goals of the game
  private objectiveBox!: ObjectiveBox
  private objectives = Objective as ObjectivesData
  private currentObjectiveStepId = this.objectives.initialStepId

  // Adds ! indicator on the NPC that is next in objective list
  private questMarker!: Phaser.GameObjects.Text
  // Adds ! indicator on the NPC in minimap that is next in objective list
  private minimapQuestDot!: Phaser.GameObjects.Arc

  // Handle highlighting in minimap
  private uiCamera!: Phaser.Cameras.Scene2D.Camera
  private worldObjects: Phaser.GameObjects.GameObject[] = []
  private minimapNpcDots: Phaser.GameObjects.Arc[] = []
  private isObjectiveComplete = false

  // Timer and gold HUD
  private hud!: GameHUD
  private coins = 1000
  private remainingTime = 3600 // in seconds
  private timerEvent!: Phaser.Time.TimerEvent
  private isTimeUp = false

  // Background music and npc talk sounds
  private bgMusic?: Phaser.Sound.BaseSound

  // Act 1 - Get to hotel
  private isCutscenePlaying = false

  private playerFollowOffset = {
    x: -50,
    y: 0,
  }

  private npcTalkSoundKeys = ['npc-talk-1', 'npc-talk-2', 'npc-talk-3']

  // Black bg on cutscene
  private nightOverlay?: Phaser.GameObjects.Rectangle
  private nightText?: Phaser.GameObjects.Text

  private isStoryUIVisible = true
  private houseNoiseTimer?: Phaser.Time.TimerEvent

  // Speed during movement lock of player and npc
  private cutsceneWalkSpeed = 200
  private fastTravelSpeed = 300

  private complimentTipCost = 1

  private scamHousePathToSmallTalk = [
    { x: 1700, y: 1540 },
    { x: 1750, y: 1660 },
    { x: 2050, y: 1660 },
  ]

  private scamHousePathAfterSmallTalk = [
    { x: 2050, y: 1660 },
    { x: 2300, y: 1580 },
    { x: 2500, y: 1515 },
    { x: 2695, y: 1480 },
  ]

  private countryCompliments: Record<string, string[]> = {
    uae: ['UAE! Beautiful place.', 'Even your buildings look richer than my entire village.'],
    egypt: [
      'Egypt! Ah, then you already understand tourist prices.',
      'You are basically local. I will only scam you politely.',
    ],
    italy: [
      'Italy! Pasta, fashion, romance.',
      'Very classy country. Your wallet must also be classy.',
    ],
    japan: [
      'Japan! So polite, so clean, so organized.',
      'Even your luggage probably says thank you.',
    ],
    usa: ['America! Big country, big dreams.', 'And hopefully, big tips.'],
    india: ['India! Amazing food, strong tea, great bargaining.', 'I must be careful with you.'],
  }

  // Debug key to get coordinates of points in the game via player movements
  private debugCoordKey!: Phaser.Input.Keyboard.Key

  private merchantOffers: MerchantOffer[] = [
    {
      npcName: 'NPC_1',
      label: 'Hotel guide',
      price: 0,
      pitch: 'Hotel? Yes, yes. I know a place.',
      reaction: 'Excellent. Cheap choice. Financially responsible.',
    },
    {
      npcName: 'NPC_12',
      label: 'Hotel guide',
      price: 0,
      pitch: 'Hotel? Yes, I know a better one.',
      reaction: 'Wonderful. You chose premium confusion.',
    },
    {
      npcName: 'NPC_9',
      label: 'Hotel guide',
      price: 0,
      pitch: 'Hotel? Of course. Mine has extra mystery.',
      reaction: 'Excellent. Mystery package begins.',
    },
    {
      npcName: 'NPC_6',
      label: 'Hotel guide',
      price: 0,
      pitch: 'Hotel? I know the most hotel-looking hotel.',
      reaction: 'Good choice. Very hotel. Much building.',
    },
    {
      npcName: 'NPC_5',
      label: 'Hotel guide',
      price: 0,
      pitch: 'Hotel? Yes. Very close. Emotionally close.',
      reaction: 'Perfect. Your wallet is brave.',
    },
  ]

  private storyStage: StoryStage = 'intro'

  private tilemap!: Phaser.Tilemaps.Tilemap

  // Opening sequence with loading and fading into game and player walking out the door
  private isOpeningSequencePlaying = false

  private openingIntroEndPoint = {
    x: 0,
    y: 0,
  }

  private openingIntroSpeed = 75

  private openingOverlayObjects: Phaser.GameObjects.GameObject[] = []
  private openingDotsTimer?: Phaser.Time.TimerEvent

  private firstInteractedMerchantName?: string
  private firstInteractedMerchantPrice = 10

  private nextMerchantPrice = 25
  private merchantPriceIncrease = 15

  private merchantQuotedPrices = new Map<string, number>()

  // small animation on the hotel merchants to show them waiting for tourist
  private merchantWaitingTweens = new Map<NPC, Phaser.Tweens.Tween>()
  private merchantHomePositions = new Map<NPC, { x: number; y: number }>()

  private merchantWaitingStep = 14

  // Baby sound for hotel cut scene
  private cutsceneMusic?: Phaser.Sound.BaseSound
  private allowNpcTalkSfx = true

  // Minigame UI Config
  private minigame!: MinigamePopup

  private reputation = 0

  private storyQuestFlags = {
    metBazaarAuntie: false,
    completedMapBargain: false,
    completedDateTrade: false,
    completedPyramidRiddles: false,
  }

  // To make the player enter the city below the gate
  private foregroundGateLayer?: Phaser.Tilemaps.TilemapLayer;

  private bazaarEntranceMarker?: Phaser.GameObjects.Arc  
  private bazaarEntrancePoint?: {
    x: number
    y: number
  }
  
  private bazaarEntranceGlow?: Phaser.GameObjects.Arc
  private bazaarEntranceRing?: Phaser.GameObjects.Arc
  private bazaarEntranceInner?: Phaser.GameObjects.Arc
  private bazaarEntranceArrow?: Phaser.GameObjects.Text
  private bazaarEntranceLabel?: Phaser.GameObjects.Container
  private bazaarEntranceLabelText?: Phaser.GameObjects.Text
  private bazaarEntranceZone?: Phaser.GameObjects.Zone
  
  private bazaarEntranceRadius = 95
  
  private returnFromBazaar = false
private villageSpawnName = 'PlayerSpawn'

private timerEvent?: Phaser.Time.TimerEvent

private stopGameTimer?: () => void
  /** Registers this scene with Phaser under the key "VillageScene". */
  constructor() {
    super('VillageScene')
  }

  init(data?: {
    fromBazaar?: boolean
    spawnName?: string
    coins?: number
    reputation?: number
  }) {
    this.returnFromBazaar = Boolean(data?.fromBazaar)
    this.villageSpawnName = data?.spawnName ?? 'PlayerSpawn'
  
    if (typeof data?.coins === 'number') {
      this.coins = data.coins
    }
  
    if (typeof data?.reputation === 'number') {
      this.reputation = data.reputation
    }
  }

  /**
   * Sets up the tilemap, player, collision walls, camera, input, and render order.
   * Called once when the scene starts.
   */
  create() {
    // --- Tilemap setup ---
    // Load the village tilemap exported from Tiled and bind it to the loaded tileset image.
    const map = this.make.tilemap({
      key: 'egypt_city',
    })

    this.tilemap = map

    const tileset = map.addTilesetImage('egypt_desert_tileset', 'egypt_desert_tileset')

    if (!tileset) {
      console.error('Tileset not found')
      console.log(map.tilesets.map((t) => t.name))
      return
    }

    // --- Tile layers ---
    // Create visible layers from the map. Each layer gets a different depth so objects draw on top of ground.
    const groundLayer = map.createLayer('Ground', tileset)
    const pathsLayer = map.createLayer('Paths', tileset)
    const waterLayer = map.createLayer('Water', tileset)
    const buildingsLayer = map.createLayer('Buildings', tileset)
    const propsLayer = map.createLayer('Props', tileset)
    const foregroundGateLayer = map.createLayer('ForegroundGate', tileset)

    console.log(
      'Map layers:',
      map.layers.map((layer) => layer.name)
    )

    console.log(
      'ForegroundGate created:',
      Boolean(foregroundGateLayer)
    )

    if (!foregroundGateLayer) {
      console.warn(
        'ForegroundGate layer not found. Check the exact layer name in Tiled.'
      )
    } else {
      this.foregroundGateLayer = foregroundGateLayer
    }

    groundLayer?.setDepth(0)
    pathsLayer?.setDepth(1)
    waterLayer?.setDepth(2)
    buildingsLayer?.setDepth(10)
    propsLayer?.setDepth(20)
    foregroundGateLayer?.setDepth(9000)

    this.worldObjects.push(
      ...([
        groundLayer,
        pathsLayer,
        waterLayer,
        buildingsLayer,
        propsLayer,
        foregroundGateLayer,
      ].filter(Boolean) as Phaser.GameObjects.GameObject[]),
    )

    // Initialization of dialogues with NPC
    this.dialogue = new DialogueBox(this)

    // Minigame dialogue initialisation
    this.minigame = new MinigamePopup(this)

    // Initialization of objectives
    this.objectiveBox = new ObjectiveBox(this)
    this.objectiveBox.setText(this.getCurrentObjectiveStep()?.objectiveText)

    // Space hides the conversation
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // --- Player setup ---
    // Spawn the player sprite at the starting position with physics and a slightly smaller scale.
    // this.player = this.physics.add.sprite(20, 10, "player");
const gameplaySpawn = this.getSpawnPoint(
  map,
  this.villageSpawnName
)
    const introSpawn = this.getOptionalSpawnPoint(map, 'PlayerIntroStart') ?? {
      x: gameplaySpawn.x,
      y: gameplaySpawn.y - 90,
    }

    this.openingIntroEndPoint = gameplaySpawn

    this.player = this.physics.add.sprite(introSpawn.x, introSpawn.y, 'player')

    this.player.setData('animKey', 'player')

    this.player.setScale(1)
    this.player.setDepth(30)
    this.worldObjects.push(this.player)

    // --- NPC setup ---
    // const wizard = new NPC(
    //   this,
    //   340,
    //   260,
    //   "wizard",
    //   Dialogue.wizard.open
    // );

    // // Push NPC into NPC Array
    // this.npcs.push(wizard);
    // wizard.setFrame(0);
    // wizard.setScale(1.2);
    // wizard.setDepth(30);
    this.createNPCsFromMap(map)
    this.createQuestMarker()
    this.createInteractPrompt()
    this.createBazaarEntranceMarker(map)
    // --- Collision objects ---
    // Read invisible collision rectangles from the Tiled object layer and turn them into static physics bodies.
    const collisionObjects = map.getObjectLayer('CollisionObjects')

    if (collisionObjects) {
      collisionObjects.objects.forEach((obj) => {
        const wall = this.add.rectangle(
          obj.x! + obj.width! / 2,
          obj.y! + obj.height! / 2,
          obj.width!,
          obj.height!,
          0xff0000,
          0, // Invisible
        )

        this.physics.add.existing(wall, true)

        // Adds collision for player to walls
        this.physics.add.collider(this.player, wall as Phaser.GameObjects.Rectangle)
      })
    }
    this.player.setDepth(30)

    // --- Camera setup ---
    // Constrain the camera to the map bounds and smoothly follow the player.
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    this.cameras.main.startFollow(this.player, true, 0.15, 0.15)

    this.cameras.main.setZoom(0.8)

    this.createMinimap(map)

    const hudWidth = 150

this.hud = new GameHUD(
  this,
  this.minimapConfig.x + this.minimapConfig.width - hudWidth,
  this.minimapConfig.y + this.minimapConfig.height + 6,
  hudWidth,
)

    this.hud.setCoins(this.coins)
this.hud.setReputation(this.reputation)

    const timerController = startOrResumeSharedCountdown(
      this,
      (remainingSeconds) => {
        this.hud.setTime(remainingSeconds)
      },
      {
        totalSeconds: 3600,
      }
    )
    
    this.stopGameTimer = timerController.stop

    this.createUICamera()

    if (this.returnFromBazaar) {
      this.isOpeningSequencePlaying = false
      this.isCutscenePlaying = false
    
      this.player.setVisible(true)
      this.player.setPosition(gameplaySpawn.x, gameplaySpawn.y)
      this.player.setVelocity(0)
      this.player.stop()
    
      this.storyStage = 'bazaarQuests'
    
      this.setStoryUIVisible(true)
    
      this.objectiveBox.setText(
        'Objective: Continue your journey through Hahaland.'
      )
    
      this.cameras.main.centerOn(gameplaySpawn.x, gameplaySpawn.y)
    } else {
      this.startOpeningSequence()
    }
    // --- Keyboard input ---
    // Bind WASD keys for four-directional movement.
    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })

    // --- Keyboard input for NPC interactions---
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    this.setupAudio()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bgMusic?.stop()
    })

    // Debug key to get coordinates of points in the game via player movements
    // Move the player to the required coordinate and press p
    this.debugCoordKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P)
  }

  private setupAudio() {
    const musicKey = 'egypt-theme'

    if (!this.cache.audio.exists(musicKey)) {
      console.warn(`Audio key "${musicKey}" not found.`)
      return
    }

    this.bgMusic = this.sound.add(musicKey, {
      loop: true,
      volume: 0.45,
    })

    if (this.cache.audio.exists('cutscene-theme')) {
      this.cutsceneMusic = this.sound.add('cutscene-theme', {
        loop: true,
        volume: 0.55,
      })

      console.log('Cutscene music loaded successfully')
    } else {
      console.warn('cutscene-theme audio was NOT found')
    }

    // Try once immediately
    this.startBackgroundMusic()

    // Also try after real Phaser user input
    this.input.once('pointerdown', () => {
      this.startBackgroundMusic()
    })

    this.input.keyboard?.once('keydown', () => {
      this.startBackgroundMusic()
    })
  }

  private startCutsceneMusic() {
    console.log('Trying to start cutscene music')

    this.allowNpcTalkSfx = false

    if (this.bgMusic?.isPlaying) {
      this.bgMusic.pause()
    }

    if (!this.cutsceneMusic) {
      console.warn('No cutsceneMusic object exists')
      return
    }

    if (!this.cutsceneMusic.isPlaying) {
      this.cutsceneMusic.play({
        loop: true,
        volume: 0.55,
      })

      console.log('Cutscene music started')
    }
  }

  private stopCutsceneMusic() {
    this.allowNpcTalkSfx = true

    if (this.cutsceneMusic?.isPlaying) {
      this.cutsceneMusic.stop()
    }

    if (this.bgMusic && !this.bgMusic.isPlaying) {
      this.bgMusic.resume()
    }
  }

  private startBackgroundMusic() {
    if (this.isCutscenePlaying) return

    if (!this.bgMusic) return
    if (this.bgMusic.isPlaying) return

    this.bgMusic.play({
      loop: true,
      volume: 0.45,
    })
  }

  private createQuestMarker() {
    this.questMarker = this.add.text(0, 0, '!', {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#ffd966',
      stroke: '#000000',
      strokeThickness: 6,
    })

    this.questMarker.setOrigin(0.5)
    this.questMarker.setDepth(2000)
    this.questMarker.setVisible(false)

    this.worldObjects.push(this.questMarker)

    this.updateQuestMarker()
  }

  private updateQuestMarker() {
    if (!this.questMarker) return

    if (
      this.storyStage === 'intro' ||
      this.storyStage === 'travellingToFakeHotel' ||
      this.storyStage === 'fakeHotelNight' ||
      this.storyStage === 'leaveFakeHotel'
    ) {
      this.questMarker.setVisible(false)
      return
    }

    if (this.isObjectiveComplete) {
      this.questMarker.setVisible(false)
      return
    }

    const targetNpcName = this.getActiveQuestTargetNpcName();

    if (!targetNpcName) {
      this.questMarker.setVisible(false)
      return
    }
    
    const targetNPC = this.npcs.find((npc) => {
      return npc.getData('npcName') === targetNpcName
    });

    const nearest = this.getNearestNPC(100)

    const playerIsNearQuestNPC = nearest === targetNPC && this.interactPrompt?.visible

    if (playerIsNearQuestNPC) {
      this.questMarker.setVisible(false)
      return
    }

    this.questMarker.setVisible(true)

    this.questMarker.setPosition(targetNPC.x, targetNPC.y - 45)
  }

  /**
   * Runs every frame. Reads keyboard input and moves the player while playing walk animations.
   */
  update() {
    // Debug key to get coordinates of points in the game via player movements
    if (Phaser.Input.Keyboard.JustDown(this.debugCoordKey)) {
      console.log('Player position:', {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
      })
    }

    if (
      Phaser.Input.Keyboard.JustDown(
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B)
      )
    ) {
      this.scene.start('BazaarScene', {
        coins: this.coins,
        reputation: this.reputation,
      })
    }

    // block movement when opening sequence is playing
    if (this.isOpeningSequencePlaying) {
      this.player.setVelocity(0)
      return
    }

    const speed = 100

    if (this.isStoryUIVisible) {
      this.updateInteractPrompt()
      this.updateQuestMarker()
      this.updateMinimapPlayerDot()
      this.updateMinimapNpcDots()
      this.updateMinimapQuestDot()
    } else {
      this.interactPrompt?.setVisible(false)
      this.questMarker?.setVisible(false)
      this.minimapPlayerDot?.setVisible(false)
      this.minimapQuestDot?.setVisible(false)

      this.minimapNpcDots.forEach((dot) => {
        dot.setVisible(false)
      })
    }

    // Block player movement when minigame is open
    if (this.minigame?.open()) {
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

    if (this.isCutscenePlaying) {
      this.player.setVelocity(0)
      return
    }

    if (this.isTimeUp) {
      this.player.setVelocity(0)
      this.player.stop()
      return
    }

    if (
      this.keys.left.isDown ||
      this.keys.right.isDown ||
      this.keys.up.isDown ||
      this.keys.down.isDown
    ) {
      this.startBackgroundMusic()
    }
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

    // NPC interaction
    if (this.handleBazaarEntranceInput()) {
      return
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.interact()
    }
  }

  private startOpeningSequence() {
    this.isOpeningSequencePlaying = true

    this.setStoryUIVisible(false)
    this.interactPrompt?.setVisible(false)

    this.player.setVelocity(0)
    this.player.setVisible(false)

    this.showOpeningLoadingScreen()

    this.time.delayedCall(1200, () => {
      this.hideOpeningLoadingScreen(() => {
        this.player.setVisible(true)

        this.time.delayedCall(1050, () => {
          this.playDoorWalkIntro()
        })
      })
    })
  }

  private playDoorWalkIntro() {
    this.moveActorTo(
      this.player,
      this.openingIntroEndPoint.x,
      this.openingIntroEndPoint.y,
      this.openingIntroSpeed,
      () => {
        this.isOpeningSequencePlaying = false

        this.setStoryUIVisible(true)

        this.objectiveBox.setText('Objective: Choose a hotel guide.')

        this.startMerchantWaitingAnimations()

        this.showEmotion(this.player, '!')
      },
    )
  }

  private showOpeningLoadingScreen() {
    const width = this.scale.width
    const height = this.scale.height

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x050505, 1)

    overlay.setScrollFactor(0)
    overlay.setDepth(70000)

    const title = this.add.text(width / 2, height / 2 - 45, 'HAHALAND', {
      fontFamily: 'Georgia',
      fontSize: '52px',
      color: '#ffd966',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold',
    })

    title.setOrigin(0.5)
    title.setScrollFactor(0)
    title.setDepth(70001)

    const subtitle = this.add.text(width / 2, height / 2 + 18, 'Entering the old city', {
      fontFamily: 'Georgia',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    })

    subtitle.setOrigin(0.5)
    subtitle.setScrollFactor(0)
    subtitle.setDepth(70001)

    const loading = this.add.text(width / 2, height / 2 + 62, 'Loading', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#d9b24c',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    })

    loading.setOrigin(0.5)
    loading.setScrollFactor(0)
    loading.setDepth(70001)

    let dots = 0

    this.openingDotsTimer = this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        dots = (dots + 1) % 4
        loading.setText(`Loading${'.'.repeat(dots)}`)
      },
    })

    this.tweens.add({
      targets: title,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.openingOverlayObjects = [overlay, title, subtitle, loading]
  }

  private hideOpeningLoadingScreen(onComplete?: () => void) {
    this.openingDotsTimer?.remove(false)
    this.openingDotsTimer = undefined

    this.tweens.add({
      targets: this.openingOverlayObjects,
      alpha: 0,
      duration: 650,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.openingOverlayObjects.forEach((obj) => {
          obj.destroy()
        })

        this.openingOverlayObjects = []

        onComplete?.()
      },
    })
  }

  // Logic for interacting with NPCs using the E key
  private interact() {
    const nearest = this.getNearestNPC(100)

    if (!nearest) return

    this.startBackgroundMusic()
    this.playNPCTalkSound()

    const npcName = nearest.getData('npcName')
    const npcPortraitKey = nearest.texture.key

    if (npcName === 'NPC_14' && this.storyStage === 'findRealHotel') {
      this.startBazaarAuntieScene()
      this.interactPrompt.setVisible(false)
      return
    }

    const isMerchant = this.merchantOffers.some((offer) => offer.npcName === npcName)

    if (isMerchant && this.storyStage === 'intro') {
      this.showDirectMerchantOffer(nearest)
      this.interactPrompt.setVisible(false)
      return
    }

    const questHandled = this.handleQuestProgress(npcName, npcPortraitKey)

    this.interactPrompt.setVisible(false)

    if (questHandled) return

    this.dialogue.show(nearest.dialogue, undefined, npcPortraitKey)
  }

  private startBazaarAuntieScene() {
    const auntieNpc = this.npcs.find((npc) => npc.getData('npcName') === 'NPC_14')

    if (!auntieNpc) {
      console.warn('NPC_14 (Bazaar Auntie) not found on map.')
      return
    }

    const portraitKey = 'npc14'

    if (this.storyQuestFlags.metBazaarAuntie) {
      this.dialogue.show(
        [
          {
            text: 'Remember, tourist.',
            portraitKey,
          },
          {
            text: 'In the bazaar, the first price is not a price.',
            portraitKey,
          },
          {
            text: 'It is a joke wearing a number.',
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
          text: 'You look terrible.',
          portraitKey,
        },
        {
          text: 'I slept in a fake hotel.',
          portraitKey: 'player',
        },
        {
          text: 'Ah. First night in Hahaland?',
          portraitKey,
        },
        {
          text: 'This happens often?',
          portraitKey: 'player',
        },
        {
          text: 'It is basically immigration.',
          portraitKey,
        },
        {
          text: 'I need a real hotel.',
          portraitKey: 'player',
        },
        {
          text: 'Then first, you need power.',
          portraitKey,
        },
        {
          text: 'Money?',
          portraitKey: 'player',
        },
        {
          text: 'No. Bargaining.',
          portraitKey,
        },
        {
          text: 'Rule one: never say wow.',
          portraitKey,
        },
        {
          text: 'Rule two: if they say special price, protect your wallet.',
          portraitKey,
        },
        {
          text: 'Rule three: walk away slowly. The slower you walk, the cheaper it gets.',
          portraitKey,
        },
      ],
      () => {
        this.storyQuestFlags.metBazaarAuntie = true
        this.storyStage = 'bazaarTraining'
      
        this.objectiveBox.setText(
          'Objective: Enter the bazaar district.'
        )
      
        this.questMarker.setVisible(false)
        this.minimapQuestDot.setVisible(false)
      
        this.showBazaarEntranceMarker()
      },
      portraitKey,
    )
  }

  private showDirectMerchantOffer(npc: NPC) {
    this.stopMerchantWaitingAnimation(npc)
    const npcName = npc.getData('npcName') as string

    const offer = this.merchantOffers.find((item) => item.npcName === npcName)

    if (!offer) return

    const portraitKey = npc.texture.key
    const price = this.getMerchantPrice(offer)

    const isCheapOriginalMerchant = offer.npcName === this.firstInteractedMerchantName

    const lines = isCheapOriginalMerchant
      ? this.getFirstInteractedMerchantDialogue(price, portraitKey)
      : this.getIncreasingMerchantDialogue(offer, price, portraitKey)

    this.dialogue.showChoice({
      lines,
      portraitKey,
      choices: [
        {
          label: `Accept ${price} coins`,
          value: 'accept',
        },
        {
          label: 'Keep looking',
          value: 'decline',
        },
      ],
      onChoice: (value) => {
        if (value === 'accept') {
          this.acceptMerchantOffer(npc, offer, price)
        } else {
          this.declineMerchantOffer(npc, offer, price)
        }
      },
    })
  }

  private getFirstInteractedMerchantDialogue(price: number, portraitKey: string) {
    const playerHasCheckedOthers = this.merchantQuotedPrices.size > 1

    if (!playerHasCheckedOthers) {
      return [
        {
          text: 'Welcome, traveler.',
          portraitKey,
        },
        {
          text: `I can take you to a hotel for ${price} coins.`,
          portraitKey,
        },
        {
          text: 'Simple price. No tourist calculator.',
          portraitKey,
        },
      ]
    }

    return [
      {
        text: 'Ah, you came back.',
        portraitKey,
      },
      {
        text: `My price is still ${price} coins.`,
        portraitKey,
      },
      {
        text: 'Others increase prices. I increase trust.',
        portraitKey,
      },
      {
        text: 'Also maybe scam later. But politely.',
        portraitKey,
      },
    ]
  }

  private getIncreasingMerchantDialogue(offer: MerchantOffer, price: number, portraitKey: string) {
    return [
      {
        text: offer.pitch,
        portraitKey,
      },
      {
        text: `For you, only ${price} coins.`,
        portraitKey,
      },
      {
        text: 'Price is higher because I smiled professionally.',
        portraitKey,
      },
      {
        text: 'The smile has service charge.',
        portraitKey,
      },
    ]
  }

  private acceptMerchantOffer(npc: NPC, offer: MerchantOffer, price: number) {
    const portraitKey = npc.texture.key

    if (this.coins < price) {
      this.dialogue.show(
        [
          {
            text: `You need ${price} coins.`,
            portraitKey,
          },
          {
            text: 'Your wallet has entered silent mode.',
            portraitKey,
          },
        ],
        undefined,
        portraitKey,
      )

      return
    }
    this.stopAllMerchantWaitingAnimations()
    this.changeCoins(-price)

    this.dialogue.show(
      [
        {
          text: `${price} coins received.`,
          portraitKey,
        },
        {
          text: offer.reaction,
          portraitKey,
        },
        {
          text: 'Follow me. Your hotel is definitely a place.',
          portraitKey,
        },
      ],
      () => {
        this.storyStage = 'travellingToFakeHotel'
        this.startHotelScamCutscene(npc)
      },
      portraitKey,
    )
  }

  private declineMerchantOffer(npc: NPC, offer: MerchantOffer, price: number) {
    const portraitKey = npc.texture.key

    const isFirstInteractedMerchant = offer.npcName === this.firstInteractedMerchantName

    const lines = isFirstInteractedMerchant
      ? [
          {
            text: 'No problem.',
            portraitKey,
          },
          {
            text: 'I will keep 10 coins.',
            portraitKey,
          },
          {
            text: 'Stable price. Unstable hotel.',
            portraitKey,
          },
        ]
      : [
          {
            text: 'You want to ask another guide?',
            portraitKey,
          },
          {
            text: 'Very brave.',
            portraitKey,
          },
          {
            text: 'The next smile may cost more.',
            portraitKey,
          },
        ]

    this.dialogue.show(
      lines,
      () => {
        if (this.storyStage === 'intro') {
          this.startMerchantWaitingAnimation(npc)
        }
      },
      portraitKey,
    )
  }

  private startHotelScamCutscene(npc: NPC) {
    this.isCutscenePlaying = true

    this.interactPrompt.setVisible(false)
    this.questMarker.setVisible(false)

    this.dialogue.show(
      ['Excellent choice!', 'Follow me, my friend.', 'Your hotel is very close.'],
      () => {
        this.walkToFakeHotel(npc)
      },
      npc.texture.key,
    )
  }

  private setStoryUIVisible(visible: boolean) {
    // Hide/show minimap camera
    this.isStoryUIVisible = visible

    this.interactPrompt?.setVisible(false)
    this.questMarker?.setVisible(false)

    if (this.minimap) {
      this.minimap.setVisible(visible)
    }

    this.minimapBorder?.setVisible(visible)
    this.minimapPlayerDot?.setVisible(visible)
    this.minimapQuestDot?.setVisible(visible)

    this.minimapNpcDots.forEach((dot) => {
      dot.setVisible(visible)
    })

    if (this.hud?.container) {
      this.hud.container.setVisible(visible)
    }

    const objectiveAny = this.objectiveBox as any

    if (objectiveAny?.container) {
      objectiveAny.container.setVisible(visible)
    }
  }

  private walkToFakeHotel(npc: NPC) {
    this.dialogue.showChoice({
      lines: [
        'The hotel is a little walk from here.',
        'You can skip the travel ...',
        'but some story moments may be missed.'
      ],
      portraitKey: npc.texture.key,
      choices: [
        { label: 'Enjoy walk', value: 'walk' },
        { label: 'Skip travel', value: 'skip' },
      ],
      onChoice: (value) => {
        if (value === 'skip') {
          this.skipTravelToFakeHotel(npc)
          return
        }

        this.startLongTravelToFakeHotel(npc)
      },
    })
  }

  private startLongTravelToFakeHotel(npc: NPC) {
    const npcPath = this.scamHousePathToSmallTalk

    const playerPath = npcPath.map((point) => ({
      x: point.x + this.playerFollowOffset.x,
      y: point.y + this.playerFollowOffset.y,
    }))

    this.walkActorPath(npc, npcPath, this.cutsceneWalkSpeed)

    this.walkActorPath(this.player, playerPath, this.cutsceneWalkSpeed, () => {
      this.startCountrySmallTalk(npc)
    })
  }

  private continueTravelToFakeHotel(npc: NPC) {
    const npcPath = this.scamHousePathAfterSmallTalk

    const playerPath = npcPath.map((point) => ({
      x: point.x + this.playerFollowOffset.x,
      y: point.y + this.playerFollowOffset.y,
    }))

    this.walkActorPath(npc, npcPath, this.cutsceneWalkSpeed)

    this.walkActorPath(this.player, playerPath, this.cutsceneWalkSpeed, () => {
      this.revealFakeHotel(npc)
    })
  }

  private skipTravelToFakeHotel(npc: NPC) {
    this.dialogue.show(
      [
        {
          text: 'Skipping travel...',
          portraitKey: npc.texture.key,
        },
        {
          text: 'Some story jokes may be missed.',
          portraitKey: npc.texture.key,
        },
      ],
      () => {
        const finalPoint =
          this.scamHousePathAfterSmallTalk[this.scamHousePathAfterSmallTalk.length - 1]

        this.moveActorTo(npc, finalPoint.x, finalPoint.y, this.fastTravelSpeed)

        this.moveActorTo(
          this.player,
          finalPoint.x + this.playerFollowOffset.x,
          finalPoint.y + this.playerFollowOffset.y,
          this.fastTravelSpeed,
          () => {
            this.revealFakeHotel(npc)
          },
        )
      },
    )
  }

  private startCountrySmallTalk(npc: NPC) {
    this.player.setVelocity(0)
    npc.setVelocity(0)

    this.dialogue.showChoiceList({
      lines: [
        {
          text: 'So, traveler...',
          portraitKey: npc.texture.key,
        },
        {
          text: 'Where are you from?',
          portraitKey: npc.texture.key,
        },
      ],
      portraitKey: npc.texture.key,
      choices: [
        { label: 'UAE', value: 'uae' },
        { label: 'Egypt', value: 'egypt' },
        { label: 'Italy', value: 'italy' },
        { label: 'Japan', value: 'japan' },
        { label: 'USA', value: 'usa' },
        { label: 'India', value: 'india' },
      ],
      onChoice: (country) => {
        this.respondToCountry(npc, country)
      },
    })
  }

  private respondToCountry(npc: NPC, country: string) {
    const compliment = this.countryCompliments[country] ?? [
      'Ah, beautiful place!',
      'Very famous. Very nice. Very tip-worthy.',
    ]

    this.dialogue.show(
      [
        {
          text: compliment[0],
          portraitKey: npc.texture.key,
        },
        {
          text: compliment[1],
          portraitKey: npc.texture.key,
        },
        {
          text: 'That was a premium compliment.',
          portraitKey: npc.texture.key,
        },
      ],
      () => {
        this.askForComplimentTip(npc)
      },
    )
  }

  private askForComplimentTip(npc: NPC) {
    this.dialogue.showChoice({
      lines: [
        {
          text: 'By the way...',
          portraitKey: npc.texture.key,
        },
        {
          text: 'That compliment was not free.',
          portraitKey: npc.texture.key,
        },
        {
          text: 'Only 1 gold for premium emotional support.',
          portraitKey: npc.texture.key,
        },
        {
          text: 'Would you like to tip your cultural guide?',
          portraitKey: npc.texture.key,
        },
      ],
      portraitKey: npc.texture.key,
      choices: [
        {
          label: 'Tip 1 gold',
          value: 'tip',
        },
        {
          label: 'No tip',
          value: 'no-tip',
        },
      ],
      onChoice: (value) => {
        if (value === 'tip') {
          this.handleTipYes(npc)
        } else {
          this.handleTipNo(npc)
        }
      },
    })
  }

  private handleTipYes(npc: NPC) {
    if (this.coins <= 0) {
      this.dialogue.show(
        [
          {
            text: 'I would tip, but I have no gold.',
            portraitKey: 'player',
          },
          {
            text: 'No gold?',
            portraitKey: npc.texture.key,
          },
          {
            text: 'This is a very sad day for tourism.',
            portraitKey: npc.texture.key,
          },
        ],
        () => {
          this.showEmotion(npc, '...')
          this.continueTravelToFakeHotel(npc)
        },
      )

      return
    }

    this.changeCoins(-this.complimentTipCost)

    this.dialogue.show(
      [
        {
          text: 'Fine. Here is 1 gold.',
          portraitKey: 'player',
        },
        {
          text: 'Ah! A generous traveler!',
          portraitKey: npc.texture.key,
        },
        {
          text: 'Your country is now officially my favorite.',
          portraitKey: npc.texture.key,
        },
      ],
      () => {
        this.showEmotion(npc, '$')
        this.continueTravelToFakeHotel(npc)
      },
    )
  }

  private handleTipNo(npc: NPC) {
    this.dialogue.show(
      [
        {
          text: 'No tip.',
          portraitKey: 'player',
        },
        {
          text: 'No tip?',
          portraitKey: npc.texture.key,
        },
        {
          text: 'After such a beautiful compliment?',
          portraitKey: npc.texture.key,
        },
        {
          text: 'Fine. I will walk sadly.',
          portraitKey: npc.texture.key,
        },
      ],
      () => {
        this.showEmotion(npc, '!!')
        this.cameras.main.shake(180, 0.004)
        this.continueTravelToFakeHotel(npc)
      },
    )
  }

  private createMerchantPriceShouts() {
    console.log(
      'NPCs loaded:',
      this.npcs.map((npc) => npc.getData('npcName')),
    )

    console.log(
      'Merchant offers:',
      this.merchantOffers.map((offer) => offer.npcName),
    )

    this.merchantOffers.forEach((offer) => {
      const npc = this.npcs.find((item) => item.getData('npcName') === offer.npcName)

      if (!npc) {
        console.warn('No NPC found for merchant offer:', offer.npcName)
        return
      }

      const shout = this.add.text(npc.x, npc.y - 52, `${offer.price} gold!`, {
        fontFamily: 'Georgia',
        fontSize: '15px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      })

      shout.setOrigin(0.5)
      shout.setDepth(2600)

      this.tweens.add({
        targets: shout,
        y: shout.y - 4,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      this.worldObjects.push(shout)
    })
  }

  private changeCoins(amount: number) {
    this.coins = Math.max(0, this.coins + amount)

    const hudAny = this.hud as any

    if (hudAny?.setCoins) {
      hudAny.setCoins(this.coins)
      return
    }

    if (hudAny?.updateCoins) {
      hudAny.updateCoins(this.coins)
      return
    }

    console.warn('HUD coin update method not found.')
  }

  private walkActorPath(
    actor: Phaser.Physics.Arcade.Sprite,
    path: { x: number; y: number }[],
    speed = this.cutsceneWalkSpeed,
    onComplete?: () => void,
  ) {
    if (path.length === 0) {
      onComplete?.()
      return
    }

    const [nextPoint, ...remainingPath] = path

    this.moveActorTo(actor, nextPoint.x, nextPoint.y, speed, () => {
      this.walkActorPath(actor, remainingPath, speed, onComplete)
    })
  }

  private moveActorTo(
    actor: Phaser.Physics.Arcade.Sprite,
    x: number,
    y: number,
    speed = this.cutsceneWalkSpeed,
    onComplete?: () => void,
  ) {
    actor.setVelocity(0)

    const dx = x - actor.x
    const dy = y - actor.y

    const distance = Phaser.Math.Distance.Between(actor.x, actor.y, x, y)

    const duration = Math.max(600, (distance / speed) * 1000)

    let direction: 'left' | 'right' | 'up' | 'down'

    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left'
    } else {
      direction = dy > 0 ? 'down' : 'up'
    }

    const animationTextureKey = actor.getData('animKey') ?? actor.texture.key

    const animationKey = `${animationTextureKey}-walk-${direction}`

    if (this.anims.exists(animationKey)) {
      actor.play(animationKey, true)
    } else {
      console.warn('Missing animation:', animationKey)
    }

    this.tweens.add({
      targets: actor,
      x,
      y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        actor.stop()
        actor.setFrame(0)
        onComplete?.()
      },
    })
  }

  private revealFakeHotel(npc: NPC) {
    this.cameras.main.shake(250, 0.006)

    this.showEmotion(this.player, '!!')

    const playerPortraitKey = this.player.texture.key

    this.dialogue.show(
      [
        {
          text: 'Here we are!',
          portraitKey: npc.texture.key,
        },
        {
          text: 'Wait...',
          portraitKey: playerPortraitKey,
        },
        {
          text: 'This is your house?',
          portraitKey: playerPortraitKey,
        },
        {
          text: 'Yes, yes. Very local hotel.',
          portraitKey: npc.texture.key,
        },
        {
          text: 'This is NOT a hotel!',
          portraitKey: playerPortraitKey,
        },
      ],
      () => {
        this.objectiveBox.setText('Objective: Try to sleep in the fake hotel.')

        this.time.delayedCall(1500, () => {
          this.startNoisyNightSequence(npc)
        })
      },
    )
  }

  private startNoisyNightSequence(npc: NPC) {
    this.storyStage = 'fakeHotelNight'
    this.setStoryUIVisible(false)

    this.player.setVelocity(0)
    this.player.stop()

    this.cameras.main.fadeOut(900, 0, 0, 0)

    this.time.delayedCall(950, () => {
      this.showNightOverlay()
      this.startCutsceneMusic()

      this.objectiveBox.setText('Objective: Try to sleep...')

      this.time.delayedCall(1000, () => {
        this.dialogue.show(
          [
            'That night...',
            'The house is too loud.',
            'Someone is arguing.',
            'A baby is crying.',
            'Pots are clanging in the kitchen.',
            {
              text: "I can't sleep here...",
              portraitKey: 'player',
            },
            {
              text: 'I need to leave and find a real hotel.',
              portraitKey: 'player',
            },
          ],
          () => {
            this.startLeaveFakeHotelSequence(npc)
          },
        )
      })
    })
  }

  private showNightOverlay() {
    const width = this.scale.width
    const height = this.scale.height

    this.nightOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.95)

    this.nightOverlay.setScrollFactor(0)
    this.nightOverlay.setDepth(19000)

    this.nightText = this.add.text(width / 2, height / 2 - 40, 'That night...', {
      fontFamily: 'Georgia',
      fontSize: '42px',
      color: '#ffd966',
      fontStyle: 'bold',
    })

    this.nightText.setOrigin(0.5)
    this.nightText.setScrollFactor(0)
    this.nightText.setDepth(19001)

    // Important: do not let the UI camera render the black overlay
    if (this.uiCamera) {
      this.uiCamera.ignore([this.nightOverlay, this.nightText])
    }

    this.tweens.add({
      targets: this.nightText,
      alpha: 0.45,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private hideNightOverlay() {
    this.nightOverlay?.destroy()
    this.nightText?.destroy()

    this.nightOverlay = undefined
    this.nightText = undefined
  }

  private getFakeHotelDoorPoint() {
    return this.getSpawnPoint(this.tilemap, 'FakeHotelDoor')
  }

  private getFakeHotelInsidePoint() {
    const inside = this.getOptionalSpawnPoint(this.tilemap, 'FakeHotelInside')

    if (inside) return inside

    const door = this.getFakeHotelDoorPoint()

    return {
      x: door.x,
      y: door.y - 80,
    }
  }

  private getFakeHotelExitPoint() {
    const exit = this.getOptionalSpawnPoint(this.tilemap, 'FakeHotelExit')

    if (exit) return exit

    const door = this.getFakeHotelDoorPoint()

    return {
      x: door.x,
      y: door.y + 70,
    }
  }

  private hideMerchantInsideFakeHotel(npc: NPC) {
    const inside = this.getFakeHotelInsidePoint()

    npc.setPosition(inside.x, inside.y)
    npc.setVisible(false)
    npc.setData('insideFakeHotel', true)
    npc.setVelocity(0)
    npc.stop()

    const body = npc.body as Phaser.Physics.Arcade.Body | null

    if (body) {
      body.enable = false
    }
  }

  private startLeaveFakeHotelSequence(npc: NPC) {
    this.storyStage = 'leaveFakeHotel'
    this.stopCutsceneMusic()
    this.isCutscenePlaying = true
    this.setStoryUIVisible(false)

    this.hideMerchantInsideFakeHotel(npc)

    const inside = this.getFakeHotelInsidePoint()

    this.player.setPosition(inside.x, inside.y)
    this.player.setVelocity(0)
    this.player.stop()

    this.hideNightOverlay()
    this.cameras.main.fade(1, 0, 0, 0, false)

    this.time.delayedCall(150, () => {
      this.cameras.main.fadeIn(900, 0, 0, 0)

      this.time.delayedCall(950, () => {
        const exit = this.getFakeHotelExitPoint()

        this.walkActorPath(this.player, [exit], this.cutsceneWalkSpeed, () => {
          this.dialogue.show(
            [
              {
                text: 'Finally... fresh air.',
                portraitKey: 'player',
              },
              {
                text: 'No guide. No kitchen bed. No emotional goat.',
                portraitKey: 'player',
              },
              {
                text: 'I need to find someone in the bazaar...',
                portraitKey: 'player',
              },
              {
                text: 'Someone who actually knows this city.',
                portraitKey: 'player',
              },
            ],
            () => {
              this.finishLeaveFakeHotelSequence()
            },
            'player',
          )
        })
      })
    })
  }

  private finishLeaveFakeHotelSequence() {
    this.isCutscenePlaying = false
    this.setStoryUIVisible(true)
    this.storyStage = 'findRealHotel'
    this.objectiveBox.setText('Objective: Talk to Bazaar Auntie.')
    this.updateQuestMarker()
    this.updateMinimapQuestDot()  
  }

  private showEmotion(actor: Phaser.Physics.Arcade.Sprite, text: string) {
    const emotion = this.add.text(actor.x, actor.y - 70, text, {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold',
    })

    emotion.setOrigin(0.5)
    emotion.setDepth(3000)

    this.tweens.add({
      targets: emotion,
      y: emotion.y - 18,
      alpha: 0,
      duration: 1200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        emotion.destroy()
      },
    })
  }

  private playNPCTalkSound() {
    const soundKey = Phaser.Utils.Array.GetRandom(this.npcTalkSoundKeys)

    if (!this.cache.audio.exists(soundKey)) {
      console.warn('NPC talk sound missing:', soundKey)
      return
    }

    this.sound.play(soundKey, {
      volume: 1,
      detune: Phaser.Math.Between(-120, 120),
    })
  }

  shutdown() {
    this.bgMusic?.stop()
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

    this.interactPrompt.setDepth(1000)
    this.interactPrompt.setVisible(false)
    this.worldObjects.push(this.interactPrompt)
  }

  private updateInteractPrompt() {
    if (this.dialogue.isOpen()) {
      this.interactPrompt.setVisible(false)
      return
    }

    const nearest = this.getNearestNPC(100)

    if (!nearest) {
      this.interactPrompt.setVisible(false)
      return
    }

    this.interactPrompt.setVisible(true)

    this.interactPrompt.setPosition(nearest.x, nearest.y - 45)
  }

  private getNearestNPC(maxDistance: number): NPC | null {
    let nearest: NPC | null = null
    let nearestDistance = maxDistance

    this.npcs.forEach((npc) => {
      if (!npc.visible) return
      if (npc.getData('insideFakeHotel')) return

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y)

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = npc
      }
    })

    return nearest
  }

  private updateMinimapNpcDots() {
    if (!this.minimapNpcDots.length) return

    this.npcs.forEach((npc, index) => {
      const dot = this.minimapNpcDots[index]

      if (!dot) return

      if (!npc.visible || npc.getData('insideFakeHotel')) {
        dot.setVisible(false)
        return
      }

      dot.setVisible(true)

      const normalizedX = Phaser.Math.Clamp(npc.x / this.mapPixelWidth, 0, 1)

      const normalizedY = Phaser.Math.Clamp(npc.y / this.mapPixelHeight, 0, 1)

      dot.setPosition(
        this.minimapConfig.x + normalizedX * this.minimapConfig.width,
        this.minimapConfig.y + normalizedY * this.minimapConfig.height,
      )
    })
  }

  private createMinimapNpcDots() {
    this.minimapNpcDots.forEach((dot) => {
      dot.destroy()
    })

    this.minimapNpcDots = this.npcs.map(() => {
      const dot = this.add.circle(this.minimapConfig.x, this.minimapConfig.y, 3, 0x66ccff)

      dot.setScrollFactor(0)
      dot.setDepth(20001)
      dot.setStrokeStyle(1, 0x000000)

      return dot
    })
  }

  private createMinimap(map: Phaser.Tilemaps.Tilemap) {
    this.mapPixelWidth = map.widthInPixels
    this.mapPixelHeight = map.heightInPixels

    const minimapWidth = 150
const minimapHeight = Math.round(
  minimapWidth * (map.heightInPixels / map.widthInPixels)
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

    this.minimap.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    const zoom = Math.min(minimapWidth / map.widthInPixels, minimapHeight / map.heightInPixels)

    this.minimap.setZoom(zoom)
    this.minimap.centerOn(map.widthInPixels / 2, map.heightInPixels / 2)

    this.minimap.setBackgroundColor(0x111111)

    this.minimapBorder = this.add.rectangle(x, y, minimapWidth, minimapHeight, 0x000000, 0)

    this.minimapBorder.setOrigin(0)
    this.minimapBorder.setScrollFactor(0)
    this.minimapBorder.setDepth(20000)
    this.minimapBorder.setStrokeStyle(2, 0xffffff, 0.9)

    this.minimapPlayerDot = this.add.circle(x, y, 4, 0xff0000)

    this.minimapPlayerDot.setScrollFactor(0)
    this.minimapPlayerDot.setDepth(20002)

    this.minimapQuestDot = this.add.circle(x, y, 5, 0xffd966)

    this.minimapQuestDot.setScrollFactor(0)
    this.minimapQuestDot.setDepth(20003)
    this.minimapQuestDot.setStrokeStyle(2, 0x000000)

    this.createMinimapNpcDots()

    this.minimap.ignore([
      this.dialogue.container,
      this.objectiveBox.container,
      this.minigame.container,
      this.interactPrompt,
      this.questMarker,
      this.minimapBorder,
      this.minimapPlayerDot,
      this.minimapQuestDot,
      ...this.minimapNpcDots,
    ])
  }

  private updateMinimapPlayerDot() {
    if (!this.minimapPlayerDot) return

    const normalizedX = Phaser.Math.Clamp(this.player.x / this.mapPixelWidth, 0, 1)

    const normalizedY = Phaser.Math.Clamp(this.player.y / this.mapPixelHeight, 0, 1)

    this.minimapPlayerDot.setPosition(
      this.minimapConfig.x + normalizedX * this.minimapConfig.width,
      this.minimapConfig.y + normalizedY * this.minimapConfig.height,
    )
  }

  private createUICamera() {
    const uiObjects: Phaser.GameObjects.GameObject[] = [
      this.dialogue.container,
      this.objectiveBox.container,
      this.hud.container,
      this.minigame.container,
      this.minimapBorder,
      this.minimapPlayerDot,
      this.minimapQuestDot,
      ...this.minimapNpcDots,
    ]

    this.cameras.main.ignore(uiObjects)

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height)

    this.uiCamera.setName('UICamera')
    this.uiCamera.setScroll(0, 0)
    this.uiCamera.setZoom(1)

    this.uiCamera.ignore(this.worldObjects)
  }

  private updateMinimapQuestDot() {
    if (!this.minimapQuestDot) return

    if (this.isObjectiveComplete) {
      this.minimapQuestDot.setVisible(false)
      return
    }

    const targetNpcName = this.getActiveQuestTargetNpcName()

    if (!targetNpcName) {
    this.minimapQuestDot.setVisible(false)
    return
    }

    const targetNPC = this.npcs.find((npc) => {
    return npc.getData('npcName') === targetNpcName
    })

    if (!targetNPC) {
      this.minimapQuestDot.setVisible(false)
      return
    }

    if (!targetNPC.visible || targetNPC.getData('insideFakeHotel')) {
      this.questMarker.setVisible(false)
      return
    }

    this.minimapQuestDot.setVisible(true)

    const normalizedX = Phaser.Math.Clamp(targetNPC.x / this.mapPixelWidth, 0, 1)

    const normalizedY = Phaser.Math.Clamp(targetNPC.y / this.mapPixelHeight, 0, 1)

    this.minimapQuestDot.setPosition(
      this.minimapConfig.x + normalizedX * this.minimapConfig.width,
      this.minimapConfig.y + normalizedY * this.minimapConfig.height,
    )
  }

  private getSpawnPoint(map: Phaser.Tilemaps.Tilemap, name: string) {
    const spawnLayer = map.getObjectLayer('Spawns')

    if (!spawnLayer) {
      console.warn('No Spawns layer found')
      return { x: 100, y: 100 }
    }

    const spawn = spawnLayer.objects.find((obj) => obj.name === name)

    if (!spawn) {
      console.warn(`Spawn point not found: ${name}`)
      return { x: 100, y: 100 }
    }

    return {
      x: spawn.x ?? 100,
      y: spawn.y ?? 100,
    }
  }

  private getOptionalSpawnPoint(
    map: Phaser.Tilemaps.Tilemap,
    name: string,
  ): { x: number; y: number } | null {
    const spawnLayer = map.getObjectLayer('Spawns')

    if (!spawnLayer) return null

    const spawn = spawnLayer.objects.find((obj) => obj.name === name)

    if (!spawn) return null

    return {
      x: spawn.x ?? 100,
      y: spawn.y ?? 100,
    }
  }

  private createNPCsFromMap(map: Phaser.Tilemaps.Tilemap) {
    const spawnLayer = map.getObjectLayer('Spawns')
    console.log(
      'Spawns objects:',
      spawnLayer?.objects.map((obj) => ({
        name: obj.name,
        type: obj.type,
        class: (obj as any).class,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        gid: (obj as any).gid,
      })),
    )
    if (!spawnLayer) {
      console.warn('No Spawns layer found')
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
      const dialogue = this.getNPCDialogue(npcName)
      const spriteKey = this.getNPCSpriteKey(npcName)

      const npc = new NPC(this, obj.x ?? 100, obj.y ?? 100, spriteKey, dialogue)

      npc.setData('npcName', npcName)
      npc.setData('animKey', spriteKey)
      npc.setFrame(0)
      npc.setScale(1)
      npc.setDepth(30)

      this.npcs.push(npc)
      this.worldObjects.push(npc)
      this.physics.add.collider(this.player, npc)
    })
  }

  private getNPCDialogue(name: string): string[] {
    const dialogues: Record<string, string[]> = Dialogue

    return dialogues[name] ?? ['Hello traveler.', 'This city has many stories.']
  }

  private getNPCSpriteKey(name: string): string {
    const sprites: Record<string, string> = {
      NPC_1: 'npc1',
      NPC_2: 'npc2',
      NPC_3: 'npc3',
      NPC_4: 'npc4',
      NPC_5: 'npc5',
      NPC_6: 'npc6',
      NPC_7: 'npc7',
      NPC_8: 'npc8',
      NPC_9: 'npc9',
      NPC_10: 'npc10',
      NPC_11: 'npc11',
      NPC_12: 'npc12',
      NPC_13: 'npc13',
      NPC_14: 'npc14',
      NPC_15: 'npc15',
      NPC_16: 'npc16',
      NPC_17: 'npc17',
      NPC_18: 'npc18',
      NPC_19: 'npc19',
      NPC_20: 'npc20',
      NPC_21: 'npc21',
    }

    return sprites[name] ?? 'wizard'
  }

  private handleQuestProgress(npcName: string, npcPortraitKey?: string): boolean {
    const currentStep = this.getCurrentObjectiveStep()

    if (currentStep.targetNpc !== npcName) {
      return false
    }

    this.dialogue.show(
      currentStep.dialogue,
      () => {
        if (currentStep.nextStepId) {
          this.currentObjectiveStepId = currentStep.nextStepId

          this.objectiveBox.setText(this.getCurrentObjectiveStep().objectiveText)
          this.updateQuestMarker()
          this.updateMinimapQuestDot()
          return
        }

        this.isObjectiveComplete = true

        this.objectiveBox.setText(currentStep.completeObjectiveText ?? 'Objective Complete')

        this.questMarker.setVisible(false)
        this.minimapQuestDot.setVisible(false)
      },
      npcPortraitKey,
    )

    return true
  }

  private getCurrentObjectiveStep(): ObjectiveStep {
    const step = this.objectives.steps[this.currentObjectiveStepId]

    if (!step) {
      console.error('Objective step not found:', this.currentObjectiveStepId)

      return {
        objectiveText: 'Objective error: step not found',
        targetNpc: '',
        dialogue: [],
      }
    }

    return step
  }

  private addCoins(amount: number) {
    this.coins += amount
    this.hud.setCoins(this.coins)
this.hud.setReputation(this.reputation)
  }

  private removeCoins(amount: number) {
    this.coins -= amount
    this.hud.setCoins(this.coins)
this.hud.setReputation(this.reputation)
  }

  private endGameDueToTime() {
    this.isTimeUp = true

    if (this.timerEvent) {
      this.timerEvent.remove(false)
    }

    this.player.setVelocity(0)
    this.player.stop()

    this.interactPrompt.setVisible(false)

    this.objectiveBox.setText("Time's up! Your run has ended.")

    this.dialogue.show([
      "Time's up!",
      'Your play session has ended.',
      'We can add restart or score screen next.',
    ])
  }

  private getMerchantPrice(offer: MerchantOffer) {
    // First merchant the player talks to becomes the cheap merchant
    if (!this.firstInteractedMerchantName) {
      this.firstInteractedMerchantName = offer.npcName

      this.merchantQuotedPrices.set(offer.npcName, this.firstInteractedMerchantPrice)

      return this.firstInteractedMerchantPrice
    }

    // First merchant always stays at 10
    if (offer.npcName === this.firstInteractedMerchantName) {
      return this.firstInteractedMerchantPrice
    }

    // If this merchant already quoted a price, keep the same quote
    const existingPrice = this.merchantQuotedPrices.get(offer.npcName)

    if (existingPrice !== undefined) {
      return existingPrice
    }

    // Every new merchant after the first becomes more expensive
    const price = this.nextMerchantPrice

    this.merchantQuotedPrices.set(offer.npcName, price)

    this.nextMerchantPrice += this.merchantPriceIncrease

    return price
  }

  private getStableMerchantDialogue(price: number, portraitKey: string) {
    if (this.merchantInflationBonus <= 0) {
      return [
        {
          text: 'Welcome, traveler.',
          portraitKey,
        },
        {
          text: `I can take you to a hotel for ${price} gold.`,
          portraitKey,
        },
        {
          text: 'Simple price. No mathematics.',
          portraitKey,
        },
      ]
    }

    return [
      {
        text: 'Ah, you came back.',
        portraitKey,
      },
      {
        text: `My price is still ${price} gold.`,
        portraitKey,
      },
      {
        text: 'Others may panic. I remain consistent.',
        portraitKey,
      },
      {
        text: 'Stable scam. Very professional.',
        portraitKey,
      },
    ]
  }

  private isMerchantNPC(npc: NPC) {
    const npcName = npc.getData('npcName') as string

    return this.merchantOffers.some((offer) => offer.npcName === npcName)
  }

  private startMerchantWaitingAnimations() {
    this.npcs.forEach((npc) => {
      if (!this.isMerchantNPC(npc)) return

      this.startMerchantWaitingAnimation(npc)
    })
  }

  private startMerchantWaitingAnimation(npc: NPC) {
    if (this.storyStage !== 'intro') return
    if (this.merchantWaitingTweens.has(npc)) return

    const homePosition = this.merchantHomePositions.get(npc) ?? {
      x: npc.x,
      y: npc.y,
    }

    this.merchantHomePositions.set(npc, homePosition)

    const tween = this.tweens.add({
      targets: npc,
      y: homePosition.y - this.merchantWaitingStep,
      duration: Phaser.Math.Between(1300, 1700),
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 600),

      onStart: () => {
        this.playMerchantWalkAnimation(npc, 'up')
      },

      onYoyo: () => {
        this.playMerchantWalkAnimation(npc, 'down')
      },

      onRepeat: () => {
        this.playMerchantWalkAnimation(npc, 'up')
      },
    })

    this.merchantWaitingTweens.set(npc, tween)
  }

  private playMerchantWalkAnimation(npc: NPC, direction: 'up' | 'down') {
    const animationTextureKey = npc.getData('animKey') ?? npc.texture.key

    const animationKey = `${animationTextureKey}-walk-${direction}`

    if (this.anims.exists(animationKey)) {
      npc.play(animationKey, true)
    } else {
      console.warn('Missing merchant waiting animation:', animationKey)
    }
  }

  private stopMerchantWaitingAnimation(npc: NPC, snapHome = true) {
    const tween = this.merchantWaitingTweens.get(npc)

    if (tween) {
      tween.stop()
      this.merchantWaitingTweens.delete(npc)
    }

    if (snapHome) {
      const homePosition = this.merchantHomePositions.get(npc)

      if (homePosition) {
        npc.setPosition(homePosition.x, homePosition.y)
      }
    }

    npc.stop()
    npc.setFrame(0)
  }

  private stopAllMerchantWaitingAnimations() {
    const merchants = Array.from(this.merchantWaitingTweens.keys())

    merchants.forEach((npc) => {
      this.stopMerchantWaitingAnimation(npc)
    })
  }

  private changeReputation(amount: number) {
    this.reputation = Phaser.Math.Clamp(
      this.reputation + amount,
      0,
      100
    )
  
    this.hud?.setReputation(this.reputation)
  
    console.log('Reputation:', this.reputation)
  }

  private addStoryItem(itemKey: keyof typeof this.storyItems) {
    if (!(itemKey in this.storyItems)) {
      console.warn(`Unknown story item: ${itemKey}`)
      return
    }

    this.storyItems[itemKey] = true
    console.log('Story item acquired:', itemKey)
  }

  private showMinigamePlaceholder(title: string, description: string) {
    console.warn(`${title}: not implemented yet.`)

    this.minigame.show({
      title,
      description: [description, 'Coming in a future update.'],
      choices: [
        {
          label: 'Continue',
          value: 'continue',
          response: 'Placeholder complete. Full minigame coming soon.',
        },
      ],
      onComplete: () => {},
    })
  }

  private getActiveQuestTargetNpcName(): string {
    if (this.storyStage === 'findRealHotel') {
      return 'NPC_14'
    }
  
    // During bazaar entrance stage, we do not want an NPC marker.
    if (this.storyStage === 'bazaarTraining') {
      return ''
    }
  
    return this.getCurrentObjectiveStep()?.targetNpc ?? ''
  }

  private createBazaarEntranceMarker(map: Phaser.Tilemaps.Tilemap) {
    const point = this.getOptionalSpawnPoint(map, 'BazaarEntrance')
  
    if (!point) {
      console.warn('BazaarEntrance spawn point not found in Tiled.')
      return
    }
  
    this.bazaarEntrancePoint = point
  
    this.bazaarEntranceGlow = this.add.circle(
      point.x,
      point.y,
      38,
      0xff4422,
      0.25
    )
  
    this.bazaarEntranceRing = this.add.circle(
      point.x,
      point.y,
      34,
      0xff0000,
      0
    )
  
    this.bazaarEntranceRing.setStrokeStyle(4, 0xffdd66, 1)
  
    this.bazaarEntranceInner = this.add.circle(
      point.x,
      point.y,
      16,
      0xff3311,
      0.85
    )
  
    this.bazaarEntranceInner.setStrokeStyle(2, 0xffffff, 0.95)
  
    this.bazaarEntranceArrow = this.add.text(
      point.x,
      point.y - 5,
      '↓',
      {
        fontFamily: 'Georgia',
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
        fontStyle: 'bold',
      }
    )
  
    this.bazaarEntranceArrow.setOrigin(0.5)
  
    const labelBg = this.add.rectangle(
      0,
      0,
      190,
      34,
      0x000000,
      0.78
    )
  
    labelBg.setStrokeStyle(2, 0xffdd66, 1)
  
    this.bazaarEntranceLabelText = this.add.text(
      0,
      0,
      'Enter Bazaar',
      {
        fontFamily: 'Georgia',
        fontSize: '16px',
        color: '#ffdd66',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      }
    )
  
    this.bazaarEntranceLabelText.setOrigin(0.5)
  
    this.bazaarEntranceLabel = this.add.container(
      point.x,
      point.y - 58,
      [labelBg, this.bazaarEntranceLabelText]
    )
  
    this.bazaarEntranceZone = this.add.zone(
      point.x,
      point.y,
      120,
      120
    )
  
    this.bazaarEntranceZone.setInteractive({
      useHandCursor: true,
    })
  
    this.bazaarEntranceZone.on('pointerdown', () => {
      if (this.storyStage !== 'bazaarTraining') return
      this.enterBazaarScene()
    })
  
    const markerObjects = [
      this.bazaarEntranceGlow,
      this.bazaarEntranceRing,
      this.bazaarEntranceInner,
      this.bazaarEntranceArrow,
      this.bazaarEntranceLabel,
      this.bazaarEntranceZone,
    ]
  
    markerObjects.forEach((obj) => {
      obj.setDepth(9500)
      obj.setVisible(false)
    })
  
    this.worldObjects.push(...markerObjects)
  
    this.tweens.add({
      targets: this.bazaarEntranceGlow,
      scaleX: 1.55,
      scaleY: 1.55,
      alpha: 0.1,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  
    this.tweens.add({
      targets: this.bazaarEntranceRing,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  
    this.tweens.add({
      targets: this.bazaarEntranceArrow,
      y: point.y - 12,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  
    this.minimap?.ignore(markerObjects)
    this.uiCamera?.ignore(markerObjects)
  }

  private showBazaarEntranceMarker() {
    const objects = [
      this.bazaarEntranceGlow,
      this.bazaarEntranceRing,
      this.bazaarEntranceInner,
      this.bazaarEntranceArrow,
      this.bazaarEntranceLabel,
      this.bazaarEntranceZone,
    ]
  
    objects.forEach((obj) => {
      obj?.setVisible(true)
      obj?.setActive(true)
    })
  }

  private hideBazaarEntranceMarker() {
    const objects = [
      this.bazaarEntranceGlow,
      this.bazaarEntranceRing,
      this.bazaarEntranceInner,
      this.bazaarEntranceArrow,
      this.bazaarEntranceLabel,
      this.bazaarEntranceZone,
    ]
  
    objects.forEach((obj) => {
      obj?.setVisible(false)
      obj?.setActive(false)
    })
  }

  private enterBazaarScene() {
    this.hideBazaarEntranceMarker()
    this.setStoryUIVisible(false)
  
    const width = this.scale.width
    const height = this.scale.height
  
    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x050505,
      1
    )
  
    overlay.setScrollFactor(0)
    overlay.setDepth(90000)
  
    const title = this.add.text(
      width / 2,
      height / 2 - 36,
      'BAZAAR DISTRICT',
      {
        fontFamily: 'Georgia',
        fontSize: '42px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
      }
    )
  
    title.setOrigin(0.5)
    title.setScrollFactor(0)
    title.setDepth(90001)
  
    const subtitle = this.add.text(
      width / 2,
      height / 2 + 28,
      'Entering the loudest place in Hahaland...',
      {
        fontFamily: 'Georgia',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }
    )
  
    subtitle.setOrigin(0.5)
    subtitle.setScrollFactor(0)
    subtitle.setDepth(90001)
  
    this.cameras.main.fadeOut(650, 0, 0, 0)
  
    this.time.delayedCall(950, () => {
      this.scene.start('BazaarScene', {
        coins: this.coins,
        reputation: this.reputation,
      })
    })
  }

 private handleBazaarEntranceInput() {
  if (this.storyStage !== 'bazaarTraining') return false
  if (!this.bazaarEntrancePoint) return false
  if (!this.bazaarEntranceGlow?.visible) return false

  const distance = Phaser.Math.Distance.Between(
    this.player.x,
    this.player.y,
    this.bazaarEntrancePoint.x,
    this.bazaarEntrancePoint.y
  )

  const playerIsNear =
    distance <= this.bazaarEntranceRadius

  this.bazaarEntranceLabelText?.setText(
    playerIsNear ? 'E Enter Bazaar' : 'Enter Bazaar'
  )

  this.bazaarEntranceInner?.setFillStyle(
    playerIsNear ? 0x00aa44 : 0xff3311,
    0.9
  )

  if (
    playerIsNear &&
    Phaser.Input.Keyboard.JustDown(this.interactKey)
  ) {
    this.enterBazaarScene()
    return true
  }

  return false
}
}
