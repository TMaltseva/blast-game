import { GamePhase } from "./TurnResult";
import { LevelConfig } from "../config/LevelConfig";

export class GameSession {
  private score: number = 0;
  private movesLeft: number;
  private phase: GamePhase = GamePhase.PLAYING;
  private shuffleCount: number = 0;

  private readonly targetScore: number;
  private maxShuffles: number;

  constructor(config: LevelConfig) {
    this.movesLeft = config.movesLimit;
    this.targetScore = config.targetScore;
    this.maxShuffles = config.maxShuffles;
  }

  public addScore(points: number): void {
    this.score += points;
  }

  public spendMove(): void {
    this.movesLeft--;
  }

  public incrementShuffle(): void {
    this.shuffleCount++;
  }

  public canShuffle(): boolean {
    return this.shuffleCount < this.maxShuffles;
  }

  public getScore(): number {
    return this.score;
  }

  public getMovesLeft(): number {
    return this.movesLeft;
  }

  public getPhase(): GamePhase {
    return this.phase;
  }

  public isPlaying(): boolean {
    return this.phase === GamePhase.PLAYING;
  }

  // Проверяем победу и поражение после каждого хода
  public evaluate(hasValidMoves: boolean): void {
    if (this.score >= this.targetScore) {
      this.phase = GamePhase.WON;
      return;
    }

    if (this.movesLeft <= 0) {
      this.phase = GamePhase.LOST;
      return;
    }

    if (!hasValidMoves) {
      this.phase = GamePhase.LOST;
    }
  }

  public reset(config: LevelConfig): void {
    this.score = 0;
    this.movesLeft = config.movesLimit;
    this.phase = GamePhase.PLAYING;
    this.shuffleCount = 0;
    this.maxShuffles = config.maxShuffles;
  }
}
