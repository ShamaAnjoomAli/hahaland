import Phaser from "phaser";

type ImageAsset = {
  key: string;
  path: string;
};

type TilemapAsset = {
  key: string;
  path: string;
};

type SpriteSheetAsset = {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
};

type AnimationConfig = {
  key: string;
  texture: string;
  start: number;
  end: number;
  frameRate: number;
  repeat: number;
};

type AudioAsset = {
  key: string;
  paths: string[];
};

const AUDIO: AudioAsset[] = [
  {
    key: "egypt-theme",
    paths: [
      "assets/audio/music/egypt_theme.wav",
    ],
  },
  {
    key: "npc-talk-1",
    paths: [
      "assets/audio/sfx/npc_talk_1.wav",
    ],
  },
  {
    key: "npc-talk-2",
    paths: [
      "assets/audio/sfx/npc_talk_2.wav",
    ],
  },
  {
    key: "npc-talk-3",
    paths: [
      "assets/audio/sfx/npc_talk_3.wav",
    ],
  },
];

const TILEMAPS: TilemapAsset[] = [
  {
    key: "egypt_city",
    path: "assets/maps/egypt_city_starter_map.json",
  },
];

const IMAGES: ImageAsset[] = [
  {
    key: "egypt_desert_tileset",
    path: "assets/maps/egypt_desert_tileset.png",
  },
];

const SPRITESHEETS: SpriteSheetAsset[] = [
  {
    key: "player",
    path: "assets/sprites/player/player.png",
    frameWidth: 64,
    frameHeight: 64,
  },

  // NPCs
  {
    key: "wizard",
    path: "assets/sprites/npc/npc1.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: "alien",
    path: "assets/sprites/npc/alien.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: "baker",
    path: "assets/sprites/npc/baker.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: "cow",
    path: "assets/sprites/npc/cow.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: "crab",
    path: "assets/sprites/npc/crab.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: "green-ghost",
    path: "assets/sprites/npc/green-ghost.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: "hero",
    path: "assets/sprites/npc/hero.png",
    frameWidth: 64,
    frameHeight: 64,
  },
];

const ANIMATIONS: AnimationConfig[] = [
  {
    key: "walk-up",
    texture: "player",
    start: 12,
    end: 15,
    frameRate: 10,
    repeat: -1,
  },
  {
    key: "walk-left",
    texture: "player",
    start: 4,
    end: 7,
    frameRate: 10,
    repeat: -1,
  },
  {
    key: "walk-right",
    texture: "player",
    start: 8,
    end: 11,
    frameRate: 10,
    repeat: -1,
  },
  {
    key: "walk-down",
    texture: "player",
    start: 0,
    end: 3,
    frameRate: 10,
    repeat: -1,
  },
];


/**
 * Initial scene that runs when the game starts.
 * Loads all shared assets, creates player walk animations, then hands off to VillageScene.
 */
export default class BootScene extends Phaser.Scene {
    /** Registers this scene with Phaser under the key "BootScene". */
  constructor() {
    super("BootScene");
  }


  /**
   * Loads assets required by VillageScene before gameplay begins.
   * Assets are keyed here so other scenes can reference them by name.
   */
  preload() {    
    // Village map exported from Tiled (JSON format).
    this.loadTilemaps();
    this.loadImages();
    this.loadSpritesheets();
    this.loadAudio();

    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.error("Failed to load asset:", file.key, file.src);
    });
  }

  create() {
    this.createAnimations();

    this.scene.start("VillageScene");
  }

  private loadTilemaps() {
    TILEMAPS.forEach((asset) => {
      this.load.tilemapTiledJSON(
        asset.key,
        asset.path
      );
    });
  }

  private loadImages() {
    IMAGES.forEach((asset) => {
      this.load.image(
        asset.key,
        asset.path
      );
    });
  }

  private loadSpritesheets() {
    SPRITESHEETS.forEach((asset) => {
      this.load.spritesheet(
        asset.key,
        asset.path,
        {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        }
      );
    });
  }

  private loadAudio() {
    AUDIO.forEach((asset) => {
      this.load.audio(asset.key, asset.paths);
    });
  }

  private createAnimations() {
    ANIMATIONS.forEach((animation) => {
      if (this.anims.exists(animation.key)) return;

      this.anims.create({
        key: animation.key,
        frames: this.anims.generateFrameNumbers(
          animation.texture,
          {
            start: animation.start,
            end: animation.end,
          }
        ),
        frameRate: animation.frameRate,
        repeat: animation.repeat,
      });
    });
  }
}