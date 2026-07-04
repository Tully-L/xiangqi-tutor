// 闯关学棋:六个循序渐进的教学关卡。
// 结构见 lessons.test.js 顶部注释。棋盘坐标系与 engine.js 一致。

import { legalMoves, initialBoard } from './engine.js';
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
    id: 'trade',
    title: '第六关 · 兑子有账',
    goal: '吃掉那个没人保护的子',
    intro: '吃子前先算账：车≈500、马炮≈300、相仕≈120、兵卒最小。眼前两个目标：黑马值钱但有象保着，黑卒便宜但白给。吃哪个？',
    ai: false,
    setup: () => {
      const b = E();
      put(b, 4, 5, 'rook', 'red');
      put(b, 4, 2, 'horse', 'black');
      put(b, 2, 0, 'elephant', 'black'); // 象眼(3,1)空着,正保着那匹马
      put(b, 0, 5, 'pawn', 'black');
      return b;
    },
    hint(board) {
      return { from: findPiece(board, 'red', 'rook'), to: findPiece(board, 'black', 'pawn'), text: '吃白给的卒。马虽然值钱，但它背后有象保着——吃马丢车，血亏。' };
    },
    check(board, move) {
      if (move.captured?.type === 'pawn')
        return { result: 'win', msg: '会算账了！吃子三问：它值多少？有没有人保？我的子会不会丢？「白给的才吃」能让你少输一半的棋。' };
      if (move.captured?.type === 'horse')
        return { result: 'retry', msg: '别！这马有象保着：你吃马，象立刻吃你的车。车 500 换马 300，这笔账亏大了。找那个没人保护的目标。' };
      return { result: 'retry', msg: '这关要吃子：两个目标里，挑没人保护的那个下手。' };
    },
  },
  {
    id: 'fork',
    title: '第七关 · 一子捉双',
    goal: '一步马，同时攻击黑车和黑炮',
    intro: '高手赚子靠「捉双」：一步棋同时攻击两个目标，对方只救得了一个。马的日字有八个方向——找那个能同时踩住黑车和黑炮的落点。',
    ai: false,
    setup: () => {
      const b = E();
      put(b, 5, 4, 'horse', 'red');
      put(b, 2, 1, 'rook', 'black');
      put(b, 6, 1, 'cannon', 'black');
      return b;
    },
    hint(board) {
      return { from: findPiece(board, 'red', 'horse'), to: [4, 2], text: '跳到这个点：日字一边踩着车、一边踩着炮，两个都跑不掉。' };
    },
    check(board) {
      const r = findPiece(board, 'black', 'rook');
      const c = findPiece(board, 'black', 'cannon');
      if (r && c && attacks(board, 'red', ...r) && attacks(board, 'red', ...c))
        return { result: 'win', msg: '捉双成功！黑方只能救一个，下一步你白赚一个大子。实战里马和炮最擅长这一手，学会它就学会了「赚子」。' };
      return { result: 'retry', msg: '这一步没同时攻击到两个子。数马的八个日字落点，找能一脚踩两船的那个。' };
    },
  },
  {
    id: 'opening',
    title: '第八关 · 开局三板斧',
    goal: '当头炮 → 跳马 → 出车',
    intro: '整局棋的头三步有现成的好套路：① 炮移中路瞄将（当头炮）② 马跳起来护中兵 ③ 车动起来占线。跟我走一遍，以后每盘开局都不吃亏。',
    ai: false,
    setup: () => initialBoard(),
    reply(moveCount) {
      if (moveCount === 1) return { from: [7, 0], to: [6, 2] }; // 黑跳马应对
      if (moveCount === 2) return { from: [1, 0], to: [2, 2] }; // 黑再跳马
      return null;
    },
    hint(board, moveCount = 0) {
      if (moveCount === 0) return { from: [7, 7], to: [4, 7], text: '把右炮平移到正中那条线——「当头炮」，直指黑将。' };
      if (moveCount === 1) return { from: [7, 9], to: [6, 7], text: '马向中间斜跳，正好护住中路的兵。' };
      return { from: [8, 9], to: [7, 9], text: '车横移一步亮出来——车路通了才有威力。' };
    },
    check(board, move, moveCount) {
      if (moveCount === 1) {
        if (move.moved.type === 'cannon' && move.to[0] === 4 && move.to[1] === 7)
          return { result: 'continue', msg: '好！「当头炮」架上了，炮瞄中路直指黑将。我（黑方）跳马应一步——看你的第二板斧。' };
        return { result: 'retry', msg: '第一步走「当头炮」：把任意一个炮平移到棋盘正中那条竖线上。' };
      }
      if (moveCount === 2) {
        if (move.moved.type === 'horse' && (move.to[0] === 6 || move.to[0] === 2) && move.to[1] === 7)
          return { result: 'continue', msg: '马跳好了，正护住中兵，阵型很稳。黑方也跳马——最后一板斧：出车！' };
        return { result: 'retry', msg: '第二步跳马：把马向中间斜跳一步（跳完正好保护中路的兵）。' };
      }
      if (move.moved.type === 'rook')
        return { result: 'win', msg: '三板斧完成：炮瞄中路、马护中兵、车占要道！这就是最经典的「中炮」开局。以后每盘棋开头照这个思路走，不会吃亏。' };
      return { result: 'retry', msg: '第三步出车：动一动边上的车，横移一步亮出来就行。车不出动，前面白忙。' };
    },
  },
  {
    id: 'endgame',
    title: '第九关 · 残局擒王',
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
