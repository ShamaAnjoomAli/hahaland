import Phaser from 'phaser'

export default class ObjectiveBox {
  public container: Phaser.GameObjects.Container

  private scene: Phaser.Scene
  private bg: Phaser.GameObjects.Rectangle
  private text: Phaser.GameObjects.Text
  private currentText = 'Objective loading...'

  private readonly boxX = 12
  private readonly boxY = 12
  private readonly minimapWidth = 150
  private readonly rightPadding = 12
  private readonly gapBetweenObjectiveAndMap = 12

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.container = scene.add.container(0, 0)
    this.container.setScrollFactor(0)
    this.container.setDepth(40000)
    this.container.setVisible(true)

    this.bg = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.72)
    this.bg.setOrigin(0)
    this.bg.setStrokeStyle(2, 0xffffff, 0.75)

    this.text = scene.add.text(0, 0, this.currentText, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      lineSpacing: 2,
      wordWrap: {
        width: 300,
        useAdvancedWrap: true,
      },
    })

    this.container.add([this.bg, this.text])
    this.layout()

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
  }

  setText(value: string) {
    this.currentText = value || 'No active objective'
    this.text.setText(this.currentText)
    this.layout()
  }

  hide() {
    this.container.setVisible(false)
  }

  show() {
    this.container.setVisible(true)
  }

  private layout() {
    const sceneWidth = this.scene.scale.width

    const reservedRight =
      this.minimapWidth + this.rightPadding + this.gapBetweenObjectiveAndMap

    const availableWidth = sceneWidth - this.boxX - reservedRight
    const useFullWidth = availableWidth < 220

    const boxWidth = useFullWidth
      ? Math.max(180, sceneWidth - this.boxX * 2)
      : Math.max(220, availableWidth)

    const innerPaddingX = 10
    const innerPaddingY = 7

    this.text.setPosition(this.boxX + innerPaddingX, this.boxY + innerPaddingY)
    this.text.setWordWrapWidth(Math.max(120, boxWidth - innerPaddingX * 2))
    this.text.setText(this.currentText)

    const boxHeight = Math.max(32, Math.ceil(this.text.height + innerPaddingY * 2))

    this.bg.setPosition(this.boxX, this.boxY)
    this.bg.setSize(boxWidth, boxHeight)
  }

  private handleResize() {
    this.layout()
  }

  private destroy() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
  }
}
