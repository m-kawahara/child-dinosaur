// ブラキオサウルスの形・色・骨。かわいい 3D：大きなまるい頭とおでこ、太い首、明るい水色。
// 座標: x が前（頭の向き）、y が上、z が右。地面が y=0。単位はだいたいメートル（本物より小さめ）。
import { byDistance, blendGroups } from "./mesh.mjs";
import {
  boxDist, FACE, headSpace, hex, lerp3, makeMouth, nearEye, norm3, placeEyes, rcz, sdEllipsoid, sdRoundCone, smax, smin, smoothstep,
  spotAmount, surfaceZ, withEye,
} from "./sdf.mjs";

// ---------- 胴・首・しっぽ ----------
const TAIL = [
  [-0.4, 3.25, 0.64],
  [-1.6, 3.0, 0.46],
  [-2.75, 2.62, 0.31],
  [-3.8, 2.2, 0.19],
  [-4.6, 1.9, 0.1],
  [-5.1, 1.76, 0.05],
];
// 肩から斜め上へのびる太い首
const NECK = [
  [2.45, 4.1, 0.68],
  [3.0, 4.85, 0.54],
  [3.55, 5.55, 0.45],
  [4.05, 6.15, 0.4],
  [4.5, 6.6, 0.36],
];
const BOX_TORSO = [-5.3, 1.9, -1.15, 5.0, 7.1, 1.15];

function sdTorso(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.0, 3.15, 0], [0.92, 0.75, 0.72]); // 腰
  d = smin(d, sdEllipsoid(px, py, pz, [1.05, 3.2, 0], [1.5, 1.08, 1.0]), 0.45); // 胴
  d = smin(d, sdEllipsoid(px, py, pz, [2.05, 3.55, 0], [0.88, 0.98, 0.86]), 0.4); // 高い肩
  d = smin(d, sdEllipsoid(px, py, pz, [0.95, 2.5, 0], [1.25, 0.5, 0.8]), 0.4); // おなか
  d = smin(d, sdEllipsoid(px, py, pz, [-0.8, 3.05, 0], [0.95, 0.62, 0.58]), 0.35); // しっぽの付け根
  for (let i = 0; i < TAIL.length - 1; i++) {
    const a = TAIL[i], b = TAIL[i + 1];
    d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.85), 0.2);
  }
  if (px > 1.6) {
    for (let i = 0; i < NECK.length - 1; i++) {
      const a = NECK[i], b = NECK[i + 1];
      d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.88), i === 0 ? 0.4 : 0.15);
    }
  }
  return d;
}

// ---------- 頭（頭の座標で作り、首の先を中心に大きくして置く） ----------
const HEAD = headSpace([4.5, 6.6], 2.0);
const { toHead, fromHead } = HEAD;

/** 口の線。口の角が少し上がって、にっこりして見える */
const lipY = (x) => 6.5 + 0.06 * smoothstep(4.9, 4.66, x);
const MOUTH = makeMouth(HEAD, lipY, 4.68, 0.016);

function sdUpperHead(px, py, pz, az) {
  let d = sdEllipsoid(px, py, pz, [4.75, 6.72, 0], [0.3, 0.26, 0.24]); // まるい頭
  d = smin(d, sdEllipsoid(px, py, pz, [4.82, 6.9, 0], [0.2, 0.17, 0.17]), 0.08); // おでこの盛り上がり
  d = smin(d, rcz(px, py, pz, [4.85, 6.62, 0], [5.15, 6.54, 0], 0.2, 0.15, 0.85), 0.1); // 鼻先
  d = smin(d, sdEllipsoid(px, py, az, [4.72, 6.56, 0.12], [0.22, 0.15, 0.13]), 0.06); // ほお
  return smax(d, lipY(px) - py, 0.015);
}

function sdLowerJaw(px, py, pz) {
  const d = rcz(px, py, pz, [4.66, 6.46, 0], [5.08, 6.44, 0], 0.16, 0.12, 0.8);
  return smax(d, py - lipY(px), 0.015);
}

/** 頭（体の座標で受けて、体の座標の距離を返す） */
function sdHead(px, py, pz) {
  const [hx, hy, hz] = toHead(px, py, pz);
  return smin(sdUpperHead(hx, hy, hz, Math.abs(hz)), sdLowerJaw(hx, hy, hz), 0.025) * HEAD.scale;
}
const BOX_HEAD = [...fromHead([4.35, 6.2, -0.4]), ...fromHead([5.4, 7.15, 0.4])];

// ---------- 足（ゾウのような太い柱） ----------
const LZ = 0.6;
const HIP = [0.0, 2.7, LZ], KNEE = [0.3, 1.5, LZ], ANKLE = [0.05, 0.45, LZ], BALL = [0.28, 0.13, LZ], TOE_TIP = [0.58, 0.07, LZ];
const HIND_TOES = [
  [[0.3, 0.14, LZ, 0.13], [0.55, 0.1, LZ, 0.1]],
  [[0.28, 0.13, LZ - 0.08, 0.12], [0.5, 0.1, LZ - 0.2, 0.09]],
  [[0.28, 0.13, LZ + 0.08, 0.12], [0.5, 0.1, LZ + 0.2, 0.09]],
];
const BOX_HIND = [-0.75, -0.05, 0.0, 1.05, 3.55, 1.25];

function sdHindLeg(px, py, az) {
  let d = rcz(px, py, az, HIP, KNEE, 0.6, 0.36, 0.8);
  d = smin(d, sdEllipsoid(px, py, az, [0.15, 2.35, LZ], [0.52, 0.68, 0.44]), 0.2);
  d = smin(d, rcz(px, py, az, KNEE, ANKLE, 0.36, 0.27, 0.9), 0.15);
  d = smin(d, rcz(px, py, az, ANKLE, BALL, 0.26, 0.23, 0.95), 0.08);
  if (py < 0.5) {
    d = smin(d, sdEllipsoid(px, py, az, [0.33, 0.14, LZ], [0.35, 0.14, 0.32]), 0.06);
    for (const [a, b] of HIND_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.05);
  }
  return d;
}

const FZ = 0.62;
const SHOULDER = [2.15, 3.05, FZ], ELBOW = [1.95, 1.75, FZ], WRIST = [2.12, 0.45, FZ], HAND = [2.22, 0.13, FZ], FINGER_TIP = [2.5, 0.07, FZ];
const FRONT_TOES = [
  [[2.24, 0.14, FZ, 0.12], [2.45, 0.1, FZ, 0.095]],
  [[2.22, 0.13, FZ - 0.08, 0.11], [2.4, 0.1, FZ - 0.19, 0.085]],
  [[2.22, 0.13, FZ + 0.08, 0.11], [2.4, 0.1, FZ + 0.19, 0.085]],
];
const BOX_FRONT = [1.35, -0.05, 0.1, 2.95, 3.85, 1.25];

function sdFrontLeg(px, py, az) {
  let d = rcz(px, py, az, SHOULDER, ELBOW, 0.44, 0.3, 0.85);
  d = smin(d, sdEllipsoid(px, py, az, [2.15, 2.85, FZ - 0.05], [0.44, 0.58, 0.4]), 0.18);
  d = smin(d, rcz(px, py, az, ELBOW, WRIST, 0.3, 0.25, 0.9), 0.12);
  d = smin(d, rcz(px, py, az, WRIST, HAND, 0.25, 0.22, 0.95), 0.06);
  if (py < 0.5) {
    d = smin(d, sdEllipsoid(px, py, az, [2.25, 0.14, FZ], [0.33, 0.14, 0.31]), 0.06);
    for (const [a, b] of FRONT_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.05);
  }
  return d;
}

const NAILS = [...HIND_TOES, ...FRONT_TOES].map(([, tip]) => [[tip[0] - 0.02, tip[1], tip[2]], [tip[0] + 0.06, tip[1] - 0.025, tip[2]], tip[3] * 0.8, 0.045]);
const sdNails = (px, py, az) => {
  let d = 10;
  for (const [a, b, r1, r2] of NAILS) d = Math.min(d, sdRoundCone(px, py, az, a, b, r1, r2));
  return d;
};

// ---------- 全体 ----------
function sdBase(px, py, pz) {
  const az = Math.abs(pz);
  let d = 10;
  if (boxDist(px, py, pz, BOX_TORSO) < 0.4) d = sdTorso(px, py, pz);
  if (boxDist(px, py, pz, BOX_HEAD) < 0.4) d = smin(d, sdHead(px, py, pz), 0.15);
  if (boxDist(px, py, az, BOX_HIND) < 0.4) d = smin(d, sdHindLeg(px, py, az), 0.3);
  if (boxDist(px, py, az, BOX_FRONT) < 0.4) d = smin(d, sdFrontLeg(px, py, az), 0.25);
  if (py < 0.3) d = smin(d, sdNails(px, py, az), 0.02);
  return smax(d, -py, 0.02);
}

const EYE_AT = fromHead([4.84, 6.76]);
const { eye: EYE, eyes: EYES } = placeEyes(sdBase, EYE_AT[0], EYE_AT[1], norm3([0.3, 0.12, 1]), 0.095 * HEAD.scale, hex(0x79b8e8));

function sdf(px, py, pz) {
  let d = sdBase(px, py, pz);
  if (d < 0.3 && px > 4.3 && py > 6.0) {
    d = withEye(d, px, py, Math.abs(pz), EYE);
    d = MOUTH.carve(d, px, py);
  }
  return d;
}

// ---------- 色 ----------
const PAL = {
  body: hex(0x79b8e8),
  back: hex(0x6aaee2),
  spot: hex(0x579dd6),
  belly: hex(0xe3f3ff),
  nostril: hex(0x3a6f9c),
};

const isNail = (px, py, az) => py < 0.3 && sdNails(px, py, az) < 0.014;

// 背中から首へのまだらと、ほおのチーク
const SPOTS = [
  [-3.3, 2.5, 0.16],
  [-2.2, 2.95, 0.22],
  [-1.0, 3.45, 0.28],
  [0.3, 3.85, 0.32],
  [1.55, 4.15, 0.3],
  [2.75, 5.0, 0.24],
  [3.5, 5.85, 0.2],
].map(([x, y, r]) => [x, y, surfaceZ(sdBase, x, y) ?? 0, r]);
const CHEEK_AT = fromHead([4.98, 6.6]);
const CHEEK = [CHEEK_AT[0], CHEEK_AT[1], surfaceZ(sdBase, CHEEK_AT[0], CHEEK_AT[1]), 0.15];
const NOSTRIL = fromHead([5.24, 6.63, 0.07]);

function color([px, py, pz], [, ny]) {
  const az = Math.abs(pz);
  if (isNail(px, py, az)) return FACE.nail;
  const mouth = MOUTH.at(px, py, ny);
  // おなかは明るい色、背中は少しこく。足・口・目のまわりにはおなかの色をつけない
  const leg = smoothstep(0.05, -0.1, Math.min(sdHindLeg(px, py, az), sdFrontLeg(px, py, az)) - sdTorso(px, py, pz));
  let c = lerp3(PAL.belly, PAL.body, Math.max(smoothstep(-0.45, -0.28, ny), mouth.near, nearEye(px, py, az, EYE), leg));
  c = lerp3(c, PAL.back, smoothstep(0.35, 0.9, ny));
  c = lerp3(c, PAL.spot, spotAmount(px, py, az, SPOTS));
  c = lerp3(c, FACE.cheek, 0.7 * spotAmount(px, py, az, [CHEEK]));
  const dn = Math.hypot((px - NOSTRIL[0]) * 0.8, py - NOSTRIL[1], az - NOSTRIL[2]);
  c = lerp3(c, PAL.nostril, 1 - smoothstep(0.035, 0.055, dn));
  return lerp3(c, ny > 0 && az < 0.12 ? FACE.tongue : FACE.mouth, mouth.inside);
}

const gloss = ([px, py, pz], [, ny]) => (isNail(px, py, Math.abs(pz)) ? 0.8 : 0.6 * MOUTH.at(px, py, ny).inside);

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
const pt = (p) => [p[0], p[1], 0];
const BONES = [
  ["hips", null, [0.0, 3.15, 0], [0.95, 3.25, 0]],
  ["spine1", "hips", [0.95, 3.25, 0], [1.9, 3.5, 0]],
  ["spine2", "spine1", [1.9, 3.5, 0], pt(NECK[0])],
  ["neck1", "spine2", pt(NECK[0]), pt(NECK[1])],
  ["neck2", "neck1", pt(NECK[1]), pt(NECK[2])],
  ["neck3", "neck2", pt(NECK[2]), pt(NECK[3])],
  ["neck4", "neck3", pt(NECK[3]), pt(NECK[4])],
  ["head", "neck4", pt(NECK[4]), fromHead([5.2, 6.5])],
  ["jaw", "head", fromHead([4.66, 6.52]), fromHead([5.1, 6.42])],
  ["tail1", "hips", pt(TAIL[0]), pt(TAIL[1])],
  ["tail2", "tail1", pt(TAIL[1]), pt(TAIL[2])],
  ["tail3", "tail2", pt(TAIL[2]), pt(TAIL[3])],
  ["tail4", "tail3", pt(TAIL[3]), pt(TAIL[4])],
  ["tail5", "tail4", pt(TAIL[4]), pt(TAIL[5])],
  ...legBones(1, "R"),
  ...legBones(-1, "L"),
  ...armBones(1, "R"),
  ...armBones(-1, "L"),
];
const TORSO_BONES = ["hips", "spine1", "spine2", "neck1", "neck2", "neck3", "neck4", "tail1", "tail2", "tail3", "tail4", "tail5"];

function skin(px, py, pz) {
  const az = Math.abs(pz);
  const tag = pz >= 0 ? "R" : "L";
  return blendGroups([
    [sdTorso(px, py, pz), () => byDistance(BONES, TORSO_BONES, px, py, pz)],
    [
      boxDist(px, py, pz, BOX_HEAD) < 0.3 ? sdHead(px, py, pz) : 10,
      () => {
        // 口の線より下は jaw（もぐもぐ・なき声）
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
  name: "brachiosaurus",
  grid: { min: [-5.2, -0.04, -1.25], max: [6.2, 7.7, 1.25], h: 0.02 },
  sdf,
  color,
  gloss,
  skin,
  bones: BONES,
  eyes: EYES,
};
