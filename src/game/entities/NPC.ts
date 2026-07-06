import Phaser from "phaser";

export default class NPC extends Phaser.Physics.Arcade.Sprite {

    public dialogue: string[];

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        dialogue: string[],
        scale = 1.5
    ) {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.dialogue = dialogue;

        this.setScale(scale);
        this.setDepth(30);

        (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    }
}