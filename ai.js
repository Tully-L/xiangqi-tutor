import { legalMoves } from './engine.js';

export const PIECE_VALUES = {
  pawn: 70,
  advisor: 120,
  elephant: 120,
  horse: 270,
  cannon: 285,
  rook: 500,
  general: 10000,
};

const WIDTH = 9;
const HEIGHT = 10;
const WIN_SCORE = 1_000_000;

const opponent = (color) => (color === 'red' ? 'black' : 'red');

export function allMoves(board, color) {
  const moves = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (board[y][x]?.color !== color) continue;
      for (const [tx, ty] of legalMoves(board, x, y)) {
        moves.push({ from: [x, y], to: [tx, ty] });
      }
    }
  }
  return moves;
}

export function bestMove(board, color, depth = 3) {
  const moves = orderedMoves(board, color);
  if (moves.length === 0) return null;

  let best = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const searchDepth = Math.max(0, depth - 1);

  for (const move of moves) {
    const score = minimax(applyMove(board, move), opponent(color), searchDepth, color, alpha, Infinity);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
    alpha = Math.max(alpha, bestScore);
  }

  return best;
}

function minimax(board, turn, depth, rootColor, alpha, beta) {
  const terminalScore = generalScore(board, rootColor);
  if (terminalScore !== null) return terminalScore;
  if (depth === 0) return evaluate(board, rootColor);

  const moves = orderedMoves(board, turn);
  if (moves.length === 0) return evaluate(board, rootColor);

  if (turn === rootColor) {
    let score = -Infinity;
    for (const move of moves) {
      score = Math.max(score, minimax(applyMove(board, move), opponent(turn), depth - 1, rootColor, alpha, beta));
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return score;
  }

  let score = Infinity;
  for (const move of moves) {
    score = Math.min(score, minimax(applyMove(board, move), opponent(turn), depth - 1, rootColor, alpha, beta));
    beta = Math.min(beta, score);
    if (alpha >= beta) break;
  }
  return score;
}

function evaluate(board, rootColor) {
  let score = 0;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const piece = board[y][x];
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] + positionBonus(piece, x, y);
      score += piece.color === rootColor ? value : -value;
    }
  }
  return score;
}

function positionBonus(piece, x, y) {
  if (piece.type !== 'pawn') return 0;
  const progress = piece.color === 'red' ? 9 - y : y;
  const center = 4 - Math.abs(4 - x);
  return progress * 2 + center;
}

function generalScore(board, rootColor) {
  let hasRootGeneral = false;
  let hasEnemyGeneral = false;
  const enemy = opponent(rootColor);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const piece = board[y][x];
      if (piece?.type !== 'general') continue;
      if (piece.color === rootColor) hasRootGeneral = true;
      if (piece.color === enemy) hasEnemyGeneral = true;
    }
  }

  if (!hasRootGeneral) return -WIN_SCORE;
  if (!hasEnemyGeneral) return WIN_SCORE;
  return null;
}

function applyMove(board, move) {
  const next = board.map((row) => row.slice());
  const [fx, fy] = move.from;
  const [tx, ty] = move.to;
  next[ty][tx] = next[fy][fx];
  next[fy][fx] = null;
  return next;
}

function orderedMoves(board, color) {
  return allMoves(board, color).sort((a, b) => moveScore(board, b) - moveScore(board, a));
}

function moveScore(board, move) {
  const [fx, fy] = move.from;
  const [tx, ty] = move.to;
  const moving = board[fy][fx];
  const captured = board[ty][tx];
  if (!captured || !moving) return 0;
  return PIECE_VALUES[captured.type] * 10 - PIECE_VALUES[moving.type];
}
