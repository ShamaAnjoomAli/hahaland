import Phaser from "phaser";
import NPC from "../entities/NPC";
import Dialogue from "../script/dialogue.json"
import Objective from "../script/objectives.json";
import DialogueBox from "../ui/DialogueBox";
import ObjectiveBox from "../ui/ObjectiveBox";

type ObjectiveStep = {
  objectiveText: string;
  targetNpc: string;
  dialogue: string[];
  nextStepId?: string;
  completeObjectiveText?: string;
};

type ObjectivesData = {
  initialStepId: string;
  steps: Record<string, ObjectiveStep>;
};

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

  /** NPC Highlight for interaction */
  private interactPrompt!: Phaser.GameObjects.Container;

  /** Minimap */
  private minimap!: Phaser.Cameras.Scene2D.Camera;
  private minimapBorder!: Phaser.GameObjects.Rectangle;
  private minimapPlayerDot!: Phaser.GameObjects.Arc;

  private mapPixelWidth = 0;
  private mapPixelHeight = 0;

  private minimapConfig = {
    x: 0,
    y: 0,
    width: 220,
    height: 140,
  };

  // Objective box to show user goals of the game
  private objectiveBox!: ObjectiveBox;
  private objectives = Objective as ObjectivesData;
  private currentObjectiveStepId = this.objectives.initialStepId;  

  // Adds ! indicator on the NPC that is next in objective list
  private questMarker!: Phaser.GameObjects.Text;
  // Adds ! indicator on the NPC in minimap that is next in objective list
  private minimapQuestDot!: Phaser.GameObjects.Arc;

  // Handle highlighting in minimap
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private worldObjects: Phaser.GameObjects.GameObject[] = [];
  private minimapNpcDots: Phaser.GameObjects.Arc[] = [];
  private isObjectiveComplete = false;
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
    this.worldObjects.push(
      ...[
        groundLayer,
        pathsLayer,
        waterLayer,
        buildingsLayer,
        propsLayer,
      ].filter(Boolean) as Phaser.GameObjects.GameObject[]
    );
  
    // Initialization of dialogues with NPC
    this.dialogue = new DialogueBox(this);
  
    // Initialization of objectives
    this.objectiveBox = new ObjectiveBox(this);
    this.objectiveBox.setText(
      this.getCurrentObjectiveStep()?.objectiveText
    );
    
    // Space hides the conversation
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
  
    // --- Player setup ---
    // Spawn the player sprite at the starting position with physics and a slightly smaller scale.
    // this.player = this.physics.add.sprite(20, 10, "player");
    const playerSpawn = this.getSpawnPoint(map, "PlayerSpawn");

this.player = this.physics.add.sprite(
  playerSpawn.x,
  playerSpawn.y,
  "player"
);
    this.player.setScale(0.75);
    this.player.setDepth(30);
    this.worldObjects.push(this.player);

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
    this.createNPCsFromMap(map);
    this.createQuestMarker();
    this.createInteractPrompt();
  

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

    this.createMinimap(map);
    this.createUICamera();
    
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

  private createQuestMarker() {
    this.questMarker = this.add.text(0, 0, "!", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffd966",
      stroke: "#000000",
      strokeThickness: 6,
    });
  
    this.questMarker.setOrigin(0.5);
    this.questMarker.setDepth(2000);
    this.questMarker.setVisible(false);
  
    this.worldObjects.push(this.questMarker);
  
    this.updateQuestMarker();
  }
  
  private updateQuestMarker() {
    if (!this.questMarker) return;
  
    const currentStep = this.getCurrentObjectiveStep();
  
    const targetNPC = this.npcs.find((npc) => {
      return npc.getData("npcName") === currentStep.targetNpc;
    });
  
    if (!targetNPC) {
      this.questMarker.setVisible(false);
      return;
    }
  
    this.questMarker.setVisible(true);
    this.questMarker.setPosition(
      targetNPC.x,
      targetNPC.y - 25
    );
  }

  /**
   * Runs every frame. Reads keyboard input and moves the player while playing walk animations.
   */
  update() {
    const speed = 100;

    this.updateInteractPrompt();
    this.updateQuestMarker();
    this.updateMinimapPlayerDot();
    this.updateMinimapNpcDots();
    this.updateMinimapQuestDot();
  
    if (this.dialogue.isOpen()) {
      this.player.setVelocity(0);
  
      if (
        Phaser.Input.Keyboard.JustDown(
          this.spaceKey
        )
      ) {
        this.dialogue.next();
      }
  
      return;
    }
  
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
    const nearest = this.getNearestNPC(60);

    if (!nearest) return;
  
    const npcName = nearest.getData("npcName");
  
    const questHandled =
      this.handleQuestProgress(npcName);
  
    this.interactPrompt.setVisible(false);
  
    if (questHandled) return;
  
    this.dialogue.show(nearest.dialogue);
  }

  private createInteractPrompt() {
    const bg = this.add.rectangle(
      0,
      0,
      90,
      28,
      0x000000,
      0.75
    );
  
    bg.setStrokeStyle(2, 0xffffff);
  
    const text = this.add.text(
      0,
      0,
      "E Talk",
      {
        fontSize: "14px",
        color: "#ffffff",
      }
    );
  
    text.setOrigin(0.5);
  
    this.interactPrompt = this.add.container(
      0,
      0,
      [bg, text]
    );
  
    this.interactPrompt.setDepth(1000);
    this.interactPrompt.setVisible(false);
    this.worldObjects.push(this.interactPrompt);
  }
  
  private updateInteractPrompt() {
    if (this.dialogue.isOpen()) {
      this.interactPrompt.setVisible(false);
      return;
    }
  
    const nearest = this.getNearestNPC(60);
  
    if (!nearest) {
      this.interactPrompt.setVisible(false);
      return;
    }
  
    this.interactPrompt.setVisible(true);
  
    this.interactPrompt.setPosition(
      nearest.x,
      nearest.y - 45
    );
  }
  
  private getNearestNPC(maxDistance: number): NPC | null {
    let nearest: NPC | null = null;
    let nearestDistance = maxDistance;
  
    this.npcs.forEach((npc) => {
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
  
    return nearest;
  }
  

  private updateMinimapNpcDots() {
    if (!this.minimapNpcDots.length) return;
  
    this.npcs.forEach((npc, index) => {
      const dot = this.minimapNpcDots[index];
  
      if (!dot) return;
  
      const normalizedX = Phaser.Math.Clamp(
        npc.x / this.mapPixelWidth,
        0,
        1
      );
  
      const normalizedY = Phaser.Math.Clamp(
        npc.y / this.mapPixelHeight,
        0,
        1
      );
  
      dot.setPosition(
        this.minimapConfig.x +
          normalizedX * this.minimapConfig.width,
        this.minimapConfig.y +
          normalizedY * this.minimapConfig.height
      );
    });
  }

  private createMinimapNpcDots() {
    this.minimapNpcDots.forEach((dot) => {
      dot.destroy();
    });
  
    this.minimapNpcDots = this.npcs.map(() => {
      const dot = this.add.circle(
        this.minimapConfig.x,
        this.minimapConfig.y,
        3,
        0x66ccff
      );
  
      dot.setScrollFactor(0);
      dot.setDepth(20001);
      dot.setStrokeStyle(1, 0x000000);
  
      return dot;
    });
  }

  private createMinimap(map: Phaser.Tilemaps.Tilemap) {
    this.mapPixelWidth = map.widthInPixels;
    this.mapPixelHeight = map.heightInPixels;
  
    const minimapWidth = 160;
    const minimapHeight = 100;
    const padding = 16;
  
    const x = this.scale.width - minimapWidth - padding;
    const y = padding;
  
    this.minimapConfig = {
      x,
      y,
      width: minimapWidth,
      height: minimapHeight,
    };
  
    this.minimap = this.cameras.add(
      x,
      y,
      minimapWidth,
      minimapHeight
    );
  
    this.minimap.setBounds(
      0,
      0,
      map.widthInPixels,
      map.heightInPixels
    );
  
    const zoom = Math.min(
      minimapWidth / map.widthInPixels,
      minimapHeight / map.heightInPixels
    );
  
    this.minimap.setZoom(zoom);
    this.minimap.centerOn(
      map.widthInPixels / 2,
      map.heightInPixels / 2
    );
  
    this.minimap.setBackgroundColor(0x111111);
  
    this.minimapBorder = this.add.rectangle(
      x,
      y,
      minimapWidth,
      minimapHeight,
      0x000000,
      0
    );
  
    this.minimapBorder.setOrigin(0);
    this.minimapBorder.setScrollFactor(0);
    this.minimapBorder.setDepth(20000);
    this.minimapBorder.setStrokeStyle(
      2,
      0xffffff,
      0.9
    );
  
    this.minimapPlayerDot = this.add.circle(
      x,
      y,
      4,
      0xff0000
    );
  
    this.minimapPlayerDot.setScrollFactor(0);
    this.minimapPlayerDot.setDepth(20002);
  
    this.minimapQuestDot = this.add.circle(
      x,
      y,
      5,
      0xffd966
    );
  
    this.minimapQuestDot.setScrollFactor(0);
    this.minimapQuestDot.setDepth(20003);
    this.minimapQuestDot.setStrokeStyle(2, 0x000000);
  
    this.createMinimapNpcDots();
  
    this.minimap.ignore([
      this.dialogue.container,
      this.objectiveBox.container,
      this.interactPrompt,
      this.questMarker,
      this.minimapBorder,
      this.minimapPlayerDot,
      this.minimapQuestDot,
      ...this.minimapNpcDots,
    ]);
  }
  
  private updateMinimapPlayerDot() {
    if (!this.minimapPlayerDot) return;
  
    const normalizedX = Phaser.Math.Clamp(
      this.player.x / this.mapPixelWidth,
      0,
      1
    );
  
    const normalizedY = Phaser.Math.Clamp(
      this.player.y / this.mapPixelHeight,
      0,
      1
    );
  
    this.minimapPlayerDot.setPosition(
      this.minimapConfig.x +
        normalizedX * this.minimapConfig.width,
      this.minimapConfig.y +
        normalizedY * this.minimapConfig.height
    );
  }

  private createUICamera() {
    const uiObjects: Phaser.GameObjects.GameObject[] = [
      this.dialogue.container,
      this.objectiveBox?.container,
      this.minimapBorder,
      this.minimapPlayerDot,
      this.minimapQuestDot,
      ...this.minimapNpcDots,
    ];
  
    this.cameras.main.ignore(uiObjects);
  
    this.uiCamera = this.cameras.add(
      0,
      0,
      this.scale.width,
      this.scale.height
    );
  
    this.uiCamera.setName("UICamera");
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);
  
    this.uiCamera.ignore(this.worldObjects);
  }

 private updateMinimapQuestDot() {
  if (!this.minimapQuestDot) return;

  if (this.isObjectiveComplete) {
    this.minimapQuestDot.setVisible(false);
    return;
  }

  const currentStep = this.getCurrentObjectiveStep();

  const targetNPC = this.npcs.find((npc) => {
    return npc.getData("npcName") === currentStep.targetNpc;
  });

  if (!targetNPC) {
    this.minimapQuestDot.setVisible(false);
    return;
  }

  this.minimapQuestDot.setVisible(true);

  const normalizedX = Phaser.Math.Clamp(
    targetNPC.x / this.mapPixelWidth,
    0,
    1
  );

  const normalizedY = Phaser.Math.Clamp(
    targetNPC.y / this.mapPixelHeight,
    0,
    1
  );

  this.minimapQuestDot.setPosition(
    this.minimapConfig.x +
      normalizedX * this.minimapConfig.width,
    this.minimapConfig.y +
      normalizedY * this.minimapConfig.height
  );
}

  private getSpawnPoint(
    map: Phaser.Tilemaps.Tilemap,
    name: string
  ) {
    const spawnLayer = map.getObjectLayer("Spawns");
  
    if (!spawnLayer) {
      console.warn("No Spawns layer found");
      return { x: 100, y: 100 };
    }
  
    const spawn = spawnLayer.objects.find(
      (obj) => obj.name === name
    );
  
    if (!spawn) {
      console.warn(`Spawn point not found: ${name}`);
      return { x: 100, y: 100 };
    }
  
    return {
      x: spawn.x ?? 100,
      y: spawn.y ?? 100,
    };
  }
  
  private createNPCsFromMap(
    map: Phaser.Tilemaps.Tilemap
  ) {
    const spawnLayer = map.getObjectLayer("Spawns");
  
    if (!spawnLayer) {
      console.warn("No Spawns layer found");
      return;
    }
  
    const npcObjects = spawnLayer.objects.filter(
      (obj) => obj.type === "npc"
    );
  
    npcObjects.forEach((obj) => {
      const npcName = obj.name ?? "NPC";
      const dialogue = this.getNPCDialogue(npcName);
      const spriteKey = this.getNPCSpriteKey(npcName);
  
      const npc = new NPC(
        this,
        obj.x ?? 100,
        obj.y ?? 100,
        spriteKey,
        dialogue
      );
      npc.setData("npcName", npcName);
      npc.setFrame(0);
      npc.setScale(1.2);
      npc.setDepth(30);
  
      this.npcs.push(npc);
      this.worldObjects.push(npc);
      this.physics.add.collider(
        this.player,
        npc
      );
    });
  }
  
  private getNPCDialogue(name: string): string[] {
    const dialogues: Record<string, string[]> = Dialogue;
  
    return dialogues[name] ?? [
      "Hello traveler.",
      "This city has many stories."
    ];
  }

  private getNPCSpriteKey(name: string): string {
    const sprites: Record<string, string> = {
      NPC_Wizard: "wizard",
      NPC_Alien: "alien",
      NPC_Baker: "baker",
      NPC_Cow: "cow",
    };
  
    return sprites[name] ?? "wizard";
  }

  private handleQuestProgress(npcName: string): boolean {
    const currentStep = this.getCurrentObjectiveStep();

    if (currentStep.targetNpc !== npcName) {
      return false;
    }

    this.dialogue.show(currentStep.dialogue, () => {
      if (currentStep.nextStepId) {
        this.currentObjectiveStepId = currentStep.nextStepId;

        this.objectiveBox.setText(
          this.getCurrentObjectiveStep().objectiveText
        );
        this.updateQuestMarker();
        this.updateMinimapQuestDot();
        return;
      }

      this.isObjectiveComplete = true;

      this.objectiveBox.setText(
        currentStep.completeObjectiveText ??
          "Objective Complete"
      );

      this.questMarker.setVisible(false);
      this.minimapQuestDot.setVisible(false);
    });

    return true;
  }

  private getCurrentObjectiveStep(): ObjectiveStep {
    const step = this.objectives.steps[
      this.currentObjectiveStepId
    ];
  
    if (!step) {
      console.error(
        "Objective step not found:",
        this.currentObjectiveStepId
      );
  
      return {
        objectiveText: "Objective error: step not found",
        targetNpc: "",
        dialogue: [],
      };
    }
  
    return step;
  }
}
