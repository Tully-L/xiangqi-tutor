const W = 9;
const H = 10;

const inside = (x, y) => x >= 0 && x < W && y >= 0 && y < H;
const palace = (color, x, y) =>
  x >= 3 && x <= 5 && (color === 'red' ? y >= 7 && y <= 9 : y >= 0 && y <= 2);
const own = (board, x, y, color) => board[y][x]?.color === color;
const canLand = (board, x, y, color) => inside(x, y) && !own(board, x, y, color);

export function initialBoard() {
  const board = Array.from({ length: H }, () => Array(W).fill(null));
  const back = ['rook', 'horse', 'elephant', 'advisor', 'general', 'advisor', 'elephant', 'horse', 'rook'];
  for (let x = 0; x < W; x++) {
    board[0][x] = { type: back[x], color: 'black' };
    board[9][x] = { type: back[x], color: 'red' };
  }
  for (const x of [1, 7]) {
    board[2][x] = { type: 'cannon', color: 'black' };
    board[7][x] = { type: 'cannon', color: 'red' };
  }
  for (const x of [0, 2, 4, 6, 8]) {
    board[3][x] = { type: 'pawn', color: 'black' };
    board[6][x] = { type: 'pawn', color: 'red' };
  }
  return board;
}

export function legalMoves(board, x, y) {
  if (!inside(x, y) || !board[y][x]) return [];
  const piece = board[y][x];
  const moves = [];
  const add = (nx, ny) => {
    if (canLand(board, nx, ny, piece.color)) moves.push([nx, ny]);
  };

  if (piece.type === 'rook') slide(board, x, y, piece.color, moves);
  else if (piece.type === 'cannon') cannon(board, x, y, piece.color, moves);
  else if (piece.type === 'horse') horse(board, x, y, piece.color, add);
  else if (piece.type === 'elephant') elephant(board, x, y, piece.color, add);
  else if (piece.type === 'advisor') advisor(x, y, piece.color, add);
  else if (piece.type === 'general') general(board, x, y, piece.color, add);
  else if (piece.type === 'pawn') pawn(x, y, piece.color, add);

  return moves.filter(([nx, ny]) => !generalsFace(afterMove(board, x, y, nx, ny)));
}

function slide(board, x, y, color, moves) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let nx = x + dx, ny = y + dy; inside(nx, ny); nx += dx, ny += dy) {
      if (!board[ny][nx]) moves.push([nx, ny]);
      else {
        if (board[ny][nx].color !== color) moves.push([nx, ny]);
        break;
      }
    }
  }
}

function cannon(board, x, y, color, moves) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let seenScreen = false;
    for (let nx = x + dx, ny = y + dy; inside(nx, ny); nx += dx, ny += dy) {
      const target = board[ny][nx];
      if (!seenScreen) {
        if (target) seenScreen = true;
        else moves.push([nx, ny]);
      } else if (target) {
        if (target.color !== color) moves.push([nx, ny]);
        break;
      }
    }
  }
}

function horse(board, x, y, color, add) {
  for (const [dx, dy, lx, ly] of [
    [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1],
    [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0],
  ]) {
    if (!board[y + ly]?.[x + lx]) add(x + dx, y + dy);
  }
}

function elephant(board, x, y, color, add) {
  for (const [dx, dy] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
    const nx = x + dx, ny = y + dy;
    if ((color === 'red' ? ny >= 5 : ny <= 4) && !board[y + dy / 2]?.[x + dx / 2]) add(nx, ny);
  }
}

function advisor(x, y, color, add) {
  for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (palace(color, nx, ny)) add(nx, ny);
  }
}

function general(board, x, y, color, add) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (palace(color, nx, ny)) add(nx, ny);
  }
  for (let ny = y + (color === 'red' ? -1 : 1); inside(x, ny); ny += color === 'red' ? -1 : 1) {
    if (!board[ny][x]) continue;
    if (board[ny][x].type === 'general' && board[ny][x].color !== color) add(x, ny);
    break;
  }
}

function pawn(x, y, color, add) {
  const forward = color === 'red' ? -1 : 1;
  add(x, y + forward);
  if (color === 'red' ? y <= 4 : y >= 5) {
    add(x - 1, y);
    add(x + 1, y);
  }
}

function afterMove(board, x, y, nx, ny) {
  const copy = board.map((row) => row.slice());
  copy[ny][nx] = copy[y][x];
  copy[y][x] = null;
  return copy;
}

function generalsFace(board) {
  let red, black;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = board[y][x];
      if (p?.type === 'general') {
        if (p.color === 'red') red = [x, y];
        else black = [x, y];
      }
    }
  }
  if (!red || !black || red[0] !== black[0]) return false;
  const x = red[0];
  for (let y = black[1] + 1; y < red[1]; y++) {
    if (board[y][x]) return false;
  }
  return true;
}
