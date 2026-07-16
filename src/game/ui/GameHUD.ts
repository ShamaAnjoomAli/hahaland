import Phaser from 'phaser'

export default class GameHUD {
  public container: Phaser.GameObjects.Container

  private scene: Phaser.Scene
  private coinText: Phaser.GameObjects.Text
  private timerText: Phaser.GameObjects.Text
  private reputationLabel: Phaser.GameObjects.Text
  private bg: Phaser.GameObjects.Graphics
  private reputationFill: Phaser.GameObjects.Graphics

  private width: number
  private reputationBarWidth: number
  private reputationBarX: number
  private reputationBarY: number
  private rightMargin: number
  private fixedY: number

  constructor(scene: Phaser.Scene, x: number, y: number, width = 150) {
    this.scene = scene
    this.width = width
    this.rightMargin = Math.max(0, scene.scale.width - x - width)
    this.fixedY = y

    const height = 50
    const topHeight = 28
    const dividerX = Math.round(width * 0.46)
    const clockX = dividerX + 14

    this.reputationBarX = 44
    this.reputationBarY = 36
    this.reputationBarWidth = width - 56

    this.container = scene.add.container(x, y)

    this.bg = scene.add.graphics()

    this.bg.fillStyle(0x000000, 0.72)
    this.bg.fillRoundedRect(0, 0, width, height, 7)

    this.bg.lineStyle(2, 0xffffff, 0.32)
    this.bg.strokeRoundedRect(0, 0, width, height, 7)

    this.bg.lineStyle(1, 0xffffff, 0.2)
    this.bg.lineBetween(dividerX, 5, dividerX, topHeight - 5)

    this.bg.lineStyle(1, 0xffffff, 0.18)
    this.bg.lineBetween(8, topHeight + 1, width - 8, topHeight + 1)

    this.bg.fillStyle(0x1d1d1d, 1)
    this.bg.fillRoundedRect(
      this.reputationBarX,
      this.reputationBarY,
      this.reputationBarWidth,
      7,
      3,
    )

    this.bg.lineStyle(1, 0xffffff, 0.28)
    this.bg.strokeRoundedRect(
      this.reputationBarX,
      this.reputationBarY,
      this.reputationBarWidth,
      7,
      3,
    )

    const coinIcon = scene.add.circle(14, topHeight / 2, 6, 0xffd966)
    coinIcon.setStrokeStyle(1.5, 0x9b7a3f)

    this.coinText = scene.add.text(27, topHeight / 2, '0', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    })
    this.coinText.setOrigin(0, 0.5)

    const clockIcon = scene.add.circle(clockX, topHeight / 2, 6, 0x222222)
    clockIcon.setStrokeStyle(1.5, 0xffffff)

    const clockHandA = scene.add.line(
      0,
      0,
      clockX,
      topHeight / 2,
      clockX,
      topHeight / 2 - 4,
      0xffffff,
    )
    clockHandA.setLineWidth(1.5)

    const clockHandB = scene.add.line(
      0,
      0,
      clockX,
      topHeight / 2,
      clockX + 3,
      topHeight / 2,
      0xffffff,
    )
    clockHandB.setLineWidth(1.5)

    this.timerText = scene.add.text(clockX + 13, topHeight / 2, '00:00', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    })
    this.timerText.setOrigin(0, 0.5)

    this.reputationLabel = scene.add.text(12, 39, 'REP', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#ffd966',
      fontStyle: 'bold',
    })
    this.reputationLabel.setOrigin(0, 0.5)

    this.reputationFill = scene.add.graphics()

    this.container.add([
      this.bg,
      coinIcon,
      this.coinText,
      clockIcon,
      clockHandA,
      clockHandB,
      this.timerText,
      this.reputationLabel,
      this.reputationFill,
    ])

    this.container.setScrollFactor(0)
    this.container.setDepth(50000)

    this.setReputation(0)

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
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

  setReputation(value: number) {
    const safeValue = Phaser.Math.Clamp(Math.floor(value), 0, 100)
    const fillWidth = Math.round(this.reputationBarWidth * (safeValue / 100))

    let fillColor = 0xff6666

    if (safeValue >= 70) {
      fillColor = 0x66ff99
    } else if (safeValue >= 35) {
      fillColor = 0xffd966
    }

    this.reputationFill.clear()

    if (fillWidth > 0) {
      this.reputationFill.fillStyle(fillColor, 1)
      this.reputationFill.fillRoundedRect(
        this.reputationBarX,
        this.reputationBarY,
        fillWidth,
        7,
        3,
      )
    }

    this.reputationLabel.setText('REP')
  }

  private handleResize(gameSize: { width: number }) {
    this.container.setPosition(
      gameSize.width - this.width - this.rightMargin,
      this.fixedY,
    )
  }

  private destroy() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
  }
}
