import Phaser from 'phaser'
import { loadGameProgress } from '../utils/progressSave'

type ImageAsset = {
  key: string
  path: string
}

type TilemapAsset = {
  key: string
  path: string
}

type SpriteSheetAsset = {
  key: string
  path: string
  frameWidth: number
  frameHeight: number
}

type AnimationConfig = {
  key: string
  texture: string
  start: number
  end: number
  frameRate: number
  repeat: number
}

type AudioAsset = {
  key: string
  paths: string[]
}

const AUDIO: AudioAsset[] = [
  {
    key: 'egypt-theme',
    paths: ['assets/audio/music/egypt_theme.wav'],
  },
  {
    key: 'npc-talk-1',
    paths: ['assets/audio/sfx/npc_talk_1.wav'],
  },
  {
    key: 'npc-talk-2',
    paths: ['assets/audio/sfx/npc_talk_2.wav'],
  },
  {
    key: 'npc-talk-3',
    paths: ['assets/audio/sfx/npc_talk_3.wav'],
  },
  {
    key: 'cutscene-theme',
    paths: ['assets/audio/sfx/cutscene-theme.mp3'],
  },
]

const TILEMAPS: TilemapAsset[] = [
  {
    key: 'egypt_city',
    path: 'assets/maps/egypt_city_starter_map.json',
  },
  {
    key: 'egypt_temple_final',
    path: 'assets/maps/egypt_temple_final_map.json',
  },
]

const IMAGES: ImageAsset[] = [
  {
    key: 'egypt_desert_tileset',
    path: 'assets/maps/egypt_desert_tileset.png',
  },
  {
    key: 'egypt-city-gate-foreground',
    path: 'assets/maps/egypt_city_gate_foreground.png',
  },
  {
    key: 'temple-final-background',
    path: 'assets/maps/temple_final_background.png',
  },
  {
    key: 'badge-fake-hotel',
    path: 'assets/ui/badges/badge_fake_hotel.png',
  },
  {
    key: 'badge-bazaar-date',
    path: 'assets/ui/badges/badge_bazaar_date.png',
  },
  {
    key: 'badge-bazaar-eagle',
    path: 'assets/ui/badges/badge_bazaar_eagle.png',
  },
  {
    key: 'badge-bazaar-donkey',
    path: 'assets/ui/badges/badge_bazaar_donkey.png',
  },
  {
    key: 'badge-bazaar-grain',
    path: 'assets/ui/badges/badge_bazaar_grain.png',
  },
  {
    key: 'badge-bazaar-spice',
    path: 'assets/ui/badges/badge_bazaar_spice.png',
  },
  {
    key: 'badge-bazaar-pottery',
    path: 'assets/ui/badges/badge_bazaar_pottery.png',
  },
  {
    key: 'badge-bazaar-archery',
    path: 'assets/ui/badges/badge_bazaar_archery.png',
  },
  {
    key: 'badge-bazaar-finish',
    path: 'assets/ui/badges/badge_bazaar_finish.png',
  },
  {
    key: 'badge-temple-gate-truth',
    path: 'assets/ui/badges/badge_temple_gate_truth.png',
  },
  {
    key: 'badge-temple-candle-ra',
    path: 'assets/ui/badges/badge_temple_candle_ra.png',
  },
  {
    key: 'badge-temple-hieroglyphs',
    path: 'assets/ui/badges/badge_temple_hieroglyphs.png',
  },
  {
    key: 'badge-temple-false-gold',
    path: 'assets/ui/badges/badge_temple_false_gold.png',
  },
  {
    key: 'badge-temple-painted-prophecy',
    path: 'assets/ui/badges/badge_temple_painted_prophecy.png',
  },
  {
    key: 'badge-temple-scarab-board',
    path: 'assets/ui/badges/badge_temple_scarab_board.png',
  },
  {
    key: 'badge-temple-stairway-sun',
    path: 'assets/ui/badges/badge_temple_stairway_sun.png',
  },
  {
    key: 'badge-temple-finish',
    path: 'assets/ui/badges/badge_temple_finish.png',
  },
]

const SPRITESHEETS: SpriteSheetAsset[] = [
  {
    key: 'player',
    path: 'assets/sprites/player/player.png',
    frameWidth: 64,
    frameHeight: 64,
  },

  // NPCs
  {
    key: 'npc1',
    path: 'assets/sprites/npc/npc1.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc2',
    path: 'assets/sprites/npc/npc2.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc3',
    path: 'assets/sprites/npc/npc3.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc4',
    path: 'assets/sprites/npc/npc4.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc5',
    path: 'assets/sprites/npc/npc5.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc6',
    path: 'assets/sprites/npc/npc6.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc7',
    path: 'assets/sprites/npc/npc7.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc8',
    path: 'assets/sprites/npc/npc8.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc9',
    path: 'assets/sprites/npc/npc9.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc10',
    path: 'assets/sprites/npc/npc10.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc11',
    path: 'assets/sprites/npc/npc11.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc12',
    path: 'assets/sprites/npc/npc12.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc13',
    path: 'assets/sprites/npc/npc13.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc14',
    path: 'assets/sprites/npc/npc14.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc15',
    path: 'assets/sprites/npc/npc15.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc16',
    path: 'assets/sprites/npc/npc16.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc17',
    path: 'assets/sprites/npc/npc17.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc18',
    path: 'assets/sprites/npc/npc18.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc19',
    path: 'assets/sprites/npc/npc19.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc20',
    path: 'assets/sprites/npc/npc20.png',
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: 'npc21',
    path: 'assets/sprites/npc/npc21.png',
    frameWidth: 64,
    frameHeight: 64,
  },
]

/**
 * Initial scene that runs when the game starts.
 * Loads all shared assets, creates player walk animations, then hands off to VillageScene.
 */
export default class BootScene extends Phaser.Scene {
  /** Registers this scene with Phaser under the key "BootScene". */
  constructor() {
    super('BootScene')
  }

  /**
   * Loads assets required by VillageScene before gameplay begins.
   * Assets are keyed here so other scenes can reference them by name.
   */
  preload() {
    // Village map exported from Tiled (JSON format).
    this.loadTilemaps()
    this.loadImages()
    this.loadSpritesheets()
    this.loadAudio()

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('Failed to load asset:', file.key, file.src)
    })

    this.load.image(
      'bazaar-background',
      'assets/maps/bazaar_background.png'
    )

    this.load.tilemapTiledJSON(
      'egypt_bazaar',
      'assets/maps/egypt_bazaar_map.json'
    )

    this.load.image(
      'bazaar-gate-foreground',
      'assets/maps/bazaar_gate_foreground.png'
    )

    this.load.image(
      'bazaar_race_bg',
      'assets/minigames/bazaar_race_bg.png'
    )

    this.load.image(
      'donkey_topview',
      'assets/minigames/donkey_topview.png'
    )

    this.load.image(
      'eagle_egypt_bg',
      'assets/minigames/egypt_sky_background.png'
    )

    this.load.spritesheet(
      'eagle_fly',
      'assets/minigames/eagle_fly_spritesheet.png',
      {
        frameWidth: 256,
        frameHeight: 160,
      }
    )
  }

  create() {
    this.createAnimations()

    const startMode = (window as any).__HAHALAND_START_MODE__
    const savedProgress = loadGameProgress()

    if (startMode === 'resume' && savedProgress) {
      this.scene.start(savedProgress.currentScene, {
        resume: true,
      })
      return
    }

    this.scene.start('VillageScene', {
      resume: false,
      coins: 1000,
      reputation: 0,
    })
  }

  private loadTilemaps() {
    TILEMAPS.forEach((asset) => {
      this.load.tilemapTiledJSON(asset.key, asset.path)
    })
  }

  private loadImages() {
    IMAGES.forEach((asset) => {
      this.load.image(asset.key, asset.path)
    })
  }

  private loadSpritesheets() {
    SPRITESHEETS.forEach((asset) => {
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      })
    })
  }

  private loadAudio() {
    AUDIO.forEach((asset) => {
      this.load.audio(asset.key, asset.paths)
    })
  }

  private createWalkAnimations(textureKey: string) {
    const animations = [
      {
        key: `${textureKey}-walk-down`,
        start: textureKey === 'player' ? 0 : 0,
        end: textureKey === 'player' ? 3 : 3,
      },
      {
        key: `${textureKey}-walk-up`,
        start: textureKey === 'player' ? 12 : 4,
        end: textureKey === 'player' ? 15 : 7,
      },
      {
        key: `${textureKey}-walk-left`,
        start: textureKey === 'player' ? 4 : 8,
        end: textureKey === 'player' ? 7 : 11,
      },
      {
        key: `${textureKey}-walk-right`,
        start: textureKey === 'player' ? 8 : 12,
        end: textureKey === 'player' ? 11 : 15,
      },
    ]

    animations.forEach((animation) => {
      if (this.anims.exists(animation.key)) return

      this.anims.create({
        key: animation.key,
        frames: this.anims.generateFrameNumbers(textureKey, {
          start: animation.start,
          end: animation.end,
        }),
        frameRate: 8,
        repeat: -1,
      })
    })
  }

  private createAnimations() {
    this.createWalkAnimations('player')
    this.createWalkAnimations('npc1')
    this.createWalkAnimations('npc2')
    this.createWalkAnimations('npc3')
    this.createWalkAnimations('npc4')
    this.createWalkAnimations('npc5')
    this.createWalkAnimations('npc6')
    this.createWalkAnimations('npc7')
    this.createWalkAnimations('npc8')
    this.createWalkAnimations('npc9')
    this.createWalkAnimations('npc10')
    this.createWalkAnimations('npc11')
    this.createWalkAnimations('npc12')
    this.createWalkAnimations('npc13')
    this.createWalkAnimations('npc14')
    this.createWalkAnimations('npc15')
    this.createWalkAnimations('npc16')
    this.createWalkAnimations('npc17')
    this.createWalkAnimations('npc18')
    this.createWalkAnimations('npc19')
    this.createWalkAnimations('npc20')
    this.createWalkAnimations('npc21')
  }
}
