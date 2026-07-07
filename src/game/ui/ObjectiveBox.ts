import Phaser from "phaser";

export default class ObjectiveBox {
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const bg = scene.add.rectangle(
      10,
      15,
      300,
      36,
      0x000000,
      0.7
    );

    bg.setOrigin(0);
    bg.setStrokeStyle(2, 0xffffff, 0.8);

    this.text = scene.add.text(
      16,
      23,
      "Objective loading...",
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
        wordWrap: {
          width: 320,
        },
      }
    );

    this.container = scene.add.container(0, 0, [
      bg,
      this.text,
    ]);

    this.container.setScrollFactor(0);
    this.container.setDepth(9997);
    this.container.setVisible(true);
  }

  setText(value: string) {
    this.text.setText(value || "No active objective");
  }

  hide() {
    this.container.setVisible(false);
  }

  show() {
    this.container.setVisible(true);
  }
}