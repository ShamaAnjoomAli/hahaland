import Phaser from "phaser";

export default class VillageScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Sprite;
    private keys!: any;
  constructor() {
    super("VillageScene");
  }

  create() {
    const map = this.make.tilemap({
        key: "village",
    });

    const tileset = map.addTilesetImage("tileset", "tiles");

    if (!tileset) return;
    // console.log(map.layers.map(layer => layer.name));
    const groundLayer = map.createLayer("Dungeon", tileset);
    const objectLayer = map.createLayer("Objects", tileset);
    const cartLayer = map.createLayer("Carts", tileset);

    const player = this.add.sprite(100, 100, "player");

    player.setScale(0.75);
    player.setDepth(30);
    
    this.player = player;
    this.player.setDepth(30);
    
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

    // this.cameras.main.setZoom(2);
        this.keys = this.input.keyboard!.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    groundLayer.setDepth(0);

objectLayer.setDepth(10);

cartLayer.setDepth(20);

}
update() {
    const speed = 2;

    let moving = false;

    if (this.keys.left.isDown) {
        this.player.x -= speed;
        this.player.play("walk-left", true);
        moving = true;
    }

    else if (this.keys.right.isDown) {
        this.player.x += speed;
        this.player.play("walk-right", true);
        moving = true;
    }

    else if (this.keys.up.isDown) {
        this.player.y -= speed;
        this.player.play("walk-up", true);
        moving = true;
    }

    else if (this.keys.down.isDown) {
        this.player.y += speed;
        this.player.play("walk-down", true);
        moving = true;
    }

    if (!moving) {
        this.player.stop();
    }
}
}