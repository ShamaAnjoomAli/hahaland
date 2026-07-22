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
  {
    key: 'false-gold-sound-good',
    paths: ['assets/minigames/temple_false_gold/sound_coin_good.wav'],
  },
  {
    key: 'false-gold-sound-bad',
    paths: ['assets/minigames/temple_false_gold/sound_coin_bad.wav'],
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
    key: 'temple-truth-round-1',
    path: 'assets/minigames/temple_truth/truth_round_1.png',
  },
  {
    key: 'temple-truth-round-2',
    path: 'assets/minigames/temple_truth/truth_round_2.png',
  },
  {
    key: 'temple-truth-round-3',
    path: 'assets/minigames/temple_truth/truth_round_3.png',
  },
  {
    key: 'temple-truth-round-4',
    path: 'assets/minigames/temple_truth/truth_round_4.png',
  },
  {
    key: 'temple-truth-round-5',
    path: 'assets/minigames/temple_truth/truth_round_5.png',
  },
  {
    key: 'candle-ra-path-bg',
    path: 'assets/minigames/temple_candle_ra/candle_ra_path_bg.png',
  },
  {
    key: 'candle-ra-candle',
    path: 'assets/minigames/temple_candle_ra/candle_ra_candle.png',
  },
  {
    key: 'candle-ra-icon-cover',
    path: 'assets/minigames/temple_candle_ra/candle_ra_icon_cover.png',
  },
  {
    key: 'candle-ra-icon-shield',
    path: 'assets/minigames/temple_candle_ra/candle_ra_icon_shield.png',
  },
  {
    key: 'candle-ra-icon-bell',
    path: 'assets/minigames/temple_candle_ra/candle_ra_icon_bell.png',
  },
  {
    key: 'candle-ra-icon-oil',
    path: 'assets/minigames/temple_candle_ra/candle_ra_icon_oil.png',
  },
  {
    key: 'candle-ra-icon-raise',
    path: 'assets/minigames/temple_candle_ra/candle_ra_icon_raise.png',
  },
  {
    key: 'candle-ra-obstacle-wind',
    path: 'assets/minigames/temple_candle_ra/candle_ra_obstacle_wind.png',
  },
  {
    key: 'candle-ra-obstacle-dust',
    path: 'assets/minigames/temple_candle_ra/candle_ra_obstacle_dust.png',
  },
  {
    key: 'candle-ra-obstacle-ghost',
    path: 'assets/minigames/temple_candle_ra/candle_ra_obstacle_ghost.png',
  },
  {
    key: 'candle-ra-obstacle-altar',
    path: 'assets/minigames/temple_candle_ra/candle_ra_obstacle_altar.png',
  },
  {
    key: 'candle-ra-corridor-bg',
    path: 'assets/minigames/temple_candle_ra/candle_corridor_bg.png',
  },
  {
    key: 'candle-player-idle-0',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_idle_0.png',
  },
  {
    key: 'candle-player-idle-1',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_idle_1.png',
  },
  {
    key: 'candle-player-idle-2',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_idle_2.png',
  },
  {
    key: 'candle-player-idle-3',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_idle_3.png',
  },
  {
    key: 'candle-player-walk-0',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_walk_0.png',
  },
  {
    key: 'candle-player-walk-1',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_walk_1.png',
  },
  {
    key: 'candle-player-walk-2',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_walk_2.png',
  },
  {
    key: 'candle-player-walk-3',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_walk_3.png',
  },
  {
    key: 'candle-player-cover-0',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_cover_0.png',
  },
  {
    key: 'candle-player-cover-1',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_cover_1.png',
  },
  {
    key: 'candle-player-cover-2',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_cover_2.png',
  },
  {
    key: 'candle-player-cover-3',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_cover_3.png',
  },
  {
    key: 'candle-player-shield-0',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_shield_0.png',
  },
  {
    key: 'candle-player-shield-1',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_shield_1.png',
  },
  {
    key: 'candle-player-shield-2',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_shield_2.png',
  },
  {
    key: 'candle-player-shield-3',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_shield_3.png',
  },
  {
    key: 'candle-player-bell-0',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_bell_0.png',
  },
  {
    key: 'candle-player-bell-1',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_bell_1.png',
  },
  {
    key: 'candle-player-bell-2',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_bell_2.png',
  },
  {
    key: 'candle-player-bell-3',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_bell_3.png',
  },
  {
    key: 'candle-player-oil-0',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_oil_0.png',
  },
  {
    key: 'candle-player-oil-1',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_oil_1.png',
  },
  {
    key: 'candle-player-oil-2',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_oil_2.png',
  },
  {
    key: 'candle-player-oil-3',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_oil_3.png',
  },
  {
    key: 'candle-player-raise-0',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_raise_0.png',
  },
  {
    key: 'candle-player-raise-1',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_raise_1.png',
  },
  {
    key: 'candle-player-raise-2',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_raise_2.png',
  },
  {
    key: 'candle-player-raise-3',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_raise_3.png',
  },
  {
    key: 'candle-player-fail-0',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_fail_0.png',
  },
  {
    key: 'candle-player-fail-1',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_fail_1.png',
  },
  {
    key: 'candle-player-fail-2',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_fail_2.png',
  },
  {
    key: 'candle-player-fail-3',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_fail_3.png',
  },
  {
    key: 'candle-player-success-0',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_success_0.png',
  },
  {
    key: 'candle-player-success-1',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_success_1.png',
  },
  {
    key: 'candle-player-success-2',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_success_2.png',
  },
  {
    key: 'candle-player-success-3',
    path: 'assets/minigames/temple_candle_ra/player_frames/candle_player_success_3.png',
  },
  {
    key: 'candle-ra-flame-full',
    path: 'assets/minigames/temple_candle_ra/flame_full.png',
  },
  {
    key: 'candle-ra-flame-medium',
    path: 'assets/minigames/temple_candle_ra/flame_medium.png',
  },
  {
    key: 'candle-ra-flame-low',
    path: 'assets/minigames/temple_candle_ra/flame_low.png',
  },
  {
    key: 'candle-ra-flame-tiny',
    path: 'assets/minigames/temple_candle_ra/flame_tiny.png',
  },
  {
    key: 'candle-ra-flame-extinguished',
    path: 'assets/minigames/temple_candle_ra/flame_extinguished.png',
  },
  {
    key: 'candle-ra-obstacle-wind-new',
    path: 'assets/minigames/temple_candle_ra/obstacle_wind.png',
  },
  {
    key: 'candle-ra-obstacle-ghost-new',
    path: 'assets/minigames/temple_candle_ra/obstacle_ghost.png',
  },
  {
    key: 'candle-ra-obstacle-dust-new',
    path: 'assets/minigames/temple_candle_ra/obstacle_dust.png',
  },
  {
    key: 'candle-ra-obstacle-shadow',
    path: 'assets/minigames/temple_candle_ra/obstacle_shadow.png',
  },
  {
    key: 'candle-ra-obstacle-sparks',
    path: 'assets/minigames/temple_candle_ra/obstacle_sparks.png',
  },
  {
    key: 'candle-ra-action-cover',
    path: 'assets/minigames/temple_candle_ra/icon_cover.png',
  },
  {
    key: 'candle-ra-action-shield',
    path: 'assets/minigames/temple_candle_ra/icon_shield.png',
  },
  {
    key: 'candle-ra-action-bell',
    path: 'assets/minigames/temple_candle_ra/icon_bell.png',
  },
  {
    key: 'candle-ra-action-oil',
    path: 'assets/minigames/temple_candle_ra/icon_oil.png',
  },
  {
    key: 'candle-ra-action-raise',
    path: 'assets/minigames/temple_candle_ra/icon_raise.png',
  },
  {
    key: 'candle-ra-checkpoint-inactive',
    path: 'assets/minigames/temple_candle_ra/checkpoint_inactive.png',
  },
  {
    key: 'candle-ra-checkpoint-current',
    path: 'assets/minigames/temple_candle_ra/checkpoint_current.png',
  },
  {
    key: 'candle-ra-checkpoint-completed',
    path: 'assets/minigames/temple_candle_ra/checkpoint_completed.png',
  },
  {
    key: 'candle-ra-checkpoint-failed',
    path: 'assets/minigames/temple_candle_ra/checkpoint_failed.png',
  },
  {
    key: 'candle-ra-checkpoint-final',
    path: 'assets/minigames/temple_candle_ra/checkpoint_final.png',
  },
  {
    key: 'candle-ra-fx-success-glow',
    path: 'assets/minigames/temple_candle_ra/fx_success_glow.png',
  },
  {
    key: 'candle-ra-fx-correct-sparkle',
    path: 'assets/minigames/temple_candle_ra/fx_correct_sparkle.png',
  },
  {
    key: 'candle-ra-fx-failure-smoke',
    path: 'assets/minigames/temple_candle_ra/fx_failure_smoke.png',
  },
  {
    key: 'candle-ra-fx-candle-saved',
    path: 'assets/minigames/temple_candle_ra/fx_candle_saved.png',
  },
  {
    key: 'candle-ra-fx-candle-damaged',
    path: 'assets/minigames/temple_candle_ra/fx_candle_damaged.png',
  },
  {
    key: 'candle-ra-altar-goal',
    path: 'assets/minigames/temple_candle_ra/sun_altar_goal.png',
  },
  {
    key: 'false-gold-bg',
    path: 'assets/minigames/temple_false_gold/false_gold_chamber_bg.png',
  },
  {
    key: 'false-gold-real-coin-1',
    path: 'assets/minigames/temple_false_gold/real_coin_01.png',
  },
  {
    key: 'false-gold-real-coin-2',
    path: 'assets/minigames/temple_false_gold/real_coin_02.png',
  },
  {
    key: 'false-gold-real-coin-3',
    path: 'assets/minigames/temple_false_gold/real_coin_03.png',
  },
  {
    key: 'false-gold-fake-coin-1',
    path: 'assets/minigames/temple_false_gold/fake_coin_01.png',
  },
  {
    key: 'false-gold-fake-coin-2',
    path: 'assets/minigames/temple_false_gold/fake_coin_02.png',
  },
  {
    key: 'false-gold-fake-coin-3',
    path: 'assets/minigames/temple_false_gold/fake_coin_03.png',
  },
  {
    key: 'false-gold-tool-magnifier',
    path: 'assets/minigames/temple_false_gold/tool_magnifier.png',
  },
  {
    key: 'false-gold-tool-scale',
    path: 'assets/minigames/temple_false_gold/tool_scale.png',
  },
  {
    key: 'false-gold-tool-tap-hammer',
    path: 'assets/minigames/temple_false_gold/tool_tap_hammer.png',
  },
  {
    key: 'false-gold-tool-torch',
    path: 'assets/minigames/temple_false_gold/tool_torch.png',
  },
  {
    key: 'false-gold-fx-correct-glow-1',
    path: 'assets/minigames/temple_false_gold/fx_correct_glow_01.png',
  },
  {
    key: 'false-gold-fx-correct-glow-2',
    path: 'assets/minigames/temple_false_gold/fx_correct_glow_02.png',
  },
  {
    key: 'false-gold-fx-fake-burst-1',
    path: 'assets/minigames/temple_false_gold/fx_fake_burst_01.png',
  },
  {
    key: 'false-gold-fx-fake-burst-2',
    path: 'assets/minigames/temple_false_gold/fx_fake_burst_02.png',
  },
  {
    key: 'false-gold-fx-sound-ring',
    path: 'assets/minigames/temple_false_gold/fx_sound_ring.png',
  },
  {
    key: 'false-gold-fx-bad-sound-crack',
    path: 'assets/minigames/temple_false_gold/fx_bad_sound_crack.png',
  },
  {
    key: 'false-gold-tool-sound-hammer-emblem',
    path: 'assets/minigames/temple_false_gold/tool_sound_hammer_emblem.png',
  },
  {
    key: 'false-gold-tool-sound-coin-waves',
    path: 'assets/minigames/temple_false_gold/tool_sound_coin_waves.png',
  },
  {
    key: 'painted-prophecy-round-1',
    path: 'assets/minigames/painted_prophecy/painted-prophecy-round-1.png',
  },
  {
    key: 'painted-prophecy-round-2',
    path: 'assets/minigames/painted_prophecy/painted-prophecy-round-2.png',
  },
  {
    key: 'painted-prophecy-round-3',
    path: 'assets/minigames/painted_prophecy/painted-prophecy-round-3.png',
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
    key: 'candle-ra-player',
    path: 'assets/minigames/temple_candle_ra/candle_player_sheet.png',
    frameWidth: 256,
    frameHeight: 256,
  },
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