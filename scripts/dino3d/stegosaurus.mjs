// ステゴサウルスの形・色・骨。
// 座標: x が前（頭の向き）、y が上、z が右。地面が y=0。単位はだいたいメートル。
import { byDistance, blendGroups } from "./mesh.mjs";
import {
  boxDist, clamp, fbm, hex, lerp3, mix, norm3, rcz, sdEllipsoid, sdRoundCone, sdSphere, smax, smin, smoothstep, withEye,
} from "./sdf.mjs";

// ---------- 胴・首・しっぽ ----------
const TAIL = [
  [-0.4, 2.55, 0.6],
  [-1.5, 2.42, 0.42],
  [-2.6, 2.15, 0.26],
  [-3.6, 1.9, 0.14],
  [-4.35, 1.76, 0.05],
];
const BOX_TORSO = [-4.5, 0.95, -1.0, 3.0, 3.4, 1.0];

function sdTorso(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.0, 2.45, 0], [0.95, 0.78, 0.62]); // 高い腰
  d = smin(d, sdEllipsoid(px, py, pz, [0.95, 2.05, 0], [1.35, 0.85, 0.78]), 0.4); // 胴
  d = smin(d, sdEllipsoid(px, py, pz, [0.7, 1.55, 0], [1.1, 0.45, 0.62]), 0.35); // おなか
  d = smin(d, sdEllipsoid(px, py, pz, [1.9, 1.55, 0], [0.72, 0.62, 0.58]), 0.35); // 低い肩
  d = smin(d, rcz(px, py, pz, [2.3, 1.55, 0], [2.95, 1.22, 0], 0.38, 0.23, 0.9), 0.2); // 首
  d = smin(d, sdEllipsoid(px, py, pz, [-0.75, 2.4, 0], [0.9, 0.58, 0.5]), 0.35); // しっぽの付け根
  for (let i = 0; i < TAIL.length - 1; i++) {
    const a = TAIL[i], b = TAIL[i + 1];
    d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.85), 0.15);
  }
  return d;
}

// ---------- 小さな頭 ----------
const lipY = (x) => 1.1 - 0.2 * (x - 3.1);
const EYE = { center: [3.12, 1.27, 0.125], axis: norm3([0.3, 0.1, 1]), radius: 0.033 };
const NOSTRIL = [3.5, 1.08, 0.045];
const BOX_HEAD = [2.75, 0.85, -0.3, 3.7, 1.5, 0.3];
const sdBeak = (px, py, pz) => rcz(px, py, pz, [3.48, 1.06, 0], [3.63, 0.98, 0], 0.055, 0.02, 0.8);

function sdHead(px, py, pz, az) {
  let d = sdEllipsoid(px, py, pz, [3.1, 1.2, 0], [0.25, 0.16, 0.15]);
  d = smin(d, rcz(px, py, pz, [3.1, 1.17, 0], [3.55, 1.03, 0], 0.15, 0.07, 0.85), 0.1); // 口先
  d = smin(d, sdEllipsoid(px, py, az, [3.15, 1.12, 0.09], [0.2, 0.1, 0.08]), 0.06); // ほお
  return smin(d, sdBeak(px, py, pz), 0.03);
}

// ---------- 足 ----------
const LZ = 0.48;
const HIP = [0.0, 2.1, LZ], KNEE = [0.4, 1.2, LZ], ANKLE = [0.08, 0.4, LZ], BALL = [0.3, 0.12, LZ], TOE_TIP = [0.56, 0.06, LZ];
const HIND_TOES = [
  [[0.3, 0.12, LZ, 0.09], [0.54, 0.075, LZ, 0.065]],
  [[0.28, 0.11, LZ - 0.05, 0.08], [0.48, 0.07, LZ - 0.15, 0.058]],
  [[0.28, 0.11, LZ + 0.05, 0.08], [0.48, 0.07, LZ + 0.15, 0.058]],
];
const BOX_HIND = [-0.6, -0.05, 0.0, 1.0, 2.9, 1.0];

function sdHindLeg(px, py, az) {
  let d = rcz(px, py, az, HIP, KNEE, 0.46, 0.22, 0.8);
  d = smin(d, sdEllipsoid(px, py, az, [0.28, 1.9, LZ], [0.42, 0.55, 0.36]), 0.2);
  d = smin(d, sdSphere(px, py, az, KNEE, 0.2), 0.1);
  d = smin(d, rcz(px, py, az, KNEE, ANKLE, 0.22, 0.14, 0.9), 0.1);
  d = smin(d, sdSphere(px, py, az, ANKLE, 0.15), 0.06);
  d = smin(d, rcz(px, py, az, ANKLE, BALL, 0.14, 0.12, 0.95), 0.06);
  if (py < 0.35) {
    d = smin(d, sdEllipsoid(px, py, az, [0.36, 0.1, LZ], [0.26, 0.1, 0.21]), 0.05);
    for (const [a, b] of HIND_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.04);
  }
  return d;
}

const FZ = 0.45;
const SHOULDER = [1.95, 1.25, FZ], ELBOW = [1.78, 0.72, FZ], WRIST = [1.93, 0.27, FZ], HAND = [2.03, 0.1, FZ], FINGER_TIP = [2.25, 0.05, FZ];
const FRONT_TOES = [
  [[2.03, 0.09, FZ, 0.07], [2.22, 0.065, FZ, 0.05]],
  [[2.01, 0.09, FZ - 0.05, 0.062], [2.17, 0.062, FZ - 0.12, 0.046]],
  [[2.01, 0.09, FZ + 0.05, 0.062], [2.17, 0.062, FZ + 0.12, 0.046]],
];
const BOX_FRONT = [1.45, -0.05, 0.1, 2.5, 1.7, 0.85];

function sdFrontLeg(px, py, az) {
  let d = rcz(px, py, az, SHOULDER, ELBOW, 0.24, 0.16, 0.85);
  d = smin(d, sdSphere(px, py, az, ELBOW, 0.16), 0.06);
  d = smin(d, rcz(px, py, az, ELBOW, WRIST, 0.15, 0.11, 0.9), 0.06);
  d = smin(d, sdSphere(px, py, az, WRIST, 0.12), 0.05);
  d = smin(d, rcz(px, py, az, WRIST, HAND, 0.11, 0.1, 0.95), 0.04);
  if (py < 0.3) {
    d = smin(d, sdEllipsoid(px, py, az, [2.08, 0.09, FZ], [0.18, 0.09, 0.17]), 0.04);
    for (const [a, b] of FRONT_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.03);
  }
  return d;
}

const HOOVES = [...HIND_TOES, ...FRONT_TOES].map(([, tip]) => [[tip[0] - 0.02, tip[1], tip[2]], [tip[0] + 0.06, tip[1] - 0.022, tip[2]], tip[3] * 0.95, 0.025]);
const sdHooves = (px, py, az) => {
  let d = 10;
  for (const [a, b, r1, r2] of HOOVES) d = Math.min(d, sdRoundCone(px, py, az, a, b, r1, r2));
  return d;
};

// ---------- 背中の板と、しっぽのとげ ----------
// 板を背中にのせるため、先に背中の高さと傾きを測る
const backTop = (x) => {
  let y = 4.0;
  for (let i = 0; i < 200; i++) {
    const d = sdTorso(x, y, 0);
    if (d < 0.001) break;
    y -= Math.max(d * 0.8, 0.001);
  }
  return y;
};
// 板の高さ：首のほうは小さく、腰からしっぽの付け根でいちばん大きい
const PLATE_H = [[2.3, 0.22], [1.2, 0.46], [0.0, 0.78], [-0.8, 0.86], [-1.8, 0.62], [-3.1, 0.24]];
const plateHeight = (x) => {
  for (let i = 1; i < PLATE_H.length; i++) {
    const [x0, h0] = PLATE_H[i - 1], [x1, h1] = PLATE_H[i];
    if (x <= x0 && x >= x1) return mix(h0, h1, (x0 - x) / (x0 - x1));
  }
  return 0.2;
};
const PLATES = [];
{
  const N = 17;
  for (let i = 0; i < N; i++) {
    const x = mix(2.05, -3.1, i / (N - 1));
    const y = backTop(x);
    const slope = (backTop(x + 0.05) - backTop(x - 0.05)) / 0.1;
    const h = plateHeight(x);
    const side = i % 2 === 0 ? 1 : -1;
    // 板の上の向き：背中に垂直で、少し外へ開く
    const up = norm3([-slope, 1, side * 0.16]);
    const along = norm3([1, slope, 0]);
    const thick = norm3([along[1] * up[2] - along[2] * up[1], along[2] * up[0] - along[0] * up[2], along[0] * up[1] - along[1] * up[0]]);
    PLATES.push({ base: [x, y - 0.08, side * 0.06], up, along, thick, h, w: 0.32 * h + 0.06 });
  }
}

function sdPlates(px, py, pz) {
  let d = 10;
  for (const p of PLATES) {
    if (Math.abs(px - p.base[0]) > p.w + 0.2) continue;
    const qx = px - p.base[0], qy = py - p.base[1], qz = pz - p.base[2];
    const a = qx * p.along[0] + qy * p.along[1] + qz * p.along[2];
    const u = qx * p.up[0] + qy * p.up[1] + qz * p.up[2];
    const t = qx * p.thick[0] + qy * p.thick[1] + qz * p.thick[2];
    // 上へいくほど細くして、葉っぱのような形に
    const narrow = 1 - 0.55 * smoothstep(0, p.h, u);
    const U = p.h * 0.58;
    d = Math.min(d, sdEllipsoid(a / narrow, u - U * 0.72, t, [0, 0, 0], [p.w, U, 0.035]) * narrow);
  }
  return d;
}

const SPIKES = [
  [[-3.55, 1.95, 0.07], [-3.88, 2.48, 0.3], 0.06, 0.008],
  [[-3.95, 1.85, 0.06], [-4.38, 2.22, 0.38], 0.055, 0.008],
];
const sdSpikes = (px, py, az) => Math.min(...SPIKES.map(([a, b, r1, r2]) => sdRoundCone(px, py, az, a, b, r1, r2)));

// ---------- 全体 ----------
function sdBody(px, py, pz) {
  let d = sdTorso(px, py, pz);
  if (py > 2.0 || px < -2.5) d = smin(d, sdPlates(px, py, pz), 0.05);
  if (px < -3.3) d = smin(d, sdSpikes(px, py, Math.abs(pz)), 0.04);
  return d;
}

function sdBase(px, py, pz) {
  const az = Math.abs(pz);
  let d = 10;
  if (boxDist(px, py, pz, [-4.5, 0.95, -1.0, 3.0, 4.2, 1.0]) < 0.4) d = sdBody(px, py, pz);
  if (boxDist(px, py, pz, BOX_HEAD) < 0.4) d = smin(d, sdHead(px, py, pz, az), 0.12);
  if (boxDist(px, py, az, BOX_HIND) < 0.4) d = smin(d, sdHindLeg(px, py, az), 0.26);
  if (boxDist(px, py, az, BOX_FRONT) < 0.4) d = smin(d, sdFrontLeg(px, py, az), 0.18);
  if (py < 0.25) d = smin(d, sdHooves(px, py, az), 0.02);
  return d;
}

function detailBumps(px, py, pz) {
  let d = 0.007 * fbm(px * 3.2, py * 3.2, pz * 3.2);
  const neck = smoothstep(2.25, 2.45, px) * (1 - smoothstep(2.85, 3.0, px));
  if (neck > 0) d += 0.007 * neck * Math.sin(48 * (0.85 * px + 0.5 * py));
  if (px > 3.0 && px < 3.55) d += 0.008 * Math.exp(-(((py - lipY(px)) / 0.012) ** 2)) * smoothstep(3.0, 3.15, px); // 口の線
  return d;
}

function sdf(px, py, pz) {
  let d = sdBase(px, py, pz);
  if (d < 0.3) {
    const az = Math.abs(pz);
    d += detailBumps(px, py, pz);
    if (px > 2.9 && py > 1.0) {
      d = withEye(d, px, py, az, EYE);
      d = smax(d, -sdEllipsoid(px, py, az, NOSTRIL, [0.03, 0.018, 0.016]), 0.006);
    }
  }
  return smax(d, -py, 0.02);
}

// ---------- 色 ----------
const PAL = {
  back: hex(0x4d4a2c),
  side: hex(0x878049),
  belly: hex(0xcfc191),
  stripe: hex(0x2e2c1b),
  plateBase: hex(0x6a5b3a),
  plateMid: hex(0xb05f36),
  plateEdge: hex(0xdc8a48),
  plateRim: hex(0x5a2e1c),
  spikeBase: hex(0x7a6c55),
  spikeTip: hex(0xeee6d4),
  beak: hex(0x2f2b24),
  hoof: hex(0x3a3429),
  eyeRing: hex(0x2c2918),
  nostril: hex(0x1c1a12),
  sole: hex(0x2e2c24),
};

function region(px, py, pz) {
  const az = Math.abs(pz);
  if (py < 0.25 && sdHooves(px, py, az) < 0.015) return { kind: "hoof" };
  if (px < -3.3) {
    for (const [a, b, r1, r2] of SPIKES) {
      if (sdRoundCone(px, py, az, a, b, r1, r2) < 0.012) {
        const t = clamp(((px - a[0]) * (b[0] - a[0]) + (py - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2), 0, 1);
        return { kind: "spike", t };
      }
    }
  }
  if (px > 3.3 && sdBeak(px, py, pz) < 0.01) return { kind: "beak" };
  if (py > 2.0 || px < -2.5) {
    for (const p of PLATES) {
      if (Math.abs(px - p.base[0]) > p.w + 0.1) continue;
      const qx = px - p.base[0], qy = py - p.base[1], qz = pz - p.base[2];
      const u = qx * p.up[0] + qy * p.up[1] + qz * p.up[2];
      const t = qx * p.thick[0] + qy * p.thick[1] + qz * p.thick[2];
      const a = qx * p.along[0] + qy * p.along[1] + qz * p.along[2];
      if (Math.abs(t) < 0.06 && u > 0.08 && sdTorso(px, py, pz) > 0.015) return { kind: "plate", u: u / p.h, a: a / p.w };
    }
  }
  return { kind: "skin" };
}

function color([px, py, pz], [, ny]) {
  const az = Math.abs(pz);
  const r = region(px, py, pz);
  if (r.kind === "hoof") return PAL.hoof;
  if (r.kind === "beak") return PAL.beak;
  if (r.kind === "spike") return lerp3(PAL.spikeBase, PAL.spikeTip, smoothstep(0.15, 0.8, r.t));
  if (r.kind === "plate") {
    // 根もとは体の色、上へいくほど赤みが強く、ふちは濃い。たての筋（血管）を少し
    let c = lerp3(PAL.plateBase, PAL.plateMid, smoothstep(0.1, 0.55, r.u));
    c = lerp3(c, PAL.plateEdge, smoothstep(0.55, 0.9, r.u));
    c = lerp3(c, PAL.plateRim, smoothstep(0.8, 1.0, Math.hypot(r.a * 1.1, r.u)) * 0.6);
    c = c.map((v) => v * (0.9 + 0.1 * Math.sin(r.a * 22 + fbm(px * 6, py * 6, pz * 6) * 3)));
    return c;
  }
  let c = lerp3(PAL.belly, PAL.side, smoothstep(-0.6, 0.05, ny));
  c = lerp3(c, PAL.back, smoothstep(0.1, 0.85, ny));
  if (px > -3.6 && px < 2.4 && py > 1.2) {
    const s = Math.sin(px * 4.2 + 1.1 * fbm(px * 1.3, py * 1.3, pz * 1.3));
    c = lerp3(c, PAL.stripe, smoothstep(0.5, 0.85, s) * smoothstep(-0.1, 0.5, ny) * 0.5);
  }
  const m = fbm(px * 2.2 + 7, py * 2.2, pz * 2.2);
  c = c.map((v) => v * (1 + 0.15 * m));
  const de = Math.hypot(px - EYE.center[0], py - EYE.center[1], az - EYE.center[2]);
  if (de < 0.08) c = lerp3(c, PAL.eyeRing, 0.55 * (1 - smoothstep(0.045, 0.08, de)));
  const dn = Math.hypot((px - NOSTRIL[0]) / 1.4, py - NOSTRIL[1], az - NOSTRIL[2]);
  if (dn < 0.035) c = lerp3(c, PAL.nostril, 1 - smoothstep(0.015, 0.035, dn));
  if (px > 3.05 && Math.abs(py - lipY(px)) < 0.015) c = lerp3(c, PAL.beak, 0.6);
  if (py < 0.05) c = lerp3(c, PAL.sole, 0.6);
  return c;
}

function detail([px, py, pz]) {
  const r = region(px, py, pz);
  if (r.kind === "plate") return [1, 0.2];
  if (r.kind !== "skin") return [1, 0.1];
  return [Math.max(smoothstep(2.7, 2.95, px), 1 - smoothstep(0.35, 0.8, py)), 1];
}

// ---------- 骨と重み ----------
const legBones = (s, tag) => [
  [`thigh.${tag}`, "hips", [HIP[0], HIP[1], s * LZ], [KNEE[0], KNEE[1], s * LZ]],
  [`shin.${tag}`, `thigh.${tag}`, [KNEE[0], KNEE[1], s * LZ], [ANKLE[0], ANKLE[1], s * LZ]],
  [`foot.${tag}`, `shin.${tag}`, [ANKLE[0], ANKLE[1], s * LZ], [BALL[0], BALL[1], s * LZ]],
  [`toe.${tag}`, `foot.${tag}`, [BALL[0], BALL[1], s * LZ], [TOE_TIP[0], TOE_TIP[1], s * LZ]],
];
const armBones = (s, tag) => [
  [`upperArm.${tag}`, "spine2", [SHOULDER[0], SHOULDER[1], s * FZ], [ELBOW[0], ELBOW[1], s * FZ]],
  [`forearm.${tag}`, `upperArm.${tag}`, [ELBOW[0], ELBOW[1], s * FZ], [WRIST[0], WRIST[1], s * FZ]],
  [`hand.${tag}`, `forearm.${tag}`, [WRIST[0], WRIST[1], s * FZ], [HAND[0], HAND[1], s * FZ]],
  [`finger.${tag}`, `hand.${tag}`, [HAND[0], HAND[1], s * FZ], [FINGER_TIP[0], FINGER_TIP[1], s * FZ]],
];
const BONES = [
  ["hips", null, [0.0, 2.45, 0], [0.9, 2.3, 0]],
  ["spine1", "hips", [0.9, 2.3, 0], [1.8, 1.85, 0]],
  ["spine2", "spine1", [1.8, 1.85, 0], [2.3, 1.55, 0]],
  ["neck", "spine2", [2.3, 1.55, 0], [2.95, 1.25, 0]],
  ["head", "neck", [2.95, 1.25, 0], [3.6, 1.0, 0]],
  ["tail1", "hips", [-0.4, 2.55, 0], [-1.5, 2.42, 0]],
  ["tail2", "tail1", [-1.5, 2.42, 0], [-2.6, 2.15, 0]],
  ["tail3", "tail2", [-2.6, 2.15, 0], [-3.6, 1.9, 0]],
  ["tail4", "tail3", [-3.6, 1.9, 0], [-4.35, 1.76, 0]],
  ...legBones(1, "R"),
  ...legBones(-1, "L"),
  ...armBones(1, "R"),
  ...armBones(-1, "L"),
];
const TORSO_BONES = ["hips", "spine1", "spine2", "neck", "tail1", "tail2", "tail3", "tail4"];

function skin(px, py, pz) {
  const az = Math.abs(pz);
  const tag = pz >= 0 ? "R" : "L";
  // 板ととげは、すぐ下の背骨・しっぽの骨についていく
  const bodyD = Math.min(sdTorso(px, py, pz), py > 2.0 || px < -2.5 ? sdPlates(px, py, pz) : 10, px < -3.3 ? sdSpikes(px, py, az) : 10);
  const spinePoint = py > 2.0 ? [px, Math.min(py, backTop(px) - 0.3), pz] : [px, py, pz];
  return blendGroups([
    [bodyD, () => byDistance(BONES, TORSO_BONES, spinePoint[0], spinePoint[1], spinePoint[2] * 0.3)],
    [boxDist(px, py, pz, BOX_HEAD) < 0.3 ? sdHead(px, py, pz, az) : 10, () => [["head", 1]]],
    [
      boxDist(px, py, az, BOX_HIND) < 0.3 ? Math.min(sdHindLeg(px, py, az), sdHooves(px, py, az)) : 10,
      () => byDistance(BONES, ["thigh", "shin", "foot", "toe"].map((n) => `${n}.${tag}`), px, py, pz),
    ],
    [
      boxDist(px, py, az, BOX_FRONT) < 0.3 ? Math.min(sdFrontLeg(px, py, az), sdHooves(px, py, az)) : 10,
      () => byDistance(BONES, ["upperArm", "forearm", "hand", "finger"].map((n) => `${n}.${tag}`), px, py, pz),
    ],
  ]);
}

export default {
  name: "stegosaurus",
  grid: { min: [-4.5, -0.04, -1.0], max: [3.72, 4.12, 1.0], h: 0.02 },
  scales: { big: 16, small: 28 },
  sdf,
  color,
  detail,
  skin,
  bones: BONES,
  eyes: [1, -1].map((s) => ({ center: [EYE.center[0], EYE.center[1], s * EYE.center[2]], axis: [EYE.axis[0], EYE.axis[1], s * EYE.axis[2]], radius: EYE.radius })),
};
