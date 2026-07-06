import Phaser from "phaser";
import NPC from "../entities/NPC";
import Dialogue from "../dialogues/dialogue.json"
import DialogueBox from "../ui/DialogueBox";
/**
 * Main gameplay scene for the village map.
 * Loads the Tiled map, spawns the player, handles collisions, camera follow, and movement.
 */
export default class VillageScene extends Phaser.Scene {
  /** The player sprite with arcade physics enabled. */
  private player!: Phaser.Physics.Arcade.Sprite;

  /** WASD keyboard bindings used for player movement. */
  private keys!: any;

  private npcs: NPC[] = [];

  /** NPC Interaction. */
  private interactKey!: Phaser.Input.Keyboard.Key;
  
  /** NPC Interaction. */
  private dialogue!: DialogueBox;

  /** NPC dialogue hide */
  private spaceKey!: Phaser.Input.Keyboard.Key;

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
      key: "egypt_city",
    });
  
    const tileset = map.addTilesetImage(
      "egypt_desert_tileset",
      "egypt_desert_tileset"
    );
  
    if (!tileset) {
      console.error("Tileset not found");
      console.log(map.tilesets.map(t => t.name));
      return;
    }
  
    
    // --- Tile layers ---
    // Create visible layers from the map. Each layer gets a different depth so objects draw on top of ground.
    const groundLayer = map.createLayer("Ground", tileset);
    const pathsLayer = map.createLayer("Paths", tileset);
    const waterLayer = map.createLayer("Water", tileset);
    const buildingsLayer = map.createLayer("Buildings", tileset);
    const propsLayer = map.createLayer("Props", tileset);
     
    
    // --- Layer depth ordering ---
    // Lower depth draws first (ground), higher depth draws on top (carts, then player).
    groundLayer?.setDepth(0);
    pathsLayer?.setDepth(1);
    waterLayer?.setDepth(2);
    buildingsLayer?.setDepth(10);
    propsLayer?.setDepth(20);
  
    // Initialization of dialogues with NPC
    this.dialogue = new DialogueBox(this);
  
    // Space hides the conversation
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
  
    // --- Player setup ---
    // Spawn the player sprite at the starting position with physics and a slightly smaller scale.
    this.player = this.physics.add.sprite(20, 150, "player");
    this.player.setScale(0.75);
    this.player.setDepth(30);
  
    // --- NPC setup ---
    const wizard = new NPC(
      this,
      470,
      130,
      "wizard",
      Dialogue.wizard.open
    );
  
    wizard.setFrame(0);
    wizard.setScale(1.2);
    wizard.setDepth(30);
  
    this.npcs.push(wizard);
  
    this.physics.add.collider(this.player, wizard);
  

    // --- Collision objects ---
    // Read invisible collision rectangles from the Tiled object layer and turn them into static physics bodies.
    const collisionObjects = map.getObjectLayer("CollisionObjects");
  
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

        // Adds collision for player to walls
        this.physics.add.collider(
          this.player,
          wall as Phaser.GameObjects.Rectangle
        );
// Adds collision for player to npcs
this.physics.add.collider(
  this.player,
  wizard
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

    // --- Keyboard input for NPC interactions---
    this.interactKey = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.E
    );

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

    // NPC interaction
    if (
        Phaser.Input.Keyboard.JustDown(
            this.interactKey
        )
    ) {
        this.interact();
    }

    // Hide NPC Dialogue
    if (
        Phaser.Input.Keyboard.JustDown(
            this.spaceKey
        )
    ) {
        this.dialogue.next();
    }
  }

  // Logic for interacting with NPCs using the E key
  private interact() {

    let nearest: NPC | null = null;
    let nearestDistance = 99999;

    this.npcs.forEach(npc => {

        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            npc.x,
            npc.y
        );

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = npc;
        }

    });

    if (!nearest) return;

    if (nearestDistance > 60) return;

    console.log("Showing dialogue");
    this.dialogue.show(nearest.dialogue);}
}
