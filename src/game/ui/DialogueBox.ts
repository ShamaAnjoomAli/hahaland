import Phaser from "phaser";

type DialogueChoice = {
  label: string;
  value: string;
};

type ChoiceDialogueConfig = {
  lines: string[];
  choices: DialogueChoice[];
  portraitKey?: string;
  onChoice: (value: string) => void;
};

type DialogueLine =
  | string
  | {
      text: string;
      portraitKey?: string;
    };

export default class DialogueBox {
  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;

  private box!: Phaser.GameObjects.Rectangle;
  private text!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  private portraitPanel!: Phaser.GameObjects.Graphics;
  private portrait!: Phaser.GameObjects.Sprite;

  private lines: DialogueLine[] = [];
  private defaultPortraitKey?: string;
  
  private index = 0;
  private open = false;

  private onClose?: () => void;
  private portraitTween?: Phaser.Tweens.Tween;

  // Adding case for dialogues that dont require the potrait with frame
  private textWithPortraitX = 0;
  private textWithoutPortraitX = 0;
  private textWithPortraitWidth = 0;
  private textWithoutPortraitWidth = 0;

  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private activeChoices: DialogueChoice[] = [];
  private onChoice?: (value: string) => void;
  private showingChoices = false;

  private choiceListStartIndex = 0;
  private choiceWheelHandler?: (...args: any[]) => void;


  private portraitBaseX = 0;
  private portraitBaseY = 0;
  private portraitScale = 1.45;
  private portraitTweenScale = 1.52;

  private choicePanel?: Phaser.GameObjects.Container;

  private selectedChoiceIndex = 0;

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
    this.container.setDepth(30000);
    this.container.setScrollFactor(0);
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

    this.portraitBaseX = portraitCenterX;
    this.portraitBaseY = portraitCenterY + 6;

    this.portrait.setPosition(
      this.portraitBaseX,
      this.portraitBaseY
    );

    this.portrait.setScale(1.2);
    this.portrait.setVisible(false);

    this.text = scene.add.text(
      dialogueTextX,
      height - 135,
      "",
      {
        fontSize: "20px",
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
    dialogue: DialogueLine | DialogueLine[],
    onClose?: () => void,
    portraitKey?: string
  ) {
    this.clearChoices();

    this.lines = Array.isArray(dialogue)
      ? dialogue
      : [dialogue];

    this.index = 0;
    this.open = true;
    this.onClose = onClose;
    this.defaultPortraitKey = portraitKey;
    this.showingChoices = false;

    this.container.setVisible(true);
    this.hint.setText("SPACE  ▶  Next");
    this.setCurrentLine();
  }

  private setCurrentLine() {
    const currentLine = this.lines[this.index];

    if (typeof currentLine === "string") {
      this.text.setText(currentLine);
      this.setPortrait(this.defaultPortraitKey);
      return;
    }
  
    this.text.setText(currentLine.text);
  
    this.setPortrait(
      currentLine.portraitKey ?? this.defaultPortraitKey
    );
  }

  showChoice(config: ChoiceDialogueConfig) {
    this.openChoiceDialogue(config);
  }

  showChoiceList(config: ChoiceDialogueConfig) {
    this.clearChoices();
  
    this.lines = config.lines;
    this.index = 0;
    this.open = true;
    this.onClose = undefined;
  
    this.activeChoices = config.choices;
    this.onChoice = config.onChoice;
    this.defaultPortraitKey = config.portraitKey;
    this.showingChoices = false;
    this.choiceListStartIndex = 0;
  
    this.container.setVisible(true);
    this.hint.setText("SPACE  ▶  Next");
    this.setCurrentLine();
  }

  private openChoiceDialogue(config: ChoiceDialogueConfig) {
    this.clearChoices();
  
    this.lines = config.lines;
    this.index = 0;
    this.open = true;
    this.onClose = undefined;
  
    this.activeChoices = config.choices;
    this.onChoice = config.onChoice;
    this.defaultPortraitKey = config.portraitKey;
    this.showingChoices = false;
    this.choiceListStartIndex = 0;
  
    this.container.setVisible(true);
    this.hint.setText("SPACE  ▶  Next");
    this.setCurrentLine();
  }

  next() {
    if (!this.open) return;

    if (this.showingChoices) {
      return;
    }

    this.index++;

    if (this.index >= this.lines.length) {
      if (this.activeChoices.length > 0) {
        this.showChoiceButtons();
        return;
      }

      this.hide();
      return;
    }

    this.setCurrentLine();
  }

  private showChoiceListButtons() {
    this.showingChoices = true;
    this.hint.setText("Choose an option");
  
    this.choiceWheelHandler = (
      _pointer: any,
      _objects: any,
      _dx: any,
      dy: number
    ) => {
      if (!this.showingChoices) return;
  
      if (dy > 0) {
        this.scrollChoiceList(1);
      } else if (dy < 0) {
        this.scrollChoiceList(-1);
      }
    };
  
    this.scene.input.on("wheel", this.choiceWheelHandler);
  
    this.renderChoiceList();
  }

  private scrollChoiceList(direction: number) {
    const maxVisible = 4;
  
    const maxStart = Math.max(
      0,
      this.activeChoices.length - maxVisible
    );
  
    this.choiceListStartIndex = Phaser.Math.Clamp(
      this.choiceListStartIndex + direction,
      0,
      maxStart
    );
  
    this.selectedChoiceIndex = Phaser.Math.Clamp(
      this.choiceListStartIndex,
      0,
      this.activeChoices.length - 1
    );
  
    this.renderChoiceList();
  }

  private renderChoiceList() {
    this.choiceButtons.forEach((button) => button.destroy());
    this.choiceButtons = [];
  
    this.choicePanel?.destroy();
    this.choicePanel = undefined;
  
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
  
    const maxVisible = 4;
  
    const optionWidth = 230;
    const optionHeight = 32;
    const optionGap = 5;
  
    const visibleCount = Math.min(
      this.activeChoices.length,
      maxVisible
    );
  
    const panelWidth = 300;
    const panelHeight =
      58 + visibleCount * (optionHeight + optionGap);
  
    const panelX = width / 2;
    const panelY = height / 2 - 45;
  
    this.choicePanel = this.scene.add.container(panelX, panelY);
    this.choicePanel.setDepth(52000);
    this.container.add(this.choicePanel);
  
    // soft shadow
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(
      -panelWidth / 2 + 8,
      -panelHeight / 2 + 10,
      panelWidth,
      panelHeight,
      18
    );
  
    // compact glass panel
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x050505, 0.82);
    bg.fillRoundedRect(
      -panelWidth / 2,
      -panelHeight / 2,
      panelWidth,
      panelHeight,
      18
    );
  
    this.choicePanel.add([shadow, bg]);
  
    const title = this.scene.add.text(
      0,
      -panelHeight / 2 + 24,
      "Choose",
      {
        fontFamily: "Georgia",
        fontSize: "17px",
        color: "#d9b24c",
        stroke: "#000000",
        strokeThickness: 4,
        fontStyle: "bold",
      }
    );
  
    title.setOrigin(0.5);
    this.choicePanel.add(title);
  
    const maxStart = Math.max(
      0,
      this.activeChoices.length - maxVisible
    );
  
    const visibleChoices = this.activeChoices.slice(
      this.choiceListStartIndex,
      this.choiceListStartIndex + maxVisible
    );
  
    const firstY = -panelHeight / 2 + 58;
  
    visibleChoices.forEach((choice, index) => {
      const realIndex = this.choiceListStartIndex + index;
      const isSelected = realIndex === this.selectedChoiceIndex;
  
      const y = firstY + index * (optionHeight + optionGap);
  
      const option = this.scene.add.container(0, y);
  
      const optionBg = this.scene.add.graphics();
  
      if (isSelected) {
        optionBg.fillStyle(0x6b4a00, 0.85);
      } else {
        optionBg.fillStyle(0x000000, 0.25);
      }
  
      optionBg.fillRoundedRect(
        -optionWidth / 2,
        -optionHeight / 2,
        optionWidth,
        optionHeight,
        12
      );
  
      const label = this.scene.add.text(
        -optionWidth / 2 + 22,
        0,
        `${isSelected ? "›" : "•"} ${choice.label}`,
        {
          fontFamily: "Georgia",
          fontSize: isSelected ? "19px" : "18px",
          color: isSelected ? "#ffffff" : "#ffd966",
          stroke: "#000000",
          strokeThickness: 4,
          fontStyle: "bold",
        }
      );
  
      label.setOrigin(0, 0.5);
  
      option.add([optionBg, label]);
  
      option.setSize(optionWidth, optionHeight);
  
      option.setInteractive(
        new Phaser.Geom.Rectangle(
          -optionWidth / 2,
          -optionHeight / 2,
          optionWidth,
          optionHeight
        ),
        Phaser.Geom.Rectangle.Contains
      );
  
      option.on("pointerover", () => {
        this.selectedChoiceIndex = realIndex;
        this.renderChoiceList();
      });
  
      option.on("pointerdown", () => {
        this.choose(choice.value);
      });
  
      this.choicePanel?.add(option);
      this.choiceButtons.push(option);
    });
  
    if (this.choiceListStartIndex > 0) {
      this.createScrollText(
        panelWidth / 2 - 35,
        -panelHeight / 2 + 26,
        "▲",
        -1
      );
    }
  
    if (this.choiceListStartIndex < maxStart) {
      this.createScrollText(
        panelWidth / 2 - 35,
        panelHeight / 2 - 24,
        "▼",
        1
      );
    }
  }

  private createScrollText(
    x: number,
    y: number,
    labelText: string,
    direction: number
  ) {
    const button = this.scene.add.container(x, y);
  
    const label = this.scene.add.text(0, 0, labelText, {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffd966",
      stroke: "#000000",
      strokeThickness: 4,
      fontStyle: "bold",
    });
  
    label.setOrigin(0.5);
  
    button.add(label);
  
    button.setSize(32, 26);
  
    button.setInteractive(
      new Phaser.Geom.Rectangle(-16, -13, 32, 26),
      Phaser.Geom.Rectangle.Contains
    );
  
    button.on("pointerover", () => {
      label.setColor("#ffffff");
      button.setScale(1.12);
    });
  
    button.on("pointerout", () => {
      label.setColor("#ffd966");
      button.setScale(1);
    });
  
    button.on("pointerdown", () => {
      this.scrollChoiceList(direction);
    });
  
    this.choicePanel?.add(button);
    this.choiceButtons.push(button);
  }

  hide() {
    this.clearChoices();
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

  this.portrait.setPosition(
    this.portraitBaseX,
    this.portraitBaseY
  );

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

  this.portrait.setScale(this.portraitScale);
  this.portrait.setAlpha(1);
  this.portrait.setAngle(0);

  this.portraitTween = this.scene.tweens.add({
    targets: this.portrait,
    y: this.portraitBaseY - 3,
    scaleX: this.portraitTweenScale,
    scaleY: this.portraitTweenScale,
    duration: 750,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  }

  private stopPortraitAnimation() {
    if (this.portraitTween) {
      this.portraitTween.stop();
      this.portraitTween.remove();
      this.portraitTween = undefined;
    }
  
    if (this.portrait) {
      this.portrait.setPosition(
        this.portraitBaseX,
        this.portraitBaseY
      );
  
      this.portrait.setScale(this.portraitScale);
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

  private showChoiceButtons() {
  this.showingChoices = true;
  this.selectedChoiceIndex = 0;

  this.hint.setText("");

  this.choiceWheelHandler = (
    _pointer: any,
    _objects: any,
    _dx: any,
    dy: number
  ) => {
    if (!this.showingChoices) return;

    if (dy > 0) {
      this.scrollChoiceList(1);
    } else if (dy < 0) {
      this.scrollChoiceList(-1);
    }
  };

  this.scene.input.on("wheel", this.choiceWheelHandler);

  this.renderChoiceList();
}
  
  private showChoices() {
    this.showChoiceButtons();
  }
  
  private choose(value: string) {
    const callback = this.onChoice;

    this.clearChoices();
    this.hide();
  
    callback?.(value);
  }
  
  private clearChoices() {
    this.choiceButtons.forEach((button) => button.destroy());
    this.choiceButtons = [];
  
    this.choicePanel?.destroy();
    this.choicePanel = undefined;
  
    if (this.choiceWheelHandler) {
      this.scene.input.off("wheel", this.choiceWheelHandler);
      this.choiceWheelHandler = undefined;
    }
  
    this.activeChoices = [];
    this.onChoice = undefined;
    this.showingChoices = false;
    this.choiceListStartIndex = 0;
  }
}