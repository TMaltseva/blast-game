import { TileData } from "./TileData";
import { BoardModel } from "./BoardModel";

export class AdjacencyGroupFinder {
  private minGroupSize: number;

  constructor(minGroupSize: number) {
    this.minGroupSize = minGroupSize;
  }

  //find tiles of similar color with BFS
  public findGroup(board: BoardModel, row: number, col: number): TileData[] {
    const origin = board.getTile(row, col);
    if (!origin) return [];

    const visited = new Set<number>();
    const queue: TileData[] = [origin];
    const group: TileData[] = [];

    visited.add(origin.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);

      const neighbors = this.getNeighbors(board, current.row, current.col);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id) && neighbor.color === origin.color) {
          visited.add(neighbor.id);
          queue.push(neighbor);
        }
      }
    }

    return group;
  }

  public isValidGroup(group: TileData[]): boolean {
    return group.length >= this.minGroupSize;
  }

  private getNeighbors(
    board: BoardModel,
    row: number,
    col: number
  ): TileData[] {
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    const neighbors: TileData[] = [];

    for (const [dr, dc] of directions) {
      const tile = board.getTile(row + dr, col + dc);
      if (tile) neighbors.push(tile);
    }

    return neighbors;
  }
}
