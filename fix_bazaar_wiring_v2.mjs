import fs from 'node:fs'
import path from 'node:path'

const scenePath = path.resolve('src/game/scenes/BazaarScene.ts')
const popupPath = path.resolve('src/game/ui/BazaarChallengePopup.ts')

function fail(message) {
  console.error(`\nERROR: ${message}\n`)
  process.exit(1)
}

if (!fs.existsSync(scenePath)) {
  fail(`Could not find ${scenePath}. Run this command from the folder containing package.json.`)
}

if (!fs.existsSync(popupPath)) {
  fail(
    `Could not find ${popupPath}. Make sure the new Flappy-style BazaarChallengePopup.ts is in src/game/ui first.`
  )
}

let code = fs.readFileSync(scenePath, 'utf8')
const original = code
const backupPath = `${scenePath}.before-interactive-bazaar-games`

if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, original, 'utf8')
}

function replaceSection(source, startPattern, endPattern, replacement, label) {
  const startMatch = startPattern.exec(source)

  if (!startMatch || startMatch.index === undefined) {
    fail(`Could not locate ${label} start.`)
  }

  const searchFrom = startMatch.index + startMatch[0].length
  const remaining = source.slice(searchFrom)
  const endMatch = endPattern.exec(remaining)

  if (!endMatch || endMatch.index === undefined) {
    fail(`Could not locate the method following ${label}.`)
  }

  const endIndex = searchFrom + endMatch.index
  return source.slice(0, startMatch.index) + replacement + source.slice(endIndex)
}

// -----------------------------------------------------------------------------
// 1. Imports
// -----------------------------------------------------------------------------

// Remove old MinigamePopup imports while preserving its choice type for the
// existing config data.
code = code.replace(
  /import\s+MinigamePopup\s*,\s*\{\s*type\s+MinigameChoice\s*\}\s*from\s*['"]\.\.\/ui\/MinigamePopup['"]\s*;?/g,
  `import type { MinigameChoice } from '../ui/MinigamePopup'`
)

code = code.replace(
  /import\s+MinigamePopup\s+from\s*['"]\.\.\/ui\/MinigamePopup['"]\s*;?/g,
  ''
)

// Remove any previous/incomplete BazaarChallengePopup import so it can be
// recreated consistently.
code = code.replace(
  /import\s+BazaarChallengePopup(?:\s*,\s*\{[\s\S]*?\})?\s+from\s*['"]\.\.\/ui\/BazaarChallengePopup(?:_interactive_v1)?['"]\s*;?/g,
  ''
)

if (
  code.includes('MinigameChoice') &&
  !/import\s+type\s*\{\s*MinigameChoice\s*\}\s*from\s*['"]\.\.\/ui\/MinigamePopup['"]/.test(code)
) {
  code = code.replace(
    /import\s+Phaser\s+from\s+['"]phaser['"]\s*;?/,
    (match) => `${match}\nimport type { MinigameChoice } from '../ui/MinigamePopup'`
  )
}

const challengeImport = `import BazaarChallengePopup, {
  type BazaarGameId,
  type BazaarMinigameResult,
} from '../ui/BazaarChallengePopup'`

if (!code.includes("from '../ui/BazaarChallengePopup'")) {
  const importAnchor =
    /import\s+type\s*\{\s*MinigameChoice\s*\}\s*from\s*['"]\.\.\/ui\/MinigamePopup['"]\s*;?/

  if (importAnchor.test(code)) {
    code = code.replace(importAnchor, (match) => `${match}\n${challengeImport}`)
  } else {
    code = code.replace(
      /import\s+Phaser\s+from\s+['"]phaser['"]\s*;?/,
      (match) => `${match}\n${challengeImport}`
    )
  }
}

// -----------------------------------------------------------------------------
// 2. Popup field and construction
// -----------------------------------------------------------------------------

code = code.replace(
  /private\s+minigame!\s*:\s*MinigamePopup/g,
  'private minigame!: BazaarChallengePopup'
)

code = code.replace(
  /this\.minigame\s*=\s*new\s+MinigamePopup\s*\(\s*this\s*\)/g,
  'this.minigame = new BazaarChallengePopup(this)'
)

if (!code.includes('private minigame!: BazaarChallengePopup')) {
  fail('Could not update the minigame field to BazaarChallengePopup.')
}

if (!code.includes('this.minigame = new BazaarChallengePopup(this)')) {
  fail('Could not update the popup construction in create().')
}

// -----------------------------------------------------------------------------
// 3. Launch interactive games instead of choice buttons
// -----------------------------------------------------------------------------

const startMethodReplacement = `  private startMarketMinigame(
    npcName: string,
    portraitKey: string,
    config: {
      title: string
      description: string[]
      gameId: BazaarGameId
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
          gameId: config.gameId,
          portraitKey,
          onComplete: (result) => {
            this.applyMinigameReward(result)
            this.completedMarkets.add(npcName)

            this.objectiveBox.setText(
              \`Objective: Bazaar markets completed \${this.completedMarkets.size}/7\`
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
                    'Objective: Exit the bazaar through the Bazaar Entrance.'
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

`

code = replaceSection(
  code,
  /(?:^|\n)\s*private\s+startMarketMinigame\s*\(/m,
  /(?:^|\n)\s*private\s+applyMinigameReward\s*\(/m,
  `\n${startMethodReplacement}`,
  'startMarketMinigame()'
)

const rewardMethodReplacement = `  private applyMinigameReward(
    result: BazaarMinigameResult
  ) {
    if (result.goldDelta) {
      this.changeCoins(result.goldDelta)
    }

    if (result.reputationDelta) {
      this.changeReputation(result.reputationDelta)
    }
  }

`

code = replaceSection(
  code,
  /(?:^|\n)\s*private\s+applyMinigameReward\s*\(/m,
  /(?:^|\n)\s*private\s+changeCoins\s*\(/m,
  `\n${rewardMethodReplacement}`,
  'applyMinigameReward()'
)

// -----------------------------------------------------------------------------
// 4. Add gameId to the market config type and each Bazaar NPC
// -----------------------------------------------------------------------------

const getConfigMatch = /private\s+getMarketConfig\s*\([^)]*\)\s*\{/.exec(code)

if (!getConfigMatch || getConfigMatch.index === undefined) {
  fail('Could not locate getMarketConfig().')
}

const configStart = getConfigMatch.index
const configEndMatch = /(?:^|\n)\s*private\s+[A-Za-z0-9_]+\s*\(/m.exec(
  code.slice(configStart + getConfigMatch[0].length)
)

const configEnd = configEndMatch
  ? configStart + getConfigMatch[0].length + configEndMatch.index
  : code.length

let configSection = code.slice(configStart, configEnd)

if (!configSection.includes('gameId: BazaarGameId')) {
  configSection = configSection.replace(
    /description\s*:\s*string\[\]\s*\r?\n(\s*)choices\s*:\s*MinigameChoice\[\]/,
    `description: string[]\n$1gameId: BazaarGameId\n$1choices: MinigameChoice[]`
  )
}

const gameIds = {
  NPC_3: 'map-bargain',
  NPC_4: 'scale-puzzle',
  NPC_8: 'spice-memory',
  NPC_7: 'date-trade',
  NPC_10: 'pottery-fraud',
  NPC_11: 'donkey-race',
  NPC_15: 'eagle-delivery',
}

for (const [npcName, gameId] of Object.entries(gameIds)) {
  const npcPattern = new RegExp(`(${npcName}\\s*:\\s*\\{)(?!\\s*gameId\\s*:)`)

  if (npcPattern.test(configSection)) {
    configSection = configSection.replace(
      npcPattern,
      `$1\n        gameId: '${gameId}',`
    )
  }
}

code = code.slice(0, configStart) + configSection + code.slice(configEnd)

// -----------------------------------------------------------------------------
// 5. Verification
// -----------------------------------------------------------------------------

const requiredChecks = [
  ["BazaarChallengePopup import", code.includes("from '../ui/BazaarChallengePopup'")],
  ['BazaarChallengePopup field', code.includes('private minigame!: BazaarChallengePopup')],
  ['BazaarChallengePopup construction', code.includes('new BazaarChallengePopup(this)')],
  ['interactive show call', code.includes('gameId: config.gameId')],
  ['Eagle game mapping', /NPC_15\s*:\s*\{\s*gameId:\s*['"]eagle-delivery['"]/.test(code)],
]

const failedChecks = requiredChecks.filter(([, passed]) => !passed)

if (failedChecks.length > 0) {
  fail(`Verification failed: ${failedChecks.map(([name]) => name).join(', ')}`)
}

fs.writeFileSync(scenePath, code, 'utf8')

console.log('\nBazaarScene.ts updated successfully.')
console.log(`Backup: ${backupPath}`)
console.log('The Eagle Keeper now routes to eagle-delivery in BazaarChallengePopup.ts.')
console.log('\nNext run:')
console.log('  npm run dev')
console.log('\nThen hard-refresh the browser with Ctrl + Shift + R.\n')
