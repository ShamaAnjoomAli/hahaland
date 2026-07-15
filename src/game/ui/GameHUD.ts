import Phaser from 'phaser'

export default class GameHUD {
  public container: Phaser.GameObjects.Container

  private coinText: Phaser.GameObjects.Text
  private timerText: Phaser.GameObjects.Text
  private bg: Phaser.GameObjects.Graphics

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width = 150
  ) {
    const height = 28
    const dividerX = Math.round(width * 0.46)
    const clockX = dividerX + 14

    this.container = scene.add.container(x, y)

    this.bg = scene.add.graphics()

    this.bg.fillStyle(0x000000, 0.72)
    this.bg.fillRoundedRect(0, 0, width, height, 7)

    this.bg.lineStyle(2, 0xffffff, 0.32)
    this.bg.strokeRoundedRect(0, 0, width, height, 7)

    this.bg.lineStyle(1, 0xffffff, 0.2)
    this.bg.lineBetween(dividerX, 5, dividerX, height - 5)

    const coinIcon = scene.add.circle(
      14,
      height / 2,
      6,
      0xffd966
    )
    coinIcon.setStrokeStyle(1.5, 0x9b7a3f)

    this.coinText = scene.add.text(
      27,
      height / 2,
      '0',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
      }
    )
    this.coinText.setOrigin(0, 0.5)

    const clockIcon = scene.add.circle(
      clockX,
      height / 2,
      6,
      0x222222
    )
    clockIcon.setStrokeStyle(1.5, 0xffffff)

    const clockHandA = scene.add.line(
      0,
      0,
      clockX,
      height / 2,
      clockX,
      height / 2 - 4,
      0xffffff
    )
    clockHandA.setLineWidth(1.5)

    const clockHandB = scene.add.line(
      0,
      0,
      clockX,
      height / 2,
      clockX + 3,
      height / 2,
      0xffffff
    )
    clockHandB.setLineWidth(1.5)

    this.timerText = scene.add.text(
      clockX + 13,
      height / 2,
      '00:00',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
      }
    )
    this.timerText.setOrigin(0, 0.5)

    this.container.add([
      this.bg,
      coinIcon,
      this.coinText,
      clockIcon,
      clockHandA,
      clockHandB,
      this.timerText,
    ])

    this.container.setScrollFactor(0)
    this.container.setDepth(20050)
  }

  setCoins(value: number) {
    const safeValue = Math.max(0, Math.floor(value))
    this.coinText.setText(`${safeValue}`)
  }

  setTime(seconds: number) {
    const safeSeconds = Math.max(0, Math.ceil(seconds))

    const minutes = Math.floor(safeSeconds / 60)
    const remainingSeconds = safeSeconds % 60

    const formattedTime =
      `${minutes.toString().padStart(2, '0')}:` +
      `${remainingSeconds.toString().padStart(2, '0')}`

    this.timerText.setText(formattedTime)

    if (safeSeconds <= 10) {
      this.timerText.setColor('#ff6666')
    } else if (safeSeconds <= 30) {
      this.timerText.setColor('#ffd966')
    } else {
      this.timerText.setColor('#ffffff')
    }
  }
}