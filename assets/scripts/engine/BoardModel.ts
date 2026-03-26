import { TileData } from "./TileData";
import { TileFactory } from "./TileFactory";

export class BoardModel {
  private grid: (TileData | null)[][];
  private factory: TileFactory;
  public readonly rows: number;
  public readonly cols: number;

  constructor(rows: number, cols: number, factory: TileFactory) {
    this.rows = rows;
    this.cols = cols;
    this.factory = factory;
    this.grid = [];
    this.fill();
  }

  private fill(): void {
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = this.factory.create(r, c);
      }
    }
  }

  public getTile(row: number, col: number): TileData | null {
    if (!this.inBounds(row, col)) return null;
    return this.grid[row][col];
  }

  public setTile(row: number, col: number, tile: TileData | null): void {
    if (!this.inBounds(row, col)) return;
    if (tile) {
      tile.row = row;
      tile.col = col;
    }
    this.grid[row][col] = tile;
  }

  public removeTile(row: number, col: number): void {
    this.setTile(row, col, null);
  }

  public spawnTile(row: number, col: number): TileData {
    const tile = this.factory.create(row, col);
    this.setTile(row, col, tile);
    return tile;
  }

  public forEachTile(
    cb: (tile: TileData, row: number, col: number) => void,
  ): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.grid[r][c];
        if (tile) cb(tile, r, c);
      }
    }
  }

  public inBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  public reset(): void {
    this.factory.reset();
    this.fill();
  }
}
