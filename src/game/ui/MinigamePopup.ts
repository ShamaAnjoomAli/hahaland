import Phaser from 'phaser'

export type MinigameChoice = {
  label: string
  value: string
  response: string
  success?: boolean
  goldDelta?: number
  reputationDelta?: number
  setFlags?: string[]
  setItems?: string[]
}

export type MinigameConfig = {
  title: string
  description: string[]
  choices: MinigameChoice[]
  onComplete: (choice: MinigameChoice) => void
}

export default class MinigamePopup {
  private scene: Phaser.Scene
  public container: Phaser.GameObjects.Container
  private title!: Phaser.GameObjects.Text
  private body!: Phaser.GameObjects.Text
  private buttons: Phaser.GameObjects.Container[] = []
  private config?: MinigameConfig
  private isVisible = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.container = scene.add.container(0, 0)
    this.container.setDepth(80000)
    this.container.setScrollFactor(0)
    this.container.setVisible(false)

    this.createBase()
  }

  private createBase() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    const dark = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.62)

    const panel = this.scene.add.rectangle(width / 2, height / 2, 640, 420, 0x17100a, 0.95)

    panel.setStrokeStyle(3, 0xd9b24c, 1)

    this.title = this.scene.add.text(width / 2, height / 2 - 170, '', {
      fontFamily: 'Georgia',
      fontSize: '30px',
      color: '#ffd966',
      stroke: '#000000',
      strokeThickness: 5,
      fontStyle: 'bold',
      align: 'center',
    })

    this.title.setOrigin(0.5)

    this.body = this.scene.add.text(width / 2, height / 2 - 105, '', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      wordWrap: {
        width: 560,
      },
    })

    this.body.setOrigin(0.5, 0)

    this.container.add([dark, panel, this.title, this.body])
  }

  show(config: MinigameConfig) {
    this.clearButtons()

    this.config = config
    this.isVisible = true

    this.title.setText(config.title)
    this.body.setText(config.description.join('\n'))

    this.createChoiceButtons(config.choices)

    this.container.setVisible(true)
  }

  hide() {
    this.clearButtons()
    this.container.setVisible(false)
    this.isVisible = false
    this.config = undefined
  }

  open() {
    return this.isVisible
  }

  private createChoiceButtons(choices: MinigameChoice[]) {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    const startY = height / 2 + 45
    const gap = 58

    choices.forEach((choice, index) => {
      const y = startY + index * gap

      const button = this.scene.add.container(width / 2, y)

      const bg = this.scene.add.rectangle(0, 0, 500, 42, 0x2b1c0d, 0.96)

      bg.setStrokeStyle(2, 0xd9b24c, 0.9)

      const text = this.scene.add.text(0, 0, choice.label, {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
      })

      text.setOrigin(0.5)

      button.add([bg, text])
      button.setSize(500, 42)

      button.setInteractive(
        new Phaser.Geom.Rectangle(-250, -21, 500, 42),
        Phaser.Geom.Rectangle.Contains,
      )

      button.on('pointerover', () => {
        bg.setFillStyle(0x5a3a12, 1)
        text.setColor('#ffffff')
        button.setScale(1.03)
      })

      button.on('pointerout', () => {
        bg.setFillStyle(0x2b1c0d, 0.96)
        text.setColor('#ffd966')
        button.setScale(1)
      })

      button.on('pointerdown', () => {
        this.choose(choice)
      })

      this.buttons.push(button)
      this.container.add(button)
    })
  }

  private choose(choice: MinigameChoice) {
    if (!this.config) return

    const callback = this.config.onComplete

    this.showResult(choice, () => {
      this.hide()
      callback(choice)
    })
  }

  private showResult(choice: MinigameChoice, onDone: () => void) {
    this.clearButtons()

    this.body.setText(choice.response)

    const width = this.scene.scale.width
    const height = this.scene.scale.height

    const continueButton = this.scene.add.container(width / 2, height / 2 + 120)

    const bg = this.scene.add.rectangle(0, 0, 260, 44, 0x6b4a00, 0.96)

    bg.setStrokeStyle(2, 0xffd966, 1)

    const text = this.scene.add.text(0, 0, 'Continue', {
      fontFamily: 'Georgia',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    })

    text.setOrigin(0.5)

    continueButton.add([bg, text])
    continueButton.setSize(260, 44)

    continueButton.setInteractive(
      new Phaser.Geom.Rectangle(-130, -22, 260, 44),
      Phaser.Geom.Rectangle.Contains,
    )

    continueButton.on('pointerdown', () => {
      onDone()
    })

    this.buttons.push(continueButton)
    this.container.add(continueButton)
  }

  private clearButtons() {
    this.buttons.forEach((button) => {
      button.destroy()
    })

    this.buttons = []
  }
}
