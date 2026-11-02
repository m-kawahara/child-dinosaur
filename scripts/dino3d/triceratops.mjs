// トリケラトプスの形・色・骨。かわいい 3D：大きな頭と目、先のまるい角、水玉のえりかざり、明るいオレンジ。
// 座標: x が前（頭の向き）、y が上、z が右。地面が y=0。単位はだいたいメートル。
import { byDistance, blendGroups } from "./mesh.mjs";
import {
  boxDist, FACE, headSpace, hex, lerp3, makeMouth, nearEye, norm3, placeEyes, rcz, sdChain, sdEllipsoid, sdRoundCone, sdSphere, smax, smin,
  smoothstep, spotAmount, surfaceZ, withEye,
} from "./sdf.mjs";

// ---------- 胴・首・しっぽ ----------
const TAIL = [
  [-0.3, 2.5, 0.64],
  [-1.3, 2.32, 0.48],
  [-2.2, 2.05, 0.33],
  [-2.95, 1.78, 0.2],
  [-3.45, 1.6, 0.1],
];
const BOX_TORSO = [-3.65, 1.0, -1.2, 3.4, 3.5, 1.2];

function sdTorso(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.1, 2.5, 0], [0.95, 0.75, 0.75]); // 腰
  d = smin(d, sdEllipsoid(px, py, pz, [1.3, 2.3, 0], [1.5, 1.08, 1.05]), 0.4); // たる型の胴
  d = smin(d, sdEllipsoid(px, py, pz, [1.1, 1.7, 0], [1.25, 0.55, 0.88]), 0.35); // おなか
  d = smin(d, sdEllipsoid(px, py, pz, [2.35, 2.15, 0], [0.75, 0.82, 0.85]), 0.35); // 肩
  d = smin(d, rcz(px, py, pz, [2.6, 2.3, 0], [3.1, 2.35, 0], 0.66, 0.6, 0.95), 0.25); // 首
  d = smin(d, sdEllipsoid(px, py, pz, [-0.75, 2.4, 0], [0.95, 0.62, 0.6]), 0.35); // しっぽの付け根
  for (let i = 0; i < TAIL.length - 1; i++) {
    const a = TAIL[i], b = TAIL[i + 1];
    d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.85), 0.2);
  }
  return d;
}

// ---------- 頭（頭の座標で作り、首のつけ根を中心に大きくして置く） ----------
const HEAD = headSpace([3.0, 2.35], 1.22);
const { toHead, fromHead } = HEAD;

/** 口の線。口の角が上がって、にっこりして見える */
const lipY = (x) => 1.96 + 0.16 * smoothstep(3.9, 3.4, x);
const MOUTH = makeMouth(HEAD, lipY, 3.45, 0.02);

// えりかざり：頭の後ろから首の上へ大きく傾いた、反った板（左右は下へ曲がる）
const FRILL_U = norm3([-0.8, 0.6, 0]); // 板の上の向き（後ろへ大きく傾く）
const FRILL_N = norm3([0.6, 0.8, 0]); // 板の表の向き
const FRILL_R = { t: 0.1, u: 1.0, w: 1.08 };
const FRILL_BASE = [3.3, 2.8];
const FRILL_C = [FRILL_BASE[0] + FRILL_U[0] * FRILL_R.u * 0.85, FRILL_BASE[1] + FRILL_U[1] * FRILL_R.u * 0.85, 0];
const FRILL_BEND = 0.45; // 左右のふちがほおのほうへ下がる（横から見ても大きな盾に見える）
/** えりかざりの板の中の座標（t: 厚み方向、u: 上下、w: 左右） */
const frillLocal = (px, py, pz) => {
  const qx = px - FRILL_C[0], qy = py - FRILL_C[1];
  const t = qx * FRILL_N[0] + qy * FRILL_N[1];
  const u = qx * FRILL_U[0] + qy * FRILL_U[1];
  return { t: t + FRILL_BEND * pz * pz, u, w: pz };
};
// ふちのまるいでこぼこ
const FRILL_RIM = [];
for (let deg = -25; deg <= 205; deg += 14) {
  const a = (deg * Math.PI) / 180;
  const u = FRILL_R.u * Math.sin(a) * 0.96, w = FRILL_R.w * Math.cos(a) * 0.96;
  const back = -FRILL_BEND * w * w;
  FRILL_RIM.push([0, 1, 2].map((i) => FRILL_C[i] + FRILL_U[i] * u + FRILL_N[i] * back + (i === 2 ? w : 0)));
}
// えりかざりの水玉（板の中の u, w と半径）
const FRILL_DOTS = [[0.5, 0, 0.17], [0.22, 0.48, 0.14], [0.22, -0.48, 0.14], [-0.15, 0.78, 0.12], [-0.15, -0.78, 0.12], [0.62, 0.55, 0.1], [0.62, -0.55, 0.1]];

function sdFrill(px, py, pz) {
  const { t, u, w } = frillLocal(px, py, pz);
  // 頭につながる根もとは厚く
  const thick = FRILL_R.t + 0.14 * smoothstep(-0.3, -0.85, u / FRILL_R.u);
  let d = sdEllipsoid(t, u, w, [0, 0, 0], [thick, FRILL_R.u, FRILL_R.w]) * 0.7;
  for (const p of FRILL_RIM) d = smin(d, sdSphere(px, py, pz, p, 0.1), 0.05);
  return d;
}

// 角（目の上の2本は上へ、鼻の上は小さく）。先はまるく
const BROW_HORN = [[3.5, 2.85, 0.25, 0.12], [3.62, 3.12, 0.28, 0.09], [3.78, 3.36, 0.3, 0.055]];
const NOSE_HORN = [[4.16, 2.18, 0, 0.13], [4.3, 2.52, 0, 0.06]];
const sdHorns = (px, py, pz, az) => Math.min(sdChain(px, py, az, BROW_HORN), sdChain(px, py, pz, NOSE_HORN));

// くちばしの先（上と下）
const sdBeak = (px, py, pz) =>
  Math.min(rcz(px, py, pz, [4.32, 2.02, 0], [4.55, 1.9, 0], 0.2, 0.1, 0.6), rcz(px, py, pz, [4.2, 1.84, 0], [4.42, 1.8, 0], 0.14, 0.08, 0.6));

function sdUpperHead(px, py, pz, az) {
  let d = sdEllipsoid(px, py, pz, [3.45, 2.45, 0], [0.62, 0.55, 0.5]); // まるい頭
  d = smin(d, rcz(px, py, pz, [3.7, 2.25, 0], [4.35, 2.02, 0], 0.42, 0.28, 0.8), 0.25); // 鼻先
  d = smin(d, sdEllipsoid(px, py, az, [3.45, 2.15, 0.3], [0.42, 0.34, 0.3]), 0.15); // ほお
  return smax(d, lipY(px) - py, 0.03);
}

function sdLowerJaw(px, py, pz) {
  const d = rcz(px, py, pz, [3.4, 1.9, 0], [4.25, 1.85, 0], 0.32, 0.22, 0.75);
  return smax(d, py - lipY(px), 0.03);
}

/** 頭（体の座標で受けて、体の座標の距離を返す） */
function sdHead(px, py, pz) {
  const [hx, hy, hz] = toHead(px, py, pz);
  const az = Math.abs(hz);
  let d = smin(sdUpperHead(hx, hy, hz, az), sdLowerJaw(hx, hy, hz), 0.05);
  d = smin(d, sdFrill(hx, hy, hz), 0.15);
  d = smin(d, sdBeak(hx, hy, hz), 0.04);
  d = smin(d, sdHorns(hx, hy, hz, az), 0.06);
  return d * HEAD.scale;
}
const BOX_HEAD = [...fromHead([1.5, 1.4, -1.35]), ...fromHead([4.85, 4.25, 1.35])];

// ---------- 足（左右で同じ形） ----------
const LZ = 0.62;
const HIP = [0.05, 2.2, LZ];
const KNEE = [0.45, 1.25, LZ];
const ANKLE = [0.1, 0.42, LZ];
const BALL = [0.36, 0.12, LZ];
const TOE_TIP = [0.7, 0.07, LZ];
const HIND_TOES = [
  [[0.36, 0.13, LZ, 0.12], [0.62, 0.1, LZ, 0.095]],
  [[0.33, 0.12, LZ - 0.07, 0.11], [0.56, 0.09, LZ - 0.19, 0.085]],
  [[0.33, 0.12, LZ + 0.07, 0.11], [0.56, 0.09, LZ + 0.19, 0.085]],
];
const BOX_HIND = [-0.7, -0.05, 0.0, 1.15, 3.0, 1.3];

function sdHindLeg(px, py, az) {
  let d = rcz(px, py, az, HIP, KNEE, 0.55, 0.3, 0.8); // 太もも
  d = smin(d, sdEllipsoid(px, py, az, [0.3, 1.95, LZ], [0.48, 0.65, 0.42]), 0.2);
  d = smin(d, rcz(px, py, az, KNEE, ANKLE, 0.3, 0.2, 0.9), 0.15); // すね
  d = smin(d, rcz(px, py, az, ANKLE, BALL, 0.2, 0.17, 0.95), 0.08);
  if (py < 0.45) {
    d = smin(d, sdEllipsoid(px, py, az, [0.42, 0.12, LZ], [0.32, 0.12, 0.27]), 0.06); // 足のうら
    for (const [a, b] of HIND_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.05);
  }
  return d;
}

const FZ = 0.66;
const SHOULDER = [2.45, 1.9, FZ];
const ELBOW = [2.2, 1.08, FZ];
const WRIST = [2.42, 0.32, FZ];
const HAND = [2.55, 0.11, FZ];
const FINGER_TIP = [2.85, 0.07, FZ];
const FRONT_TOES = [
  [[2.55, 0.12, FZ, 0.105], [2.78, 0.09, FZ, 0.08]],
  [[2.53, 0.11, FZ - 0.06, 0.095], [2.72, 0.085, FZ - 0.16, 0.075]],
  [[2.53, 0.11, FZ + 0.06, 0.095], [2.72, 0.085, FZ + 0.16, 0.075]],
];
const BOX_FRONT = [1.65, -0.05, 0.15, 3.15, 2.5, 1.25];

function sdFrontLeg(px, py, az) {
  let d = rcz(px, py, az, SHOULDER, ELBOW, 0.34, 0.22, 0.85); // うで
  d = smin(d, sdEllipsoid(px, py, az, [2.45, 1.95, FZ - 0.05], [0.38, 0.48, 0.34]), 0.15); // 肩の筋肉
  d = smin(d, rcz(px, py, az, ELBOW, WRIST, 0.22, 0.17, 0.9), 0.12);
  d = smin(d, rcz(px, py, az, WRIST, HAND, 0.17, 0.15, 0.95), 0.06);
  if (py < 0.4) {
    d = smin(d, sdEllipsoid(px, py, az, [2.6, 0.11, FZ], [0.24, 0.11, 0.22]), 0.05);
    for (const [a, b] of FRONT_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.04);
  }
  return d;
}

// つめ（指先のまるいつめ）
const NAILS = [...HIND_TOES, ...FRONT_TOES].map(([, tip]) => [[tip[0] - 0.02, tip[1], tip[2]], [tip[0] + 0.07, tip[1] - 0.025, tip[2]], tip[3] * 0.8, 0.045]);
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
  if (boxDist(px, py, pz, BOX_HEAD) < 0.4) d = smin(d, sdHead(px, py, pz), 0.2);
  if (boxDist(px, py, az, BOX_HIND) < 0.4) d = smin(d, sdHindLeg(px, py, az), 0.28);
  if (boxDist(px, py, az, BOX_FRONT) < 0.4) d = smin(d, sdFrontLeg(px, py, az), 0.2);
  if (py < 0.3) d = smin(d, sdNails(px, py, az), 0.02);
  return smax(d, -py, 0.02);
}

const EYE_AT = fromHead([3.72, 2.56]);
const { eye: EYE, eyes: EYES } = placeEyes(sdBase, EYE_AT[0], EYE_AT[1], norm3([0.3, 0.12, 1]), 0.17 * HEAD.scale, hex(0xf2a65a));

function sdf(px, py, pz) {
  let d = sdBase(px, py, pz);
  if (d < 0.3 && px > 3.2) {
    d = withEye(d, px, py, Math.abs(pz), EYE);
    d = MOUTH.carve(d, px, py);
  }
  return d;
}

// ---------- 色 ----------
const PAL = {
  body: hex(0xf2a65a),
  back: hex(0xec9a4e),
  spot: hex(0xdf8a40),
  belly: hex(0xfff1c9),
  frill: hex(0xef8f4c),
  frillRim: hex(0xd9733a),
  frillDot: hex(0xfff1c9),
  horn: hex(0xfff4dc),
  beak: hex(0xd9803f),
  nostril: hex(0x9a4f22),
};

/** 角の付け根からの割合（0 = 付け根、1 = 先）。角でなければ null */
function hornT(hx, hy, hz, haz) {
  const along = (chain, z) => {
    const a = chain[0], b = chain[chain.length - 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    return Math.max(0, Math.min(1, ((hx - a[0]) * dx + (hy - a[1]) * dy + (z - a[2]) * dz) / (dx * dx + dy * dy + dz * dz)));
  };
  const db = sdChain(hx, hy, haz, BROW_HORN), dn = sdChain(hx, hy, hz, NOSE_HORN);
  const m = Math.min(db, dn);
  if (m > 0.012) return null;
  return m === db ? along(BROW_HORN, haz) : along(NOSE_HORN, hz);
}

function region(px, py, pz) {
  const az = Math.abs(pz);
  if (py < 0.3 && sdNails(px, py, az) < 0.015) return { kind: "nail" };
  if (px > 3.0) {
    const [hx, hy, hz] = toHead(px, py, pz);
    const h = hornT(hx, hy, hz, Math.abs(hz));
    if (h !== null) return { kind: "horn", t: h };
    if (hx > 4.15 && sdBeak(hx, hy, hz) < 0.015) return { kind: "beak" };
  }
  return { kind: "skin" };
}

// 背中のまだら（横の表面の上のほう）とほおのチーク
const SPOTS = [
  [-2.6, 2.15, 0.16],
  [-1.6, 2.5, 0.22],
  [-0.5, 2.85, 0.28],
  [0.75, 3.05, 0.32],
  [1.9, 2.85, 0.28],
].map(([x, y, r]) => [x, y, surfaceZ(sdBase, x, y) ?? 0, r]);
const CHEEK_AT = fromHead([3.95, 2.2]);
const CHEEK = [CHEEK_AT[0], CHEEK_AT[1], surfaceZ(sdBase, CHEEK_AT[0], CHEEK_AT[1]), 0.18];
const NOSTRIL = fromHead([4.48, 2.12, 0.1]);

function color([px, py, pz], [nx, ny]) {
  const az = Math.abs(pz);
  const r = region(px, py, pz);
  if (r.kind === "nail") return FACE.nail;
  if (r.kind === "horn") return lerp3(PAL.horn, [1, 1, 1], smoothstep(0.5, 1, r.t) * 0.5);
  const mouth = MOUTH.at(px, py, ny);
  const inside = ny > 0 && az < 0.15 ? FACE.tongue : FACE.mouth;
  if (r.kind === "beak") return lerp3(PAL.beak, inside, mouth.inside);
  // えりかざりの表：水玉もよう、ふちはこく。裏は体の色
  if (px > 1.3 && py > 2.4) {
    const [hx, hy, hz] = toHead(px, py, pz);
    const f = frillLocal(hx, hy, hz);
    const rim = Math.hypot(f.u / FRILL_R.u, f.w / FRILL_R.w);
    if (Math.abs(f.t) < 0.22 && rim < 1.25 && f.u > -0.5) {
      const facing = smoothstep(-0.2, 0.3, nx * FRILL_N[0] + ny * FRILL_N[1]) * smoothstep(-0.45, -0.25, f.u);
      let c = lerp3(PAL.frill, PAL.frillRim, smoothstep(0.84, 0.94, rim));
      for (const [u, w, rad] of FRILL_DOTS) c = lerp3(c, PAL.frillDot, 1 - smoothstep(rad * 0.85, rad, Math.hypot(f.u - u, f.w - w)));
      return lerp3(PAL.body, c, facing);
    }
  }
  // おなかは明るい色、背中は少しこく。足・口・目のまわりにはおなかの色をつけない
  const leg = smoothstep(0.05, -0.1, Math.min(sdHindLeg(px, py, az), sdFrontLeg(px, py, az)) - sdTorso(px, py, pz));
  let c = lerp3(PAL.belly, PAL.body, Math.max(smoothstep(-0.45, -0.28, ny), mouth.near, nearEye(px, py, az, EYE), leg));
  c = lerp3(c, PAL.back, smoothstep(0.35, 0.9, ny));
  c = lerp3(c, PAL.spot, spotAmount(px, py, az, SPOTS));
  c = lerp3(c, FACE.cheek, 0.7 * spotAmount(px, py, az, [CHEEK]));
  const dn = Math.hypot((px - NOSTRIL[0]) * 0.8, py - NOSTRIL[1], az - NOSTRIL[2]);
  c = lerp3(c, PAL.nostril, 1 - smoothstep(0.035, 0.055, dn));
  return lerp3(c, inside, mouth.inside);
}

/** 角・くちばし・つめはつやつや、口の中は少しぬれたつや */
const gloss = ([px, py, pz], [, ny]) => (region(px, py, pz).kind !== "skin" ? 0.8 : 0.6 * MOUTH.at(px, py, ny).inside);

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
  ["hips", null, [0.05, 2.5, 0], [0.9, 2.45, 0]],
  ["spine1", "hips", [0.9, 2.45, 0], [1.8, 2.35, 0]],
  ["spine2", "spine1", [1.8, 2.35, 0], [2.65, 2.3, 0]],
  ["neck", "spine2", [2.65, 2.3, 0], [3.15, 2.4, 0]],
  ["head", "neck", [3.15, 2.4, 0], fromHead([4.6, 1.9])],
  ["jaw", "head", fromHead([3.4, 2.05]), fromHead([4.4, 1.82])],
  ["tail1", "hips", [-0.4, 2.5, 0], [-1.3, 2.32, 0]],
  ["tail2", "tail1", [-1.3, 2.32, 0], [-2.2, 2.05, 0]],
  ["tail3", "tail2", [-2.2, 2.05, 0], [-2.95, 1.78, 0]],
  ["tail4", "tail3", [-2.95, 1.78, 0], [-3.5, 1.6, 0]],
  ...legBones(1, "R"),
  ...legBones(-1, "L"),
  ...armBones(1, "R"),
  ...armBones(-1, "L"),
];
const TORSO_BONES = ["hips", "spine1", "spine2", "neck", "tail1", "tail2", "tail3", "tail4"];

function skin(px, py, pz) {
  const az = Math.abs(pz);
  const tag = pz >= 0 ? "R" : "L";
  return blendGroups([
    [sdTorso(px, py, pz), () => byDistance(BONES, TORSO_BONES, px, py, pz)],
    [
      boxDist(px, py, pz, BOX_HEAD) < 0.3 ? sdHead(px, py, pz) : 10,
      () => {
        // 下あご（下のくちばし）は jaw、えりかざり・角をふくめ、それ以外は head についていく
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
  name: "triceratops",
  grid: { min: [-3.62, -0.04, -1.42], max: [5.0, 4.45, 1.42], h: 0.02 },
  sdf,
  color,
  gloss,
  skin,
  bones: BONES,
  eyes: EYES,
};
