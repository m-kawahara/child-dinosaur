// トリケラトプスの形・色・骨。
// 座標: x が前（頭の向き）、y が上、z が右。地面が y=0。単位はだいたいメートル。
import { byDistance, blendGroups } from "./mesh.mjs";
import {
  boxDist, fbm, hex, lerp3, norm3, rcz, sdChain, sdEllipsoid, sdRoundCone, sdSphere, smax, smin, smoothstep, withEye,
} from "./sdf.mjs";

// ---------- 胴・首・しっぽ ----------
const TAIL = [
  [-0.3, 2.5, 0.62],
  [-1.4, 2.3, 0.45],
  [-2.5, 1.95, 0.29],
  [-3.4, 1.6, 0.16],
  [-4.0, 1.38, 0.05],
];
const BOX_TORSO = [-4.2, 1.1, -1.15, 3.6, 3.4, 1.15];

function sdTorso(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.1, 2.5, 0], [0.95, 0.72, 0.72]); // 腰
  d = smin(d, sdEllipsoid(px, py, pz, [1.3, 2.3, 0], [1.5, 1.06, 1.02]), 0.4); // たる型の胴
  d = smin(d, sdEllipsoid(px, py, pz, [1.1, 1.66, 0], [1.25, 0.52, 0.85]), 0.35); // おなか
  d = smin(d, sdEllipsoid(px, py, pz, [2.4, 2.15, 0], [0.75, 0.82, 0.82]), 0.35); // 肩
  d = smin(d, rcz(px, py, pz, [2.7, 2.3, 0], [3.15, 2.3, 0], 0.62, 0.55, 0.95), 0.25); // 首
  d = smin(d, sdEllipsoid(px, py, pz, [-0.75, 2.4, 0], [0.95, 0.6, 0.58]), 0.35); // しっぽの付け根
  for (let i = 0; i < TAIL.length - 1; i++) {
    const a = TAIL[i], b = TAIL[i + 1];
    d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.82), 0.15);
  }
  return d;
}

// ---------- 頭 ----------
/** 口の線。くちばしに向かって下がり、口の角で上がる */
const lipY = (x) => (x >= 3.6 ? 1.98 - 0.25 * (x - 3.6) : 1.98 + (3.6 - x) * 0.9);
const EYE = { center: [3.62, 2.62, 0.33], axis: norm3([0.25, 0.15, 1]), radius: 0.058 };
const NOSTRIL = [4.36, 2.02, 0.12];
const BOX_HEAD = [1.5, 1.45, -1.3, 4.8, 4.2, 1.3];

// えりかざり：頭の後ろから首の上へ大きく傾いた、反った板（左右は下へ曲がる）
const FRILL_U = norm3([-0.8, 0.6, 0]); // 板の上の向き（後ろへ大きく傾く）
const FRILL_N = norm3([0.6, 0.8, 0]); // 板の表の向き
const FRILL_R = { t: 0.1, u: 1.05, w: 1.02 };
const FRILL_BASE = [3.3, 2.8];
const FRILL_C = [FRILL_BASE[0] + FRILL_U[0] * FRILL_R.u * 0.85, FRILL_BASE[1] + FRILL_U[1] * FRILL_R.u * 0.85, 0];
const FRILL_BEND = 0.5; // 左右のふちがほおのほうへ下がる（横から見ても大きな盾に見える）
/** えりかざりの板の中の座標（t: 厚み方向、u: 上下、w: 左右） */
const frillLocal = (px, py, pz) => {
  const qx = px - FRILL_C[0], qy = py - FRILL_C[1];
  const t = qx * FRILL_N[0] + qy * FRILL_N[1];
  const u = qx * FRILL_U[0] + qy * FRILL_U[1];
  return { t: t + FRILL_BEND * pz * pz, u, w: pz };
};
// ふちのでこぼこ（えりの骨のとげ）
const FRILL_RIM = [];
for (let deg = -25; deg <= 205; deg += 13) {
  const a = (deg * Math.PI) / 180;
  const u = FRILL_R.u * Math.sin(a) * 0.97, w = FRILL_R.w * Math.cos(a) * 0.97;
  const back = -FRILL_BEND * w * w;
  const p = [0, 1, 2].map((i) => FRILL_C[i] + FRILL_U[i] * u + FRILL_N[i] * back + (i === 2 ? w : 0));
  const out = norm3([FRILL_U[0] * Math.sin(a), FRILL_U[1] * Math.sin(a), Math.cos(a)]);
  FRILL_RIM.push([p, [p[0] + out[0] * 0.11, p[1] + out[1] * 0.11, p[2] + out[2] * 0.11]]);
}

function sdFrill(px, py, pz) {
  const { t, u, w } = frillLocal(px, py, pz);
  // 頭につながる根もとは厚く
  const thick = FRILL_R.t + 0.14 * smoothstep(-0.3, -0.85, u / FRILL_R.u);
  let d = sdEllipsoid(t, u, w, [0, 0, 0], [thick, FRILL_R.u, FRILL_R.w]) * 0.7;
  for (const [a, b] of FRILL_RIM) d = smin(d, sdRoundCone(px, py, pz, a, b, 0.07, 0.025), 0.04);
  return d;
}

// 角（目の上の2本は長く前へ、鼻の上は短く、ほおの角は下向き）
const BROW_HORN = [[3.55, 2.85, 0.25, 0.11], [3.95, 3.25, 0.3, 0.07], [4.45, 3.5, 0.32, 0.015]];
const NOSE_HORN = [[4.12, 2.2, 0, 0.12], [4.3, 2.58, 0, 0.015]];
const CHEEK_HORN = [[3.45, 1.95, 0.48, 0.07], [3.4, 1.72, 0.62, 0.015]];
const sdHorns = (px, py, pz, az) =>
  Math.min(sdChain(px, py, az, BROW_HORN), sdChain(px, py, pz, NOSE_HORN), sdChain(px, py, az, CHEEK_HORN));

// くちばし（上と下）
const sdBeak = (px, py, pz) =>
  Math.min(
    rcz(px, py, pz, [4.35, 1.95, 0], [4.68, 1.62, 0], 0.22, 0.03, 0.55),
    rcz(px, py, pz, [4.3, 1.72, 0], [4.55, 1.62, 0], 0.14, 0.03, 0.55),
  );

function sdHead(px, py, pz, az) {
  let d = sdEllipsoid(px, py, pz, [3.3, 2.5, 0], [0.5, 0.55, 0.5]); // 頭の後ろ
  d = smin(d, rcz(px, py, pz, [3.45, 2.45, 0], [4.4, 1.85, 0], 0.45, 0.24, 0.66), 0.2); // 顔
  d = smin(d, sdEllipsoid(px, py, az, [3.45, 2.2, 0.3], [0.45, 0.35, 0.24]), 0.15); // ほお
  d = smin(d, smax(rcz(px, py, pz, [3.35, 1.95, 0], [4.35, 1.68, 0], 0.28, 0.13, 0.62), py - lipY(px) - 0.02, 0.03), 0.06); // 下あご
  d = smin(d, sdFrill(px, py, pz), 0.15);
  d = smin(d, sdBeak(px, py, pz), 0.04);
  d = smin(d, sdHorns(px, py, pz, az), 0.06);
  return d;
}

// ---------- 足（左右で同じ形） ----------
const LZ = 0.62;
const HIP = [0.05, 2.2, LZ];
const KNEE = [0.45, 1.25, LZ];
const ANKLE = [0.1, 0.42, LZ];
const BALL = [0.36, 0.12, LZ];
const TOE_TIP = [0.66, 0.06, LZ];
const HIND_TOES = [
  [[0.36, 0.12, LZ, 0.1], [0.62, 0.08, LZ, 0.075]],
  [[0.33, 0.11, LZ - 0.06, 0.09], [0.56, 0.07, LZ - 0.17, 0.065]],
  [[0.33, 0.11, LZ + 0.06, 0.09], [0.56, 0.07, LZ + 0.17, 0.065]],
];
const BOX_HIND = [-0.6, -0.05, 0.0, 1.1, 3.0, 1.2];

function sdHindLeg(px, py, az) {
  let d = rcz(px, py, az, HIP, KNEE, 0.5, 0.25, 0.8); // 太もも
  d = smin(d, sdEllipsoid(px, py, az, [0.3, 1.95, LZ], [0.45, 0.62, 0.4]), 0.2);
  d = smin(d, sdSphere(px, py, az, KNEE, 0.24), 0.1);
  d = smin(d, rcz(px, py, az, KNEE, ANKLE, 0.25, 0.16, 0.9), 0.1); // すね
  d = smin(d, sdSphere(px, py, az, ANKLE, 0.17), 0.06);
  d = smin(d, rcz(px, py, az, ANKLE, BALL, 0.16, 0.14, 0.95), 0.06);
  if (py < 0.4) {
    d = smin(d, sdEllipsoid(px, py, az, [0.42, 0.11, LZ], [0.3, 0.11, 0.24]), 0.06); // 足のうら
    for (const [a, b] of HIND_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.04);
  }
  return d;
}

const SHOULDER = [2.45, 1.9, 0.66];
const ELBOW = [2.2, 1.08, 0.66];
const WRIST = [2.42, 0.32, 0.66];
const HAND = [2.55, 0.11, 0.66];
const FINGER_TIP = [2.82, 0.06, 0.66];
const FZ = 0.66;
const FRONT_TOES = [
  [[2.55, 0.1, FZ, 0.085], [2.78, 0.07, FZ, 0.062]],
  [[2.53, 0.1, FZ - 0.06, 0.075], [2.72, 0.07, FZ - 0.15, 0.055]],
  [[2.53, 0.1, FZ + 0.06, 0.075], [2.72, 0.07, FZ + 0.15, 0.055]],
];
const BOX_FRONT = [1.7, -0.05, 0.2, 3.1, 2.5, 1.2];

function sdFrontLeg(px, py, az) {
  let d = rcz(px, py, az, SHOULDER, ELBOW, 0.3, 0.18, 0.85); // うで
  d = smin(d, sdEllipsoid(px, py, az, [2.45, 1.95, FZ - 0.05], [0.35, 0.45, 0.32]), 0.15); // 肩の筋肉
  d = smin(d, sdSphere(px, py, az, ELBOW, 0.19), 0.08);
  d = smin(d, rcz(px, py, az, ELBOW, WRIST, 0.18, 0.13, 0.9), 0.08);
  d = smin(d, sdSphere(px, py, az, WRIST, 0.14), 0.06);
  d = smin(d, rcz(px, py, az, WRIST, HAND, 0.14, 0.12, 0.95), 0.05);
  if (py < 0.35) {
    d = smin(d, sdEllipsoid(px, py, az, [2.6, 0.1, FZ], [0.22, 0.1, 0.2]), 0.05);
    for (const [a, b] of FRONT_TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.04);
  }
  return d;
}

// ひづめ（指先の丸いつめ）
const HOOVES = [...HIND_TOES, ...FRONT_TOES].map(([, tip]) => [[tip[0] - 0.02, tip[1], tip[2]], [tip[0] + 0.07, tip[1] - 0.025, tip[2]], tip[3] * 0.95, 0.03]);
const sdHooves = (px, py, az) => {
  let d = 10;
  for (const [a, b, r1, r2] of HOOVES) d = Math.min(d, sdRoundCone(px, py, az, a, b, r1, r2));
  return d;
};

// ---------- 全体 ----------
function sdBase(px, py, pz) {
  const az = Math.abs(pz);
  let d = 10;
  if (boxDist(px, py, pz, BOX_TORSO) < 0.4) d = sdTorso(px, py, pz);
  if (boxDist(px, py, pz, BOX_HEAD) < 0.4) d = smin(d, sdHead(px, py, pz, az), 0.2);
  if (boxDist(px, py, az, BOX_HIND) < 0.4) d = smin(d, sdHindLeg(px, py, az), 0.28);
  if (boxDist(px, py, az, BOX_FRONT) < 0.4) d = smin(d, sdFrontLeg(px, py, az), 0.2);
  if (py < 0.3) d = smin(d, sdHooves(px, py, az), 0.02);
  return d;
}

/** ゆるい凹凸と、首・ひざのしわ */
function detailBumps(px, py, pz) {
  let d = 0.008 * fbm(px * 3, py * 3, pz * 3);
  const neck = smoothstep(2.6, 2.85, px) * (1 - smoothstep(3.1, 3.3, px)) * smoothstep(1.7, 2.0, py);
  if (neck > 0) d += 0.008 * neck * Math.sin(40 * (0.85 * px + 0.5 * py));
  // 口の線は浅いみぞ
  if (px > 3.4 && px < 4.5) d += 0.012 * Math.exp(-(((py - lipY(px)) / 0.015) ** 2)) * smoothstep(3.4, 3.6, px);
  return d;
}

function sdf(px, py, pz) {
  let d = sdBase(px, py, pz);
  if (d < 0.3) {
    const az = Math.abs(pz);
    d += detailBumps(px, py, pz);
    if (px > 3.2 && py > 1.8) {
      d = withEye(d, px, py, az, EYE);
      d = smax(d, -sdEllipsoid(px, py, az, NOSTRIL, [0.06, 0.035, 0.03]), 0.01); // 鼻の穴
    }
  }
  return smax(d, -py, 0.02);
}

// ---------- 色 ----------
const PAL = {
  back: hex(0x4b3d2c),
  side: hex(0x846847),
  belly: hex(0xc7ac85),
  stripe: hex(0x2f261c),
  frill: hex(0x8f5835),
  frillCenter: hex(0xb9824d),
  frillEdge: hex(0x3c281b),
  frillSpike: hex(0xd6c4a0),
  hornBase: hex(0x7a6b56),
  hornTip: hex(0xebe2cf),
  beak: hex(0x2e2924),
  hoof: hex(0x3b352d),
  eyeRing: hex(0x2c2318),
  nostril: hex(0x1d1812),
  sole: hex(0x2e2a24),
};

/** 角の付け根からの割合（0 = 付け根、1 = 先） */
const hornT = (px, py, pz, az) => {
  const along = (chain, z) => {
    const a = chain[0], b = chain[chain.length - 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    return Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy + (z - a[2]) * dz) / (dx * dx + dy * dy + dz * dz)));
  };
  const db = sdChain(px, py, az, BROW_HORN), dn = sdChain(px, py, pz, NOSE_HORN), dc = sdChain(px, py, az, CHEEK_HORN);
  const m = Math.min(db, dn, dc);
  if (m > 0.012) return null;
  return m === db ? along(BROW_HORN, az) : m === dn ? along(NOSE_HORN, pz) : along(CHEEK_HORN, az);
};

function region(px, py, pz) {
  const az = Math.abs(pz);
  if (py < 0.3 && sdHooves(px, py, az) < 0.015) return { kind: "hoof" };
  if (px > 3.3) {
    const h = hornT(px, py, pz, az);
    if (h !== null) return { kind: "horn", t: h };
    if (sdBeak(px, py, pz) < 0.012) return { kind: "beak" };
  }
  return { kind: "skin" };
}

function color([px, py, pz], [nx, ny]) {
  const az = Math.abs(pz);
  const r = region(px, py, pz);
  if (r.kind === "hoof") return PAL.hoof;
  if (r.kind === "beak") return PAL.beak;
  if (r.kind === "horn") return lerp3(PAL.hornBase, PAL.hornTip, smoothstep(0.1, 0.85, r.t));
  // えりかざりの表：色のついた模様。ふちは濃く、とげは明るい
  if (px < 3.6 && py > 2.3 && px > 1.4) {
    const f = frillLocal(px, py, pz);
    const facing = nx * FRILL_N[0] + ny * FRILL_N[1];
    const rim = Math.hypot(f.u / FRILL_R.u, f.w / FRILL_R.w);
    if (Math.abs(f.t) < 0.2 && rim < 1.2 && f.u > -0.5) {
      if (rim > 0.98) return PAL.frillSpike;
      let c = lerp3(PAL.frillCenter, PAL.frill, smoothstep(0.15, 0.65, rim));
      c = lerp3(c, PAL.frillEdge, smoothstep(0.78, 0.95, rim));
      const spots = smoothstep(0.35, 0.6, fbm(f.u * 3.2, f.w * 3.2, 4.2));
      c = lerp3(c, PAL.frillEdge, spots * 0.5);
      // 裏側は体の色に近く
      return lerp3(lerp3(PAL.side, PAL.back, 0.4), c, smoothstep(-0.2, 0.3, facing) * smoothstep(-0.45, -0.25, f.u));
    }
  }
  let c = lerp3(PAL.belly, PAL.side, smoothstep(-0.6, 0.05, ny));
  c = lerp3(c, PAL.back, smoothstep(0.1, 0.85, ny));
  if (px > -3.6 && px < 2.7 && py > 1.4) {
    const s = Math.sin(px * 3.6 + 1.2 * fbm(px * 1.2, py * 1.2, pz * 1.2));
    c = lerp3(c, PAL.stripe, smoothstep(0.55, 0.85, s) * smoothstep(0.0, 0.6, ny) * 0.55);
  }
  const m = fbm(px * 2.0 + 3, py * 2.0, pz * 2.0);
  c = c.map((v) => v * (1 + 0.16 * m));
  const de = Math.hypot(px - EYE.center[0], py - EYE.center[1], az - EYE.center[2]);
  if (de < 0.14) c = lerp3(c, PAL.eyeRing, 0.55 * (1 - smoothstep(0.08, 0.14, de)));
  const dn = Math.hypot((px - NOSTRIL[0]) / 1.5, py - NOSTRIL[1], az - NOSTRIL[2]);
  if (dn < 0.06) c = lerp3(c, PAL.nostril, 1 - smoothstep(0.025, 0.06, dn));
  if (px > 3.5 && Math.abs(py - lipY(px)) < 0.02) c = lerp3(c, PAL.beak, 0.6);
  if (py < 0.05) c = lerp3(c, PAL.sole, 0.6);
  return c;
}

/** 頭と足先は小さいうろこ。角・くちばし・ひづめはつるっと、えりかざりは弱め */
function detail([px, py, pz]) {
  const r = region(px, py, pz);
  if (r.kind !== "skin") return [1, 0.15];
  const onFrill = px < 3.6 && py > 2.3 && Math.abs(frillLocal(px, py, pz).t) < 0.2;
  return [Math.max(smoothstep(3.1, 3.4, px), 1 - smoothstep(0.4, 0.9, py)), onFrill ? 0.45 : 1];
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
  ["hips", null, [0.05, 2.5, 0], [0.9, 2.45, 0]],
  ["spine1", "hips", [0.9, 2.45, 0], [1.8, 2.35, 0]],
  ["spine2", "spine1", [1.8, 2.35, 0], [2.65, 2.3, 0]],
  ["neck", "spine2", [2.65, 2.3, 0], [3.15, 2.4, 0]],
  ["head", "neck", [3.15, 2.4, 0], [4.6, 1.75, 0]],
  ["tail1", "hips", [-0.4, 2.5, 0], [-1.4, 2.3, 0]],
  ["tail2", "tail1", [-1.4, 2.3, 0], [-2.5, 1.95, 0]],
  ["tail3", "tail2", [-2.5, 1.95, 0], [-3.4, 1.6, 0]],
  ["tail4", "tail3", [-3.4, 1.6, 0], [-4.0, 1.38, 0]],
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
  name: "triceratops",
  grid: { min: [-4.12, -0.04, -1.32], max: [4.8, 4.2, 1.32], h: 0.02 },
  scales: { big: 14, small: 26 },
  sdf,
  color,
  detail,
  skin,
  bones: BONES,
  eyes: [1, -1].map((s) => ({ center: [EYE.center[0], EYE.center[1], s * EYE.center[2]], axis: [EYE.axis[0], EYE.axis[1], s * EYE.axis[2]], radius: EYE.radius })),
};
