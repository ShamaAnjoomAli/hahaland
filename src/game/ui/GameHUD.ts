import Phaser from "phaser";

export default class GameHUD {
  public container: Phaser.GameObjects.Container;

  private coinText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width = 160
  ) {
    this.bg = scene.add.graphics();

    this.bg.fillStyle(0x000000, 0.72);
    this.bg.fillRoundedRect(
      x,
      y,
      width,
      34,
      8
    );

    this.bg.lineStyle(2, 0xffffff, 0.35);
    this.bg.strokeRoundedRect(
      x,
      y,
      width,
      34,
      8
    );

    // coin icon
    const coinIcon = scene.add.circle(
      x + 18,
      y + 17,
      8,
      0xffd966
    );

    coinIcon.setStrokeStyle(2, 0x9b7a3f);

    this.coinText = scene.add.text(
      x + 32,
      y + 8,
      "0",
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
      }
    );

    // clock icon
    const clockIcon = scene.add.circle(
      x + 88,
      y + 17,
      8,
      0x222222
    );

    clockIcon.setStrokeStyle(2, 0xffffff);

    const clockHandA = scene.add.line(
      0,
      0,
      x + 88,
      y + 17,
      x + 88,
      y + 12,
      0xffffff
    );

    const clockHandB = scene.add.line(
      0,
      0,
      x + 88,
      y + 17,
      x + 92,
      y + 17,
      0xffffff
    );

    this.timerText = scene.add.text(
      x + 102,
      y + 8,
      "02:00",
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
      }
    );

    this.container = scene.add.container(0, 0, [
      this.bg,
      coinIcon,
      this.coinText,
      clockIcon,
      clockHandA,
      clockHandB,
      this.timerText,
    ]);

    this.container.setScrollFactor(0);
    this.container.setDepth(20050);
  }

  setCoins(value: number) {
    this.coinText.setText(`${value}`);
  }

  setTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const formattedTime =
      `${minutes.toString().padStart(2, "0")}:` +
      `${remainingSeconds.toString().padStart(2, "0")}`;

    this.timerText.setText(formattedTime);

    if (seconds <= 10) {
      this.timerText.setColor("#ff6666");
    } else {
      this.timerText.setColor("#ffffff");
    }
  }
}