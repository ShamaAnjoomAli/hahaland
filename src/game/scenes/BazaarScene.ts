import Phaser from 'phaser'
import NPC from '../entities/NPC'
import DialogueBox from '../ui/DialogueBox'
import ObjectiveBox from '../ui/ObjectiveBox'
import GameHUD from '../ui/GameHUD'
import MinigamePopup, { type MinigameChoice } from '../ui/MinigamePopup'

export default class BazaarScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private keys!: any
  private interactKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key

  private dialogue!: DialogueBox
  private objectiveBox!: ObjectiveBox
  private hud!: GameHUD
  private minigame!: MinigamePopup

  private npcs: NPC[] = []
  private interactPrompt!: Phaser.GameObjects.Container

  private coins = 1000
  private reputation = 0

  private completedMarkets = new Set<string>()

  constructor() {
    super('BazaarScene')
  }

  init(data?: {
    coins?: number
    reputation?: number
  }) {
    if (typeof data?.coins === 'number') {
      this.coins = data.coins
    }

    if (typeof data?.reputation === 'number') {
      this.reputation = data.reputation
    }
  }

  create() {
    const map = this.make.tilemap({
      key: 'egypt_bazaar',
    })

    const background = this.add.image(
      0,
      0,
      'bazaar-background'
    )

    background.setOrigin(0, 0)
    background.setDepth(0)

    const mapWidth =
      map.widthInPixels || background.width

    const mapHeight =
      map.heightInPixels || background.height

    this.physics.world.setBounds(
      0,
      0,
      mapWidth,
      mapHeight
    )

    this.cameras.main.setBounds(
      0,
      0,
      mapWidth,
      mapHeight
    )

    this.dialogue = new DialogueBox(this)
    this.objectiveBox = new ObjectiveBox(this)
    this.minigame = new MinigamePopup(this)

    this.objectiveBox.setText(
      'Objective: Explore the bazaar markets.'
    )

    this.createPlayer(map)
    this.createNPCsFromMap(map)
    this.createCollisionObjects(map)
    this.createInteractPrompt()

    this.cameras.main.startFollow(
      this.player,
      true,
      0.15,
      0.15
    )

    this.cameras.main.setZoom(0.8)

    this.hud = new GameHUD(
      this,
      this.scale.width - 176,
      126,
      160
    )

    this.hud.setCoins(this.coins)
    this.hud.setTime(0)

    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })

    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E
    )

    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    )

    this.dialogue.show(
      [
        {
          text: 'The bazaar is louder than the fake hotel.',
          portraitKey: 'player',
        },
        {
          text: 'At least here, the scams have signs.',
          portraitKey: 'player',
        },
      ],
      undefined,
      'player'
    )
  }

  update() {
    if (this.minigame.open()) {
      this.player.setVelocity(0)
      this.player.stop()
      return
    }

    if (this.dialogue.isOpen()) {
      this.player.setVelocity(0)

      if (
        Phaser.Input.Keyboard.JustDown(
          this.spaceKey
        )
      ) {
        this.dialogue.next()
      }

      return
    }

    this.updateInteractPrompt()

    if (this.handleBazaarExit()) {
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

    this.player.setDepth(this.player.y)

    this.npcs.forEach((npc) => {
      npc.setDepth(npc.y)
    })

    if (
      Phaser.Input.Keyboard.JustDown(
        this.interactKey
      )
    ) {
      this.interact()
    }
  }

  private createPlayer(
    map: Phaser.Tilemaps.Tilemap
  ) {
    const spawn = this.getSpawnPoint(
      map,
      'BazaarPlayerSpawn'
    )

    this.player = this.physics.add.sprite(
      spawn.x,
      spawn.y,
      'player'
    )

    this.player.setData('animKey', 'player')
    this.player.setScale(1)
    this.player.setDepth(this.player.y)
    this.player.setCollideWorldBounds(true)
  }

  private createNPCsFromMap(
    map: Phaser.Tilemaps.Tilemap
  ) {
    const spawnLayer = map.getObjectLayer('Spawns')

    if (!spawnLayer) {
      console.warn('No Spawns layer found.')
      return
    }

    const npcObjects = spawnLayer.objects.filter(
      (obj) => {
        const name = obj.name ?? ''
        const type = obj.type ?? ''
        const objectClass = (obj as any).class ?? ''

        return (
          type === 'npc' ||
          objectClass === 'npc' ||
          name.startsWith('NPC_')
        )
      }
    )

    npcObjects.forEach((obj) => {
      const npcName = obj.name ?? 'NPC'
      const spriteKey = this.getNPCSpriteKey(npcName)

      const npc = new NPC(
        this,
        obj.x ?? 100,
        obj.y ?? 100,
        spriteKey,
        ['Welcome to the bazaar.']
      )

      npc.setData('npcName', npcName)
      npc.setData('animKey', spriteKey)
      npc.setFrame(0)
      npc.setScale(1)
      npc.setDepth(npc.y)

      this.npcs.push(npc)

      this.physics.add.collider(
        this.player,
        npc
      )
    })
  }

  private createCollisionObjects(
    map: Phaser.Tilemaps.Tilemap
  ) {
    const collisionLayer = map.getObjectLayer(
      'CollisionObjects'
    )

    if (!collisionLayer) {
      console.warn('No CollisionObjects layer found.')
      return
    }

    collisionLayer.objects.forEach((obj) => {
      const wall = this.add.rectangle(
        obj.x! + obj.width! / 2,
        obj.y! + obj.height! / 2,
        obj.width!,
        obj.height!,
        0xff0000,
        0
      )

      this.physics.add.existing(wall, true)

      this.physics.add.collider(
        this.player,
        wall as Phaser.GameObjects.Rectangle
      )
    })
  }

  private createInteractPrompt() {
    const bg = this.add.rectangle(
      0,
      0,
      90,
      28,
      0x000000,
      0.75
    )

    bg.setStrokeStyle(2, 0xffffff)

    const text = this.add.text(
      0,
      0,
      'E Talk',
      {
        fontSize: '14px',
        color: '#ffffff',
      }
    )

    text.setOrigin(0.5)

    this.interactPrompt = this.add.container(
      0,
      0,
      [bg, text]
    )

    this.interactPrompt.setDepth(20000)
    this.interactPrompt.setVisible(false)
  }

  private updateInteractPrompt() {
    const nearest = this.getNearestNPC(95)

    if (!nearest) {
      this.interactPrompt.setVisible(false)
      return
    }

    this.interactPrompt.setVisible(true)
    this.interactPrompt.setPosition(
      nearest.x,
      nearest.y - 45
    )
  }

  private getNearestNPC(maxDistance: number) {
    let nearest: NPC | null = null
    let nearestDistance = maxDistance

    this.npcs.forEach((npc) => {
      const distance =
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          npc.x,
          npc.y
        )

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = npc
      }
    })

    return nearest
  }

  private interact() {
    const nearest = this.getNearestNPC(95)

    if (!nearest) return

    const npcName = nearest.getData(
      'npcName'
    ) as string

    const config = this.getMarketConfig(npcName)

    if (!config) {
      this.dialogue.show(
        [
          {
            text: 'This shop is busy right now.',
            portraitKey: nearest.texture.key,
          },
          {
            text: 'Come back when the owner stops arguing with a basket.',
            portraitKey: nearest.texture.key,
          },
        ],
        undefined,
        nearest.texture.key
      )

      return
    }

    if (this.completedMarkets.has(npcName)) {
      this.dialogue.show(
        [
          {
            text: 'We already finished business here.',
            portraitKey: nearest.texture.key,
          },
          {
            text: 'The merchant is still emotionally recovering.',
            portraitKey: nearest.texture.key,
          },
        ],
        undefined,
        nearest.texture.key
      )

      return
    }

    this.startMarketMinigame(
      npcName,
      nearest.texture.key,
      config
    )
  }

  private startMarketMinigame(
    npcName: string,
    portraitKey: string,
    config: {
      title: string
      description: string[]
      choices: MinigameChoice[]
    }
  ) {
    this.dialogue.show(
      [
        {
          text: config.description[0],
          portraitKey,
        },
        {
          text: config.description[1],
          portraitKey,
        },
      ],
      () => {
        this.minigame.show({
          title: config.title,
          description: config.description,
          choices: config.choices,
          onComplete: (choice) => {
            this.applyMinigameReward(choice)
            this.completedMarkets.add(npcName)

            this.objectiveBox.setText(
              `Objective: Bazaar markets completed ${this.completedMarkets.size}/7`
            )

            if (this.completedMarkets.size >= 7) {
              this.dialogue.show(
                [
                  {
                    text: 'You survived the bazaar.',
                    portraitKey: 'player',
                  },
                  {
                    text: 'Your wallet is lighter, but your bargaining soul is stronger.',
                    portraitKey: 'player',
                  },
                  {
                    text: 'Find the Bazaar Exit gate.',
                    portraitKey: 'player',
                  },
                ],
                () => {
                  this.objectiveBox.setText(
                    'Objective: Exit the bazaar through the North Gate.'
                  )
                },
                'player'
              )
            }
          },
        })
      },
      portraitKey
    )
  }

  private applyMinigameReward(
    choice: MinigameChoice
  ) {
    if (choice.goldDelta) {
      this.changeCoins(choice.goldDelta)
    }

    if (choice.reputationDelta) {
      this.changeReputation(choice.reputationDelta)
    }
  }

  private changeCoins(amount: number) {
    this.coins = Math.max(0, this.coins + amount)
    this.hud.setCoins(this.coins)
  }

  private changeReputation(amount: number) {
    this.reputation = Phaser.Math.Clamp(
      this.reputation + amount,
      0,
      100
    )

    console.log('Bazaar reputation:', this.reputation)
  }

  private handleBazaarExit() {
    const exit = this.getOptionalSpawnPointFromKey(
      'BazaarExit'
    )

    if (!exit) return false

    const distance =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        exit.x,
        exit.y
      )

    if (distance > 90) return false

    this.objectiveBox.setText(
      'Press E to return to the city.'
    )

    if (
      Phaser.Input.Keyboard.JustDown(
        this.interactKey
      )
    ) {
      this.scene.start('VillageScene', {
        fromBazaar: true,
        spawnName: 'BazaarReturnSpawn',
        coins: this.coins,
        reputation: this.reputation,
      })

      return true
    }

    return false
  }

  private getMarketConfig(npcName: string) {
    const configs: Record<
      string,
      {
        title: string
        description: string[]
        choices: MinigameChoice[]
      }
    > = {
      NPC_3: {
        title: '1. Suspicious Map Bargain',
        description: [
          'The Map Seller waves a papyrus with too many arrows.',
          'Opening price: 300 gold. What do you do?',
        ],
        choices: [
          {
            label: 'Pay 300 gold immediately',
            value: 'pay',
            goldDelta: -300,
            reputationDelta: -2,
            response:
              'Map Seller: Excellent! I respect a customer who fears negotiation.',
          },
          {
            label: 'Say: Too expensive',
            value: 'fair',
            goldDelta: -80,
            reputationDelta: 5,
            response:
              'Map Seller: Fine. 80 gold. Beginner bargain, but acceptable.',
          },
          {
            label: 'Walk away slowly',
            value: 'walk-away',
            goldDelta: -25,
            reputationDelta: 12,
            response:
              'Map Seller: Wait! 300 was pyramid price! Fine, 25 and I will pretend to respect you.',
          },
        ],
      },

      NPC_4: {
        title: '2. Broken Scale Puzzle',
        description: [
          'The Scale Merchant is selling dates with a suspicious scale.',
          'One weight is fake. Which one do you accuse?',
        ],
        choices: [
          {
            label: 'The shiny copper weight',
            value: 'wrong',
            goldDelta: -50,
            reputationDelta: -2,
            response:
              'Wrong. The merchant charges you an inspection fee.',
          },
          {
            label: 'The cracked stone weight',
            value: 'correct',
            goldDelta: 350,
            reputationDelta: 20,
            response:
              'Correct. Sand spills from the cracked weight. The crowd gasps.',
          },
          {
            label: 'Accuse the basket',
            value: 'funny',
            goldDelta: 50,
            reputationDelta: 5,
            response:
              'The basket is innocent, but your confidence scares the merchant into a small refund.',
          },
        ],
      },

      NPC_8: {
        title: '3. Spice Memory Challenge',
        description: [
          'The Spice Merchant mixes three spices.',
          'The smell is strong enough to reset your personality.',
        ],
        choices: [
          {
            label: 'Cumin, cinnamon, coriander',
            value: 'correct',
            goldDelta: 220,
            reputationDelta: 10,
            response:
              'Correct. Your nose has earned citizenship.',
          },
          {
            label: 'Sand, regret, and heat',
            value: 'funny',
            goldDelta: 40,
            reputationDelta: 5,
            response:
              'Wrong, but emotionally accurate. The seller gives you pity gold.',
          },
          {
            label: 'Premium tourist dust',
            value: 'wrong',
            goldDelta: -40,
            reputationDelta: -1,
            response:
              'The seller charges you for insulting the dust.',
          },
        ],
      },

      NPC_7: {
        title: '4. Date Basket Trade',
        description: [
          'The Date Merchant has too many baskets.',
          'Can you turn this into profit?',
        ],
        choices: [
          {
            label: 'Buy low and sell to temple cook',
            value: 'trade',
            goldDelta: 450,
            reputationDelta: 15,
            response:
              'You buy cheap and sell smart. The merchant calls you a dangerous accountant.',
          },
          {
            label: 'Eat the dates',
            value: 'eat',
            goldDelta: -30,
            reputationDelta: 2,
            response:
              'Delicious. Financially terrible, but delicious.',
          },
          {
            label: 'Sell the merchant his own dates',
            value: 'chaos',
            goldDelta: 75,
            reputationDelta: 4,
            response:
              'Somehow, the merchant buys one basket back. Nobody understands what happened.',
          },
        ],
      },

      NPC_10: {
        title: '5. Antique Pottery Fraud',
        description: [
          'The Pottery Seller shows three royal antiques.',
          'One still has wet paint. Which is fake?',
        ],
        choices: [
          {
            label: 'The pot marked “painted today”',
            value: 'correct',
            goldDelta: 300,
            reputationDelta: 15,
            response:
              'Correct. The seller says the label was “for transparency.”',
          },
          {
            label: 'The dusty cracked pot',
            value: 'wrong',
            goldDelta: -60,
            reputationDelta: -2,
            response:
              'That one was actually ancient. You pay a staring fee.',
          },
          {
            label: 'All pots are emotionally fake',
            value: 'funny',
            goldDelta: 80,
            reputationDelta: 6,
            response:
              'The crowd loves the answer. The seller pays you to stop philosophizing.',
          },
        ],
      },

      NPC_11: {
        title: '6. Donkey Race',
        description: [
          'The Donkey Master presents Royal Thunder.',
          'Royal Thunder is asleep. How do you motivate him?',
        ],
        choices: [
          {
            label: 'Compliment his beautiful knees',
            value: 'correct',
            goldDelta: 700,
            reputationDelta: 25,
            response:
              'Royal Thunder wakes immediately. Nobody knows why knee compliments work, but you win.',
          },
          {
            label: 'Offer him a business partnership',
            value: 'funny',
            goldDelta: 200,
            reputationDelta: 8,
            response:
              'The donkey respects the proposal but requests legal review. You place second.',
          },
          {
            label: 'Shout “Go faster!”',
            value: 'wrong',
            goldDelta: -100,
            reputationDelta: -2,
            response:
              'Royal Thunder stares like a disappointed uncle. Entry fee lost.',
          },
        ],
      },

      NPC_15: {
        title: '7. Eagle Delivery Race',
        description: [
          'The Eagle Keeper needs a message delivered across the bazaar.',
          'The eagle looks smarter than everyone involved.',
        ],
        choices: [
          {
            label: 'Give the eagle clear directions',
            value: 'correct',
            goldDelta: 500,
            reputationDelta: 18,
            response:
              'The eagle delivers perfectly and returns with exact change. Suspiciously professional.',
          },
          {
            label: 'Tell the eagle “follow your dreams”',
            value: 'funny',
            goldDelta: 120,
            reputationDelta: 6,
            response:
              'The eagle circles dramatically, inspires the crowd, and delivers late.',
          },
          {
            label: 'Deliver the message yourself',
            value: 'wrong',
            goldDelta: -70,
            reputationDelta: -1,
            response:
              'You get lost between two identical spice stalls. The eagle judges you silently.',
          },
        ],
      },
    }

    return configs[npcName]
  }

  private getSpawnPoint(
    map: Phaser.Tilemaps.Tilemap,
    name: string
  ) {
    const spawnLayer = map.getObjectLayer('Spawns')

    if (!spawnLayer) {
      console.warn('No Spawns layer found.')
      return { x: 100, y: 100 }
    }

    const spawn = spawnLayer.objects.find(
      (obj) => obj.name === name
    )

    if (!spawn) {
      console.warn(`Spawn not found: ${name}`)
      return { x: 100, y: 100 }
    }

    return {
      x: spawn.x ?? 100,
      y: spawn.y ?? 100,
    }
  }

  private getOptionalSpawnPointFromKey(name: string) {
    const map = this.make.tilemap({
      key: 'egypt_bazaar',
    })

    const spawnLayer = map.getObjectLayer('Spawns')

    if (!spawnLayer) return null

    const spawn = spawnLayer.objects.find(
      (obj) => obj.name === name
    )

    if (!spawn) return null

    return {
      x: spawn.x ?? 100,
      y: spawn.y ?? 100,
    }
  }

  private getNPCSpriteKey(name: string): string {
    const sprites: Record<string, string> = {
      NPC_3: 'npc3',
      NPC_4: 'npc4',
      NPC_7: 'npc7',
      NPC_8: 'npc8',
      NPC_10: 'npc10',
      NPC_11: 'npc11',
      NPC_15: 'npc15',
    }

    return sprites[name] ?? 'npc1'
  }
}