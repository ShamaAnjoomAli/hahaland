import { useEffect } from "react";
import Phaser from "phaser";

import BootScene from "./game/scenes/BootScene";
import VillageScene from "./game/scenes/VillageScene";

function Game() {
  useEffect(() => {
    const game = new Phaser.Game({
        type: Phaser.AUTO,
      
        parent: "game-container",
      
        backgroundColor: "#000000",
      
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

  return <div id="game-container" />;
}

export default Game;