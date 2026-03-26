export enum TileColor {
  BLUE = 0,
  GREEN = 1,
  PURPLE = 2,
  RED = 3,
  YELLOW = 4,
}

export enum TileType {
  NORMAL = "normal",
  SUPER_ROW = "super_row",
  SUPER_COL = "super_col",
  SUPER_BOMB = "super_bomb",
  SUPER_ALL = "super_all",
}

export interface TileData {
  id: number;
  color: TileColor;
  type: TileType;
  row: number;
  col: number;
}
