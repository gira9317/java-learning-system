/*
 * オセロのレッスンで、プログラムが出力した盤面を読み取る。
 * 盤面の形式は第1問で決めたものと同じ（コンソールでも、画面の盤面でも同じプログラムが動く）:
 *
 *     1 2 3 4 5 6 7 8
 *   1 . . . . . . . .
 *   ...
 *   4 . . . W B . . .
 *   5 . . . B W . . .
 *   ...
 *
 * B = 黒、W = 白、. = 空き。打つ場所は「行 列」（例: 3 4）で入力する。
 */

export type Cell = "B" | "W" | ".";
export type Board = Cell[][];

const HEADER = /^\s*1 2 3 4 5 6 7 8\s*$/;
const ROW = /^([1-8]) ([.BW](?: [.BW]){7})\s*$/;

/** 出力の中で、最後に表示された盤面を返す。なければ null */
export function lastBoard(text: string): Board | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let i = lines.length - 9; i >= 0; i--) {
    if (!HEADER.test(lines[i])) continue;
    const rows: Cell[][] = [];
    for (let r = 0; r < 8; r++) {
      const m = lines[i + 1 + r]?.match(ROW);
      if (!m || Number(m[1]) !== r + 1) break;
      rows.push(m[2].split(" ") as Cell[]);
    }
    if (rows.length === 8) return rows;
  }
  return null;
}

export function countStones(board: Board) {
  let black = 0;
  let white = 0;
  for (const row of board) for (const c of row) {
    if (c === "B") black++;
    if (c === "W") white++;
  }
  return { black, white };
}
