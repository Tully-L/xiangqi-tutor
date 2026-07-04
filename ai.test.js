// TDD spec for the xiangqi AI opponent (ai.js).
//
// ai.js must be a browser-safe ES module (no node APIs) and export:
//   allMoves(board, color)            -> [{ from: [x,y], to: [x,y] }] every legal move for that color
//   bestMove(board, color, depth = 3) -> { from: [x,y], to: [x,y] } | null (no legal moves)
//   PIECE_VALUES                      -> { pawn, advisor, elephant, horse, cannon, rook, general }
// Search must be minimax with alpha-beta pruning over legalMoves from ./engine.js.
// Board format and coordinates are identical to engine.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard, legalMoves } from './engine.js';
import { allMoves, bestMove, PIECE_VALUES } from './ai.js';

function emptyBoard() {
  return Array.from({ length: 10 }, () => Array(9).fill(null));
}
function put(b, x, y, type, color) { b[y][x] = { type, color }; return b; }

test('PIECE_VALUES: rook is the strongest field piece, general above everything', () => {
  assert.ok(PIECE_VALUES.rook > PIECE_VALUES.cannon);
  assert.ok(PIECE_VALUES.rook > PIECE_VALUES.horse);
  assert.ok(PIECE_VALUES.horse > PIECE_VALUES.pawn);
  assert.ok(PIECE_VALUES.general > PIECE_VALUES.rook * 10);
});

test('allMoves: matches legalMoves piece by piece on the initial board', () => {
  const b = initialBoard();
  for (const color of ['red', 'black']) {
    const moves = allMoves(b, color);
    let expected = 0;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
      if (b[y][x]?.color === color) expected += legalMoves(b, x, y).length;
    }
    assert.equal(moves.length, expected);
    for (const m of moves) {
      assert.equal(b[m.from[1]][m.from[0]].color, color);
      const ok = legalMoves(b, ...m.from).some(([mx, my]) => mx === m.to[0] && my === m.to[1]);
      assert.ok(ok, `illegal move reported: ${JSON.stringify(m)}`);
    }
  }
});

test('bestMove: returns a legal move on the initial board for both sides', () => {
  const b = initialBoard();
  for (const color of ['red', 'black']) {
    const m = bestMove(b, color);
    assert.ok(m, 'must return a move');
    const ok = legalMoves(b, ...m.from).some(([mx, my]) => mx === m.to[0] && my === m.to[1]);
    assert.ok(ok);
  }
});

test('bestMove: grabs a free piece', () => {
  const b = emptyBoard();
  put(b, 3, 9, 'general', 'red');
  put(b, 5, 0, 'general', 'black');
  put(b, 4, 5, 'rook', 'red');
  put(b, 4, 2, 'horse', 'black'); // undefended, on the rook's file
  const m = bestMove(b, 'red');
  assert.deepEqual(m.to, [4, 2]);
});

test('bestMove: prefers the safe capture over the poisoned one', () => {
  const b = emptyBoard();
  put(b, 3, 9, 'general', 'red');
  put(b, 5, 0, 'general', 'black');
  put(b, 4, 5, 'rook', 'red');
  put(b, 4, 2, 'pawn', 'black');  // defended by the horse below
  put(b, 3, 4, 'horse', 'black'); // guards (4,2); leg (3,3) is empty
  put(b, 0, 5, 'pawn', 'black');  // free pawn on the rook's rank
  const m = bestMove(b, 'red', 2);
  assert.deepEqual(m.from, [4, 5]);
  assert.notDeepEqual(m.to, [4, 2]); // taking the guarded pawn loses the rook
});

test('bestMove: takes the enemy general when it is hanging', () => {
  const b = emptyBoard();
  put(b, 3, 9, 'general', 'red');
  put(b, 5, 0, 'general', 'black');
  put(b, 5, 5, 'rook', 'red'); // open file straight onto the black general
  const m = bestMove(b, 'red');
  assert.deepEqual(m.to, [5, 0]);
});

test('bestMove: returns null when the side has no legal moves', () => {
  const b = emptyBoard();
  put(b, 3, 9, 'general', 'red');
  assert.equal(bestMove(b, 'black'), null);
});

test('bestMove: fast enough for the browser (initial position, depth 3, < 1.5s)', () => {
  const b = initialBoard();
  const t0 = Date.now();
  bestMove(b, 'black', 3);
  const elapsed = Date.now() - t0;
  assert.ok(elapsed < 1500, `took ${elapsed}ms`);
});
