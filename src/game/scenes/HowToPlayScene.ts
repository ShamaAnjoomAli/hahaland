import Phaser from "phaser";

type InstructionItem = {
  icon: string;
  title: string;
  description: string;
};

export default class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super("HowToPlayScene");
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.createBackground(width, height);

    const panelWidth = Math.min(900, width - 120);
    const panelHeight = Math.min(570, height - 80);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    this.createPanel(panelX, panelY, panelWidth, panelHeight);

    this.add
      .text(width / 2, panelY + 50, "HOW TO PLAY", {
        fontFamily: "Georgia",
        fontSize: "44px",
        color: "#ffd700",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, panelY + 92, "Learn the basics before entering the city", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#cfcfcf",
      })
      .setOrigin(0.5);

    const items: InstructionItem[] = [
      {
        icon: "WASD",
        title: "Move",
        description: "Walk around the city.",
      },
      {
        icon: "E",
        title: "Talk",
        description: "Interact with nearby NPCs.",
      },
      {
        icon: "SPACE",
        title: "Dialogue",
        description: "Continue or close conversations.",
      },
      {
        icon: "!",
        title: "Quest Target",
        description: "The yellow marker shows who to talk to next.",
      },
      {
        icon: "●",
        title: "Minimap",
        description: "Red is you. Blue dots are NPCs.",
      },
      {
        icon: "◉",
        title: "Quest Dot",
        description: "Yellow dot marks your objective on the minimap.",
      },
      {
        icon: "¢",
        title: "Coins",
        description: "Earn coins by talking to NPCs.",
      },
      {
        icon: "⏱",
        title: "Timer",
        description: "Finish your objective before time runs out.",
      },
    ];

    this.createInstructionGrid(
      items,
      panelX,
      panelY,
      panelWidth
    );

    this.createButton(
      width / 2 - 110,
      panelY + panelHeight - 60,
      "Back",
      false,
      () => {
        this.scene.start("MainMenuScene");
      }
    );

    this.createButton(
      width / 2 + 110,
      panelY + panelHeight - 60,
      "Play",
      true,
      () => {
        this.scene.start("VillageScene");
      }
    );
  }

  private createBackground(width: number, height: number) {
    const bg = this.add.graphics();

    bg.fillGradientStyle(
      0x020106,
      0x020106,
      0x211004,
      0x000000,
      1
    );

    bg.fillRect(0, 0, width, height);

    const glow = this.add.circle(
      width / 2,
      height / 2,
      240,
      0xf2a900,
      0.1
    );

    this.tweens.add({
      targets: glow,
      alpha: 0.18,
      scale: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 2200,
    });

    const pyramid = this.add.graphics();

    pyramid.fillStyle(0xb07319, 0.16);
    pyramid.fillTriangle(
      width / 2 - 360,
      height,
      width / 2,
      130,
      width / 2 + 360,
      height
    );
  }

  private createPanel(
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const panel = this.add.graphics();

    panel.fillStyle(0x000000, 0.68);
    panel.fillRoundedRect(x, y, width, height, 22);

    panel.lineStyle(2, 0xd6a84f, 0.55);
    panel.strokeRoundedRect(x, y, width, height, 22);

    panel.lineStyle(1, 0xffffff, 0.15);
    panel.strokeRoundedRect(
      x + 8,
      y + 8,
      width - 16,
      height - 16,
      18
    );
  }

  private createInstructionGrid(
    items: InstructionItem[],
    panelX: number,
    panelY: number,
    panelWidth: number
  ) {
    const cardWidth = 360;
    const cardHeight = 72;
    const gapX = 26;
    const gapY = 16;

    const totalGridWidth = cardWidth * 2 + gapX;
    const startX =
      panelX + panelWidth / 2 - totalGridWidth / 2;

    const startY = panelY + 130;

    items.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);

      const x =
        startX + col * (cardWidth + gapX);

      const y =
        startY + row * (cardHeight + gapY);

      this.createInstructionCard(
        x,
        y,
        cardWidth,
        cardHeight,
        item
      );
    });
  }

  private createInstructionCard(
    x: number,
    y: number,
    width: number,
    height: number,
    item: InstructionItem
  ) {
    const card = this.add.graphics();

    card.fillStyle(0x120d08, 0.82);
    card.fillRoundedRect(x, y, width, height, 12);

    card.lineStyle(1, 0xd6a84f, 0.35);
    card.strokeRoundedRect(x, y, width, height, 12);

    const iconBox = this.add.rectangle(
      x + 40,
      y + height / 2,
      52,
      42,
      0xf2a900,
      0.95
    );

    iconBox.setStrokeStyle(2, 0xffd966);

    this.add
      .text(x + 40, y + height / 2, item.icon, {
        fontFamily: "Arial",
        fontSize: item.icon.length > 3 ? "14px" : "22px",
        color: "#111111",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add.text(x + 78, y + 13, item.title, {
      fontFamily: "Arial",
      fontSize: "17px",
      color: "#ffffff",
      fontStyle: "bold",
    });

    this.add.text(x + 78, y + 39, item.description, {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#cfcfcf",
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    filled: boolean,
    onClick: () => void
  ) {
    const buttonWidth = 170;
    const buttonHeight = 50;

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