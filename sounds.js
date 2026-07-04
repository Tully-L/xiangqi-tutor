// 纯合成音效与配乐(Web Audio):落子木声、吃子、警示、胜负,以及古筝风五声音阶配乐循环。
// 无采样文件;非浏览器环境(node 测试)自动降级为 no-op。

const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
let ctx = null;

function ac() {
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 拨弦:基频 + 轻微失谐泛音,指数衰减,近似古筝音色
function pluck(freq, delay = 0, dur = 0.6, gain = 0.1) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const g = c.createGain();
  g.connect(c.destination);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  for (const [mult, vol, type] of [[1, 1, 'triangle'], [2.004, 0.35, 'sine'], [3.01, 0.12, 'sine']]) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq * mult;
    const og = c.createGain();
    og.gain.value = vol;
    o.connect(og);
    og.connect(g);
    o.start(t0);
    o.stop(t0 + dur);
  }
}

// 木声:短促的频率下滑,模拟棋子磕在木盘上
function thock(f1, f2, dur = 0.09, gain = 0.22, delay = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur);
}

export const sfx = {
  select() { thock(950, 700, 0.05, 0.1); },
  move() { thock(240, 130, 0.1, 0.25); },
  capture() { thock(500, 180, 0.13, 0.3); thock(240, 110, 0.09, 0.2, 0.05); },
  warn() { pluck(440, 0, 0.25, 0.09); pluck(415.3, 0.13, 0.35, 0.09); },
  praise() { pluck(659.25, 0, 0.3, 0.07); pluck(880, 0.09, 0.45, 0.07); },
  win() { [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => pluck(f, i * 0.11, 0.9, 0.09)); },
  lose() { [392, 329.63, 261.63].forEach((f, i) => pluck(f, i * 0.16, 0.7, 0.08)); },
};

// —— 配乐:C 宫五声音阶随机漫步,低音量循环 ——
const SCALE = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
let mTimer = null;
let idx = 4;

export const music = {
  get playing() { return !!mTimer; },
  toggle() {
    if (mTimer) {
      clearInterval(mTimer);
      mTimer = null;
      return false;
    }
    if (!ac()) return false;
    mTimer = setInterval(() => {
      if (Math.random() < 0.22) return; // 留白,呼吸感
      idx = Math.min(SCALE.length - 1, Math.max(0, idx + Math.floor(Math.random() * 5) - 2));
      pluck(SCALE[idx], 0, 1.8, 0.045);
      if (Math.random() < 0.25) pluck(SCALE[idx] / 2, 0.06, 2.2, 0.03); // 偶尔叠低八度
    }, 640);
    return true;
  },
};
