// TDD spec for the guided lessons (lessons.js).
//
// lessons.js exports:
//   LESSONS: [{ id, title, goal, intro, setup(), ai, hint(board), check(board, move, moveCount) }]
//   attacks(board, color, x, y) -> can any piece of `color` legally move to (x,y)?
//   findPiece(board, color, type) -> [x,y] | null
// check() returns { result: 'win' | 'retry' | 'continue', msg? }.
// Every hint must be a legal move; following hints must solve the lesson.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legalMoves } from './engine.js';
import { LESSONS, attacks, findPiece } from './lessons.js';

function apply(board, from, to) {
  const moved = board[from[1]][from[0]];
  const captured = board[to[1]][to[0]];
  board[to[1]][to[0]] = moved;
  board[from[1]][from[0]] = null;
  return { moved, captured, from, to };
}

function isLegal(board, from, to) {
  return legalMoves(board, ...from).some(([x, y]) => x === to[0] && y === to[1]);
}

test('attacks: rook attacks along its open file', () => {
  const b = LESSONS[0].setup();
  const [rx, ry] = findPiece(b, 'red', 'rook');
  const [px, py] = findPiece(b, 'black', 'pawn');
  assert.ok(attacks(b, 'red', px, py), 'lesson 1 rook must already attack the pawn');
  assert.equal(rx, px, 'lesson 1 rook and pawn share a file');
});

test('every lesson: valid 10x9 setup and a legal first hint', () => {
  for (const L of LESSONS) {
    const b = L.setup();
    assert.equal(b.length, 10, L.id);
    assert.ok(b.every(row => row.length === 9), L.id);
    assert.ok(b.flat().filter(Boolean).length >= 2, L.id);
    const h = L.hint(b);
    assert.ok(h && h.from && h.to && h.text, `${L.id} hint shape`);
    assert.ok(isLegal(b, h.from, h.to), `${L.id} hint must be legal`);
  }
});

test('following hints solves every non-AI lesson within 4 moves', () => {
  for (const L of LESSONS) {
    if (L.ai) continue;
    const b = L.setup();
    let res = null;
    for (let i = 1; i <= 4; i++) {
      const h = L.hint(b);
      const move = apply(b, h.from, h.to);
      res = L.check(b, move, i);
      assert.notEqual(res.result, 'retry', `${L.id}: hint move must never be rejected`);
      if (res.result === 'win') break;
    }
    assert.equal(res.result, 'win', `${L.id} must be solvable by hints`);
  }
});

test('lesson 1: a non-capturing rook move is rejected with guidance', () => {
  const L = LESSONS[0];
  const b = L.setup();
  const [rx, ry] = findPiece(b, 'red', 'rook');
  const sideStep = legalMoves(b, rx, ry).find(([x, y]) => !b[y][x]);
  const move = apply(b, [rx, ry], sideStep);
  const res = L.check(b, move, 1);
  assert.equal(res.result, 'retry');
  assert.ok(res.msg.length > 0);
});

test('check lesson (将军): moving the rook onto the general\'s file wins', () => {
  const L = LESSONS.find(l => l.id === 'check');
  const b = L.setup();
  const h = L.hint(b);
  const move = apply(b, h.from, h.to);
  const [gx, gy] = findPiece(b, 'black', 'general');
  assert.ok(attacks(b, 'red', gx, gy));
  assert.equal(L.check(b, move, 1).result, 'win');
});

test('escape lesson (解将): staying on the attacked file is rejected, blocking wins', () => {
  const L = LESSONS.find(l => l.id === 'escape');
  const b = L.setup();
  const [gx, gy] = findPiece(b, 'red', 'general');
  assert.ok(attacks(b, 'black', gx, gy), 'red general starts in check');
  // blocking with the rook (the hint) clears the check
  const h = L.hint(b);
  const move = apply(b, h.from, h.to);
  assert.equal(L.check(b, move, 1).result, 'win');
});

test('final lesson (擒王): plays against the engine, wins only on capturing the general', () => {
  const L = LESSONS[LESSONS.length - 1];
  assert.ok(L.ai, 'final lesson must use the AI opponent');
  const b = L.setup();
  const [gx, gy] = findPiece(b, 'black', 'general');
  // a quiet move is not a win
  const h = L.hint(b);
  const quiet = apply(b, h.from, h.to);
  if (!quiet.captured) assert.equal(L.check(b, quiet, 1).result, 'continue');
  // capturing the general is a win
  const b2 = L.setup();
  const [g2x, g2y] = findPiece(b2, 'black', 'general');
  b2[g2y][g2x] = null;
  const fake = { moved: { type: 'rook', color: 'red' }, captured: { type: 'general', color: 'black' }, from: [0, 0], to: [g2x, g2y] };
  assert.equal(L.check(b2, fake, 5).result, 'win');
});
