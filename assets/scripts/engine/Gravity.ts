import { BoardModel } from "./BoardModel";
import { TileFall } from "./TurnResult";

export class Gravity {
  //returns list of the tile falls
  public apply(board: BoardModel): TileFall[] {
    const falls: TileFall[] = [];

    for (let c = 0; c < board.cols; c++) {
      falls.push(...this.collapseColumn(board, c));
    }

    return falls;
  }

  private collapseColumn(board: BoardModel, col: number): TileFall[] {
    const falls: TileFall[] = [];

    let emptyRow = board.rows - 1;

    for (let r = board.rows - 1; r >= 0; r--) {
      const tile = board.getTile(r, col);

      if (tile) {
        if (r !== emptyRow) {
          board.setTile(emptyRow, col, tile);
          board.setTile(r, col, null);

          falls.push({
            id: tile.id,
            fromRow: r,
            toRow: emptyRow,
            col,
          });
        }
        emptyRow--;
      }
    }

    return falls;
  }
}
