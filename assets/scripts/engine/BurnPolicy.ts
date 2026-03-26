import { TileData, TileType } from "./TileData";
import { BoardModel } from "./BoardModel";

export interface IBurnPolicy {
  getTargets(board: BoardModel, tile: TileData): TileData[];
}

export class GroupBurnPolicy implements IBurnPolicy {
  private group: TileData[];

  constructor(group: TileData[]) {
    this.group = group;
  }

  public getTargets(_board: BoardModel, _tile: TileData): TileData[] {
    return this.group;
  }
}

//burn the whole row
export class RowBurnPolicy implements IBurnPolicy {
  public getTargets(board: BoardModel, tile: TileData): TileData[] {
    const targets: TileData[] = [];

    for (let c = 0; c < board.cols; c++) {
      const t = board.getTile(tile.row, c);
      if (t) targets.push(t);
    }
    return targets;
  }
}

//burn the whole column
export class ColBurnPolicy implements IBurnPolicy {
  public getTargets(board: BoardModel, tile: TileData): TileData[] {
    const targets: TileData[] = [];

    for (let r = 0; r < board.rows; r++) {
      const t = board.getTile(r, tile.col);
      if (t) targets.push(t);
    }
    return targets;
  }
}

//burn the whole field
export class AllBurnPolicy implements IBurnPolicy {
  public getTargets(board: BoardModel, _tile: TileData): TileData[] {
    const targets: TileData[] = [];
    board.forEachTile((t) => targets.push(t));
    return targets;
  }
}

//burn in R radius
export class RadiusBurnPolicy implements IBurnPolicy {
  private radius: number;

  constructor(radius: number) {
    this.radius = radius;
  }

  public getTargets(board: BoardModel, tile: TileData): TileData[] {
    const targets: TileData[] = [];

    for (let r = tile.row - this.radius; r <= tile.row + this.radius; r++) {
      for (let c = tile.col - this.radius; c <= tile.col + this.radius; c++) {
        const t = board.getTile(r, c);
        if (t) targets.push(t);
      }
    }
    return targets;
  }
}

export function getBurnPolicyForTile(
  tile: TileData,
  group: TileData[],
  bombRadius: number
): IBurnPolicy {
  switch (tile.type) {
    case TileType.SUPER_ROW:
      return new RowBurnPolicy();
    case TileType.SUPER_COL:
      return new ColBurnPolicy();
    case TileType.SUPER_ALL:
      return new AllBurnPolicy();
    case TileType.SUPER_BOMB:
      return new RadiusBurnPolicy(bombRadius);
    default:
      return new GroupBurnPolicy(group);
  }
}
