import Phaser from "phaser";

/**
 * Placeholder root scene registered with the Phaser game instance.
 * Currently sets a background color; asset loading and gameplay happen in BootScene and VillageScene.
 */
export default class MainScene extends Phaser.Scene {
  /** Registers this scene with Phaser under the key "MainScene". */
  constructor() {
    super("MainScene");
  }

  /** Reserved for preloading assets if this scene is used as an entry point. Currently unused. */
  preload() {}

  /** Applies the default background color for this scene. */
  create() {
    this.cameras.main.setBackgroundColor("#16171d");
  }

  /** Per-frame update hook. No game logic runs here yet. */
  update() {}
}
