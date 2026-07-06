import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.tilemapTiledJSON(
      "village",
      "assets/maps/village.json"
    );

    this.load.image(
      "tiles",
      "assets/tiles/tilemap.png"
    );
    this.load.spritesheet(
        "player",
        "assets/sprites/player/player.png",
        {
            frameWidth: 64,
            frameHeight: 64,
        }
    );
  }

  create() {
    this.anims.create({
        key: "walk-up",
        frames: this.anims.generateFrameNumbers("player", {
            start: 0,
            end: 8,
        }),
        frameRate: 10,
        repeat: -1,
    });

    this.anims.create({
        key: "walk-left",
        frames: this.anims.generateFrameNumbers("player", {
            start: 9,
            end: 17,
        }),
        frameRate: 10,
        repeat: -1,
    });

    this.anims.create({
        key: "walk-right",
        frames: this.anims.generateFrameNumbers("player", {
            start: 27,
            end: 35,
        }),
        frameRate: 10,
        repeat: -1,
    });

    this.anims.create({
        key: "walk-down",
        frames: this.anims.generateFrameNumbers("player", {
            start: 18,
            end: 26,
        }),
        frameRate: 10,
        repeat: -1,
    });

    this.scene.start("VillageScene");
  }
}