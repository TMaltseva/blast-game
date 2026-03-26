import { TileData, TileType } from "./TileData";

export interface TileFall {
  id: number;
  fromRow: number;
  toRow: number;
  col: number;
}

export interface TileSpawn {
  tile: TileData;
}

export interface TileBoardSnapshot {
  id: number;
  color: number;
  type: TileType;
  row: number;
  col: number;
}

export interface TileSwap {
  idA: number;
  idB: number;
  rowA: number;
  colA: number;
  rowB: number;
  colB: number;
}

export const enum GamePhase {
  PLAYING = "playing",
  WON = "won",
  LOST = "lost",
}

export interface TurnResult {
  burned: number[];
  falls: TileFall[];
  spawns: TileSpawn[];
  superSpawned: TileData | null;
  score: number;
  totalScore: number;
  movesLeft: number;
  phase: GamePhase;
  shuffled: boolean;
  boardSnapshot: TileBoardSnapshot[] | null;
  swap: TileSwap | null;
}
