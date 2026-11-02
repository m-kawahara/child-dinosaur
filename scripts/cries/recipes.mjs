// 恐竜ごとのなき声。こわすぎない、アニメのような声にする。
// どれも { samples, mouth } を返す。mouth は口の開き（0〜1）の折れ線 [[秒, 開き], ...] で、3D の恐竜の口がこれに合わせて動く。
// 口の開きは、だいたい声の大きさと同じにしてある。
// 高さ（f0）は Hz、響き（formants）は「あ」「お」「う」のような口の形の違い。
import { breath, drive, envelope, formants, mix, reverb, voice } from "./synth.mjs";

/** ひと声。amp は大きさ（＝口の開き）の折れ線 */
const call = ({ seconds, amp, f0, tilt, vibrato, jitter, sub, rattle, seed, vowel, bw, gains, air = 0.2, airBand = [300, 3000] }) => {
  const v = formants(voice({ seconds, f0, tilt, vibrato, jitter, sub, rattle, seed }), { points: vowel, bw, gains });
  return envelope(mix([[v, 1], [breath({ seconds, band: airBand, seed: seed + 50 }), air]]), amp);
};

/** 折れ線を at 秒うしろへずらす */
const shift = (points, at) => points.map(([t, v]) => [t + at, v]);

export const RECIPES = {
  // ガオーッ：うなりながら、だんだん低くなる
  trex: () => {
    const amp = [[0, 0], [0.08, 1], [0.4, 0.95], [1.05, 0.75], [1.6, 0]];
    const roar = call({
      seconds: 1.6,
      amp,
      f0: [[0, 115], [0.14, 155], [0.55, 135], [1.15, 95], [1.6, 72]],
      tilt: 0.9,
      vibrato: [6, 0.015],
      jitter: 0.02,
      sub: 0.45,
      rattle: [27, 0.25],
      seed: 1,
      vowel: [[0, [700, 1150, 2550]], [0.8, [580, 920, 2350]], [1.6, [450, 780, 2250]]],
      bw: [120, 150, 220],
      gains: [1, 0.55, 0.25],
      air: 0.28,
    });
    return { samples: reverb(drive(roar, 1.8), { wet: 0.22, size: 1.2 }), mouth: amp };
  },

  // フンッ（鼻息）のあとに、ブモォー
  triceratops: () => {
    const snortAmp = [[0, 0], [0.02, 1], [0.09, 0.6], [0.2, 0]];
    const snort = envelope(breath({ seconds: 0.2, band: [500, 3200], seed: 3 }), snortAmp);
    const amp = [[0, 0], [0.12, 0.8], [0.4, 1], [0.95, 0.8], [1.3, 0]];
    const moo = call({
      seconds: 1.3,
      amp,
      f0: [[0, 92], [0.25, 126], [0.8, 115], [1.3, 84]],
      tilt: 1.1,
      vibrato: [4.5, 0.012],
      jitter: 0.015,
      sub: 0.2,
      rattle: [22, 0.12],
      seed: 4,
      // 口を閉じた「ム」から、開いた「オー」へ
      vowel: [[0, [290, 900, 2200]], [0.22, [500, 860, 2300]], [1.3, [430, 760, 2200]]],
      bw: [100, 130, 200],
      gains: [1, 0.5, 0.2],
      air: 0.15,
    });
    const at = 0.3;
    return {
      samples: reverb(drive(mix([[snort, 0.55], [moo, 1, at]]), 1.5), { wet: 0.2, size: 1.2 }),
      mouth: [[0, 0], [0.03, 0.2], [0.2, 0], ...shift(amp, at)],
    };
  },

  // ボオォーン：低くてやさしい、大きな体にひびく声
  brachiosaurus: () => {
    const amp = [[0, 0], [0.3, 0.9], [0.85, 1], [1.5, 0.75], [2.0, 0]];
    const hoot = call({
      seconds: 2.0,
      amp,
      f0: [[0, 62], [0.5, 80], [1.3, 74], [2.0, 56]],
      tilt: 1.6,
      vibrato: [4, 0.02],
      jitter: 0.008,
      seed: 5,
      vowel: [[0, [390, 780, 2200]], [2.0, [320, 640, 2100]]],
      bw: [70, 100, 160],
      gains: [1, 0.5, 0.15],
      air: 0.06,
      airBand: [150, 900],
    });
    return { samples: reverb(hoot, { wet: 0.38, size: 1.6, tail: 1.2 }), mouth: amp };
  },

  // フゴッ、フゴッ：鼻にかかった短い声を2回
  stegosaurus: () => {
    const grunt = (seed) => {
      const amp = [[0, 0], [0.03, 1], [0.14, 0.8], [0.28, 0]];
      return {
        amp,
        samples: call({
          seconds: 0.28,
          amp,
          f0: [[0, 175], [0.07, 192], [0.28, 132]],
          tilt: 0.9,
          jitter: 0.03,
          sub: 0.3,
          rattle: [34, 0.28],
          seed,
          // 鼻にかかった「ン」に近い響き
          vowel: [[0, [320, 1300, 2500]]],
          bw: [80, 200, 260],
          gains: [1, 0.4, 0.2],
          air: 0.55,
          airBand: [600, 4000],
        }),
      };
    };
    const a = grunt(6);
    const b = grunt(8);
    const at = 0.42;
    return {
      samples: reverb(drive(mix([[a.samples, 1], [b.samples, 1, at]]), 1.6), { wet: 0.16, size: 1.0 }),
      mouth: [...a.amp, ...shift(b.amp, at)],
    };
  },

  // クワッ、クワーッ：カモメのような高い声
  pteranodon: () => {
    const kwa = (seconds, f0, seed) => {
      const amp = [[0, 0], [0.04, 1], [seconds * 0.6, 0.85], [seconds, 0]];
      return {
        amp,
        samples: call({
          seconds,
          amp,
          f0,
          tilt: 0.7,
          vibrato: [12, 0.03],
          jitter: 0.02,
          sub: 0.15,
          seed,
          vowel: [[0, [1100, 2000, 3200]], [seconds, [900, 1700, 3000]]],
          bw: [150, 220, 300],
          gains: [1, 0.7, 0.35],
          air: 0.18,
          airBand: [1500, 6000],
        }),
      };
    };
    const a = kwa(0.2, [[0, 950], [0.06, 1300], [0.2, 1050]], 10);
    const b = kwa(0.5, [[0, 1000], [0.1, 1450], [0.35, 1250], [0.5, 900]], 12);
    const at = 0.3;
    return {
      samples: reverb(mix([[a.samples, 1], [b.samples, 1, at]]), { wet: 0.2, size: 0.9 }),
      mouth: [...a.amp, ...shift(b.amp, at)],
    };
  },
};
