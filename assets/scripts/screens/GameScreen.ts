import { BoardView } from "../views/BoardView";
import { BlastGameEngine } from "../engine/BlastGameEngine";
import { getLevelConfig } from "../config/LevelConfig";
import { GamePhase, TurnResult } from "../engine/TurnResult";
import { ResultScreen } from "./ResultScreen";
import { BoosterPanel } from "./BoosterPanel";
import { HomeScreen } from "./HomeScreen";
import { TileType } from "../engine/TileData";

const { ccclass, property } = cc._decorator;

@ccclass
export class GameScreen extends cc.Component {
  @property(BoardView)
  boardView: BoardView = null;

  @property(cc.Label)
  scoreLabel: cc.Label = null;

  @property(cc.Label)
  movesLabel: cc.Label = null;

  @property(ResultScreen)
  resultScreen: ResultScreen = null;

  @property(BoosterPanel)
  boosterPanel: BoosterPanel = null;

  @property(cc.AudioClip)
  bgMusic: cc.AudioClip = null;

  @property(cc.AudioClip)
  correctSound: cc.AudioClip = null;

  @property(cc.AudioClip)
  incorrectSound: cc.AudioClip = null;

  @property({ type: cc.AudioClip, displayName: "Explosion (bomb + smoke)" })
  explosionSound: cc.AudioClip = null;

  @property(cc.AudioClip)
  sparkleSound: cc.AudioClip = null;

  @property({ type: cc.AudioClip, displayName: "Win Sound" })
  winSound: cc.AudioClip = null;

  @property(cc.AudioClip)
  whooshSound: cc.AudioClip = null;

  @property(cc.AudioClip)
  bubblePopSound: cc.AudioClip = null;

  private engine: BlastGameEngine = null;
  private isProcessing: boolean = false;
  private teleportFirstTile: { row: number; col: number } | null = null;

  private tileTapHandler = ({ row, col }: { row: number; col: number }) => {
    void this.onTileTap(row, col);
  };

  onLoad() {
    const config = getLevelConfig();
    this.boardView.tileSize = config.tileSize;
    const boardWidth = config.cols * config.tileSize;
    const boardHeight = config.rows * config.tileSize;
    const boardX = -boardWidth / 2;
    const boardY = boardHeight / 2;
    this.boardView.node.x = boardX;
    this.boardView.node.y = boardY;

    this.layoutBoardBg();

    this.engine = new BlastGameEngine(config);

    const snapshot = this.engine.getBoardSnapshot();
    this.boardView.onTileTap.connect(this.tileTapHandler);

    if (this.resultScreen) {
      this.resultScreen.node.active = false;
    }

    const { rows, cols } = this.engine.getBoardSize();
    this.boardView.buildBoard(snapshot, rows, cols);
    this.updateHUD();

    if (this.bgMusic) {
      cc.audioEngine.playMusic(this.bgMusic, true);
    }

    cc.game.on(cc.game.EVENT_HIDE, () => {
      cc.audioEngine.pauseMusic();
    });

    cc.game.on(cc.game.EVENT_SHOW, () => {
      cc.audioEngine.resumeMusic();
    });

    if (this.boosterPanel) {
      this.boosterPanel.setInputEnabled(true);
      this.boosterPanel.onBoosterStateChanged = () => {
        if (this.isProcessing) return;
        if (this.boosterPanel.getActiveBooster() !== "teleport") {
          this.clearTeleportSelection();
        }
      };
    }
  }

  private clearTeleportSelection(): void {
    this.teleportFirstTile = null;
    this.boardView.clearHighlight();
  }

  private layoutBoardBg(): void {
    const config = getLevelConfig();
    const gridWidth = config.cols * config.tileSize;
    const gridHeight = config.rows * config.tileSize;
    const extraBgWidth = 20;
    const extraBgHeight = 20;
    const boardBg = this.boardView.node.getChildByName("BoardBg");
    if (!boardBg) return;

    const widget = boardBg.getComponent(cc.Widget);
    if (widget) {
      widget.enabled = false;
    }

    const padding = 24;
    boardBg.setAnchorPoint(0.5, 0.5);
    boardBg.setContentSize(
      gridWidth + extraBgWidth + padding * 2,
      gridHeight + extraBgHeight + padding * 2,
    );
    boardBg.setPosition(gridWidth / 2, -gridHeight / 2);
    boardBg.setSiblingIndex(0);

    const sprite = boardBg.getComponent(cc.Sprite);
    if (sprite) {
      sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    }
  }

  private async onTileTap(row: number, col: number): Promise<void> {
    if (this.isProcessing) return;

    const activeBooster = this.boosterPanel?.getActiveBooster();

    if (activeBooster === "bomb") {
      const result = this.engine.applyBoosterBomb(row, col);
      if (!result) {
        const t = this.engine.getTile(row, col);
        this.boardView.playInvalidTapAt(row, col, t?.id);
        this.playIncorrectSound();
        return;
      }
      this.boosterPanel.spendBooster("bomb");
      await this.runTurnResultFlow(result, {
        bombEffectAt: { row, col },
      });
      return;
    }

    if (activeBooster === "teleport") {
      void this.handleTeleportTap(row, col);
      return;
    }

    const tappedTile = this.engine.getTile(row, col);
    const result = this.engine.applyTap(row, col);
    if (!result) {
      const t = this.engine.getTile(row, col);
      this.boardView.playInvalidTapAt(row, col, t?.id);
      this.playIncorrectSound();
      return;
    }

    const isSuperBomb = tappedTile?.type === TileType.SUPER_BOMB;
    await this.runTurnResultFlow(result, {
      bombEffectAt: isSuperBomb ? { row, col } : undefined,
    });
  }

  private async handleTeleportTap(row: number, col: number): Promise<void> {
    if (this.isProcessing) return;

    if (!this.teleportFirstTile) {
      this.teleportFirstTile = { row, col };
      this.boardView.highlightTileAt(row, col);
      return;
    }

    const first = this.teleportFirstTile;
    this.teleportFirstTile = null;
    this.boardView.clearHighlight();

    if (first.row === row && first.col === col) {
      this.boosterPanel?.deactivate();
      return;
    }

    const result = this.engine.applyTeleport(first.row, first.col, row, col);
    if (!result) {
      this.boosterPanel?.deactivate();
      return;
    }

    this.boosterPanel.spendBooster("teleport");

    await this.runTurnResultFlow(result);
  }

  private async runTurnResultFlow(
    result: TurnResult,
    options: {
      bombEffectAt?: { row: number; col: number };
    } = {},
  ): Promise<void> {
    this.isProcessing = true;
    this.boosterPanel?.setInputEnabled(false);
    this.boardView.onTileTap.disconnect(this.tileTapHandler);

    const { bombEffectAt } = options;

    if (bombEffectAt) {
      if (this.explosionSound) {
        cc.audioEngine.playEffect(this.explosionSound, false);
      }
    } else if (result.phase !== GamePhase.WON) {
      if (result.swap) {
        this.playWhooshSound();
      } else if (result.superSpawned) {
        this.playSparkleEffect();
      } else if (this.correctSound) {
        cc.audioEngine.playEffect(this.correctSound, false);
      }
    }

    const timeout = setTimeout(() => {
      this.isProcessing = false;
      this.boardView.onTileTap.connect(this.tileTapHandler);
    }, 3000);

    try {
      await this.boardView.applyTurnResult(result, { bombEffectAt });

      clearTimeout(timeout);

      this.updateHUD(result.totalScore, result.movesLeft);

      if (result.phase === GamePhase.WON) {
        await this.showWin();
      } else if (result.phase === GamePhase.LOST) {
        await this.showLose();
      } else {
        this.isProcessing = false;
        this.boardView.onTileTap.connect(this.tileTapHandler);
      }
    } catch (e) {
      clearTimeout(timeout);
      console.error("onTileTap error:", e);
      this.isProcessing = false;
      this.boardView.onTileTap.connect(this.tileTapHandler);
    } finally {
      this.boosterPanel?.setInputEnabled(true);
    }
  }

  private playSparkleEffect(): void {
    if (this.sparkleSound) {
      cc.audioEngine.playEffect(this.sparkleSound, false);
    }
  }

  private playWhooshSound(): void {
    if (this.whooshSound) {
      cc.audioEngine.playEffect(this.whooshSound, false);
    }
  }

  private playIncorrectSound(): void {
    if (this.incorrectSound) {
      cc.audioEngine.playEffect(this.incorrectSound, false);
    }
  }

  public playBubblePop(): void {
    const clip = this.bubblePopSound ?? this.correctSound;
    if (clip) {
      cc.audioEngine.playEffect(clip, false);
    }
  }

  private updateHUD(score?: number, moves?: number): void {
    const config = getLevelConfig();
    const s = score ?? this.engine.getSession().getScore();
    const m = moves ?? this.engine.getSession().getMovesLeft();

    this.scoreLabel.string = `Scores:\n${s} / ${config.targetScore}`;
    this.movesLabel.string = `${m}`;
  }

  private async showWin(): Promise<void> {
    if (this.boosterPanel) {
      this.boosterPanel.node.active = false;
    }
    if (!this.resultScreen) {
      console.error("resultScreen is null!");
      return;
    }
    const config = getLevelConfig();
    this.resultScreen.node.active = true;
    if (this.winSound) {
      cc.audioEngine.playEffect(this.winSound, false);
    }
    this.resultScreen.setup(
      true,
      this.engine.getSession().getScore(),
      this.engine.getSession().getMovesLeft(),
      config.targetScore,
    );
  }

  private async showLose(): Promise<void> {
    if (this.boosterPanel) {
      this.boosterPanel.node.active = false;
    }
    const config = getLevelConfig();
    this.resultScreen.node.active = true;
    this.playSparkleEffect();
    this.resultScreen.setup(
      false,
      this.engine.getSession().getScore(),
      this.engine.getSession().getMovesLeft(),
      config.targetScore,
    );
  }

  public onRestartClick(): void {
    this.playBubblePop();
    this.restartGame();
  }

  public goToHomeMenu(): void {
    this.clearTeleportSelection();
    this.isProcessing = false;
    if (this.resultScreen) {
      this.resultScreen.node.active = false;
    }
    if (this.boosterPanel) {
      this.boosterPanel.node.active = true;
      this.boosterPanel.setInputEnabled(true);
    }

    this.engine.reset();
    const snapshot = this.engine.getBoardSnapshot();
    this.boardView.tileSize = getLevelConfig().tileSize;
    const { rows, cols } = this.engine.getBoardSize();
    this.boardView.buildBoard(snapshot, rows, cols);
    this.layoutBoardBg();
    this.updateHUD();

    this.boardView.onTileTap.disconnect(this.tileTapHandler);
    this.boardView.onTileTap.connect(this.tileTapHandler);

    const canvas = this.node.parent;
    const home = canvas?.getChildByName("HomeScreen")?.getComponent(HomeScreen);
    home?.showHomeHideGame();
  }

  public restartGame(): void {
    this.clearTeleportSelection();
    if (this.boosterPanel) {
      this.boosterPanel.node.active = true;
      this.boosterPanel.setInputEnabled(true);
    }
    this.engine.reset();
    if (this.resultScreen) {
      this.resultScreen.node.active = false;
    }
    this.isProcessing = false;

    const snapshot = this.engine.getBoardSnapshot();
    this.boardView.tileSize = getLevelConfig().tileSize;
    const { rows, cols } = this.engine.getBoardSize();
    this.boardView.buildBoard(snapshot, rows, cols);
    this.layoutBoardBg();
    this.updateHUD();

    this.boardView.onTileTap.disconnect(this.tileTapHandler);
    this.boardView.onTileTap.connect(this.tileTapHandler);

    const canvas = this.node.parent;
    const homeNode = canvas?.getChildByName("HomeScreen");
    const home = homeNode?.getComponent(HomeScreen);
    home?.showGameHideHome();
  }
}
