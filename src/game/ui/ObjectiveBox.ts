import Phaser from "phaser";

export default class ObjectiveBox {
  public container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const boxX = 12;
    const boxY = 12;
    const minimapWidth = 150;
    const padding = 12;
    const gapBetweenObjectiveAndMap = 12;
    
    const boxWidth =
      scene.scale.width -
      boxX -
      minimapWidth -
      padding -
      gapBetweenObjectiveAndMap;
    
    const boxHeight = 30;

    const bg = scene.add.rectangle(
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      0x000000,
      0.68
    );

    bg.setOrigin(0);
    bg.setStrokeStyle(2, 0xffffff, 0.75);

    this.text = scene.add.text(
      boxX + 10,
      boxY + 7,
      "Objective loading...",
      {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff",
        wordWrap: {
          width: boxWidth - 20,
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