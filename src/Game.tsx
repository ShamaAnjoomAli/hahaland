import { useEffect } from "react";
import Phaser from "phaser";

import BootScene from "./game/scenes/BootScene";
import VillageScene from "./game/scenes/VillageScene";

function Game() {
  useEffect(() => {
    window.scrollTo(0, 0);

    const game = new Phaser.Game({
        type: Phaser.AUTO,
      
        parent: "game-container",
      
        backgroundColor: "#000000",
        physics: {
            default: "arcade",
            arcade: {
                debug: false,
            },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 550,
          height: 500
        },
      
        scene: [BootScene, VillageScene],
      });

    return () => {
      game.destroy(true);
    };
  }, []);


  return <div
  id="game-container"
  style={{
    //   width: "100vw",
      height: "100vh",
      overflow: "hidden",
  }}
/>;
}

export default Game;