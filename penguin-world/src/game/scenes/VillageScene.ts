import Phaser from "phaser";

/**
 * Main gameplay scene for the village map.
 * Loads the Tiled map, spawns the player, handles collisions, camera follow, and movement.
 */
export default class VillageScene extends Phaser.Scene {
  /** The player sprite with arcade physics enabled. */
  private player!: Phaser.Physics.Arcade.Sprite;

  /** WASD keyboard bindings used for player movement. */
  private keys!: any;

  /** Registers this scene with Phaser under the key "VillageScene". */
  constructor() {
    super("VillageScene");
  }

  /**
   * Sets up the tilemap, player, collision walls, camera, input, and render order.
   * Called once when the scene starts.
   */
  create() {
    // --- Tilemap setup ---
    // Load the village tilemap exported from Tiled and bind it to the loaded tileset image.
    const map = this.make.tilemap({
      key: "village",
    });

    const tileset = map.addTilesetImage("tileset", "tiles");

    if (!tileset) return;

    // --- Tile layers ---
    // Create visible layers from the map. Each layer gets a different depth so objects draw on top of ground.
    const groundLayer = map.createLayer("Dungeon", tileset);
    const objectLayer = map.createLayer("Objects", tileset);
    const cartLayer = map.createLayer("Carts", tileset);

    // --- Player setup ---
    // Spawn the player sprite at the starting position with physics and a slightly smaller scale.
    this.player = this.physics.add.sprite(20, 150, "player");
    this.player.setScale(0.75);
    this.player.setDepth(30);

    // --- Collision objects ---
    // Read invisible collision rectangles from the Tiled object layer and turn them into static physics bodies.
    const collisionObjects = map.getObjectLayer("Collisions");

    if (collisionObjects) {
      collisionObjects.objects.forEach((obj) => {
        const wall = this.add.rectangle(
          obj.x! + obj.width! / 2,
          obj.y! + obj.height! / 2,
          obj.width!,
          obj.height!,
          0xff0000,
          0 // Invisible
        );

        this.physics.add.existing(wall, true);

        this.physics.add.collider(
          this.player,
          wall as Phaser.GameObjects.Rectangle
        );
      });
    }
    this.player.setDepth(30);

    // --- Camera setup ---
    // Constrain the camera to the map bounds and smoothly follow the player.
    this.cameras.main.setBounds(
      0,
      0,
      map.widthInPixels,
      map.heightInPixels
    );

    this.cameras.main.startFollow(
      this.player,
      true,
      0.15,
      0.15
    );

    // --- Keyboard input ---
    // Bind WASD keys for four-directional movement.
    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // --- Layer depth ordering ---
    // Lower depth draws first (ground), higher depth draws on top (carts, then player).
    groundLayer.setDepth(0);
    objectLayer.setDepth(10);
    cartLayer.setDepth(20);
  }

  /**
   * Runs every frame. Reads keyboard input and moves the player while playing walk animations.
   */
  update() {
    const speed = 100;

    // Reset velocity each frame so movement only happens while a key is held.
    this.player.setVelocity(0);

    if (this.keys.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.play("walk-left", true);
    } else if (this.keys.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.play("walk-right", true);
    } else if (this.keys.up.isDown) {
      this.player.setVelocityY(-speed);
      this.player.play("walk-up", true);
    } else if (this.keys.down.isDown) {
      this.player.setVelocityY(speed);
      this.player.play("walk-down", true);
    } else {
      this.player.stop();
    }
  }
}
