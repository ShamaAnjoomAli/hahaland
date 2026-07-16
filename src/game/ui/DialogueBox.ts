import Phaser from 'phaser'

type DialogueChoice = {
  label: string
  value: string
}

type DialogueLine =
  | string
  | {
      text: string
      portraitKey?: string
    }

type ChoiceDialogueConfig = {
  lines: DialogueLine[]
  choices: DialogueChoice[]
  portraitKey?: string
  onChoice: (value: string) => void
}

export default class DialogueBox {
  private scene: Phaser.Scene
  public container: Phaser.GameObjects.Container

  private choiceDimmer: Phaser.GameObjects.Rectangle
  private box: Phaser.GameObjects.Rectangle
  private text: Phaser.GameObjects.Text
  private hint: Phaser.GameObjects.Text

  private portraitPanel: Phaser.GameObjects.Graphics
  private portrait: Phaser.GameObjects.Sprite

  private lines: DialogueLine[] = []
  private defaultPortraitKey?: string

  private index = 0
  private open = false

  private onClose?: () => void
  private portraitTween?: Phaser.Tweens.Tween

  private choiceButtons: Phaser.GameObjects.Container[] = []
  private activeChoices: DialogueChoice[] = []
  private onChoice?: (value: string) => void
  private showingChoices = false

  private choiceListStartIndex = 0
  private choiceWheelHandler?: (...args: any[]) => void
  private choicePanel?: Phaser.GameObjects.Container
  private selectedChoiceIndex = 0

  private dialogueLeft = 0
  private dialogueTop = 0
  private dialogueWidth = 0
  private dialogueHeight = 0

  private portraitBaseX = 0
  private portraitBaseY = 0
  private portraitScale = 1.45
  private portraitTweenScale = 1.52

  private portraitPanelX = 0
  private portraitPanelY = 0
  private portraitPanelWidth = 96
  private portraitPanelHeight = 108

  private textWithPortraitX = 0
  private textWithoutPortraitX = 0
  private textWithPortraitWidth = 0
  private textWithoutPortraitWidth = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.container = scene.add.container(0, 0)
    this.container.setDepth(100000)
    this.container.setScrollFactor(0)
    this.container.setVisible(false)

    this.choiceDimmer = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.5)
    this.choiceDimmer.setOrigin(0)
    this.choiceDimmer.setVisible(false)

    this.box = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.9)
    this.box.setStrokeStyle(3, 0xffffff, 0.92)

    this.portraitPanel = scene.add.graphics()

    this.portrait = scene.add.sprite(0, 0, '')
    this.portrait.setVisible(false)

    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      wordWrap: {
        width: 360,
        useAdvancedWrap: true,
      },
      lineSpacing: 4,
    })

    this.hint = scene.add.text(0, 0, 'SPACE  ▶  Next', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#ffd966',
    })
    this.hint.setOrigin(1, 1)

    this.container.add([
      this.choiceDimmer,
      this.box,
      this.portraitPanel,
      this.portrait,
      this.text,
      this.hint,
    ])

    this.layout()

    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
  }

  show(
    dialogue: DialogueLine | DialogueLine[],
    onClose?: () => void,
    portraitKey?: string,
  ) {
    this.clearChoices()

    this.lines = Array.isArray(dialogue) ? dialogue : [dialogue]
    this.index = 0
    this.open = true
    this.onClose = onClose
    this.defaultPortraitKey = portraitKey
    this.showingChoices = false

    this.container.setVisible(true)
    this.hint.setText('SPACE  ▶  Next')
    this.setCurrentLine()
  }

  showChoice(config: ChoiceDialogueConfig) {
    this.openChoiceDialogue(config)
  }

  showChoiceList(config: ChoiceDialogueConfig) {
    this.openChoiceDialogue(config)
  }

  next() {
    if (!this.open || this.showingChoices) return

    this.index += 1

    if (this.index >= this.lines.length) {
      if (this.activeChoices.length > 0) {
        this.showChoiceButtons()
        return
      }

      this.hide()
      return
    }

    this.setCurrentLine()
  }

  hide() {
    if (!this.open) {
      this.clearChoices()
      return
    }

    this.clearChoices()

    this.open = false
    this.lines = []
    this.index = 0

    this.text.setText('')
    this.hint.setText('')

    this.stopPortraitAnimation()
    this.container.setVisible(false)

    const callback = this.onClose
    this.onClose = undefined

    callback?.()
  }

  isOpen() {
    return this.open
  }

  private openChoiceDialogue(config: ChoiceDialogueConfig) {
    this.clearChoices()

    this.lines = config.lines
    this.index = 0
    this.open = true
    this.onClose = undefined

    this.activeChoices = config.choices
    this.onChoice = config.onChoice
    this.defaultPortraitKey = config.portraitKey
    this.showingChoices = false
    this.choiceListStartIndex = 0
    this.selectedChoiceIndex = 0

    this.container.setVisible(true)
    this.hint.setText('SPACE  ▶  Next')
    this.setCurrentLine()
  }

  private setCurrentLine() {
    const currentLine = this.lines[this.index]

    if (typeof currentLine === 'string') {
      this.text.setText(currentLine)
      this.setPortrait(this.defaultPortraitKey)
    } else {
      this.text.setText(currentLine?.text ?? '')
      this.setPortrait(currentLine?.portraitKey ?? this.defaultPortraitKey)
    }

    this.hint.setText(
      this.index >= this.lines.length - 1 && this.activeChoices.length === 0
        ? 'SPACE  ▶  Close'
        : 'SPACE  ▶  Next',
    )

    this.fitDialogueText()
  }

  private setPortrait(portraitKey?: string) {
    this.stopPortraitAnimation()

    if (!portraitKey || !this.scene.textures.exists(portraitKey)) {
      this.portrait.setVisible(false)
      this.portraitPanel.setVisible(false)

      this.text.setX(this.textWithoutPortraitX)
      this.text.setWordWrapWidth(this.textWithoutPortraitWidth)
      return
    }

    this.portraitPanel.setVisible(true)

    this.text.setX(this.textWithPortraitX)
    this.text.setWordWrapWidth(this.textWithPortraitWidth)

    this.portrait.setTexture(portraitKey)
    this.portrait.setFrame(0)
    this.portrait.setVisible(true)
    this.portrait.setPosition(this.portraitBaseX, this.portraitBaseY)
    this.portrait.setScale(this.portraitScale)
    this.portrait.setAlpha(1)
    this.portrait.setAngle(0)

    this.portraitTween = this.scene.tweens.add({
      targets: this.portrait,
      y: this.portraitBaseY - 3,
      scaleX: this.portraitTweenScale,
      scaleY: this.portraitTweenScale,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private fitDialogueText() {
    const maxTextHeight = Math.max(58, this.dialogueHeight - 54)

    this.text.setFontSize(20)

    if (this.text.height > maxTextHeight) {
      this.text.setFontSize(18)
    }

    if (this.text.height > maxTextHeight) {
      this.text.setFontSize(16)
    }
  }

  private stopPortraitAnimation() {
    if (this.portraitTween) {
      this.portraitTween.stop()
      this.portraitTween.remove()
      this.portraitTween = undefined
    }

    this.portrait.setPosition(this.portraitBaseX, this.portraitBaseY)
    this.portrait.setScale(this.portraitScale)
  }

  private showChoiceButtons() {
    this.showingChoices = true
    this.selectedChoiceIndex = 0
    this.choiceListStartIndex = 0

    this.hint.setText('')
    this.choiceDimmer.setVisible(true)

    this.choiceWheelHandler = (
      _pointer: unknown,
      _objects: unknown,
      _dx: number,
      dy: number,
    ) => {
      if (!this.showingChoices) return

      if (dy > 0) {
        this.scrollChoiceList(1)
      } else if (dy < 0) {
        this.scrollChoiceList(-1)
      }
    }

    this.scene.input.on('wheel', this.choiceWheelHandler)
    this.renderChoiceList()
  }

  private scrollChoiceList(direction: number) {
    const maxVisible = this.getMaxVisibleChoices()
    const maxStart = Math.max(0, this.activeChoices.length - maxVisible)

    this.choiceListStartIndex = Phaser.Math.Clamp(
      this.choiceListStartIndex + direction,
      0,
      maxStart,
    )

    this.selectedChoiceIndex = Phaser.Math.Clamp(
      this.choiceListStartIndex,
      0,
      Math.max(0, this.activeChoices.length - 1),
    )

    this.renderChoiceList()
  }

  private getMaxVisibleChoices() {
    const availableHeight = Math.max(150, this.dialogueTop - 66)

    if (availableHeight < 220) return 2
    if (availableHeight < 285) return 3
    return 4
  }

  private renderChoiceList() {
    this.choiceButtons.forEach((button) => button.destroy())
    this.choiceButtons = []

    this.choicePanel?.destroy()
    this.choicePanel = undefined

    const width = this.scene.scale.width
    const maxVisible = this.getMaxVisibleChoices()

    const panelWidth = Phaser.Math.Clamp(width - 28, 290, 620)
    const optionWidth = panelWidth - 28
    const optionGap = 7

    const visibleChoices = this.activeChoices.slice(
      this.choiceListStartIndex,
      this.choiceListStartIndex + maxVisible,
    )

    const rows = visibleChoices.map((choice) => {
      const label = this.scene.add.text(0, 0, `• ${choice.label}`, {
        fontFamily: 'Georgia',
        fontSize: width < 560 ? '16px' : '18px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
        wordWrap: {
          width: optionWidth - 42,
          useAdvancedWrap: true,
        },
      })

      const rowHeight = Math.max(42, Math.ceil(label.height + 16))
      return { choice, label, rowHeight }
    })

    const titleAreaHeight = 50
    const bottomPadding = 14
    const rowsHeight = rows.reduce(
      (total, row) => total + row.rowHeight,
      Math.max(0, rows.length - 1) * optionGap,
    )
    const panelHeight = titleAreaHeight + rowsHeight + bottomPadding

    const panelBottom = this.dialogueTop - 12
    const panelX = width / 2
    const panelY = Math.max(12 + panelHeight / 2, panelBottom - panelHeight / 2)

    this.choicePanel = this.scene.add.container(panelX, panelY)
    this.container.add(this.choicePanel)

    const shadow = this.scene.add.graphics()
    shadow.fillStyle(0x000000, 0.45)
    shadow.fillRoundedRect(
      -panelWidth / 2 + 7,
      -panelHeight / 2 + 9,
      panelWidth,
      panelHeight,
      18,
    )

    const bg = this.scene.add.graphics()
    bg.fillStyle(0x050505, 0.96)
    bg.fillRoundedRect(
      -panelWidth / 2,
      -panelHeight / 2,
      panelWidth,
      panelHeight,
      18,
    )
    bg.lineStyle(2, 0xd9b24c, 0.8)
    bg.strokeRoundedRect(
      -panelWidth / 2,
      -panelHeight / 2,
      panelWidth,
      panelHeight,
      18,
    )

    const title = this.scene.add.text(0, -panelHeight / 2 + 23, 'Choose', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#d9b24c',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)

    this.choicePanel.add([shadow, bg, title])

    let currentY = -panelHeight / 2 + titleAreaHeight

    rows.forEach((row, index) => {
      const realIndex = this.choiceListStartIndex + index
      const isSelected = realIndex === this.selectedChoiceIndex
      const y = currentY + row.rowHeight / 2

      const option = this.scene.add.container(0, y)
      const optionBg = this.scene.add.graphics()

      optionBg.fillStyle(isSelected ? 0x6b4a00 : 0x000000, isSelected ? 0.9 : 0.35)
      optionBg.fillRoundedRect(
        -optionWidth / 2,
        -row.rowHeight / 2,
        optionWidth,
        row.rowHeight,
        12,
      )

      row.label.setText(`${isSelected ? '›' : '•'} ${row.choice.label}`)
      row.label.setColor(isSelected ? '#ffffff' : '#ffd966')
      row.label.setFontSize(isSelected ? (width < 560 ? 17 : 19) : width < 560 ? 16 : 18)
      row.label.setPosition(-optionWidth / 2 + 18, 0)
      row.label.setOrigin(0, 0.5)

      option.add([optionBg, row.label])
      option.setSize(optionWidth, row.rowHeight)
      option.setInteractive(
        new Phaser.Geom.Rectangle(
          -optionWidth / 2,
          -row.rowHeight / 2,
          optionWidth,
          row.rowHeight,
        ),
        Phaser.Geom.Rectangle.Contains,
      )

      option.on('pointerover', () => {
        if (this.selectedChoiceIndex === realIndex) return
        this.selectedChoiceIndex = realIndex
        this.renderChoiceList()
      })

      option.on('pointerdown', () => {
        this.choose(row.choice.value)
      })

      this.choicePanel?.add(option)
      this.choiceButtons.push(option)
      currentY += row.rowHeight + optionGap
    })

    const maxStart = Math.max(0, this.activeChoices.length - maxVisible)

    if (this.choiceListStartIndex > 0) {
      this.createScrollText(panelWidth / 2 - 30, -panelHeight / 2 + 24, '▲', -1)
    }

    if (this.choiceListStartIndex < maxStart) {
      this.createScrollText(panelWidth / 2 - 30, panelHeight / 2 - 22, '▼', 1)
    }
  }

  private createScrollText(
    x: number,
    y: number,
    labelText: string,
    direction: number,
  ) {
    const button = this.scene.add.container(x, y)

    const label = this.scene.add.text(0, 0, labelText, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd966',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    })
    label.setOrigin(0.5)

    button.add(label)
    button.setSize(32, 26)
    button.setInteractive(
      new Phaser.Geom.Rectangle(-16, -13, 32, 26),
      Phaser.Geom.Rectangle.Contains,
    )

    button.on('pointerover', () => {
      label.setColor('#ffffff')
      button.setScale(1.12)
    })

    button.on('pointerout', () => {
      label.setColor('#ffd966')
      button.setScale(1)
    })

    button.on('pointerdown', () => {
      this.scrollChoiceList(direction)
    })

    this.choicePanel?.add(button)
    this.choiceButtons.push(button)
  }

  private choose(value: string) {
    const callback = this.onChoice

    this.clearChoices()
    this.hide()
    callback?.(value)
  }

  private clearChoices() {
    this.choiceButtons.forEach((button) => button.destroy())
    this.choiceButtons = []

    this.choicePanel?.destroy()
    this.choicePanel = undefined

    if (this.choiceWheelHandler) {
      this.scene.input.off('wheel', this.choiceWheelHandler)
      this.choiceWheelHandler = undefined
    }

    this.choiceDimmer.setVisible(false)
    this.activeChoices = []
    this.onChoice = undefined
    this.showingChoices = false
    this.choiceListStartIndex = 0
    this.selectedChoiceIndex = 0
  }

  private layout() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    const horizontalMargin = Phaser.Math.Clamp(Math.round(width * 0.025), 12, 28)
    const bottomMargin = Phaser.Math.Clamp(Math.round(height * 0.025), 12, 24)

    this.dialogueWidth = Math.max(300, width - horizontalMargin * 2)
    this.dialogueHeight = Phaser.Math.Clamp(Math.round(height * 0.24), 150, 190)
    this.dialogueLeft = horizontalMargin
    this.dialogueTop = height - bottomMargin - this.dialogueHeight

    this.choiceDimmer.setPosition(0, 0)
    this.choiceDimmer.setSize(width, height)

    this.box.setPosition(width / 2, this.dialogueTop + this.dialogueHeight / 2)
    this.box.setSize(this.dialogueWidth, this.dialogueHeight)

    this.portraitPanelWidth = Phaser.Math.Clamp(
      Math.round(this.dialogueHeight * 0.62),
      88,
      106,
    )
    this.portraitPanelHeight = this.dialogueHeight - 28
    this.portraitPanelX = this.dialogueLeft + 16
    this.portraitPanelY = this.dialogueTop + 14

    this.drawPortraitPanel(
      this.portraitPanelX,
      this.portraitPanelY,
      this.portraitPanelWidth,
      this.portraitPanelHeight,
    )

    this.portraitBaseX = this.portraitPanelX + this.portraitPanelWidth / 2
    this.portraitBaseY = this.portraitPanelY + this.portraitPanelHeight / 2 + 5

    this.portraitScale = this.dialogueHeight < 165 ? 1.28 : 1.45
    this.portraitTweenScale = this.portraitScale + 0.07
    this.portrait.setPosition(this.portraitBaseX, this.portraitBaseY)

    this.textWithoutPortraitX = this.dialogueLeft + 20
    this.textWithoutPortraitWidth = this.dialogueWidth - 40

    this.textWithPortraitX =
      this.portraitPanelX + this.portraitPanelWidth + 24
    this.textWithPortraitWidth =
      this.dialogueLeft + this.dialogueWidth - this.textWithPortraitX - 22

    this.text.setY(this.dialogueTop + 18)

    if (this.portrait.visible) {
      this.text.setX(this.textWithPortraitX)
      this.text.setWordWrapWidth(this.textWithPortraitWidth)
    } else {
      this.text.setX(this.textWithoutPortraitX)
      this.text.setWordWrapWidth(this.textWithoutPortraitWidth)
    }

    this.hint.setPosition(
      this.dialogueLeft + this.dialogueWidth - 18,
      this.dialogueTop + this.dialogueHeight - 12,
    )

    this.fitDialogueText()

    if (this.showingChoices) {
      this.renderChoiceList()
    }
  }

  private handleResize() {
    this.layout()
  }

  private drawPortraitPanel(x: number, y: number, width: number, height: number) {
    this.portraitPanel.clear()

    this.portraitPanel.fillStyle(0x000000, 0.45)
    this.portraitPanel.fillRoundedRect(x + 4, y + 5, width, height, 8)

    this.portraitPanel.fillStyle(0x201915, 1)
    this.portraitPanel.fillRoundedRect(x, y, width, height, 8)

    this.portraitPanel.fillStyle(0x111111, 0.95)
    this.portraitPanel.fillRoundedRect(x + 8, y + 8, width - 16, height - 16, 6)

    this.portraitPanel.lineStyle(3, 0x9b7a3f, 1)
    this.portraitPanel.strokeRoundedRect(x, y, width, height, 8)

    this.portraitPanel.lineStyle(1, 0xe6c878, 0.45)
    this.portraitPanel.strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, 6)

    this.portraitPanel.lineStyle(3, 0xd6a84f, 0.85)

    const corner = 14

    this.portraitPanel.beginPath()
    this.portraitPanel.moveTo(x + 10, y + corner)
    this.portraitPanel.lineTo(x + 10, y + 10)
    this.portraitPanel.lineTo(x + corner, y + 10)
    this.portraitPanel.strokePath()

    this.portraitPanel.beginPath()
    this.portraitPanel.moveTo(x + width - corner, y + 10)
    this.portraitPanel.lineTo(x + width - 10, y + 10)
    this.portraitPanel.lineTo(x + width - 10, y + corner)
    this.portraitPanel.strokePath()

    this.portraitPanel.beginPath()
    this.portraitPanel.moveTo(x + 10, y + height - corner)
    this.portraitPanel.lineTo(x + 10, y + height - 10)
    this.portraitPanel.lineTo(x + corner, y + height - 10)
    this.portraitPanel.strokePath()

    this.portraitPanel.beginPath()
    this.portraitPanel.moveTo(x + width - corner, y + height - 10)
    this.portraitPanel.lineTo(x + width - 10, y + height - 10)
    this.portraitPanel.lineTo(x + width - 10, y + height - corner)
    this.portraitPanel.strokePath()
  }

  private destroy() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)

    if (this.choiceWheelHandler) {
      this.scene.input.off('wheel', this.choiceWheelHandler)
      this.choiceWheelHandler = undefined
    }

    this.stopPortraitAnimation()
  }
}
