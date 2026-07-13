import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'

import BootScene from './game/scenes/BootScene'
import VillageScene from './game/scenes/VillageScene'
import BazaarScene from './game/scenes/BazaarScene'

import './Game.css'

type Screen = 'menu' | 'howToPlay' | 'game'

export default function Game() {
  const [screen, setScreen] = useState<Screen>('menu')
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
    const audio = new Audio('/assets/audio/music/main_menu.mpeg')
    audio.loop = true
    audio.volume = 0.45
    audio.preload = 'auto'
    menuMusicRef.current = audio

    const tryStart = () => {
      if (menuMusicStartedRef.current) return
      if (screenRef.current !== 'menu') return // don't start if we've already left the menu
      audio
        .play()
        .then(() => {
          menuMusicStartedRef.current = true
        })
        .catch(() => {})
    }

    // try right away — works if the browser already trusts this page
    tryStart()

    // fallback: arm it to fire on the very first interaction anywhere on the page
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

          <h1>How to Play</h1>

          <div className="how-grid">
            <HowItem keyName="WASD" title="Move" text="Walk around the city." />
            <HowItem keyName="E" title="Talk" text="Interact with nearby NPCs." />
            <HowItem keyName="SPACE" title="Dialogue" text="Continue or close conversations." />
            <HowItem keyName="!" title="Quest Target" text="Follow the yellow marker." />
            <HowItem keyName="●" title="Minimap" text="Red is you. Blue dots are NPCs." />
            <HowItem keyName="◉" title="Objective Dot" text="Yellow dot marks your next NPC." />
            <HowItem keyName="¢" title="Coins" text="Earn coins by talking to NPCs." />
            <HowItem keyName="⏱" title="Timer" text="Finish before time runs out." />
          </div>

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

            <button
              className="primary-button"
              onClick={() => {
                stopMenuMusic()
                setScreen('game')
              }}
            >
              Play
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
          onClick={() => {
            stopMenuMusic()
            setScreen('game')
          }}
        >
          Join
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
          You arrive with <strong>1,000,000 gold</strong>. How you spend it decides who you become.
        </p>

        <div className="menu-actions">
          <button
            className="primary-button"
            onClick={() => {
              stopMenuMusic()
              setScreen('game')
            }}
          >
            Play
          </button>

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
