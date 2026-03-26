import { TileData, TileColor, TileType } from "./TileData";

export class TileFactory {
  private nextId = 0;
  private colorCount: number;

  constructor(colorCount: number) {
    this.colorCount = colorCount;
  }

  public create(row: number, col: number): TileData {
    return {
      id: this.nextId++,
      color: Math.floor(Math.random() * this.colorCount) as TileColor,
      type: TileType.NORMAL,
      row,
      col,
    };
  }

  public reset(): void {
    this.nextId = 0;
  }
}
