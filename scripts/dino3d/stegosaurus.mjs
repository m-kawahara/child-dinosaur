// ステゴサウルスの形・色・骨。かわいい 3D：大きなまるい頭と目、まるい黄色の板、先のまるいとげ、むらさき。
// 座標: x が前（頭の向き）、y が上、z が右。地面が y=0。単位はだいたいメートル。
import { byDistance, blendGroups } from "./mesh.mjs";
import {
  boxDist, FACE, headSpace, hex, lerp3, makeMouth, mix, nearEye, norm3, placeEyes, rcz, sdEllipsoid, sdRoundCone, smax, smin,
  smoothstep, spotAmount, surfaceZ, withEye,
} from "./sdf.mjs";

// ---------- 胴・首・しっぽ ----------
const TAIL = [
  [-0.4, 2.55, 0.62],
  [-1.5, 2.42, 0.45],
  [-2.55, 2.17, 0.3],
  [-3.5, 1.93, 0.18],
  [-4.2, 1.8, 0.09],
];
const BOX_TORSO = [-4.4, 0.95, -1.05, 3.0, 3.4, 1.05];

function sdTorso(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.0, 2.45, 0], [0.98, 0.8, 0.66]); // 高い腰
  d = smin(d, sdEllipsoid(px, py, pz, [0.95, 2.05, 0], [1.38, 0.88, 0.82]), 0.4); // 胴
  d = smin(d, sdEllipsoid(px, py, pz, [0.7, 1.55, 0], [1.12, 0.47, 0.66]), 0.35); // おなか
  d = smin(d, sdEllipsoid(px, py, pz, [1.9, 1.55, 0], [0.74, 0.64, 0.62]), 0.35); // 低い肩
  d = smin(d, rcz(px, py, pz, [2.3, 1.55, 0], [2.95, 1.25, 0], 0.42, 0.3, 0.9), 0.2); // 首
  d = smin(d, sdEllipsoid(px, py, pz, [-0.75, 2.4, 0], [0.92, 0.6, 0.54]), 0.35); // しっぽの付け根
  for (let i = 0; i < TAIL.length - 1; i++) {
    const a = TAIL[i], b = TAIL[i + 1];
    d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.85), 0.2);
  }
  return d;
}

// ---------- 頭（頭の座標で作り、首の先を中心に大きくして置く。本物の頭はとても小さい） ----------
const HEAD = headSpace([2.95, 1.25], 1.9);
const { toHead, fromHead } = HEAD;

/** 口の線。口の角が少し上がって、にっこりして見える */
const lipY = (x) => 1.06 + 0.05 * smoothstep(3.22, 3.02, x);
const MOUTH = makeMouth(HEAD, lipY, 3.04, 0.012);

function sdUpperHead(px, py, pz, az) {
  let d = sdEllipsoid(px, py, pz, [3.12, 1.24, 0], [0.26, 0.21, 0.19]); // まるい頭
  d = smin(d, rcz(px, py, pz, [3.2, 1.16, 0], [3.42, 1.1, 0], 0.17, 0.125, 0.85), 0.08); // 鼻先
  d = smin(d, sdEllipsoid(px, py, az, [3.1, 1.12, 0.09], [0.17, 0.12, 0.1]), 0.05); // ほお
  return smax(d, lipY(px) - py, 0.012);
}

function sdLowerJaw(px, py, pz) {
  const d = rcz(px, py, pz, [3.02, 1.02, 0], [3.37, 1.0, 0], 0.12, 0.09, 0.8);
  return smax(d, py - lipY(px), 0.012);
}

/** 頭（体の座標で受けて、体の座標の距離を返す） */
function sdHead(px, py, pz) {
  const [hx, hy, hz] = toHead(px, py, pz);
  return smin(sdUpperHead(hx, hy, hz, Math.abs(hz)), sdLowerJaw(hx, hy, hz), 0.02) * HEAD.scale;
}
const BOX_HEAD = [...fromHead([2.8, 0.82, -0.3]), ...fromHead([3.65, 1.5, 0.3])];

// ---------- 足 ----------
const LZ = 0.5;
const HIP = [0.0, 2.1, LZ], KNEE = [0.4, 1.2, LZ], ANKLE = [0.08, 0.4, LZ], BALL = [0.3, 0.12, LZ], TOE_TIP = [0.6, 0.07, LZ];
const HIND_TOES = [
  [[0.3, 0.13, LZ, 0.11], [0.54, 0.095, LZ, 0.085]],
  [[0.28, 0.12, LZ - 0.06, 0.1], [0.48, 0.09, LZ - 0.17, 0.08]],
  [[0.28, 0.12, LZ + 0.06, 0.1], [0.48, 0.09, LZ + 0.17, 0.08]],
];
const BOX_HIND = [-0.65, -0.05, 0.0, 1.05, 2.9, 1.1];

function sdHindLeg(px, py, az) {
  let d = rcz(px, py, az, HIP, KNEE, 0.5, 0.26, 0.8);
  d = smin(d, sdEllipsoid(px, py, az, [0.28, 1.9, LZ], [0.44, 0.58, 0.38]), 0.2);
  d = smin(d, rcz(px, py, az, KNEE, ANKLE, 0.26, 0.17, 0.9), 0.15);
  d = smin(d, rcz(px, py, az, ANKLE, BALL, 0.17, 0.15, 0.95), 0.07);
  if (py < 0.4) {
    d = smin(d, sdEllipsoid(px, py, az, [0.36, 0.11, LZ], [0.28, 0.11, 0.23]), 0.05);
    for (const [a, b] of HIND_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.04);
  }
  return d;
}

const FZ = 0.47;
const SHOULDER = [1.95, 1.25, FZ], ELBOW = [1.78, 0.72, FZ], WRIST = [1.93, 0.27, FZ], HAND = [2.03, 0.1, FZ], FINGER_TIP = [2.28, 0.06, FZ];
const FRONT_TOES = [
  [[2.03, 0.11, FZ, 0.09], [2.22, 0.085, FZ, 0.07]],
  [[2.01, 0.1, FZ - 0.05, 0.08], [2.17, 0.08, FZ - 0.13, 0.065]],
  [[2.01, 0.1, FZ + 0.05, 0.08], [2.17, 0.08, FZ + 0.13, 0.065]],
];
const BOX_FRONT = [1.4, -0.05, 0.1, 2.55, 1.75, 0.9];

function sdFrontLeg(px, py, az) {
  let d = rcz(px, py, az, SHOULDER, ELBOW, 0.28, 0.19, 0.85);
  d = smin(d, rcz(px, py, az, ELBOW, WRIST, 0.19, 0.14, 0.9), 0.08);
  d = smin(d, rcz(px, py, az, WRIST, HAND, 0.14, 0.13, 0.95), 0.05);
  if (py < 0.32) {
    d = smin(d, sdEllipsoid(px, py, az, [2.08, 0.1, FZ], [0.2, 0.1, 0.19]), 0.04);
    for (const [a, b] of FRONT_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.03);
  }
  return d;
}

const NAILS = [...HIND_TOES, ...FRONT_TOES].map(([, tip]) => [[tip[0] - 0.02, tip[1], tip[2]], [tip[0] + 0.06, tip[1] - 0.022, tip[2]], tip[3] * 0.8, 0.04]);
const sdNails = (px, py, az) => {
  let d = 10;
  for (const [a, b, r1, r2] of NAILS) d = Math.min(d, sdRoundCone(px, py, az, a, b, r1, r2));
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
const PLATE_H = [[2.3, 0.26], [1.2, 0.5], [0.0, 0.78], [-0.8, 0.82], [-1.8, 0.6], [-3.1, 0.26]];
const plateHeight = (x) => {
  for (let i = 1; i < PLATE_H.length; i++) {
    const [x0, h0] = PLATE_H[i - 1], [x1, h1] = PLATE_H[i];
    if (x <= x0 && x >= x1) return mix(h0, h1, (x0 - x) / (x0 - x1));
  }
  return 0.2;
};
const PLATES = [];
{
  const N = 11;
  for (let i = 0; i < N; i++) {
    const x = mix(1.95, -2.9, i / (N - 1));
    const y = backTop(x);
    const slope = (backTop(x + 0.05) - backTop(x - 0.05)) / 0.1;
    const h = plateHeight(x);
    const side = i % 2 === 0 ? 1 : -1;
    // 板の上の向き：背中に垂直で、少し外へ開く
    const up = norm3([-slope, 1, side * 0.16]);
    const along = norm3([1, slope, 0]);
    const thick = norm3([along[1] * up[2] - along[2] * up[1], along[2] * up[0] - along[0] * up[2], along[0] * up[1] - along[1] * up[0]]);
    PLATES.push({ base: [x, y - 0.08, side * 0.06], up, along, thick, h, w: 0.36 * h + 0.08 });
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
    // 上へいくほど少し細く、先のまるい葉っぱの形に
    const narrow = 1 - 0.32 * smoothstep(0, p.h, u);
    const U = p.h * 0.58;
    d = Math.min(d, sdEllipsoid(a / narrow, u - U * 0.72, t, [0, 0, 0], [p.w, U, 0.06]) * narrow);
  }
  return d;
}

const SPIKES = [
  [[-3.5, 1.98, 0.07], [-3.74, 2.36, 0.27], 0.095, 0.05],
  [[-3.9, 1.88, 0.06], [-4.2, 2.16, 0.32], 0.09, 0.05],
];
const sdSpikes = (px, py, az) => Math.min(...SPIKES.map(([a, b, r1, r2]) => sdRoundCone(px, py, az, a, b, r1, r2)));

// ---------- 全体 ----------
function sdBody(px, py, pz) {
  let d = sdTorso(px, py, pz);
  if (py > 2.0 || px < -2.5) d = smin(d, sdPlates(px, py, pz), 0.05);
  if (px < -3.2) d = smin(d, sdSpikes(px, py, Math.abs(pz)), 0.04);
  return d;
}

function sdBase(px, py, pz) {
  const az = Math.abs(pz);
  let d = 10;
  if (boxDist(px, py, pz, [-4.4, 0.95, -1.05, 3.0, 4.2, 1.05]) < 0.4) d = sdBody(px, py, pz);
  if (boxDist(px, py, pz, BOX_HEAD) < 0.4) d = smin(d, sdHead(px, py, pz), 0.15);
  if (boxDist(px, py, az, BOX_HIND) < 0.4) d = smin(d, sdHindLeg(px, py, az), 0.26);
  if (boxDist(px, py, az, BOX_FRONT) < 0.4) d = smin(d, sdFrontLeg(px, py, az), 0.18);
  if (py < 0.25) d = smin(d, sdNails(px, py, az), 0.02);
  return smax(d, -py, 0.02);
}

const EYE_AT = fromHead([3.18, 1.29]);
const { eye: EYE, eyes: EYES } = placeEyes(sdBase, EYE_AT[0], EYE_AT[1], norm3([0.3, 0.12, 1]), 0.072 * HEAD.scale, hex(0xb58ad6));

function sdf(px, py, pz) {
  let d = sdBase(px, py, pz);
  if (d < 0.3 && px > 2.8 && py < 1.8) {
    d = withEye(d, px, py, Math.abs(pz), EYE);
    d = MOUTH.carve(d, px, py);
  }
  return d;
}

// ---------- 色 ----------
const PAL = {
  body: hex(0xb58ad6),
  back: hex(0xa97ccd),
  spot: hex(0x9a6cc2),
  belly: hex(0xf1e6fb),
  plate: hex(0xf6c86b),
  plateTip: hex(0xffdf94),
  plateRim: hex(0xe39f43),
  spike: hex(0xfff4dc),
  nostril: hex(0x6b4a8a),
};

function region(px, py, pz) {
  const az = Math.abs(pz);
  if (py < 0.25 && sdNails(px, py, az) < 0.015) return { kind: "nail" };
  if (px < -3.2 && sdSpikes(px, py, az) < 0.012) return { kind: "spike" };
  if (py > 2.0 || px < -2.5) {
    for (const p of PLATES) {
      if (Math.abs(px - p.base[0]) > p.w + 0.1) continue;
      const qx = px - p.base[0], qy = py - p.base[1], qz = pz - p.base[2];
      const u = qx * p.up[0] + qy * p.up[1] + qz * p.up[2];
      const t = qx * p.thick[0] + qy * p.thick[1] + qz * p.thick[2];
      const a = qx * p.along[0] + qy * p.along[1] + qz * p.along[2];
      if (Math.abs(t) < 0.09 && u > 0.06 && sdTorso(px, py, pz) > 0.015) return { kind: "plate", u: u / p.h, a: a / p.w };
    }
  }
  return { kind: "skin" };
}

// 体のまだらと、ほおのチーク
const SPOTS = [
  [-2.6, 2.2, 0.15],
  [-1.6, 2.5, 0.2],
  [-0.5, 2.75, 0.24],
  [0.6, 2.6, 0.26],
  [1.6, 2.15, 0.2],
].map(([x, y, r]) => [x, y, surfaceZ(sdBase, x, y) ?? 0, r]);
const CHEEK_AT = fromHead([3.3, 1.12]);
const CHEEK = [CHEEK_AT[0], CHEEK_AT[1], surfaceZ(sdBase, CHEEK_AT[0], CHEEK_AT[1]), 0.12];
const NOSTRIL = fromHead([3.52, 1.15, 0.04]);

function color([px, py, pz], [, ny]) {
  const az = Math.abs(pz);
  const r = region(px, py, pz);
  if (r.kind === "nail") return FACE.nail;
  if (r.kind === "spike") return PAL.spike;
  if (r.kind === "plate") {
    // 根もとから先へ明るく、ふちは少しこく
    const c = lerp3(PAL.plate, PAL.plateTip, smoothstep(0.3, 0.9, r.u));
    return lerp3(c, PAL.plateRim, smoothstep(0.82, 1.0, Math.hypot(r.a * 1.05, r.u * 0.95)) * 0.8);
  }
  const mouth = MOUTH.at(px, py, ny);
  // おなかは明るい色、背中は少しこく。足・口・目のまわりにはおなかの色をつけない
  const leg = smoothstep(0.05, -0.1, Math.min(sdHindLeg(px, py, az), sdFrontLeg(px, py, az)) - sdTorso(px, py, pz));
  let c = lerp3(PAL.belly, PAL.body, Math.max(smoothstep(-0.45, -0.28, ny), mouth.near, nearEye(px, py, az, EYE), leg));
  c = lerp3(c, PAL.back, smoothstep(0.35, 0.9, ny));
  c = lerp3(c, PAL.spot, spotAmount(px, py, az, SPOTS));
  c = lerp3(c, FACE.cheek, 0.7 * spotAmount(px, py, az, [CHEEK]));
  const dn = Math.hypot((px - NOSTRIL[0]) * 0.8, py - NOSTRIL[1], az - NOSTRIL[2]);
  c = lerp3(c, PAL.nostril, 1 - smoothstep(0.03, 0.045, dn));
  return lerp3(c, ny > 0 && az < 0.1 ? FACE.tongue : FACE.mouth, mouth.inside);
}

function gloss([px, py, pz], [, ny]) {
  const kind = region(px, py, pz).kind;
  if (kind === "nail" || kind === "spike") return 0.8;
  if (kind === "plate") return 0.35;
  return 0.6 * MOUTH.at(px, py, ny).inside;
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
  ["head", "neck", [2.95, 1.25, 0], fromHead([3.56, 1.08])],
  ["jaw", "head", fromHead([3.02, 1.07]), fromHead([3.4, 0.98])],
  ["tail1", "hips", [-0.4, 2.55, 0], [-1.5, 2.42, 0]],
  ["tail2", "tail1", [-1.5, 2.42, 0], [-2.55, 2.17, 0]],
  ["tail3", "tail2", [-2.55, 2.17, 0], [-3.5, 1.93, 0]],
  ["tail4", "tail3", [-3.5, 1.93, 0], [-4.25, 1.8, 0]],
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
  const bodyD = Math.min(sdTorso(px, py, pz), py > 2.0 || px < -2.5 ? sdPlates(px, py, pz) : 10, px < -3.2 ? sdSpikes(px, py, az) : 10);
  const spinePoint = py > 2.0 ? [px, Math.min(py, backTop(px) - 0.3), pz] : [px, py, pz];
  return blendGroups([
    [bodyD, () => byDistance(BONES, TORSO_BONES, spinePoint[0], spinePoint[1], spinePoint[2] * 0.3)],
    [
      boxDist(px, py, pz, BOX_HEAD) < 0.3 ? sdHead(px, py, pz) : 10,
      () => {
        const jaw = MOUTH.jawWeight(px, py);
        return [["head", 1 - jaw], ["jaw", jaw]];
      },
    ],
    [
      boxDist(px, py, az, BOX_HIND) < 0.3 ? Math.min(sdHindLeg(px, py, az), sdNails(px, py, az)) : 10,
      () => byDistance(BONES, ["thigh", "shin", "foot", "toe"].map((n) => `${n}.${tag}`), px, py, pz),
    ],
    [
      boxDist(px, py, az, BOX_FRONT) < 0.3 ? Math.min(sdFrontLeg(px, py, az), sdNails(px, py, az)) : 10,
      () => byDistance(BONES, ["upperArm", "forearm", "hand", "finger"].map((n) => `${n}.${tag}`), px, py, pz),
    ],
  ]);
}

export default {
  name: "stegosaurus",
  grid: { min: [-4.42, -0.04, -1.08], max: [4.3, 4.12, 1.08], h: 0.02 },
  sdf,
  color,
  gloss,
  skin,
  bones: BONES,
  eyes: EYES,
};
