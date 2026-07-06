import Phaser from "phaser";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {}

  create() {
    this.cameras.main.setBackgroundColor("#1e1e1e");
  }

  update() {}
}