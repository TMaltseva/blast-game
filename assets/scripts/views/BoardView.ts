import { TileView } from "./TileView";
import {
  TurnResult,
  TileBoardSnapshot,
  TileFall,
  TileSpawn,
  TileSwap,
} from "../engine/TurnResult";
import { TileType } from "../engine/TileData";
import { Signal } from "../utils/Signal";
import { ParticlePool } from "../utils/ParticlePool";

const { ccclass, property } = cc._decorator;

@ccclass
export class BoardView extends cc.Component {
  @property(cc.Prefab)
  tilePrefab: cc.Prefab = null;

  @property([cc.SpriteFrame])
  tileSprites: cc.SpriteFrame[] = [];

  @property([cc.SpriteFrame])
  superTileSprites: cc.SpriteFrame[] = [];

  @property(cc.Integer)
  tileSize: number = 60;

  private boardRows: number = 9;
  private boardCols: number = 7;

  private tileMap: Map<number, TileView> = new Map();
  private pool: cc.Node[] = [];
  public readonly onTileTap = new Signal<{ row: number; col: number }>();

  onLoad() {
    this.node.zIndex = 0;
    if (this.node.children.length > 0) {
      this.node.children[0].zIndex = 0;
      this.node.sortAllChildren();
    }
    this.node.on(cc.Node.EventType.TOUCH_START, this.onBoardTouch, this);
  }

  private onBoardTouch(event: cc.Event.EventTouch): void {
    const localPos = this.node.convertToNodeSpaceAR(event.getLocation());

    const col = Math.floor(localPos.x / this.tileSize);
    const row = Math.floor(-localPos.y / this.tileSize);

    if (row < 0 || row >= this.boardRows || col < 0 || col >= this.boardCols) {
      return;
    }

    this.onTileTap.emit({ row, col });
  }

  public playInvalidTapAt(row: number, col: number, tileId?: number): void {
    let view: TileView | undefined;
    if (tileId !== undefined) {
      view = this.tileMap.get(tileId);
      if (!view) {
        this.tileMap.forEach((v) => {
          if (v.getId() === tileId) view = v;
        });
      }
    }
    if (!view) {
      view = this.findViewAt(row, col) ?? undefined;
    }
    view?.playInvalidTap();
  }

  private findViewAt(row: number, col: number): TileView | null {
    const s = this.tileSize;
    let found: TileView | null = null;
    this.tileMap.forEach((v) => {
      if (found) return;
      const c = Math.round((v.node.x - s * 0.5) / s);
      const r = Math.round((-v.node.y - s * 0.5) / s);
      if (r === row && c === col) {
        found = v;
      }
    });
    return found;
  }

  public buildBoard(
    snapshot: TileBoardSnapshot[],
    rows: number = 9,
    cols: number = 7,
  ): void {
    this.boardRows = rows;
    this.boardCols = cols;
    this.clearBoard();

    for (const data of snapshot) {
      const isSuper = data.type !== TileType.NORMAL;
      const superIdx = isSuper
        ? this.getSuperSpriteTypeIndex(data.type)
        : undefined;
      const view = this.spawnTileView(
        data.id,
        data.color,
        data.row,
        data.col,
        isSuper,
        superIdx,
      );
      if (isSuper) {
        view.playSuper();
      }
    }

    this.node.setContentSize(
      this.boardCols * this.tileSize,
      this.boardRows * this.tileSize,
    );
  }

  public async applyTurnResult(
    result: TurnResult,
    opts?: { bombEffectAt?: { row: number; col: number } },
  ): Promise<void> {
    if (result.shuffled && result.boardSnapshot) {
      await this.playShuffleAndRebuild(result.boardSnapshot);
      return;
    }

    if (result.swap) {
      await this.playSwap(result.swap);
      return;
    }

    if (opts?.bombEffectAt) {
      const w = this.worldPosForCell(opts.bombEffectAt.row, opts.bombEffectAt.col);
      ParticlePool.playBombBurst(this.node, w);
    }

    await this.playBurned(result.burned);

    if (result.superSpawned) {
      const super_ = result.superSpawned;
      if (!this.tileMap.has(super_.id)) {
        const typeIndex = this.getSuperSpriteTypeIndex(super_.type);
        const view = this.spawnTileView(
          super_.id,
          super_.color,
          super_.row,
          super_.col,
          true,
          typeIndex,
        );
        view.playSuper();
      } else {
        this.tileMap.get(super_.id)?.playSuper();
      }
    }

    await this.playFalls(result.falls);
    await this.playSpawns(result.spawns);
  }

  private async playBurned(burned: number[]): Promise<void> {
    const anims = burned.map((id) => {
      const view = this.tileMap.get(id);
      if (!view) {
        return Promise.resolve();
      }
      this.tileMap.delete(id);
      return view
        .playBurn(view.getColorIndex())
        .then(() => this.returnToPool(view.node))
        .catch((e) => {
          console.error("playBurn error:", id, e);
          this.returnToPool(view.node);
        });
    });
    await Promise.all(anims);
  }

  private async playFalls(falls: TileFall[]): Promise<void> {
    const anims = falls.map((fall) => {
      const view = this.tileMap.get(fall.id);
      if (!view) return Promise.resolve();
      const toY = this.rowToY(fall.toRow);
      return view.playFall(toY, this.tileSize).then(() => {
        if (view.isSuper()) view.playSuper();
      });
    });
    await Promise.all(anims);
  }

  private async playSpawns(spawns: TileSpawn[]): Promise<void> {
    const anims = spawns.map((spawn) => {
      const { tile } = spawn;
      const view = this.spawnTileView(
        tile.id,
        tile.color,
        tile.row,
        tile.col,
        false,
      );
      return view.playSpawn(tile.row, this.tileSize);
    });
    await Promise.all(anims);
  }

  private async playSwap(swap: TileSwap): Promise<void> {
    const viewA = this.tileMap.get(swap.idA);
    const viewB = this.tileMap.get(swap.idB);
    if (!viewA || !viewB) return;

    const toXA = this.colToX(swap.colB);
    const toYA = this.rowToY(swap.rowB);
    const toXB = this.colToX(swap.colA);
    const toYB = this.rowToY(swap.rowA);

    await Promise.all([
      new Promise<void>((resolve) => {
        cc.Tween.stopAllByTarget(viewA.node);
        cc.tween(viewA.node)
          .to(0.3, { x: toXA, y: toYA }, { easing: "sineInOut" })
          .call(() => resolve())
          .start();
      }),
      new Promise<void>((resolve) => {
        cc.Tween.stopAllByTarget(viewB.node);
        cc.tween(viewB.node)
          .to(0.3, { x: toXB, y: toYB }, { easing: "sineInOut" })
          .call(() => resolve())
          .start();
      }),
    ]);
  }

  public highlightTileAt(row: number, col: number): void {
    const view = this.findViewAt(row, col);
    if (!view) return;
    cc.Tween.stopAllByTarget(view.node);
    cc.tween(view.node)
      .repeatForever(
        cc
          .tween(view.node)
          .to(0.3, { scaleX: 1.15, scaleY: 1.15 })
          .to(0.3, { scaleX: 1.0, scaleY: 1.0 }),
      )
      .start();
  }

  public clearHighlight(): void {
    this.tileMap.forEach((view) => {
      if (!view.isSuper()) {
        cc.Tween.stopAllByTarget(view.node);
        view.node.scaleX = 1;
        view.node.scaleY = 1;
      }
    });
  }

  private async playShuffleAndRebuild(
    snapshot: TileBoardSnapshot[],
  ): Promise<void> {
    await this.playFadeAll(false);
    this.buildBoard(snapshot, this.boardRows, this.boardCols);
    await this.playFadeAll(true);
  }

  private playFadeAll(show: boolean): Promise<void> {
    return new Promise((resolve) => {
      const target = show ? 255 : 0;
      let completed = 0;
      const total = this.tileMap.size;

      if (total === 0) {
        resolve();
        return;
      }

      this.tileMap.forEach((view) => {
        cc.tween(view.node)
          .to(0.2, { opacity: target })
          .call(() => {
            completed++;
            if (completed >= total) resolve();
          })
          .start();
      });
    });
  }

  private getSuperSpriteTypeIndex(type: TileType): number | undefined {
    const idx = [
      TileType.SUPER_ROW,
      TileType.SUPER_COL,
      TileType.SUPER_BOMB,
      TileType.SUPER_ALL,
    ].indexOf(type);
    return idx >= 0 ? idx : undefined;
  }

  private spawnTileView(
    id: number,
    colorIndex: number,
    row: number,
    col: number,
    isSuper = false,
    superType?: number,
  ): TileView {
    const node = this.getFromPool();
    const view = node.getComponent(TileView);

    view.reset();

    if (
      isSuper &&
      superType !== undefined &&
      this.superTileSprites[superType]
    ) {
      view.setupWithSprite(
        id,
        colorIndex,
        this.superTileSprites[superType],
        true,
        this.tileSize,
      );
    } else {
      view.setup(id, colorIndex, this.tileSprites, isSuper, this.tileSize);
    }

    node.active = true;
    node.x = this.colToX(col);
    node.y = this.rowToY(row);

    this.node.addChild(node, 1);
    this.tileMap.set(id, view);

    return view;
  }

  private getFromPool(): cc.Node {
    const node = this.pool.pop();
    if (node) return node;
    return cc.instantiate(this.tilePrefab);
  }

  private returnToPool(node: cc.Node): void {
    cc.Tween.stopAllByTarget(node);
    node.active = false;
    node.opacity = 255;
    node.scaleX = 1;
    node.scaleY = 1;
    node.removeFromParent(false);
    this.pool.push(node);
  }

  private clearBoard(): void {
    this.tileMap.forEach((view) => this.returnToPool(view.node));
    this.tileMap.clear();
  }

  private rowToY(row: number): number {
    return -(row * this.tileSize + this.tileSize * 0.5);
  }

  private colToX(col: number): number {
    return col * this.tileSize + this.tileSize * 0.5;
  }

  private worldPosForCell(row: number, col: number): cc.Vec2 {
    const local = cc.v2(this.colToX(col), this.rowToY(row));
    return this.node.convertToWorldSpaceAR(local);
  }
}
