// ブラキオサウルスの形・色・骨。
// 座標: x が前（頭の向き）、y が上、z が右。地面が y=0。単位はだいたいメートル（本物より小さめ）。
import { byDistance, blendGroups } from "./mesh.mjs";
import { boxDist, fbm, hex, lerp3, norm3, rcz, sdEllipsoid, sdRoundCone, sdSphere, smax, smin, smoothstep, withEye } from "./sdf.mjs";

// ---------- 胴・首・しっぽ ----------
const TAIL = [
  [-0.4, 3.25, 0.62],
  [-1.7, 3.0, 0.43],
  [-3.0, 2.6, 0.28],
  [-4.2, 2.1, 0.16],
  [-5.3, 1.65, 0.07],
  [-6.1, 1.4, 0.02],
];
// 肩から斜め上へのびる長い首
const NECK = [
  [2.45, 4.1, 0.62],
  [3.0, 4.85, 0.46],
  [3.55, 5.55, 0.36],
  [4.05, 6.15, 0.29],
  [4.5, 6.6, 0.24],
];
const BOX_TORSO = [-6.3, 1.9, -1.1, 4.8, 7.0, 1.1];

function sdTorso(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.0, 3.15, 0], [0.9, 0.72, 0.68]); // 腰
  d = smin(d, sdEllipsoid(px, py, pz, [1.05, 3.2, 0], [1.5, 1.05, 0.95]), 0.45); // 胴
  d = smin(d, sdEllipsoid(px, py, pz, [2.05, 3.55, 0], [0.85, 0.95, 0.82]), 0.4); // 高い肩
  d = smin(d, sdEllipsoid(px, py, pz, [0.95, 2.5, 0], [1.25, 0.48, 0.75]), 0.4); // おなか
  d = smin(d, sdEllipsoid(px, py, pz, [-0.8, 3.05, 0], [0.95, 0.6, 0.55]), 0.35); // しっぽの付け根
  for (let i = 0; i < TAIL.length - 1; i++) {
    const a = TAIL[i], b = TAIL[i + 1];
    d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.85), 0.15);
  }
  if (px > 1.6) {
    for (let i = 0; i < NECK.length - 1; i++) {
      const a = NECK[i], b = NECK[i + 1];
      d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.85), i === 0 ? 0.4 : 0.12);
    }
  }
  return d;
}

// ---------- 頭（鼻の上が高く盛り上がる） ----------
const lipY = (x) => 6.47 - 0.25 * (x - 4.75);
const EYE = { center: [4.72, 6.78, 0.17], axis: norm3([0.2, 0.2, 1]), radius: 0.042 };
const NOSTRIL = [4.83, 6.99, 0.06];
const BOX_HEAD = [4.3, 6.15, -0.4, 5.45, 7.2, 0.4];

function sdHead(px, py, pz, az) {
  let d = sdEllipsoid(px, py, pz, [4.72, 6.68, 0], [0.3, 0.22, 0.2]);
  d = smin(d, sdEllipsoid(px, py, pz, [4.78, 6.88, 0], [0.2, 0.16, 0.15]), 0.08); // 鼻の上の盛り上がり
  d = smin(d, rcz(px, py, pz, [4.75, 6.6, 0], [5.2, 6.42, 0], 0.18, 0.12, 0.85), 0.08); // 口先
  d = smin(d, rcz(px, py, pz, [4.6, 6.52, 0], [5.15, 6.36, 0], 0.14, 0.08, 0.8), 0.05); // 下あご
  return smin(d, sdEllipsoid(px, py, az, [4.68, 6.6, 0.12], [0.22, 0.12, 0.1]), 0.05); // ほお
}

// ---------- 足（ゾウのような太い柱） ----------
const LZ = 0.58;
const HIP = [0.0, 2.7, LZ], KNEE = [0.3, 1.5, LZ], ANKLE = [0.05, 0.45, LZ], BALL = [0.28, 0.13, LZ], TOE_TIP = [0.56, 0.06, LZ];
const HIND_TOES = [
  [[0.3, 0.13, LZ, 0.11], [0.55, 0.08, LZ, 0.075]],
  [[0.28, 0.12, LZ - 0.07, 0.1], [0.5, 0.075, LZ - 0.18, 0.068]],
  [[0.28, 0.12, LZ + 0.07, 0.1], [0.5, 0.075, LZ + 0.18, 0.068]],
];
const BOX_HIND = [-0.7, -0.05, 0.0, 1.0, 3.5, 1.15];

function sdHindLeg(px, py, az) {
  let d = rcz(px, py, az, HIP, KNEE, 0.56, 0.32, 0.8);
  d = smin(d, sdEllipsoid(px, py, az, [0.15, 2.35, LZ], [0.5, 0.65, 0.42]), 0.2);
  d = smin(d, sdSphere(px, py, az, KNEE, 0.3), 0.1);
  d = smin(d, rcz(px, py, az, KNEE, ANKLE, 0.3, 0.22, 0.9), 0.1);
  d = smin(d, sdSphere(px, py, az, ANKLE, 0.22), 0.06);
  d = smin(d, rcz(px, py, az, ANKLE, BALL, 0.21, 0.19, 0.95), 0.06);
  if (py < 0.45) {
    d = smin(d, sdEllipsoid(px, py, az, [0.33, 0.13, LZ], [0.32, 0.13, 0.29]), 0.06);
    for (const [a, b] of HIND_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.04);
  }
  return d;
}

const FZ = 0.6;
const SHOULDER = [2.15, 3.05, FZ], ELBOW = [1.95, 1.75, FZ], WRIST = [2.12, 0.45, FZ], HAND = [2.22, 0.13, FZ], FINGER_TIP = [2.48, 0.06, FZ];
const FRONT_TOES = [
  [[2.24, 0.13, FZ, 0.1], [2.45, 0.08, FZ, 0.07]],
  [[2.22, 0.12, FZ - 0.07, 0.09], [2.4, 0.075, FZ - 0.17, 0.062]],
  [[2.22, 0.12, FZ + 0.07, 0.09], [2.4, 0.075, FZ + 0.17, 0.062]],
];
const BOX_FRONT = [1.4, -0.05, 0.1, 2.9, 3.8, 1.15];

function sdFrontLeg(px, py, az) {
  let d = rcz(px, py, az, SHOULDER, ELBOW, 0.4, 0.26, 0.85);
  d = smin(d, sdEllipsoid(px, py, az, [2.15, 2.85, FZ - 0.05], [0.42, 0.55, 0.38]), 0.18);
  d = smin(d, sdSphere(px, py, az, ELBOW, 0.26), 0.08);
  d = smin(d, rcz(px, py, az, ELBOW, WRIST, 0.25, 0.2, 0.9), 0.08);
  d = smin(d, sdSphere(px, py, az, WRIST, 0.2), 0.06);
  d = smin(d, rcz(px, py, az, WRIST, HAND, 0.2, 0.18, 0.95), 0.05);
  if (py < 0.45) {
    d = smin(d, sdEllipsoid(px, py, az, [2.25, 0.13, FZ], [0.3, 0.13, 0.28]), 0.06);
    for (const [a, b] of FRONT_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.04);
  }
  return d;
}

const NAILS = [...HIND_TOES, ...FRONT_TOES].map(([, tip]) => [[tip[0] - 0.02, tip[1], tip[2]], [tip[0] + 0.06, tip[1] - 0.025, tip[2]], tip[3] * 0.9, 0.025]);
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
  if (boxDist(px, py, pz, BOX_HEAD) < 0.4) d = smin(d, sdHead(px, py, pz, az), 0.12);
  if (boxDist(px, py, az, BOX_HIND) < 0.4) d = smin(d, sdHindLeg(px, py, az), 0.3);
  if (boxDist(px, py, az, BOX_FRONT) < 0.4) d = smin(d, sdFrontLeg(px, py, az), 0.25);
  if (py < 0.3) d = smin(d, sdNails(px, py, az), 0.02);
  return d;
}

function detailBumps(px, py, pz) {
  let d = 0.008 * fbm(px * 2.6, py * 2.6, pz * 2.6);
  // 首のしわ：首の向きにそって、横の筋
  const neck = smoothstep(2.6, 3.0, px) * (1 - smoothstep(4.3, 4.55, px));
  if (neck > 0) d += 0.009 * neck * Math.sin(30 * (0.78 * px + 0.62 * py));
  if (px > 4.7 && px < 5.2) d += 0.008 * Math.exp(-(((py - lipY(px)) / 0.012) ** 2)); // 口の線
  return d;
}

function sdf(px, py, pz) {
  let d = sdBase(px, py, pz);
  if (d < 0.3) {
    const az = Math.abs(pz);
    d += detailBumps(px, py, pz);
    if (px > 4.4 && py > 6.4) {
      d = withEye(d, px, py, az, EYE);
      d = smax(d, -sdEllipsoid(px, py, az, NOSTRIL, [0.05, 0.025, 0.025]), 0.008);
    }
  }
  return smax(d, -py, 0.02);
}

// ---------- 色 ----------
const PAL = {
  back: hex(0x47534e),
  side: hex(0x7c897f),
  belly: hex(0xc9c7af),
  band: hex(0x2f3833),
  nail: hex(0x3b3a33),
  eyeRing: hex(0x262c28),
  nostril: hex(0x1a1f1c),
  lip: hex(0x3a3f39),
  sole: hex(0x2c2f2a),
};

const isNail = (px, py, az) => py < 0.3 && sdNails(px, py, az) < 0.014;

function color([px, py, pz], [, ny]) {
  const az = Math.abs(pz);
  if (isNail(px, py, az)) return PAL.nail;
  let c = lerp3(PAL.belly, PAL.side, smoothstep(-0.6, 0.05, ny));
  c = lerp3(c, PAL.back, smoothstep(0.1, 0.85, ny));
  // 背中から首へ、うすい帯
  if (px > -5.0 && px < 4.5 && py > 2.3) {
    const s = Math.sin((px + py * 0.6) * 3.4 + 1.2 * fbm(px * 1.1, py * 1.1, pz * 1.1));
    c = lerp3(c, PAL.band, smoothstep(0.6, 0.9, s) * smoothstep(-0.2, 0.5, ny) * 0.45);
  }
  const m = fbm(px * 1.8 + 11, py * 1.8, pz * 1.8);
  c = c.map((v) => v * (1 + 0.15 * m));
  const de = Math.hypot(px - EYE.center[0], py - EYE.center[1], az - EYE.center[2]);
  if (de < 0.1) c = lerp3(c, PAL.eyeRing, 0.55 * (1 - smoothstep(0.055, 0.1, de)));
  const dn = Math.hypot((px - NOSTRIL[0]) / 1.5, py - NOSTRIL[1], az - NOSTRIL[2]);
  if (dn < 0.05) c = lerp3(c, PAL.nostril, 1 - smoothstep(0.02, 0.05, dn));
  if (px > 4.75 && Math.abs(py - lipY(px)) < 0.015) c = lerp3(c, PAL.lip, 0.7);
  if (py < 0.05) c = lerp3(c, PAL.sole, 0.6);
  return c;
}

const detail = ([px, py, pz]) => [
  Math.max(smoothstep(4.25, 4.55, px), 1 - smoothstep(0.45, 1.0, py)),
  isNail(px, py, Math.abs(pz)) ? 0.1 : 1,
];

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
  ["head", "neck4", pt(NECK[4]), [5.2, 6.42, 0]],
  ["jaw", "head", [4.62, 6.5, 0], [5.15, 6.36, 0]],
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
      boxDist(px, py, pz, BOX_HEAD) < 0.3 ? sdHead(px, py, pz, az) : 10,
      () => {
        // 口の線より下は jaw（もぐもぐ）
        const jaw = smoothstep(0.02, -0.02, py - lipY(px)) * smoothstep(4.62, 4.8, px);
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
  grid: { min: [-6.25, -0.04, -1.12], max: [5.48, 7.3, 1.12], h: 0.024 },
  scales: { big: 13, small: 24 },
  sdf,
  color,
  detail,
  skin,
  bones: BONES,
  eyes: [1, -1].map((s) => ({ center: [EYE.center[0], EYE.center[1], s * EYE.center[2]], axis: [EYE.axis[0], EYE.axis[1], s * EYE.axis[2]], radius: EYE.radius })),
};
