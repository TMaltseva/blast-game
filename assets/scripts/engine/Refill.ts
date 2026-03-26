import { BoardModel } from "./BoardModel";
import { TileSpawn } from "./TurnResult";

export class Refill {
  public apply(board: BoardModel): TileSpawn[] {
    const spawns: TileSpawn[] = [];

    for (let c = 0; c < board.cols; c++) {
      for (let r = 0; r < board.rows; r++) {
        const tile = board.getTile(r, c);
        if (!tile) {
          const newTile = board.spawnTile(r, c);
          spawns.push({ tile: newTile });
        }
      }
    }

    return spawns;
  }
}
