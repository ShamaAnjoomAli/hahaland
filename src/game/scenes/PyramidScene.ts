import Phaser from 'phaser'
import ObjectiveBox from '../ui/ObjectiveBox'
import GameHUD from '../ui/GameHUD'
import { startOrResumeSharedCountdown } from '../utils/utility'

type PyramidSceneData = {
  coins?: number
  reputation?: number
  remainingSeconds?: number
}

/**
 * Temporary Pyramid destination used while the Pyramid Quest is being designed.
 * It uses generated Phaser shapes, so no new image or Tiled-map preload is needed.
 */
export default class PyramidScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private keys!: any
  private interactKey!: Phaser.Input.Keyboard.Key
  private objectiveBox!: ObjectiveBox
  private hud!: GameHUD
  private returnPrompt!: Phaser.GameObjects.Container
  private returnPoint = new Phaser.Math.Vector2(700, 790)
  private coins = 1000
  private reputation = 0
  private remainingSeconds = 3600
  private stopGameTimer?: () => void
  private transitioning = false

  constructor() {
    super('PyramidScene')
  }

  init(data?: PyramidSceneData) {
    if (typeof data?.coins === 'number') this.coins = data.coins
    if (typeof data?.reputation === 'number') this.reputation = data.reputation
    if (typeof data?.remainingSeconds === 'number') {
      this.remainingSeconds = data.remainingSeconds
    }
  }

  create() {
    const worldWidth = 1400
    const worldHeight = 900

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight)
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)

    this.createTemporaryMap(worldWidth, worldHeight)

    this.player = this.physics.add.sprite(700, 720, 'player')
    this.player.setData('animKey', 'player')
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(this.player.y)

    this.objectiveBox = new ObjectiveBox(this)
    this.objectiveBox.setText(
      'Objective: Explore the temporary Pyramid area.',
    )

    this.hud = new GameHUD(this, this.scale.width - 162, 12, 150)
    this.hud.setCoins(this.coins)
    this.hud.setReputation(this.reputation)
    this.hud.setTime(this.remainingSeconds)

    this.createReturnPrompt()

    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })
    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    )

    const timerController = startOrResumeSharedCountdown(
      this,
      (remainingSeconds) => {
        this.remainingSeconds = remainingSeconds
        this.hud.setTime(remainingSeconds)
      },
      { totalSeconds: this.remainingSeconds },
    )
    this.stopGameTimer = timerController.stop

    this.cameras.main.startFollow(this.player, true, 0.15, 0.15)
    this.cameras.main.setZoom(0.72)
    this.cameras.main.fadeIn(650, 0, 0, 0)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopGameTimer?.()
    })
  }

  update() {
    if (!this.player) return

    this.player.setDepth(this.player.y)

    const distanceToReturn = Phaser.Math.Distance.BetweenPoints(
      this.player,
      this.returnPoint,
    )
    const nearReturn = distanceToReturn <= 92

    this.returnPrompt.setVisible(nearReturn && !this.transitioning)

    if (
      nearReturn &&
      !this.transitioning &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      this.returnToVillage()
      return
    }

    if (this.transitioning) {
      this.player.setVelocity(0)
      this.player.stop()
      return
    }

    const speed = 115
    this.player.setVelocity(0)

    if (this.keys.left.isDown) {
      this.player.setVelocityX(-speed)
      this.player.play('player-walk-left', true)
    } else if (this.keys.right.isDown) {
      this.player.setVelocityX(speed)
      this.player.play('player-walk-right', true)
    } else if (this.keys.up.isDown) {
      this.player.setVelocityY(-speed)
      this.player.play('player-walk-up', true)
    } else if (this.keys.down.isDown) {
      this.player.setVelocityY(speed)
      this.player.play('player-walk-down', true)
    } else {
      this.player.stop()
    }
  }

  private createTemporaryMap(width: number, height: number) {
    const graphics = this.add.graphics()
    graphics.fillStyle(0xc99a55, 1)
    graphics.fillRect(0, 0, width, height)

    graphics.fillStyle(0xd8b46f, 0.9)
    for (let y = 0; y < height; y += 90) {
      graphics.fillRect(0, y, width, 45)
    }

    graphics.fillStyle(0x72502d, 1)
    graphics.fillTriangle(370, 520, 700, 95, 1030, 520)
    graphics.fillStyle(0xa7753c, 1)
    graphics.fillTriangle(700, 95, 1030, 520, 700, 520)

    graphics.fillStyle(0x1b130c, 1)
    graphics.fillRect(645, 405, 110, 115)

    graphics.fillStyle(0xe6c781, 0.9)
    graphics.fillRect(625, 520, 150, 300)

    const title = this.add.text(700, 250, 'TEMPORARY PYRAMID MAP', {
      fontFamily: 'Georgia',
      fontSize: '30px',
      color: '#ffe7a3',
      stroke: '#241408',
      strokeThickness: 6,
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)

    const note = this.add.text(
      700,
      292,
      'Pyramid trials will be added here next.',
      {
        fontFamily: 'Georgia',
        fontSize: '17px',
        color: '#f8ead0',
        stroke: '#241408',
        strokeThickness: 4,
      },
    )
    note.setOrigin(0.5)
  }

  private createReturnPrompt() {
    const glow = this.add.ellipse(
      this.returnPoint.x,
      this.returnPoint.y,
      105,
      48,
      0x2bbfae,
      0.22,
    )
    glow.setStrokeStyle(3, 0xffd166, 0.95)

    const arrow = this.add.text(
      this.returnPoint.x,
      this.returnPoint.y - 5,
      '▼',
      {
        fontFamily: 'Georgia',
        fontSize: '24px',
        color: '#ffe7a3',
        stroke: '#241408',
        strokeThickness: 4,
        fontStyle: 'bold',
      },
    )
    arrow.setOrigin(0.5)

    const bg = this.add.rectangle(0, 0, 180, 34, 0x241408, 0.94)
    bg.setStrokeStyle(2, 0xd5a84b, 1)

    const text = this.add.text(0, 0, 'E Return Outside', {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#ffe7a3',
      fontStyle: 'bold',
    })
    text.setOrigin(0.5)

    const label = this.add.container(
      this.returnPoint.x,
      this.returnPoint.y + 52,
      [bg, text],
    )

    this.returnPrompt = this.add.container(0, 0, [glow, arrow, label])
    this.returnPrompt.setDepth(9000)
    this.returnPrompt.setVisible(false)

    this.tweens.add({
      targets: arrow,
      y: arrow.y + 7,
      duration: 680,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private returnToVillage() {
    this.transitioning = true
    this.player.setVelocity(0)
    this.player.stop()
    this.returnPrompt.setVisible(false)

    this.cameras.main.fadeOut(500, 0, 0, 0)

    this.time.delayedCall(540, () => {
      this.scene.start('VillageScene', {
        fromTempleComplete: true,
        spawnName: 'PyramidEntrance',
        coins: this.coins,
        reputation: this.reputation,
        remainingSeconds: this.remainingSeconds,
      })
    })
  }
}