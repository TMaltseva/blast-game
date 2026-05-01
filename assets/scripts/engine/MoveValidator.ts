import { BoardModel } from "./BoardModel";
import { AdjacencyGroupFinder } from "./AdjacencyGroupFinder";

export class MoveValidator {
  private finder: AdjacencyGroupFinder;

  constructor(finder: AdjacencyGroupFinder) {
    this.finder = finder;
  }

  public hasValidMoves(board: BoardModel): boolean {
    const checked = new Set<number>();

    let found = false;

    board.forEachTile((tile) => {
      if (found) return;
      if (checked.has(tile.id)) return;

      const group = this.finder.findGroup(board, tile.row, tile.col);
      group.forEach((t) => checked.add(t.id));

      if (this.finder.isValidGroup(group)) {
        found = true;
      }
    });

    return found;
  }
}
