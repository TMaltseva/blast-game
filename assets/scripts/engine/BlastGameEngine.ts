import { BoardModel } from "./BoardModel";
import { TileFactory } from "./TileFactory";
import { AdjacencyGroupFinder } from "./AdjacencyGroupFinder";
import { Gravity } from "./Gravity";
import { Refill } from "./Refill";
import { MoveValidator } from "./MoveValidator";
import { ScoreCalculator } from "./ScoreCalculator";
import { GameSession } from "./GameSession";
import { TurnResult, TileBoardSnapshot, TileFall, TileSpawn } from "./TurnResult";
import { TileData, TileType } from "./TileData";
import { getBurnPolicyForTile, RadiusBurnPolicy } from "./BurnPolicy";
import { LevelConfig } from "../config/LevelConfig";

interface TapAction {
  targets: TileData[];
  superSpawned: TileData | null;
  scoreInput: number;
  originalTileId?: number;
}

export class BlastGameEngine {
  private board: BoardModel;
  private factory: TileFactory;
  private finder: AdjacencyGroupFinder;
  private gravity: Gravity;
  private refill: Refill;
  private validator: MoveValidator;
  private calculator: ScoreCalculator;
  private session: GameSession;
  private config: LevelConfig;

  constructor(config: LevelConfig) {
    this.config = config;
    this.factory = new TileFactory(config.tileColors);
    this.board = new BoardModel(config.rows, config.cols, this.factory);
    this.finder = new AdjacencyGroupFinder(config.minGroupSize);
    this.gravity = new Gravity();
    this.refill = new Refill();
    this.validator = new MoveValidator(this.finder);
    this.calculator = new ScoreCalculator(
      config.minGroupSize,
      config.superTileThreshold
    );
    this.session = new GameSession(config);

    while (!this.validator.hasValidMoves(this.board)) {
      this.board.reset();
    }
  }

  public applyTap(row: number, col: number): TurnResult | null {
    if (!this.session.isPlaying()) return null;

    const tile = this.board.getTile(row, col);
    if (!tile) return null;

    const action = this.resolveTapAction(tile, row, col);
    if (!action) return null;

    return this.processBurn(action.targets, action.superSpawned, action.scoreInput, action.originalTileId);
  }

  public applyTeleport(
    rowA: number,
    colA: number,
    rowB: number,
    colB: number
  ): TurnResult | null {
    if (!this.session.isPlaying()) return null;
    if (rowA === rowB && colA === colB) return null;

    const tileA = this.board.getTile(rowA, colA);
    const tileB = this.board.getTile(rowB, colB);
    if (!tileA || !tileB) return null;

    this.board.setTile(rowA, colA, tileB);
    this.board.setTile(rowB, colB, tileA);

    this.session.spendMove();
    this.session.evaluate(this.validator.hasValidMoves(this.board));

    return {
      burned: [],
      falls: [],
      spawns: [],
      superSpawned: null,
      score: 0,
      totalScore: this.session.getScore(),
      movesLeft: this.session.getMovesLeft(),
      phase: this.session.getPhase(),
      shuffled: false,
      boardSnapshot: null,
      swap: {
        idA: tileA.id,
        idB: tileB.id,
        rowA,
        colA,
        rowB,
        colB,
      },
    };
  }

  public applyBoosterBomb(row: number, col: number): TurnResult | null {
    if (!this.session.isPlaying()) return null;

    const tile = this.board.getTile(row, col);
    if (!tile) return null;

    const policy = new RadiusBurnPolicy(this.config.boosterBombRadius);
    const targets = policy.getTargets(this.board, tile);

    return this.processBurn(targets, null, targets.length);
  }

  private resolveTapAction(tile: TileData, row: number, col: number): TapAction | null {
    const group = tile.type === TileType.NORMAL
      ? this.finder.findGroup(this.board, row, col)
      : [];

    if (tile.type === TileType.NORMAL && !this.finder.isValidGroup(group)) {
      return null;
    }

    const policy = getBurnPolicyForTile(tile, group, this.config.boosterBombRadius);
    const targets = policy.getTargets(this.board, tile);

    let superSpawned: TileData | null = null;
    let originalTileId: number | undefined;
    if (tile.type === TileType.NORMAL && group.length >= this.config.superTileThreshold) {
      superSpawned = this.spawnSuperTile(row, col, targets, tile, group.length);
      originalTileId = tile.id;
    }

    const scoreInput = tile.type === TileType.NORMAL ? group.length : targets.length;
    return { targets, superSpawned, scoreInput, originalTileId };
  }

  private processBurn(
    targets: TileData[],
    superSpawned: TileData | null,
    scoreInput: number,
    originalTileId?: number,
  ): TurnResult {
    const burned = this.burnTargets(targets, originalTileId);
    const { falls, spawns } = this.applyPhysics();
    const score = this.calculator.calculate(scoreInput);
    this.session.addScore(score);
    this.session.spendMove();
    const { shuffled, boardSnapshot } = this.tryEnsureValidMoves();
    this.session.evaluate(this.validator.hasValidMoves(this.board));

    return {
      burned,
      falls,
      spawns,
      superSpawned,
      score,
      totalScore: this.session.getScore(),
      movesLeft: this.session.getMovesLeft(),
      phase: this.session.getPhase(),
      shuffled,
      boardSnapshot,
      swap: null,
    };
  }

  private burnTargets(targets: TileData[], originalTileId?: number): number[] {
    const burned: number[] = [];
    for (const target of targets) {
      burned.push(target.id);
      this.board.removeTile(target.row, target.col);
    }
    if (originalTileId !== undefined) {
      burned.push(originalTileId);
    }
    return burned;
  }

  private applyPhysics(): { falls: TileFall[]; spawns: TileSpawn[] } {
    return {
      falls: this.gravity.apply(this.board),
      spawns: this.refill.apply(this.board),
    };
  }

  private tryEnsureValidMoves(): { shuffled: boolean; boardSnapshot: TileBoardSnapshot[] | null } {
    let shuffled = false;
    while (!this.validator.hasValidMoves(this.board) && this.session.canShuffle()) {
      this.shuffleBoard();
      this.session.incrementShuffle();
      shuffled = true;
    }
    return {
      shuffled,
      boardSnapshot: shuffled ? this.takeBoardSnapshot() : null,
    };
  }

  private takeBoardSnapshot(): TileBoardSnapshot[] {
    const snapshot: TileBoardSnapshot[] = [];
    this.board.forEachTile((t) => snapshot.push({
      id: t.id,
      color: t.color,
      type: t.type,
      row: t.row,
      col: t.col,
    }));
    return snapshot;
  }

  private pickSuperTileType(
    groupLength: number,
    movesUsedBeforeThisTurn: number
  ): TileType {
    if (groupLength >= 8) {
      const min = this.config.minMovesBeforeSuperAll;
      if (min > 0 && movesUsedBeforeThisTurn < min) {
        const types = [
          TileType.SUPER_ROW,
          TileType.SUPER_COL,
          TileType.SUPER_BOMB,
        ];
        return types[Math.floor(Math.random() * types.length)];
      }
      return TileType.SUPER_ALL;
    }
    if (groupLength === 7) return TileType.SUPER_BOMB;
    return Math.random() < 0.5 ? TileType.SUPER_ROW : TileType.SUPER_COL;
  }

  private spawnSuperTile(
    row: number,
    col: number,
    targets: TileData[],
    origin: TileData,
    groupLength: number
  ): TileData {
    const movesUsedBefore =
      this.config.movesLimit - this.session.getMovesLeft();
    const superType = this.pickSuperTileType(groupLength, movesUsedBefore);

    const idx = targets.findIndex((t) => t.row === row && t.col === col);
    if (idx !== -1) targets.splice(idx, 1);

    const superTile = this.factory.create(row, col);
    superTile.color = origin.color;
    superTile.type = superType;
    this.board.setTile(row, col, superTile);

    return superTile;
  }

  private shuffleBoard(): void {
    const tiles: TileData[] = [];
    this.board.forEachTile((t) => tiles.push(t));

    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tileA = tiles[i];
      const tileB = tiles[j];

      this.board.setTile(tileA.row, tileA.col, tileB);
      this.board.setTile(tileB.row, tileB.col, tileA);

      const tempRow = tileA.row;
      const tempCol = tileA.col;
      tileA.row = tileB.row;
      tileA.col = tileB.col;
      tileB.row = tempRow;
      tileB.col = tempCol;
    }
  }

  public getTile(row: number, col: number): TileData | null {
    return this.board.getTile(row, col);
  }

  public getBoardSize(): { rows: number; cols: number } {
    return { rows: this.board.rows, cols: this.board.cols };
  }

  public getBoardSnapshot(): TileBoardSnapshot[] {
    return this.takeBoardSnapshot();
  }

  public getSession(): GameSession {
    return this.session;
  }

  public reset(): void {
    this.factory.reset();
    this.board.reset();
    this.session.reset(this.config);
  }
}
