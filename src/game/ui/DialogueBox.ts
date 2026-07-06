import Phaser from "phaser";

export default class DialogueBox {

    private scene: Phaser.Scene;
    private background: Phaser.GameObjects.Rectangle;
    private text: Phaser.GameObjects.Text;
    private messages: string[] = [];
    private currentMessage = 0;
    private visible = false;

    constructor(scene: Phaser.Scene) {

        const cam = scene.cameras.main;

        this.background = scene.add.rectangle(
            cam.width / 2,
            cam.height - 80,
            cam.width - 40,
            140,
            0x000000,
            0.8
        );
        
        this.background.setDepth(1000);
        this.background.setScrollFactor(0);
        this.background.setVisible(false);
        
        this.text = scene.add.text(
            40,
            cam.height - 120,
            "",
            {
                fontSize: "20px",
                color: "#ffffff",
                wordWrap: {
                    width: cam.width - 80
                }
            }
        );
        
        this.text.setDepth(1001);
        this.text.setScrollFactor(0);
        this.text.setVisible(false);
    }

    show(messages: string[]) {
        this.messages = messages;
        this.currentMessage = 0;
        this.visible = true;
    
        this.background.setVisible(true);
        this.text.setVisible(true);
    
        this.text.setText(this.messages[0]);
    }

    next() {
        this.currentMessage++;
    
        if (this.currentMessage >= this.messages.length) {
            this.hide();
            return;
        }
    
        this.text.setText(
            this.messages[this.currentMessage]
        );
    
    }

    hide() {
        this.visible = false;

    this.background.setVisible(false);
    this.text.setVisible(false);
    }
}