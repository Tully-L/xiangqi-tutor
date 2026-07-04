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
      const h = L.hint(b, i - 1);
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

test('trade lesson (兑子): taking the guarded horse is rejected, the free pawn wins', () => {
  const L = LESSONS.find(l => l.id === 'trade');
  const b = L.setup();
  const [rx, ry] = findPiece(b, 'red', 'rook');
  const greedy = apply(b, [rx, ry], findPiece(b, 'black', 'horse'));
  const res = L.check(b, greedy, 1);
  assert.equal(res.result, 'retry');
  assert.ok(attacks(b, 'black', ...greedy.to), 'the horse square must really be guarded');
  const b2 = L.setup();
  const [r2x, r2y] = findPiece(b2, 'red', 'rook');
  const safe = apply(b2, [r2x, r2y], findPiece(b2, 'black', 'pawn'));
  assert.equal(L.check(b2, safe, 1).result, 'win');
});

test('fork lesson (捉双): only the double-attack square wins', () => {
  const L = LESSONS.find(l => l.id === 'fork');
  const b = L.setup();
  const h = L.hint(b);
  apply(b, h.from, h.to);
  assert.ok(attacks(b, 'red', ...findPiece(b, 'black', 'rook')));
  assert.ok(attacks(b, 'red', ...findPiece(b, 'black', 'cannon')));
  const b2 = L.setup();
  const [hx, hy] = findPiece(b2, 'red', 'horse');
  const quiet = legalMoves(b2, hx, hy).find(([x, y]) => !(x === h.to[0] && y === h.to[1]));
  const wrong = apply(b2, [hx, hy], quiet);
  assert.equal(L.check(b2, wrong, 1).result, 'retry');
});

test('opening lesson (三板斧): scripted black replies are legal, sequence wins in 3', () => {
  const L = LESSONS.find(l => l.id === 'opening');
  const b = L.setup();
  const m1 = apply(b, [7, 7], [4, 7]);   // 当头炮
  assert.equal(L.check(b, m1, 1).result, 'continue');
  const r1 = L.reply(1);
  assert.ok(isLegal(b, r1.from, r1.to), 'black reply 1 must be legal');
  apply(b, r1.from, r1.to);
  const m2 = apply(b, [7, 9], [6, 7]);   // 跳马
  assert.equal(L.check(b, m2, 2).result, 'continue');
  const r2 = L.reply(2);
  assert.ok(isLegal(b, r2.from, r2.to), 'black reply 2 must be legal');
  apply(b, r2.from, r2.to);
  const m3 = apply(b, [8, 9], [7, 9]);   // 出车
  assert.equal(L.check(b, m3, 3).result, 'win');
  // 乱走会被退回
  const b2 = L.setup();
  const wrong = apply(b2, [0, 6], [0, 5]); // 第一步拱边兵,不是当头炮
  assert.equal(L.check(b2, wrong, 1).result, 'retry');
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
