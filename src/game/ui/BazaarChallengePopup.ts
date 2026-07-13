import Phaser from 'phaser'

export type BazaarGameId =
  | 'map-bargain'
  | 'scale-puzzle'
  | 'spice-memory'
  | 'date-trade'
  | 'pottery-fraud'
  | 'donkey-race'
  | 'eagle-delivery'

export type BazaarMinigameResult = {
  success: boolean
  response: string
  goldDelta: number
  reputationDelta: number
  itemKey?: string
}

type BazaarChallengeConfig = {
  gameId: BazaarGameId
  portraitKey?: string
  onComplete: (result: BazaarMinigameResult) => void
}

export default class BazaarChallengePopup {
  public container: Phaser.GameObjects.Container

  private scene: Phaser.Scene
  private isVisible = false
  private currentOnComplete?: (result: BazaarMinigameResult) => void
  private resultLocked = false

  private panelWidth = 620
  private panelHeight = 520

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.container = scene.add.container(0, 0)
    this.container.setDepth(85000)
    this.container.setScrollFactor(0)
    this.container.setVisible(false)
  }

  open() {
    return this.isVisible
  }

  show(config: BazaarChallengeConfig) {
    this.isVisible = true
    this.resultLocked = false
    this.currentOnComplete = config.onComplete

    this.container.removeAll(true)
    this.container.setVisible(true)

    this.createBase()

    switch (config.gameId) {
      case 'map-bargain':
        this.createMapBargainGame()
        break

      case 'scale-puzzle':
        this.createScalePuzzleGame()
        break

      case 'spice-memory':
        this.createSpiceMemoryGame()
        break

      case 'date-trade':
        this.createDateTradeGame()
        break

      case 'pottery-fraud':
        this.createPotteryFraudGame()
        break

      case 'donkey-race':
        this.createDonkeyRaceGame()
        break

      case 'eagle-delivery':
        this.createEagleDeliveryGame()
        break
    }
  }

  hide() {
    this.isVisible = false
    this.resultLocked = false
    this.currentOnComplete = undefined
    this.container.removeAll(true)
    this.container.setVisible(false)
  }

  private createBase() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.panelWidth = Math.min(620, width - 40)
    this.panelHeight = Math.min(520, height - 36)

    const overlay = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.62
    )

    overlay.setScrollFactor(0)

    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      this.panelWidth,
      this.panelHeight,
      0x1b1207,
      0.96
    )

    panel.setStrokeStyle(4, 0xffd966, 1)
    panel.setScrollFactor(0)

    const topBar = this.scene.add.rectangle(
      width / 2,
      this.getPanelTop() + 34,
      this.panelWidth,
      68,
      0x3b2209,
      1
    )

    topBar.setStrokeStyle(2, 0x000000, 0.8)
    topBar.setScrollFactor(0)

    this.container.add([overlay, panel, topBar])
  }

  private getPanelTop() {
    return this.scene.scale.height / 2 - this.panelHeight / 2
  }

  private getPanelBottom() {
    return this.scene.scale.height / 2 + this.panelHeight / 2
  }

  private addTitle(text: string) {
    const title = this.scene.add.text(
      this.scene.scale.width / 2,
      this.getPanelTop() + 35,
      text,
      {
        fontFamily: 'Georgia',
        fontSize: '26px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 5,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: {
          width: this.panelWidth - 40,
        },
      }
    )

    title.setOrigin(0.5)
    title.setScrollFactor(0)

    this.container.add(title)

    return title
  }

  private addBodyText(text: string, yOffset: number) {
    const body = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2 + yOffset,
      text,
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: {
          width: this.panelWidth - 70,
        },
      }
    )

    body.setOrigin(0.5)
    body.setScrollFactor(0)

    this.container.add(body)

    return body
  }

  private getThreeButtonLayout() {
    const centerX = this.scene.scale.width / 2
    const buttonWidth = Math.min(155, (this.panelWidth - 100) / 3)
    const gap = 24
    const spacing = buttonWidth + gap

    return {
      leftX: centerX - spacing,
      centerX,
      rightX: centerX + spacing,
      buttonWidth,
      buttonHeight: 58,
    }
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    color = 0x4b2b0b
  ) {
    const bg = this.scene.add.rectangle(
      x,
      y,
      width,
      height,
      color,
      1
    )

    bg.setStrokeStyle(3, 0xffd966, 1)
    bg.setScrollFactor(0)
    bg.setInteractive({
      useHandCursor: true,
    })

    const text = this.scene.add.text(
      x,
      y,
      label,
      {
        fontFamily: 'Georgia',
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: {
          width: width - 12,
        },
      }
    )

    text.setOrigin(0.5)
    text.setScrollFactor(0)

    bg.on('pointerover', () => {
      bg.setFillStyle(0x6b3d10, 1)

      this.scene.tweens.add({
        targets: [bg, text],
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 90,
      })
    })

    bg.on('pointerout', () => {
      bg.setFillStyle(color, 1)

      this.scene.tweens.add({
        targets: [bg, text],
        scaleX: 1,
        scaleY: 1,
        duration: 90,
      })
    })

    bg.on('pointerdown', () => {
      if (this.resultLocked) return
      onClick()
    })

    this.container.add([bg, text])

    return {
      bg,
      text,
    }
  }

  private complete(result: BazaarMinigameResult) {
    if (this.resultLocked) return

    this.resultLocked = true

    this.scene.time.delayedCall(250, () => {
      this.showResult(result)
    })
  }

  private showResult(result: BazaarMinigameResult) {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.container.removeAll(true)
    this.createBase()

    const status = result.success ? 'CHALLENGE COMPLETE' : 'CHAOTIC RESULT'

    const title = this.scene.add.text(
      width / 2,
      this.getPanelTop() + 115,
      status,
      {
        fontFamily: 'Georgia',
        fontSize: '32px',
        color: result.success ? '#66ff99' : '#ffd966',
        stroke: '#000000',
        strokeThickness: 6,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: {
          width: this.panelWidth - 60,
        },
      }
    )

    title.setOrigin(0.5)
    title.setScrollFactor(0)

    const response = this.scene.add.text(
      width / 2,
      height / 2 - 35,
      result.response,
      {
        fontFamily: 'Georgia',
        fontSize: '21px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: {
          width: this.panelWidth - 80,
        },
      }
    )

    response.setOrigin(0.5)
    response.setScrollFactor(0)

    const rewardText = this.scene.add.text(
      width / 2,
      height / 2 + 95,
      `${result.goldDelta >= 0 ? '+' : ''}${result.goldDelta} gold\n${
        result.reputationDelta >= 0 ? '+' : ''
      }${result.reputationDelta} reputation`,
      {
        fontFamily: 'Georgia',
        fontSize: '27px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center',
        fontStyle: 'bold',
      }
    )

    rewardText.setOrigin(0.5)
    rewardText.setScrollFactor(0)

    this.scene.tweens.add({
      targets: rewardText,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 300,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    })

    this.container.add([title, response, rewardText])

    // Unlock the result screen so the Continue button can be clicked.
    this.resultLocked = false

    this.createButton(
      width / 2,
      this.getPanelBottom() - 50,
      220,
      52,
      'Continue',
      () => {
        this.currentOnComplete?.(result)
        this.hide()
      },
      0x305c20
    )
  }

  private createMapBargainGame() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.addTitle('1. Suspicious Map Bargain')

    this.addBodyText(
      'The Map Seller offers a “royal secret map” for a very tourist-friendly price.',
      -150
    )

    const priceText = this.scene.add.text(
      width / 2,
      height / 2 - 60,
      'Merchant Price: 300 gold',
      {
        fontFamily: 'Georgia',
        fontSize: '29px',
        color: '#ffd966',
        stroke: '#000000',
        strokeThickness: 5,
        fontStyle: 'bold',
      }
    )

    priceText.setOrigin(0.5)
    priceText.setScrollFactor(0)

    const panicText = this.scene.add.text(
      width / 2,
      height / 2 - 15,
      'Merchant Panic: calm',
      {
        fontFamily: 'Georgia',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }
    )

    panicText.setOrigin(0.5)
    panicText.setScrollFactor(0)

    this.container.add([priceText, panicText])

    const buttons = this.getThreeButtonLayout()
    const buttonY = height / 2 + 135

    this.createButton(
      buttons.leftX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Pay 300\ngold',
      () => {
        this.complete({
          success: false,
          goldDelta: -300,
          reputationDelta: -2,
          response:
            'Map Seller: Excellent! I respect a customer who fears negotiation.',
        })
      }
    )

    this.createButton(
      buttons.centerX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Say:\nToo expensive',
      () => {
        priceText.setText('Merchant Price: 80 gold')
        panicText.setText('Merchant Panic: slightly offended')

        this.scene.cameras.main.shake(120, 0.003)

        this.complete({
          success: true,
          goldDelta: -80,
          reputationDelta: 5,
          response:
            'Map Seller: Fine. 80 gold. Beginner bargain, but acceptable.',
        })
      }
    )

    this.createButton(
      buttons.rightX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Walk away\nslowly',
      () => {
        this.resultLocked = true

        const prices = [300, 150, 80, 25]
        const panic = [
          'calm',
          'confused',
          'sweating',
          'financially panicking',
        ]

        prices.forEach((price, index) => {
          this.scene.time.delayedCall(index * 1200, () => {
            priceText.setText(`Merchant Price: ${price} gold`)
            panicText.setText(`Merchant Panic: ${panic[index]}`)
            this.scene.cameras.main.shake(80, 0.002)
          })
        })

        this.scene.time.delayedCall(5000, () => {
          this.showResult({
            success: true,
            goldDelta: -25,
            reputationDelta: 12,
            itemKey: 'suspiciousMap',
            response:
              'Map Seller: Wait! 300 was pyramid price! Fine, 25 and I will pretend to respect you.',
          })
        })
      },
      0x704000
    )
  }

  private createScalePuzzleGame() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.addTitle('2. Broken Scale Puzzle')

    this.addBodyText(
      'The Scale Merchant swears the scale is honest. The scale looks emotionally guilty.',
      -150
    )

    const scaleBase = this.scene.add.rectangle(
      width / 2,
      height / 2 - 30,
      280,
      18,
      0x8b5a20,
      1
    )

    scaleBase.setStrokeStyle(2, 0x000000, 1)

    const leftPlate = this.scene.add.circle(
      width / 2 - 105,
      height / 2 + 8,
      45,
      0x6f4a1c,
      1
    )

    leftPlate.setStrokeStyle(3, 0xffd966, 1)

    const rightPlate = this.scene.add.circle(
      width / 2 + 105,
      height / 2 + 8,
      45,
      0x6f4a1c,
      1
    )

    rightPlate.setStrokeStyle(3, 0xffd966, 1)

    const centerPole = this.scene.add.rectangle(
      width / 2,
      height / 2 + 38,
      18,
      100,
      0x8b5a20,
      1
    )

    centerPole.setStrokeStyle(2, 0x000000, 1)

    this.container.add([scaleBase, leftPlate, rightPlate, centerPole])

    const buttons = this.getThreeButtonLayout()
    const buttonY = height / 2 + 150

    this.createButton(
      buttons.leftX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Shiny copper\nweight',
      () => {
        this.complete({
          success: false,
          goldDelta: -50,
          reputationDelta: -2,
          response:
            'Wrong. The merchant charges you an inspection fee because apparently that is a thing.',
        })
      }
    )

    this.createButton(
      buttons.centerX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Cracked stone\nweight',
      () => {
        const sand = this.scene.add.text(
          width / 2,
          height / 2 + 65,
          'sand spills out...',
          {
            fontFamily: 'Georgia',
            fontSize: '22px',
            color: '#ffd966',
            stroke: '#000000',
            strokeThickness: 4,
          }
        )

        sand.setOrigin(0.5)
        sand.setScrollFactor(0)
        this.container.add(sand)

        this.scene.cameras.main.shake(180, 0.004)

        this.complete({
          success: true,
          goldDelta: 350,
          reputationDelta: 20,
          response:
            'Correct. Sand spills from the cracked weight. The crowd gasps like this is courtroom drama.',
        })
      }
    )

    this.createButton(
      buttons.rightX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Accuse the\nbasket',
      () => {
        this.complete({
          success: true,
          goldDelta: 50,
          reputationDelta: 5,
          response:
            'The basket is innocent, but your confidence scares the merchant into a small refund.',
        })
      }
    )
  }

  private createSpiceMemoryGame() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.addTitle('3. Spice Memory Challenge')

    const instruction = this.addBodyText(
      'Watch the spice order. Then click the jars in the same order.',
      -150
    )

    const spices = [
      {
        name: 'Cumin',
        color: 0xd6a13b,
      },
      {
        name: 'Cinnamon',
        color: 0x9b3f20,
      },
      {
        name: 'Coriander',
        color: 0x6caa43,
      },
    ]

    const sequence = ['Cumin', 'Cinnamon', 'Coriander']
    const clicked: string[] = []
    let ready = false

    const jarSpacing = Math.min(170, this.panelWidth / 3.45)

    const jarObjects = spices.map((spice, index) => {
      const x = width / 2 - jarSpacing + index * jarSpacing
      const jar = this.scene.add.rectangle(
        x,
        height / 2 + 10,
        110,
        130,
        spice.color,
        1
      )

      jar.setStrokeStyle(4, 0xffd966, 1)
      jar.setInteractive({
        useHandCursor: true,
      })

      const label = this.scene.add.text(
        x,
        height / 2 + 10,
        spice.name,
        {
          fontFamily: 'Georgia',
          fontSize: '18px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center',
          wordWrap: {
            width: 95,
          },
        }
      )

      label.setOrigin(0.5)

      jar.on('pointerdown', () => {
        if (!ready || this.resultLocked) return

        clicked.push(spice.name)

        this.scene.tweens.add({
          targets: jar,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 100,
          yoyo: true,
        })

        if (clicked.length === sequence.length) {
          const correct = clicked.every((value, i) => value === sequence[i])

          if (correct) {
            this.complete({
              success: true,
              goldDelta: 220,
              reputationDelta: 10,
              response:
                'Correct. Your nose has earned citizenship.',
            })
          } else {
            this.complete({
              success: false,
              goldDelta: -40,
              reputationDelta: -1,
              response:
                'Wrong. The seller charges you for inventing tourist soup.',
            })
          }
        }
      })

      this.container.add([jar, label])

      return {
        jar,
        label,
        spice,
      }
    })

    jarObjects.forEach((item, index) => {
      this.scene.time.delayedCall(index * 650 + 400, () => {
        this.scene.tweens.add({
          targets: item.jar,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 220,
          yoyo: true,
        })
      })
    })

    this.scene.time.delayedCall(2450, () => {
      ready = true
      instruction.setText('Now click: first spice → second spice → third spice')

      jarObjects.forEach((item) => {
        item.label.setText('?')
      })
    })

    this.createButton(
      width / 2,
      this.getPanelBottom() - 55,
      Math.min(330, this.panelWidth - 120),
      44,
      'Answer emotionally: Sand, regret, and heat',
      () => {
        this.complete({
          success: true,
          goldDelta: 40,
          reputationDelta: 5,
          response:
            'Wrong ingredients. Correct feeling. The merchant gives you pity gold.',
        })
      },
      0x65420f
    )
  }

  private createDateTradeGame() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.addTitle('4. Date Basket Trade')

    this.addBodyText(
      'Drag the date basket to the best buyer. This is business. Try to look serious.',
      -155
    )

    const buttons = this.getThreeButtonLayout()
    const cardWidth = buttons.buttonWidth
    const cardHeight = 126

    const buyers = [
      {
        label: 'Temple Cook',
        subtitle: 'Needs premium dates fast',
        x: buttons.leftX,
        result: {
          success: true,
          goldDelta: 450,
          reputationDelta: 15,
          response:
            'You buy cheap and sell smart. The merchant calls you a dangerous accountant.',
        },
      },
      {
        label: 'Hungry Tourist',
        subtitle: 'Pays okay, eats loudly',
        x: buttons.centerX,
        result: {
          success: true,
          goldDelta: 160,
          reputationDelta: 5,
          response:
            'The tourist pays fairly and asks if dates grow on pyramids.',
        },
      },
      {
        label: 'Same Merchant',
        subtitle: 'Business magic',
        x: buttons.rightX,
        result: {
          success: true,
          goldDelta: 75,
          reputationDelta: 4,
          response:
            'Somehow, the merchant buys his own basket back. Nobody understands what happened.',
        },
      },
    ]

    const buyerCards = buyers.map((buyer) => {
      const bg = this.scene.add.rectangle(
        buyer.x,
        height / 2 + 45,
        cardWidth,
        cardHeight,
        0x35200b,
        1
      )

      bg.setStrokeStyle(3, 0xffd966, 1)
      bg.setInteractive({
        useHandCursor: true,
      })

      const label = this.scene.add.text(
        buyer.x,
        height / 2 + 12,
        buyer.label,
        {
          fontFamily: 'Georgia',
          fontSize: '17px',
          color: '#ffd966',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center',
          wordWrap: {
            width: cardWidth - 16,
          },
        }
      )

      label.setOrigin(0.5)

      const subtitle = this.scene.add.text(
        buyer.x,
        height / 2 + 58,
        buyer.subtitle,
        {
          fontFamily: 'Georgia',
          fontSize: '13px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
          align: 'center',
          wordWrap: {
            width: cardWidth - 18,
          },
        }
      )

      subtitle.setOrigin(0.5)

      bg.on('pointerdown', () => {
        this.complete(buyer.result)
      })

      this.container.add([bg, label, subtitle])

      return {
        bg,
        buyer,
      }
    })

    const basket = this.scene.add.container(width / 2, height / 2 - 80)

    const basketBg = this.scene.add.rectangle(
      0,
      0,
      130,
      56,
      0x8c4f17,
      1
    )

    basketBg.setStrokeStyle(3, 0xffd966, 1)

    const basketText = this.scene.add.text(
      0,
      0,
      'DATE\nBASKET',
      {
        fontFamily: 'Georgia',
        fontSize: '17px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        fontStyle: 'bold',
      }
    )

    basketText.setOrigin(0.5)

    basket.add([basketBg, basketText])
    basket.setSize(130, 56)
    basket.setInteractive(
      new Phaser.Geom.Rectangle(-65, -28, 130, 56),
      Phaser.Geom.Rectangle.Contains
    )

    this.scene.input.setDraggable(basket)

    const startX = basket.x
    const startY = basket.y

    basket.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      basket.setPosition(dragX, dragY)
    })

    basket.on('dragend', () => {
      if (this.resultLocked) return

      const match = buyerCards.find((card) => {
        const bounds = card.bg.getBounds()

        return Phaser.Geom.Rectangle.Contains(
          bounds,
          basket.x,
          basket.y
        )
      })

      if (match) {
        this.complete(match.buyer.result)
        return
      }

      this.scene.tweens.add({
        targets: basket,
        x: startX,
        y: startY,
        duration: 250,
        ease: 'Sine.easeOut',
      })
    })

    this.container.add(basket)
  }

  private createPotteryFraudGame() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.addTitle('5. Antique Pottery Fraud')

    this.addBodyText(
      'Three royal antiques. One still smells like fresh paint and bad decisions.',
      -150
    )

    const spacing = Math.min(160, this.panelWidth / 4)

    const pots = [
      {
        label: 'Dusty cracked pot',
        color: 0x6b4b2a,
        x: width / 2 - spacing,
        result: {
          success: false,
          goldDelta: -60,
          reputationDelta: -2,
          response:
            'That one was actually ancient. You pay a staring fee.',
        },
      },
      {
        label: 'Painted today',
        color: 0xd18b2c,
        x: width / 2,
        result: {
          success: true,
          goldDelta: 300,
          reputationDelta: 15,
          response:
            'Correct. The seller says the label was “for transparency.”',
        },
      },
      {
        label: 'Emotionally fake',
        color: 0x8654a8,
        x: width / 2 + spacing,
        result: {
          success: true,
          goldDelta: 80,
          reputationDelta: 6,
          response:
            'The crowd loves the answer. The seller pays you to stop philosophizing.',
        },
      },
    ]

    pots.forEach((pot) => {
      const potBody = this.scene.add.ellipse(
        pot.x,
        height / 2 + 28,
        90,
        125,
        pot.color,
        1
      )

      potBody.setStrokeStyle(4, 0xffd966, 1)
      potBody.setInteractive({
        useHandCursor: true,
      })

      const neck = this.scene.add.rectangle(
        pot.x,
        height / 2 - 40,
        46,
        30,
        pot.color,
        1
      )

      neck.setStrokeStyle(3, 0xffd966, 1)

      const label = this.scene.add.text(
        pot.x,
        height / 2 + 125,
        pot.label,
        {
          fontFamily: 'Georgia',
          fontSize: '15px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center',
          wordWrap: {
            width: 110,
          },
        }
      )

      label.setOrigin(0.5)

      potBody.on('pointerdown', () => {
        this.complete(pot.result)
      })

      if (pot.label === 'Painted today') {
        this.scene.tweens.add({
          targets: potBody,
          alpha: 0.65,
          duration: 400,
          yoyo: true,
          repeat: -1,
        })
      }

      this.container.add([potBody, neck, label])
    })
  }

  private createDonkeyRaceGame() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.addTitle('6. Donkey Race: Royal Thunder')

    this.addBodyText(
      'Royal Thunder is asleep. Hit “Compliment Knees” when the heart is inside the golden zone.',
      -155
    )

    const meterX = width / 2
    const meterY = height / 2 - 40
    const meterWidth = Math.min(390, this.panelWidth - 150)

    const meter = this.scene.add.rectangle(
      meterX,
      meterY,
      meterWidth,
      24,
      0x2b1908,
      1
    )

    meter.setStrokeStyle(3, 0xffffff, 1)

    const target = this.scene.add.rectangle(
      meterX + 65,
      meterY,
      80,
      34,
      0xffd966,
      0.75
    )

    target.setStrokeStyle(2, 0x000000, 1)

    const heart = this.scene.add.text(
      meterX - meterWidth / 2,
      meterY - 3,
      '❤',
      {
        fontFamily: 'Arial',
        fontSize: '30px',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 4,
      }
    )

    heart.setOrigin(0.5)

    this.scene.tweens.add({
      targets: heart,
      x: meterX + meterWidth / 2,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const donkey = this.scene.add.text(
      width / 2,
      height / 2 + 40,
      'Royal Thunder: Zzzzz...',
      {
        fontFamily: 'Georgia',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center',
        wordWrap: {
          width: this.panelWidth - 90,
        },
      }
    )

    donkey.setOrigin(0.5)

    this.container.add([meter, target, heart, donkey])

    const buttons = this.getThreeButtonLayout()
    const buttonY = height / 2 + 155

    this.createButton(
      buttons.leftX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Compliment\nhis knees',
      () => {
        const targetLeft = target.x - target.width / 2
        const targetRight = target.x + target.width / 2

        const hit = heart.x >= targetLeft && heart.x <= targetRight

        if (hit) {
          donkey.setText('Royal Thunder: emotionally awakened!')

          this.scene.tweens.add({
            targets: donkey,
            x: width / 2 + 80,
            duration: 450,
            yoyo: true,
            repeat: 2,
          })

          this.complete({
            success: true,
            goldDelta: 700,
            reputationDelta: 25,
            response:
              'Royal Thunder wakes immediately. Nobody knows why knee compliments work, but you win.',
          })
        } else {
          this.complete({
            success: false,
            goldDelta: 120,
            reputationDelta: 4,
            response:
              'The compliment missed the emotional moment. Royal Thunder opens one eye and still gets third place.',
          })
        }
      }
    )

    this.createButton(
      buttons.centerX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Business\npartnership',
      () => {
        this.complete({
          success: true,
          goldDelta: 200,
          reputationDelta: 8,
          response:
            'The donkey respects the proposal but requests legal review. You place second.',
        })
      }
    )

    this.createButton(
      buttons.rightX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Shout\nGo faster!',
      () => {
        this.complete({
          success: false,
          goldDelta: -100,
          reputationDelta: -2,
          response:
            'Royal Thunder stares like a disappointed uncle. Entry fee lost.',
        })
      }
    )
  }

  private createEagleDeliveryGame() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.addTitle('7. Eagle Delivery Route')

    this.addBodyText(
      'The eagle needs directions. Choose the route. Please remember: the eagle may be smarter than you.',
      -155
    )

    const routeWidth = Math.min(390, this.panelWidth - 120)
    const routeHeight = 160
    const routeY = height / 2 - 10

    const mapBg = this.scene.add.rectangle(
      width / 2,
      routeY,
      routeWidth,
      routeHeight,
      0x2c220f,
      1
    )

    mapBg.setStrokeStyle(3, 0xffd966, 1)

    const startX = width / 2 - routeWidth / 2 + 70
    const endX = width / 2 + routeWidth / 2 - 70

    const start = this.scene.add.circle(
      startX,
      routeY + 45,
      10,
      0x66ccff,
      1
    )

    const end = this.scene.add.circle(
      endX,
      routeY - 45,
      10,
      0x66ff99,
      1
    )

    const eagle = this.scene.add.text(
      startX,
      routeY + 45,
      '🦅',
      {
        fontFamily: 'Arial',
        fontSize: '28px',
      }
    )

    eagle.setOrigin(0.5)

    this.container.add([mapBg, start, end, eagle])

    const flyCorrect = () => {
      this.resultLocked = true

      this.scene.tweens.add({
        targets: eagle,
        x: width / 2,
        y: routeY - 70,
        duration: 550,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: eagle,
            x: endX,
            y: routeY - 45,
            duration: 550,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              this.showResult({
                success: true,
                goldDelta: 500,
                reputationDelta: 18,
                response:
                  'The eagle delivers perfectly and returns with exact change. Suspiciously professional.',
              })
            },
          })
        },
      })
    }

    const flyDreams = () => {
      this.resultLocked = true

      this.scene.tweens.add({
        targets: eagle,
        angle: 360,
        x: width / 2,
        y: routeY,
        duration: 700,
        repeat: 2,
        onComplete: () => {
          this.showResult({
            success: true,
            goldDelta: 120,
            reputationDelta: 6,
            response:
              'The eagle follows its dreams, inspires the crowd, and delivers late.',
          })
        },
      })
    }

    const buttons = this.getThreeButtonLayout()
    const buttonY = height / 2 + 160

    this.createButton(
      buttons.leftX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Safe route\nclear directions',
      flyCorrect
    )

    this.createButton(
      buttons.centerX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Tell eagle:\nfollow dreams',
      flyDreams
    )

    this.createButton(
      buttons.rightX,
      buttonY,
      buttons.buttonWidth,
      buttons.buttonHeight,
      'Deliver it\nyourself',
      () => {
        this.complete({
          success: false,
          goldDelta: -70,
          reputationDelta: -1,
          response:
            'You get lost between two identical spice stalls. The eagle judges you silently.',
        })
      }
    )
  }
}