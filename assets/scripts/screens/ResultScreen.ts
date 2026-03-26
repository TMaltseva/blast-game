import { GameScreen } from "./GameScreen";
import { playBubblePop } from "../utils/GameUiAudio";

const { ccclass, property } = cc._decorator;

@ccclass
export class ResultScreen extends cc.Component {
  @property(cc.Label)
  finalScoreLabel: cc.Label = null;

  @property(cc.Label)
  movesLeftLabel: cc.Label = null;

  @property(cc.Node)
  starsContainer: cc.Node = null;

  @property([cc.Node])
  stars: cc.Node[] = [];

  @property(cc.Node)
  winPanel: cc.Node = null;

  @property(cc.Node)
  losePanel: cc.Node = null;

  @property(GameScreen)
  gameScreen: GameScreen = null;

  private isWin: boolean = false;
  private finalScore: number = 0;
  private movesLeft: number = 0;
  private targetScore: number = 0;

  onLoad() {
    if (!this.gameScreen) {
      const canvas = this.node.parent;
      const gs = canvas?.getChildByName("GameScreen")?.getComponent(GameScreen);
      if (gs) this.gameScreen = gs;
    }
  }

  public setup(
    isWin: boolean,
    score: number,
    movesLeft: number,
    targetScore: number
  ): void {
    this.node.zIndex = 100;
    this.stopPanelPulse();
    this.isWin = isWin;
    this.finalScore = score;
    this.movesLeft = movesLeft;
    this.targetScore = targetScore;
    this.updateUI();
    this.playShowAnimation();
  }

  private updateUI(): void {
    if (this.finalScoreLabel) {
      this.finalScoreLabel.string = `${this.finalScore}`;
    }
    if (this.movesLeftLabel) {
      this.movesLeftLabel.string = `Steps left: ${this.movesLeft}`;
    }

    if (this.isWin) {
      if (this.winPanel) this.winPanel.active = true;
      if (this.losePanel) this.losePanel.active = false;
      this.showStars();
    } else {
      if (this.winPanel) this.winPanel.active = false;
      if (this.losePanel) this.losePanel.active = true;
      this.hideStars();
    }
  }

  private showStars(): void {
    const ratio = this.finalScore / this.targetScore;
    const starCount = ratio >= 1.5 ? 3 : ratio >= 1.0 ? 2 : 1;

    this.stars.forEach((star, i) => {
      star.active = true;
      star.scaleX = 0;
      star.scaleY = 0;

      if (i < starCount) {
        cc.tween(star)
          .delay(i * 0.15)
          .to(0.3, { scaleX: 1, scaleY: 1 }, { easing: "backOut" })
          .start();
      } else {
        star.opacity = 80;
        cc.tween(star)
          .delay(i * 0.15)
          .to(0.3, { scaleX: 1, scaleY: 1 }, { easing: "backOut" })
          .start();
      }
    });
  }

  private hideStars(): void {
    this.stars.forEach((star) => (star.active = false));
  }

  private ensurePanelUnderResultScreen(panel: cc.Node): void {
    const p = panel.parent;
    if (!p || p === this.node) return;
    const world = p.convertToWorldSpaceAR(panel.position);
    panel.setParent(this.node);
    panel.setPosition(this.node.convertToNodeSpaceAR(world));
  }

  private playShowAnimation(): void {
    const panel = this.isWin ? this.winPanel : this.losePanel;
    if (!panel) return;
    this.ensurePanelUnderResultScreen(panel);
    const restLocalY = panel.y;
    const slide = Math.min(300, this.node.height * 0.25);
    panel.y = restLocalY - slide;
    panel.opacity = 0;
    panel.scaleX = 1;
    panel.scaleY = 1;

    cc.tween(panel)
      .to(0.4, { y: restLocalY, opacity: 255 }, { easing: "backOut" })
      .call(() => this.startPanelPulse(panel))
      .start();
  }

  private startPanelPulse(panel: cc.Node): void {
    if (!panel || !cc.isValid(panel) || !panel.active) return;
    cc.Tween.stopAllByTarget(panel);
    panel.scaleX = 1;
    panel.scaleY = 1;
    cc.tween(panel)
      .repeatForever(
        cc
          .tween()
          .to(0.55, { scaleX: 1.045, scaleY: 1.045 }, { easing: "sineInOut" })
          .to(0.55, { scaleX: 1, scaleY: 1 }, { easing: "sineInOut" }),
      )
      .start();
  }

  private stopPanelPulse(): void {
    if (this.winPanel) cc.Tween.stopAllByTarget(this.winPanel);
    if (this.losePanel) cc.Tween.stopAllByTarget(this.losePanel);
  }

  public onPlayAgainClick(): void {
    playBubblePop();
    this.stopPanelPulse();
    this.gameScreen?.restartGame();
  }

  public onHomeClick(): void {
    playBubblePop();
    this.stopPanelPulse();
    this.stars.forEach((s) => {
      if (s) cc.Tween.stopAllByTarget(s);
    });
    this.gameScreen?.goToHomeMenu();
  }
}
