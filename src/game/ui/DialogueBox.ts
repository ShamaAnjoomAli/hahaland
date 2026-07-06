import Phaser from "phaser";

export default class DialogueBox {
  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;

  private box!: Phaser.GameObjects.Rectangle;
  private text!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  private lines: string[] = [];
  private index = 0;
  private open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const width = scene.scale.width;
    const height = scene.scale.height;

    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(9999);
    this.container.setVisible(false);

    this.box = scene.add.rectangle(
      width / 2,
      height - 90,
      width - 120,
      130,
      0x000000,
      0.85
    );

    this.box.setStrokeStyle(3, 0xffffff);

    this.text = scene.add.text(
      90,
      height - 135,
      "",
      {
        fontSize: "22px",
        color: "#ffffff",
        wordWrap: {
          width: width - 180,
        },
      }
    );

    this.hint = scene.add.text(
      width - 260,
      height - 55,
      "SPACE ▶ Next",
      {
        fontSize: "16px",
        color: "#ffd966",
      }
    );

    this.container.add([
      this.box,
      this.text,
      this.hint,
    ]);
  }

  show(dialogue: string | string[]) {
    this.lines = Array.isArray(dialogue)
      ? dialogue
      : [dialogue];

    this.index = 0;
    this.open = true;

    this.container.setVisible(true);
    this.showCurrentLine();
  }

  next() {
    if (!this.open) return;

    this.index++;

    if (this.index >= this.lines.length) {
      this.hide();
      return;
    }

    this.showCurrentLine();
  }

  hide() {
    this.open = false;
    this.container.setVisible(false);
  }

  isOpen() {
    return this.open;
  }

  private showCurrentLine() {
    this.text.setText(this.lines[this.index]);

    if (this.index >= this.lines.length - 1) {
      this.hint.setText("SPACE ▶ Close");
    } else {
      this.hint.setText("SPACE ▶ Next");
    }
  }
}