import Phaser from "phaser";

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
    this.load.tilemapTiledJSON(
      "egypt_city",
      "assets/maps/egypt_city_starter_map.json"
    );

    // Tileset image referenced by the village map.
    this.load.image(
      "egypt_desert_tileset",
      "assets/maps/egypt_desert_tileset.png"
    );

    // Player spritesheet; each frame is 64×64 pixels.
    this.load.spritesheet(
      "player",
      "assets/sprites/player/player.png",
      {
        frameWidth: 64,
        frameHeight: 64,
      }
    );

    // NPC spritesheet; each frame is 64×64 pixels.
    this.load.spritesheet(
        "wizard",
        "assets/sprites/npc/wizard.png",
        {
            frameWidth: 64,
            frameHeight: 64,
        }
    );
  }

  /**
   * Builds walk animations from the player spritesheet and starts the village gameplay scene.
   * Frame ranges match the row layout of the spritesheet (up, left, right, down).
   */
  create() {
    // Walk up — top row of the spritesheet (frames 0–8).
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("player", {
        start: 0,
        end: 8,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Walk left — second row (frames 9–17).
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("player", {
        start: 9,
        end: 17,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Walk right — fourth row (frames 27–35).
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("player", {
        start: 27,
        end: 35,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Walk down — third row (frames 18–26).
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("player", {
        start: 18,
        end: 26,
      }),
      frameRate: 10,
      repeat: -1,
    });

    // Transition to the main gameplay scene once assets and animations are ready.
    this.scene.start("VillageScene");
  }
}
