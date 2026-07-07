import Phaser from "phaser";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.createBackground(width, height);

    const panelWidth = Math.min(820, width - 120);
    const panelHeight = Math.min(500, height - 90);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2 + 20;

    this.createGlassPanel(
      panelX,
      panelY,
      panelWidth,
      panelHeight
    );

    this.add
      .text(width / 2, panelY + 45, "HAHALAND", {
        fontFamily: "Georgia",
        fontSize: "36px",
        color: "#ffd700",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, panelY + 105, "ANCIENT EGYPT EDITION", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#d6a84f",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, panelY + 180, "BUILD OTHERS.\nBECOME LEGEND.", {
        fontFamily: "Georgia",
        fontSize: "42px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        panelY + 285,
        "You arrive with 1,000,000 gold.\nHow you spend it decides who you become.",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#d8d8d8",
          align: "center",
          lineSpacing: 6,
        }
      )
      .setOrigin(0.5);

    this.createButton(
      width / 2 - 120,
      panelY + panelHeight - 85,
      "Play",
      true,
      () => {
        this.scene.start("VillageScene");
      }
    );

    this.createButton(
      width / 2 + 120,
      panelY + panelHeight - 85,
      "How to Play",
      false,
      () => {
        this.scene.start("HowToPlayScene");
      }
    );
  }

  private createBackground(width: number, height: number) {
    const bg = this.add.graphics();

    bg.fillGradientStyle(
      0x020106,
      0x020106,
      0x2b1606,
      0x050207,
      1
    );

    bg.fillRect(0, 0, width, height);

    const sun = this.add.circle(
      width / 2,
      height / 2 + 40,
      210,
      0xf5a400,
      0.16
    );

    this.tweens.add({
      targets: sun,
      alpha: 0.26,
      scale: 1.08,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const pyramids = this.add.graphics();

    pyramids.fillStyle(0x8a5a16, 0.26);
    pyramids.fillTriangle(
      width / 2 - 430,
      height,
      width / 2 - 120,
      190,
      width / 2 + 170,
      height
    );

    pyramids.fillStyle(0xc3891a, 0.22);
    pyramids.fillTriangle(
      width / 2 - 150,
      height,
      width / 2 + 160,
      120,
      width / 2 + 500,
      height
    );

    pyramids.fillStyle(0x000000, 0.38);
    pyramids.fillTriangle(
      width / 2 + 120,
      height,
      width / 2 + 420,
      250,
      width / 2 + 720,
      height
    );

    const vignette = this.add.graphics();

    vignette.fillStyle(0x000000, 0.48);
    vignette.fillRect(0, 0, width, height);

    for (let i = 0; i < 30; i++) {
      const dust = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(1, 3),
        0xd6a84f,
        Phaser.Math.FloatBetween(0.08, 0.22)
      );

      this.tweens.add({
        targets: dust,
        y: dust.y - Phaser.Math.Between(20, 60),
        alpha: 0,
        duration: Phaser.Math.Between(2500, 5000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2500),
      });
    }
  }

  private createGlassPanel(
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const panel = this.add.graphics();

    panel.fillStyle(0x000000, 0.58);
    panel.fillRoundedRect(x, y, width, height, 22);

    panel.lineStyle(2, 0xd6a84f, 0.55);
    panel.strokeRoundedRect(x, y, width, height, 22);

    panel.lineStyle(1, 0xffffff, 0.16);
    panel.strokeRoundedRect(
      x + 8,
      y + 8,
      width - 16,
      height - 16,
      18
    );
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    filled: boolean,
    onClick: () => void
  ) {
    const buttonWidth = 190;
    const buttonHeight = 54;

    const button = this.add.container(x, y);

    const bg = this.add.rectangle(
      0,
      0,
      buttonWidth,
      buttonHeight,
      filled ? 0xf2a900 : 0x000000,
      filled ? 1 : 0.38
    );

    bg.setStrokeStyle(
      2,
      filled ? 0xffd966 : 0xd6a84f,
      filled ? 1 : 0.65
    );

    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: filled ? "#111111" : "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    button.add([bg, text]);

    button.setSize(buttonWidth, buttonHeight);

    button.setInteractive(
      new Phaser.Geom.Rectangle(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight
      ),
      Phaser.Geom.Rectangle.Contains
    );

    button.on("pointerover", () => {
      button.setScale(1.05);

      bg.setFillStyle(
        filled ? 0xffc21a : 0x1b1208,
        filled ? 1 : 0.78
      );
    });

    button.on("pointerout", () => {
      button.setScale(1);

      bg.setFillStyle(
        filled ? 0xf2a900 : 0x000000,
        filled ? 1 : 0.38
      );
    });

    button.on("pointerdown", onClick);
  }
}