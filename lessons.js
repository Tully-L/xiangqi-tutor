// 闯关学棋:六个循序渐进的教学关卡。
// 结构见 lessons.test.js 顶部注释。棋盘坐标系与 engine.js 一致。

import { legalMoves } from './engine.js';
import { bestMove } from './ai.js';

function E() { return Array.from({ length: 10 }, () => Array(9).fill(null)); }
function put(b, x, y, type, color) { b[y][x] = { type, color }; return b; }

export function findPiece(board, color, type) {
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    const p = board[y][x];
    if (p && p.color === color && p.type === type) return [x, y];
  }
  return null;
}

export function attacks(board, color, tx, ty) {
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    const p = board[y][x];
    if (p?.color !== color) continue;
    if (legalMoves(board, x, y).some(([mx, my]) => mx === tx && my === ty)) return true;
  }
  return false;
}

function firstLegal(board, color) {
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    if (board[y][x]?.color !== color) continue;
    const ms = legalMoves(board, x, y);
    if (ms.length) return { from: [x, y], to: ms[0] };
  }
  return null;
}

export const LESSONS = [
  {
    id: 'capture',
    title: '第一关 · 车吃卒',
    goal: '把车推过去，吃掉黑卒',
    intro: '先学最痛快的：吃子。车走直线、想走多远走多远，落点上有敌子就是吃。黑卒就在你车的正前方。',
    ai: false,
    setup: () => put(put(E(), 4, 6, 'rook', 'red'), 4, 1, 'pawn', 'black'),
    hint(board) {
      return { from: findPiece(board, 'red', 'rook'), to: findPiece(board, 'black', 'pawn'), text: '车和卒在同一条线上——直接一路推到卒那一格。' };
    },
    check(board) {
      if (!findPiece(board, 'black', 'pawn'))
        return { result: 'win', msg: '吃子成功！记住：车是全场最强的子，直线上的敌子一口气就能吃到。' };
      return { result: 'retry', msg: '没吃到。车能一口气走到底——直接走到卒那一格，落点有敌子就是吃。' };
    },
  },
  {
    id: 'horse',
    title: '第二关 · 马绕日字',
    goal: '用马吃掉正前方的黑卒',
    intro: '卒就在马的正前方，但马不能直着走——它走「日」字。先斜着绕到侧面，第二跳就能吃到。',
    ai: false,
    setup: () => put(put(put(E(), 4, 7, 'horse', 'red'), 4, 5, 'pawn', 'black'), 4, 6, 'pawn', 'black'),
    hint(board) {
      const h = findPiece(board, 'red', 'horse');
      const ms = legalMoves(board, ...h);
      if (ms.some(([x, y]) => x === 4 && y === 5))
        return { from: h, to: [4, 5], text: '就是现在！马正好踩着日字，吃掉卒。' };
      if (ms.some(([x, y]) => x === 6 && y === 6))
        return { from: h, to: [6, 6], text: '先跳到侧面这个点——下一跳正好踩到卒。' };
      return { ...firstLegal(board, 'red'), text: '先随便跳一步，找回能吃到卒的位置。' };
    },
    check(board) {
      const p = board[5][4];
      if (!p || p.color === 'red')
        return { result: 'win', msg: '好马！两跳就位。马的日字看着别扭，练熟了四面八方都是它的落点。' };
      if (attacks(board, 'red', 4, 5))
        return { result: 'continue', msg: '好，绕到位了——现在马正瞄着卒，再跳一步吃掉它！' };
      return { result: 'retry', msg: '这一步够不到卒。马走「日」字：先斜着绕到侧面，两跳就能吃到。点【提示】看路线。' };
    },
  },
  {
    id: 'cannon',
    title: '第三关 · 隔山打炮',
    goal: '用炮吃掉黑马',
    intro: '炮吃子必须隔一个子（炮架）。看这条线：你的炮 — 黑卒（炮架）— 黑马，中间正好隔一个。开炮！',
    ai: false,
    setup: () => put(put(put(E(), 4, 7, 'cannon', 'red'), 4, 4, 'pawn', 'black'), 4, 2, 'horse', 'black'),
    hint(board) {
      return { from: findPiece(board, 'red', 'cannon'), to: [4, 2], text: '越过中间的卒，直接砸在马身上。' };
    },
    check(board) {
      if (!findPiece(board, 'black', 'horse'))
        return { result: 'win', msg: '隔山打牛！炮的威力全在炮架：中间正好一个子才能吃，零个、两个都不行。' };
      return { result: 'retry', msg: '没打中。数一数这条线：炮和马之间正好隔着一个卒，直接跳过它吃马。' };
    },
  },
  {
    id: 'check',
    title: '第四关 · 将军！',
    goal: '走一步车，攻击黑将',
    intro: '「将军」就是攻击对方的将，对方必须马上应对。走一步车，让它的直线火力对准黑将。',
    ai: false,
    setup: () => put(put(E(), 1, 3, 'rook', 'red'), 4, 0, 'general', 'black'),
    hint(board) {
      return { from: findPiece(board, 'red', 'rook'), to: [4, 3], text: '把车平移到黑将所在的那条竖线上——整条线都是车的火力。' };
    },
    check(board) {
      const g = findPiece(board, 'black', 'general');
      if (g && attacks(board, 'red', ...g))
        return { result: 'win', msg: '这就是「将军」！黑将被你攻击，黑方必须马上应对——逃、挡、或者吃掉你的车。应对不了就是「将死」，你赢。' };
      return { result: 'retry', msg: '这一步没形成将军。让车和黑将处在同一条没有遮挡的直线上。' };
    },
  },
  {
    id: 'escape',
    title: '第五关 · 解将',
    goal: '解除黑车对你帅的将军',
    intro: '换你挨打了！黑车正瞄着你的帅——你正被将军。解法三招：逃（挪帅）、挡（垫子）、吃（吃掉攻击你的子）。这里试试前两招。',
    ai: false,
    setup: () => {
      const b = E();
      put(b, 4, 9, 'general', 'red');
      put(b, 8, 8, 'rook', 'red');
      put(b, 4, 4, 'rook', 'black');
      put(b, 5, 0, 'general', 'black');
      put(b, 5, 1, 'advisor', 'black');
      return b;
    },
    hint(board) {
      return { from: [8, 8], to: [4, 8], text: '把你的车挡在帅前面，这叫「垫将」——黑车的火力被截断了。' };
    },
    check(board) {
      const g = findPiece(board, 'red', 'general');
      if (g && !attacks(board, 'black', ...g))
        return { result: 'win', msg: '解将成功！记住三招：逃、挡、吃。实战里被将军千万别慌，把三招挨个过一遍。' };
      return { result: 'retry', msg: '还在被将军！帅仍然在黑车的火力线上。把帅挪出这条线，或者用车挡在中间。' };
    },
  },
  {
    id: 'endgame',
    title: '第六关 · 残局擒王',
    goal: '吃掉黑将（黑方会应对）',
    intro: '最终考验：你双车在手，黑方只剩将和双士，而且这次它会躲、会反抗。用两个车轮流将军、步步收网，把黑将擒住！',
    ai: true,
    setup: () => {
      const b = E();
      put(b, 4, 9, 'general', 'red');
      put(b, 3, 9, 'advisor', 'red');
      put(b, 5, 9, 'advisor', 'red');
      put(b, 0, 2, 'rook', 'red');
      put(b, 8, 2, 'rook', 'red');
      put(b, 4, 0, 'general', 'black');
      put(b, 3, 0, 'advisor', 'black');
      put(b, 5, 0, 'advisor', 'black');
      return b;
    },
    hint(board) {
      const m = bestMove(board, 'red', 3);
      const target = m && board[m.to[1]][m.to[0]];
      return {
        ...m,
        text: target ? `这步能吃掉黑${target.type === 'general' ? '将——直接获胜' : '子'}！` : '跟着虚线圈走：两个车一个封线、一个进攻，慢慢把黑将逼进死角。',
      };
    },
    check(board, move) {
      if (move.captured?.type === 'general')
        return { result: 'win', msg: '擒王成功！双车围杀是最经典的赢法。你已经从「会走子」升级到「会赢棋」了——去下面跟教练下一整局吧！' };
      return { result: 'continue' };
    },
  },
];
