import Phaser from "phaser";

export default class DialogueBox {
  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;

  private box!: Phaser.GameObjects.Rectangle;
  private text!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  private portraitPanel!: Phaser.GameObjects.Graphics;
  private portrait!: Phaser.GameObjects.Sprite;

  private lines: string[] = [];
  private index = 0;
  private open = false;

  private onClose?: () => void;
  private portraitTween?: Phaser.Tweens.Tween;

  // Adding case for dialogues that dont require the potrait with frame
  private textWithPortraitX = 0;
  private textWithoutPortraitX = 0;
  private textWithPortraitWidth = 0;
  private textWithoutPortraitWidth = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const width = scene.scale.width;
    const height = scene.scale.height;

    const portraitPanelX = 82;
    const portraitPanelY = height - 142;
    const portraitPanelWidth = 102;
    const portraitPanelHeight = 106;

    const portraitCenterX =
      portraitPanelX + portraitPanelWidth / 2;

    const portraitCenterY =
      portraitPanelY + portraitPanelHeight / 2;

    const dialogueTextX =
      portraitPanelX + portraitPanelWidth + 30;

    this.textWithPortraitX = dialogueTextX;
    this.textWithoutPortraitX = 90;

    this.textWithPortraitWidth =
      width - dialogueTextX - 100;

    this.textWithoutPortraitWidth =
      width - 180;
      
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

    this.portraitPanel = scene.add.graphics();

    this.drawPortraitPanel(
      portraitPanelX,
      portraitPanelY,
      portraitPanelWidth,
      portraitPanelHeight
    );

    this.portrait = scene.add.sprite(
      portraitCenterX,
      portraitCenterY,
      ""
    );

    this.portrait.setScale(2.4);
    this.portrait.setVisible(false);

    this.text = scene.add.text(
      dialogueTextX,
      height - 135,
      "",
      {
        fontSize: "22px",
        color: "#ffffff",
        wordWrap: {
          width: width - dialogueTextX - 100,
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
      this.portraitPanel,
      this.portrait,
      this.text,
      this.hint,
    ]);
  }

  show(
    dialogue: string | string[],
    onClose?: () => void,
    portraitKey?: string
  ) {
    this.lines = Array.isArray(dialogue)
      ? dialogue
      : [dialogue];

    this.index = 0;
    this.open = true;
    this.onClose = onClose;

    this.setPortrait(portraitKey);

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
    if (!this.open) return;

    this.open = false;
    this.lines = [];
    this.index = 0;

    this.text.setText("");
    this.hint.setText("");

    this.stopPortraitAnimation();

    this.container.setVisible(false);

    const callback = this.onClose;
    this.onClose = undefined;

    if (callback) {
      callback();
    }
  }

  isOpen() {
    return this.open;
  }

  private showCurrentLine() {
    const currentLine = this.lines[this.index] ?? "";

    this.text.setText(currentLine);

    if (this.index >= this.lines.length - 1) {
      this.hint.setText("SPACE ▶ Close");
    } else {
      this.hint.setText("SPACE ▶ Next");
    }
  }

  private setPortrait(portraitKey?: string) {
    this.stopPortraitAnimation();

    if (
      !portraitKey ||
      !this.scene.textures.exists(portraitKey)
    ) {
      this.portrait.setVisible(false);
      this.portraitPanel.setVisible(false);

      this.text.setX(this.textWithoutPortraitX);
      this.text.setWordWrapWidth(
        this.textWithoutPortraitWidth
      );

      return;
    }

    this.portraitPanel.setVisible(true);

    this.text.setX(this.textWithPortraitX);
    this.text.setWordWrapWidth(
      this.textWithPortraitWidth
    );

    this.portrait.setTexture(portraitKey);
    this.portrait.setFrame(0);
    this.portrait.setVisible(true);

    this.portrait.setScale(2.4);
    this.portrait.setAlpha(1);
    this.portrait.setAngle(0);

    this.portraitTween = this.scene.tweens.add({
      targets: this.portrait,
      y: this.portrait.y - 4,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private stopPortraitAnimation() {
    if (this.portraitTween) {
      this.portraitTween.stop();
      this.portraitTween = undefined;
    }
  }

  private drawPortraitPanel(
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    this.portraitPanel.clear();
  
    // soft shadow
    this.portraitPanel.fillStyle(0x000000, 0.45);
    this.portraitPanel.fillRoundedRect(
      x + 4,
      y + 5,
      width,
      height,
      8
    );
  
    // main portrait background
    this.portraitPanel.fillStyle(0x201915, 1);
    this.portraitPanel.fillRoundedRect(
      x,
      y,
      width,
      height,
      8
    );
  
    // inner dark panel
    this.portraitPanel.fillStyle(0x111111, 0.95);
    this.portraitPanel.fillRoundedRect(
      x + 8,
      y + 8,
      width - 16,
      height - 16,
      6
    );
  
    // bronze outer border
    this.portraitPanel.lineStyle(
      3,
      0x9b7a3f,
      1
    );
    this.portraitPanel.strokeRoundedRect(
      x,
      y,
      width,
      height,
      8
    );
  
    // subtle inner highlight
    this.portraitPanel.lineStyle(
      1,
      0xe6c878,
      0.45
    );
    this.portraitPanel.strokeRoundedRect(
      x + 5,
      y + 5,
      width - 10,
      height - 10,
      6
    );
  
    // small corner accents
    this.portraitPanel.lineStyle(
      3,
      0xd6a84f,
      0.85
    );
  
    const corner = 14;
  
    // top-left
    this.portraitPanel.beginPath();
    this.portraitPanel.moveTo(x + 10, y + corner);
    this.portraitPanel.lineTo(x + 10, y + 10);
    this.portraitPanel.lineTo(x + corner, y + 10);
    this.portraitPanel.strokePath();
  
    // top-right
    this.portraitPanel.beginPath();
    this.portraitPanel.moveTo(x + width - corner, y + 10);
    this.portraitPanel.lineTo(x + width - 10, y + 10);
    this.portraitPanel.lineTo(x + width - 10, y + corner);
    this.portraitPanel.strokePath();
  
    // bottom-left
    this.portraitPanel.beginPath();
    this.portraitPanel.moveTo(x + 10, y + height - corner);
    this.portraitPanel.lineTo(x + 10, y + height - 10);
    this.portraitPanel.lineTo(x + corner, y + height - 10);
    this.portraitPanel.strokePath();
  
    // bottom-right
    this.portraitPanel.beginPath();
    this.portraitPanel.moveTo(x + width - corner, y + height - 10);
    this.portraitPanel.lineTo(x + width - 10, y + height - 10);
    this.portraitPanel.lineTo(x + width - 10, y + height - corner);
    this.portraitPanel.strokePath();
  }
}