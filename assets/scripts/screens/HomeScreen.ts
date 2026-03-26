import { playBubblePop } from "../utils/GameUiAudio";

const { ccclass, property } = cc._decorator;

@ccclass
export class HomeScreen extends cc.Component {
  @property(cc.Node)
  gameScreen: cc.Node = null;

  @property(cc.Node)
  homeScreen: cc.Node = null;

  @property(cc.Button)
  playButton: cc.Button = null;

  onLoad() {
    this.homeScreen.active = true;
    this.gameScreen.active = false;
    this.playPulseAnimation();
  }

  private playPulseAnimation(): void {
    cc.tween(this.playButton.node)
      .repeatForever(
        cc
          .tween()
          .to(0.6, { scaleX: 1.08, scaleY: 1.08 }, { easing: "sineInOut" })
          .to(0.6, { scaleX: 1.0, scaleY: 1.0 }, { easing: "sineInOut" })
      )
      .start();
  }

  public onPlayClick(): void {
    playBubblePop();
    this.showGameHideHome();
  }

  public showGameHideHome(): void {
    this.homeScreen.active = false;
    this.gameScreen.active = true;
  }

  public showHomeHideGame(): void {
    this.homeScreen.active = true;
    this.gameScreen.active = false;
  }
}
