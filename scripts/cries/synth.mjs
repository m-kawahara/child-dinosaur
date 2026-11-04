// なき声を作る部品。声の元（倍音）→ 声の響き（フォルマント）→ 息の音・ひずみ・残響、の順に重ねる。
// 音は 44.1kHz のモノラル（Float32Array、-1〜1）。時間はすべて秒。
export const SR = 44100;

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => t * t * (3 - 2 * t);

/** 折れ線 [[秒, 値], ...] の t 秒の値（値は数か、数の配列） */
export const curve = (points, t) => {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [t1, v1] = points[i];
    if (t <= t1) {
      const [t0, v0] = points[i - 1];
      const k = (t - t0) / (t1 - t0);
      return Array.isArray(v0) ? v0.map((a, j) => a + (v1[j] - a) * k) : v0 + (v1 - v0) * k;
    }
  }
  return points[points.length - 1][1];
};

/** 決まった種から同じ列を出す乱数（0〜1） */
const random = (seed) => {
  let a = seed * 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** なめらかなゆらぎ（-1〜1）。x が 1 進むごとに新しい値へ移る */
const wobble = (seed) => {
  const r = random(seed);
  const v = Float32Array.from({ length: 1024 }, () => r() * 2 - 1);
  return (x) => {
    const i = Math.floor(x);
    const f = smooth(x - i);
    return v[i & 1023] + (v[(i + 1) & 1023] - v[i & 1023]) * f;
  };
};

/**
 * 声の元。f0 は高さの折れ線（Hz）。倍音を 1/n^tilt で弱めながら足す（tilt が大きいほどやわらかい音）。
 * vibrato は [Hz, 深さ]、jitter は高さのゆらぎ、sub は1オクターブ下の音（うなり声のざらつき）、
 * rattle は [Hz, 深さ] の小刻みなふるえ（のどを鳴らすような音）
 */
export function voice({ seconds, f0, tilt = 1.2, vibrato = [5, 0.01], jitter = 0.01, sub = 0, rattle = [0, 0], seed = 1 }) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  const wob = wobble(seed);
  const weights = Float32Array.from({ length: 160 }, (_, h) => (h === 0 ? 0 : 1 / h ** tilt));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = curve(f0, t) * (1 + vibrato[1] * Math.sin(TAU * vibrato[0] * t) + jitter * wob(t * 30));
    phase = (phase + f / SR) % 2;
    const top = Math.min(80, Math.floor(SR / 2 / f));
    let s = 0;
    for (let h = 1; h <= top; h++) s += Math.sin(TAU * h * phase) * weights[h];
    // 1オクターブ下：f0/2 の奇数倍の音を足すと、波が1回ごとに少しちがう形になってざらつく
    if (sub > 0) for (let h = 1; h <= Math.min(2 * top, 159); h += 2) s += sub * Math.sin(Math.PI * h * phase) * weights[h];
    if (rattle[1] > 0) s *= 1 - rattle[1] * (0.5 + 0.5 * Math.sin(TAU * rattle[0] * t + 2 * wob(t * 6 + 100)));
    out[i] = s;
  }
  return normalizePeak(out);
}

/** バンドパス（RBJ、真ん中の高さは 1） */
const bandpass = (f, q) => {
  const w = (TAU * clamp(f, 20, SR * 0.45)) / SR;
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  return { b0: alpha / a0, b2: -alpha / a0, a1: (-2 * Math.cos(w)) / a0, a2: (1 - alpha) / a0 };
};

/**
 * 声の響き（フォルマント）。points は [[秒, [F1, F2, F3, ...]], ...]（Hz）、bw は帯域幅（Hz）、gains は強さ。
 * 「あ」「お」「う」のような口の形の違いは、ここで決まる
 */
export function formants(input, { points, bw = [100, 130, 200], gains = [1, 0.5, 0.25] }) {
  const out = new Float32Array(input.length);
  const st = gains.map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
  let coef = [];
  for (let i = 0; i < input.length; i++) {
    if (i % 32 === 0) {
      const fs = curve(points, i / SR);
      coef = gains.map((_, k) => bandpass(fs[k], fs[k] / bw[k]));
    }
    const x = input[i];
    let y = 0;
    for (let k = 0; k < gains.length; k++) {
      const c = coef[k], s = st[k];
      const yk = c.b0 * x + c.b2 * s.x2 - c.a1 * s.y1 - c.a2 * s.y2;
      s.x2 = s.x1;
      s.x1 = x;
      s.y2 = s.y1;
      s.y1 = yk;
      y += gains[k] * yk;
    }
    out[i] = y;
  }
  return normalizePeak(out);
}

/** 息の音：ノイズを band（[低, 高] Hz）にしぼる */
export function breath({ seconds, band, seed = 9 }) {
  const r = random(seed);
  const white = Float32Array.from({ length: Math.round(seconds * SR) }, () => r() * 2 - 1);
  const center = Math.sqrt(band[0] * band[1]);
  return formants(white, { points: [[0, [center]]], bw: [band[1] - band[0]], gains: [1] });
}

/** 大きさを折れ線 [[秒, 0〜1], ...] で変える */
export const envelope = (input, points) => input.map((x, i) => x * curve(points, i / SR));

/** いくつかの音を、[音, 大きさ, 始まる秒] で重ねる */
export function mix(parts) {
  const n = Math.max(...parts.map(([s, , at = 0]) => s.length + Math.round(at * SR)));
  const out = new Float32Array(n);
  for (const [s, gain, at = 0] of parts) {
    const o = Math.round(at * SR);
    for (let i = 0; i < s.length; i++) out[o + i] += s[i] * gain;
  }
  return out;
}

/** ゆるいひずみ。amount が大きいほど、がさがさした音になる */
export const drive = (input, amount) => {
  const k = Math.tanh(amount);
  return normalizePeak(input).map((x) => Math.tanh(amount * x) / k);
};

/**
 * 小さな残響（Schroeder：くし形4つ＋オールパス2つ）。wet は残響の大きさ、size は部屋の大きさ、tail は残す長さ（秒）
 */
export function reverb(input, { wet = 0.2, size = 1, tail = 0.8 }) {
  const n = input.length + Math.round(tail * SR);
  const dry = new Float32Array(n);
  dry.set(input);
  const wetSig = new Float32Array(n);
  for (const d of [1116, 1188, 1277, 1356].map((x) => Math.round(x * size))) {
    const buf = new Float32Array(d);
    let p = 0;
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const y = buf[p];
      lp = y * 0.6 + lp * 0.4; // 高い音ほど早く消える
      buf[p] = dry[i] + lp * 0.8;
      wetSig[i] += y * 0.25;
      p = (p + 1) % d;
    }
  }
  for (const d of [225, 556].map((x) => Math.round(x * size))) {
    const buf = new Float32Array(d);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const b = buf[p];
      const x = wetSig[i];
      buf[p] = x + b * 0.5;
      wetSig[i] = b - x * 0.5;
      p = (p + 1) % d;
    }
  }
  return dry.map((x, i) => x + wetSig[i] * wet);
}

function normalizePeak(input) {
  let peak = 0;
  for (const x of input) peak = Math.max(peak, Math.abs(x));
  return peak > 0 ? input.map((x) => x / peak) : input;
}

/**
 * 仕上げ：いちばん大きい 0.3 秒の大きさをそろえ（どの恐竜も同じくらいの大きさに）、
 * 大きすぎるところはやわらかくおさえ、はじめと終わりを短くフェードする
 */
export function finish(input, loudness = 0.22) {
  const w = Math.round(0.3 * SR);
  let sum = 0;
  let best = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input[i] * input[i];
    if (i >= w) sum -= input[i - w] * input[i - w];
    best = Math.max(best, sum);
  }
  const gain = loudness / Math.sqrt(best / w);
  const knee = 0.8;
  const fadeIn = Math.round(0.005 * SR);
  const fadeOut = Math.round(0.05 * SR);
  return input.map((x, i) => {
    let y = x * gain;
    const a = Math.abs(y);
    if (a > knee) y = Math.sign(y) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)) * 0.98);
    return y * Math.min(1, i / fadeIn, (input.length - 1 - i) / fadeOut);
  });
}

/** 16bit のモノラル WAV */
export function wavBytes(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // モノラル
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((x, i) => buf.writeInt16LE(Math.round(clamp(x, -1, 1) * 32767), 44 + i * 2));
  return buf;
}
