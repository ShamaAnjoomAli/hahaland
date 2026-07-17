import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'

import BootScene from './game/scenes/BootScene'
import VillageScene from './game/scenes/VillageScene'
import BazaarScene from './game/scenes/BazaarScene'

import {
  clearGameProgress,
  loadGameProgress,
} from './game/utils/progressSave'

import './Game.css'

type Screen = 'menu' | 'howToPlay' | 'game'

export default function Game() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [savedProgress, setSavedProgress] = useState(() =>
    loadGameProgress()
  )

  const gameRef = useRef<Phaser.Game | null>(null)

  const menuMusicRef = useRef<HTMLAudioElement | null>(null)
  const menuMusicStartedRef = useRef(false)

  // keep a ref of the current screen so the one-time "unlock" listener
  // (added once, on mount) always checks the LATEST screen, not a stale closure
  const screenRef = useRef<Screen>(screen)
  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  useEffect(() => {
    if (screen === 'menu') {
      setSavedProgress(loadGameProgress())
    }
  }, [screen])

  useEffect(() => {
    const audio = new Audio('/assets/audio/music/main_menu.mpeg')
    audio.loop = true
    audio.volume = 0.45
    audio.preload = 'auto'
    menuMusicRef.current = audio

    const tryStart = () => {
      if (menuMusicStartedRef.current) return
      if (screenRef.current !== 'menu') return
      audio
        .play()
        .then(() => {
          menuMusicStartedRef.current = true
        })
        .catch(() => {})
    }

    tryStart()

    window.addEventListener('pointerdown', tryStart, { once: true })
    window.addEventListener('keydown', tryStart, { once: true })

    return () => {
      window.removeEventListener('pointerdown', tryStart)
      window.removeEventListener('keydown', tryStart)
      audio.pause()
      audio.currentTime = 0
      menuMusicRef.current = null
      menuMusicStartedRef.current = false
    }
  }, [])

  const startMenuMusic = () => {
    const audio = menuMusicRef.current
    if (!audio || menuMusicStartedRef.current) return
    audio
      .play()
      .then(() => {
        menuMusicStartedRef.current = true
      })
      .catch((error) => {
        console.warn('Menu music blocked:', error)
      })
  }

  const stopMenuMusic = () => {
    const audio = menuMusicRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    menuMusicStartedRef.current = false
  }

  const startNewGame = () => {
    clearGameProgress()
    setSavedProgress(null)

    ;(window as any).__HAHALAND_START_MODE__ = 'new'

    stopMenuMusic()
    setScreen('game')
  }

  const continueGame = () => {
    ;(window as any).__HAHALAND_START_MODE__ = 'resume'

    stopMenuMusic()
    setScreen('game')
  }

  useEffect(() => {
    if (screen !== 'game') return

    if (gameRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 550,
      height: 500,
      backgroundColor: '#000000',
      pixelArt: false,
      antialias: true,
      roundPixels: false,
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scene: [
        BootScene,
        VillageScene,
        BazaarScene,
      ],
      scale: {
        mode: Phaser.Scale.FIT,
        // autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    }

    gameRef.current = new Phaser.Game(config)

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [screen])

  if (screen === 'game') {
    return (
      <div className="game-page">
        <button
          className="exit-game-button"
          onClick={() => {
            startMenuMusic()
            setScreen('menu')
          }}
        >
          Exit
        </button>

        <div id="game-container" />
      </div>
    )
  }

  if (screen === 'howToPlay') {
    return (
      <main className="menu-page">
        <div className="menu-bg-glow" />
        <div className="pyramid pyramid-one" />
        <div className="pyramid pyramid-two" />
        <div className="pyramid pyramid-three" />
  
        <section className="how-card">
          <p className="eyebrow">Ancient Egypt Edition</p>
  
          <h1 style={{paddingTop: "10px"}}>How to Play</h1>
  
          <p className="hero-copy" style={{paddingTop: "30px"}}>
            You arrived in Hahaland as a rich tourist looking for a hotel. But after
            getting tricked, your journey becomes much bigger: earn back your power,
            gain the trust of the people, complete ancient bazaar trials, uncover
            secrets, and become the King of Hahaland.
          </p>
  
          <div className="how-grid">
            <HowItem
              keyName="WASD"
              title="Move"
              text="Walk around the city, bazaar, gates, and story areas."
            />
  
            <HowItem
              keyName="E"
              title="Interact"
              text="Talk to NPCs, enter gates, use prompts, and interact with hidden areas."
            />
  
            <HowItem
              keyName="SPACE"
              title="Dialogue"
              text="Continue conversations and story scenes."
            />
  
            <HowItem
              keyName="!"
              title="Objective"
              text="Follow the objective box. It tells you who to talk to or where to go next."
            />
  
            <HowItem
              keyName="●"
              title="Minimap"
              text="Red is you. Blue dots are NPCs. Yellow marks your current story target."
            />
  
            <HowItem
              keyName="¢"
              title="Coins / Gold"
              text="Coins are your money and influence. You can lose them through scams or bad choices, and earn them by winning bazaar trials."
            />
  
            <HowItem
              keyName="★"
              title="Reputation"
              text="Reputation shows how much Hahaland trusts you. Complete trials and make smart choices to earn respect."
            />
  
            <HowItem
              keyName="♛"
              title="Become King"
              text="To become King, you need both wealth and reputation. Gold gives influence. Reputation earns loyalty."
            />
  
            <HowItem
              keyName="🏨"
              title="Fake Hotel Scam"
              text="Your first major story event is the fake hotel scam. After that, your real rise begins."
            />
  
            <HowItem
              keyName="7"
              title="Bazaar Trials"
              text="Complete all 7 merchant trials: map, scale, spice, dates, pottery, donkey, and eagle."
            />
  
            <HowItem
              keyName="🚪"
              title="Gates"
              text="Use entrances and gates to move between areas. The northern bazaar gate leads toward the temple."
            />
  
            <HowItem
              keyName="⏱"
              title="Timer"
              text="Your journey is timed. Keep moving, follow the objective, and build your status before time runs out."
            />
          </div>
  
          <p className="hero-copy"  style={{paddingTop: "26px"}}>
          Remember: talk to people, follow the objective, win coins, build
  reputation, complete merchant trials, reach the temple, and become
  King of Hahaland.
          </p>
  
          <div className="menu-actions">
            <button
              className="secondary-button"
              onClick={() => {
                startMenuMusic()
                setScreen('menu')
              }}
            >
              Back
            </button>
  
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="menu-page">
      <div className="menu-bg-glow" />
      <div className="pyramid pyramid-one" />
      <div className="pyramid pyramid-two" />
      <div className="pyramid pyramid-three" />

      <nav className="menu-nav">
        <div className="brand">HAHALAND</div>

        <button
          className="nav-button"
          onClick={savedProgress ? continueGame : startNewGame}
        >
          {savedProgress ? 'Continue' : 'Join'}
        </button>
      </nav>

      <section className="hero-card">
        <p className="eyebrow">Ancient Egypt Edition</p>
        <h1>HAHALAND</h1>

        <h2>
          Build Others.
          <br />
          Become Legend.
        </h2>

        <p className="hero-copy">
  You arrive with <strong>1,000,000 gold</strong>. Lose it, earn it back, build reputation, and rise as King of Hahaland.
</p>

        {/* {savedProgress && (
          <p className="hero-copy">
            Saved progress: <strong>{savedProgress.coins} gold</strong> •{' '}
            <strong>{savedProgress.reputation} rep</strong> •{' '}
            <strong>{savedProgress.completedMarkets.length}/7 markets</strong>
          </p>
        )} */}

        <div className="menu-actions">
          <button
            className={savedProgress ? 'secondary-button' : 'primary-button'}
            onClick={startNewGame}
          >
            New Game
          </button>

          {savedProgress && (
            <button
              className="primary-button"
              onClick={continueGame}
            >
              Continue
            </button>
          )}

          <button
            className="secondary-button"
            onClick={() => {
              startMenuMusic()
              setScreen('howToPlay')
            }}
          >
            How to Play
          </button>
        </div>
      </section>
    </main>
  )
}

function HowItem({ keyName, title, text }: { keyName: string; title: string; text: string }) {
  return (
    <div className="how-item">
      <div className="keycap">{keyName}</div>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  )
}
