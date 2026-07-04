// TDD spec for the xiangqi rules engine (engine.js).
//
// Coordinates: x = column 0-8 (left→right), y = row 0-9 (top→bottom).
// Black sits on top (y 0-4), red on bottom (y 5-9). Red moves toward y=0.
// River lies between y=4 and y=5. Palaces: x 3-5, y 0-2 (black) / y 7-9 (red).
//
// engine.js must export:
//   initialBoard()            -> 10x9 array (board[y][x]), cell = null | {type, color}
//   legalMoves(board, x, y)   -> array of [x, y] destinations for the piece at (x,y)
// Piece types: 'general' | 'advisor' | 'elephant' | 'horse' | 'rook' | 'cannon' | 'pawn'
// Colors: 'red' | 'black'

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard, legalMoves } from './engine.js';

function emptyBoard() {
  return Array.from({ length: 10 }, () => Array(9).fill(null));
}

function place(board, x, y, type, color) {
  board[y][x] = { type, color };
  return board;
}

function sortMoves(moves) {
  return [...moves].map(([x, y]) => `${x},${y}`).sort();
}

function assertMoves(actual, expected) {
  assert.deepEqual(sortMoves(actual), sortMoves(expected));
}

// ---------- initial position ----------

test('initialBoard: generals on the middle file, 32 pieces total', () => {
  const b = initialBoard();
  assert.deepEqual(b[0][4], { type: 'general', color: 'black' });
  assert.deepEqual(b[9][4], { type: 'general', color: 'red' });
  const count = b.flat().filter(Boolean).length;
  assert.equal(count, 32);
});

test('initialBoard: back ranks, cannons and pawns in standard spots', () => {
  const b = initialBoard();
  const back = ['rook', 'horse', 'elephant', 'advisor', 'general', 'advisor', 'elephant', 'horse', 'rook'];
  back.forEach((type, x) => {
    assert.deepEqual(b[0][x], { type, color: 'black' });
    assert.deepEqual(b[9][x], { type, color: 'red' });
  });
  for (const x of [1, 7]) {
    assert.deepEqual(b[2][x], { type: 'cannon', color: 'black' });
    assert.deepEqual(b[7][x], { type: 'cannon', color: 'red' });
  }
  for (const x of [0, 2, 4, 6, 8]) {
    assert.deepEqual(b[3][x], { type: 'pawn', color: 'black' });
    assert.deepEqual(b[6][x], { type: 'pawn', color: 'red' });
  }
});

// ---------- rook 车 ----------

test('rook: full open lines on an empty board', () => {
  const b = place(emptyBoard(), 4, 5, 'rook', 'red');
  assert.equal(legalMoves(b, 4, 5).length, 17); // 9 on the file + 8 on the rank
});

test('rook: blocked by friendly piece, may capture enemy piece', () => {
  const b = place(emptyBoard(), 4, 5, 'rook', 'red');
  place(b, 4, 3, 'pawn', 'red');    // friendly blocker above
  place(b, 4, 7, 'pawn', 'black');  // enemy below
  const moves = legalMoves(b, 4, 5).filter(([x]) => x === 4);
  assertMoves(moves, [[4, 4], [4, 6], [4, 7]]); // stops before friend, captures enemy, not beyond
});

// ---------- horse 马 ----------

test('horse: 8 moves from an open center', () => {
  const b = place(emptyBoard(), 4, 5, 'horse', 'red');
  assert.equal(legalMoves(b, 4, 5).length, 8);
});

test('horse: leg blocked (蹩马腿)', () => {
  const b = place(emptyBoard(), 4, 5, 'horse', 'red');
  place(b, 4, 4, 'pawn', 'black'); // blocks the two upward jumps
  const moves = legalMoves(b, 4, 5);
  assert.equal(moves.length, 6);
  assert.ok(!sortMoves(moves).includes('3,3'));
  assert.ok(!sortMoves(moves).includes('5,3'));
});

// ---------- cannon 炮 ----------

test('cannon: moves like a rook when not capturing', () => {
  const b = place(emptyBoard(), 4, 5, 'cannon', 'red');
  assert.equal(legalMoves(b, 4, 5).length, 17);
});

test('cannon: captures only over exactly one screen', () => {
  const b = place(emptyBoard(), 4, 5, 'cannon', 'red');
  place(b, 4, 3, 'pawn', 'red');    // screen
  place(b, 4, 2, 'pawn', 'black');  // target right behind the screen
  const up = legalMoves(b, 4, 5).filter(([x, y]) => x === 4 && y < 5);
  assertMoves(up, [[4, 4], [4, 2]]); // slide to 4,4; jump-capture 4,2; nothing else
});

test('cannon: cannot capture over two screens or capture the screen itself', () => {
  const b = place(emptyBoard(), 4, 5, 'cannon', 'red');
  place(b, 4, 3, 'pawn', 'red');
  place(b, 4, 2, 'pawn', 'red');
  place(b, 4, 1, 'pawn', 'black'); // behind two screens
  const up = legalMoves(b, 4, 5).filter(([x, y]) => x === 4 && y < 5);
  assertMoves(up, [[4, 4]]);
});

// ---------- elephant 相/象 ----------

test('elephant: moves 田 and cannot cross the river', () => {
  const b = place(emptyBoard(), 4, 5, 'elephant', 'red');
  assertMoves(legalMoves(b, 4, 5), [[2, 7], [6, 7]]); // (2,3)/(6,3) are across the river
});

test('elephant: blocked eye (塞象眼)', () => {
  const b = place(emptyBoard(), 4, 7, 'elephant', 'red');
  place(b, 3, 6, 'pawn', 'black'); // blocks the (2,5) diagonal
  const moves = legalMoves(b, 4, 7);
  assertMoves(moves, [[6, 5], [2, 9], [6, 9]]);
});

// ---------- advisor 仕/士 ----------

test('advisor: one diagonal step, confined to the palace', () => {
  const b = place(emptyBoard(), 4, 8, 'advisor', 'red');
  assertMoves(legalMoves(b, 4, 8), [[3, 7], [5, 7], [3, 9], [5, 9]]);
  const c = place(emptyBoard(), 3, 7, 'advisor', 'red');
  assertMoves(legalMoves(c, 3, 7), [[4, 8]]); // corner: only back to center
});

// ---------- general 帅/将 ----------

test('general: one orthogonal step, confined to the palace', () => {
  const b = place(emptyBoard(), 4, 9, 'general', 'red');
  place(b, 4, 0, 'general', 'black');
  place(b, 4, 5, 'pawn', 'black'); // breaks the face-off on the middle file
  assertMoves(legalMoves(b, 4, 9), [[3, 9], [5, 9], [4, 8]]);
});

test('general: may not move into a flying-general face-off', () => {
  const b = place(emptyBoard(), 3, 9, 'general', 'red');
  place(b, 4, 0, 'general', 'black'); // file 4 is empty
  const moves = legalMoves(b, 3, 9);
  assert.ok(!sortMoves(moves).includes('4,9'));
  assert.ok(sortMoves(moves).includes('3,8'));
});

// ---------- pawn 兵/卒 ----------

test('pawn: only straight forward before the river', () => {
  const b = place(emptyBoard(), 4, 6, 'pawn', 'red');
  assertMoves(legalMoves(b, 4, 6), [[4, 5]]);
});

test('pawn: forward or sideways after crossing, never backward', () => {
  const b = place(emptyBoard(), 4, 4, 'pawn', 'red');
  assertMoves(legalMoves(b, 4, 4), [[4, 3], [3, 4], [5, 4]]);
});

test('pawn: black moves the opposite way', () => {
  const b = place(emptyBoard(), 4, 3, 'pawn', 'black');
  assertMoves(legalMoves(b, 4, 3), [[4, 4]]);
  const c = place(emptyBoard(), 4, 5, 'pawn', 'black');
  assertMoves(legalMoves(c, 4, 5), [[4, 6], [3, 5], [5, 5]]);
});

// ---------- general sanity ----------

test('no piece may capture its own color', () => {
  const b = place(emptyBoard(), 4, 5, 'rook', 'red');
  place(b, 4, 4, 'pawn', 'red');
  assert.ok(!sortMoves(legalMoves(b, 4, 5)).includes('4,4'));
});

test('every piece in the initial position can be queried without crashing', () => {
  const b = initialBoard();
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    if (b[y][x]) assert.doesNotThrow(() => legalMoves(b, x, y));
  }
  assertMoves(legalMoves(b, 2, 9), [[0, 7], [4, 7]]); // bottom-rank elephant
});

test('moves never leave the board', () => {
  const b = place(emptyBoard(), 0, 0, 'rook', 'red');
  for (const [x, y] of legalMoves(b, 0, 0)) {
    assert.ok(x >= 0 && x <= 8 && y >= 0 && y <= 9);
  }
});
