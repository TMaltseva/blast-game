import { BoardModel } from "./BoardModel";
import { AdjacencyGroupFinder } from "./AdjacencyGroupFinder";

export class MoveValidator {
  private finder: AdjacencyGroupFinder;

  constructor(finder: AdjacencyGroupFinder) {
    this.finder = finder;
  }

  // Есть ли хоть один валидный ход на поле?
  public hasValidMoves(board: BoardModel): boolean {
    const checked = new Set<number>();

    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const tile = board.getTile(r, c);
        if (!tile || checked.has(tile.id)) continue;

        const group = this.finder.findGroup(board, r, c);
        group.forEach((t) => checked.add(t.id));

        if (this.finder.isValidGroup(group)) return true;
      }
    }

    return false;
  }
}
