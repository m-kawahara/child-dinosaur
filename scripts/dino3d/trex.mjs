// ティラノサウルスの形・色・骨。
// 座標: x が前（頭の向き）、y が上、z が右。地面が y=0。単位はだいたいメートル。
import { byDistance, blendGroups } from "./mesh.mjs";
import {
  boxDist, fbm, hash, hex, lerp3, mix, norm3, rcz, sdEllipsoid, sdRoundCone, sdSphere, smax, smin, smoothstep, withEye,
} from "./sdf.mjs";

// ---------- 胴・首・しっぽ（z=0 が中心） ----------
const TAIL = [
  [0.3, 3.38, 0.64],
  [-0.9, 3.3, 0.54],
  [-2.2, 3.12, 0.4],
  [-3.5, 2.93, 0.27],
  [-4.7, 2.77, 0.16],
  [-5.85, 2.64, 0.04],
];
const BOX_TORSO = [-6.0, 1.95, -0.95, 3.75, 4.45, 0.95];

function sdTorso(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.25, 3.4, 0], [0.95, 0.66, 0.6]); // 腰
  d = smin(d, sdEllipsoid(px, py, pz, [1.2, 3.08, 0], [1.3, 1.0, 0.78]), 0.35); // ろっ骨
  d = smin(d, sdEllipsoid(px, py, pz, [0.95, 2.52, 0], [0.95, 0.5, 0.6]), 0.35); // おなか
  d = smin(d, sdEllipsoid(px, py, pz, [2.05, 2.98, 0], [0.72, 0.78, 0.6]), 0.35); // 胸
  d = smin(d, rcz(px, py, pz, [2.15, 3.2, 0], [2.8, 3.62, 0], 0.62, 0.5, 0.82), 0.3); // 首の根もと
  d = smin(d, rcz(px, py, pz, [2.8, 3.62, 0], [3.28, 3.86, 0], 0.5, 0.45, 0.88), 0.2); // 首
  d = smin(d, sdEllipsoid(px, py, pz, [2.9, 3.3, 0], [0.5, 0.36, 0.38]), 0.25); // のど
  d = smin(d, sdEllipsoid(px, py, pz, [-0.65, 3.22, 0], [1.1, 0.66, 0.52]), 0.35); // しっぽの付け根の筋肉
  for (let i = 0; i < TAIL.length - 1; i++) {
    const a = TAIL[i], b = TAIL[i + 1];
    d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.78), 0.15);
  }
  return d;
}

// ---------- 頭 ----------
const MOUTH_CORNER = 3.62;
/** くちびるの線（口を閉じたときの上あごと下あごの境目） */
const lipY = (x) => (x >= MOUTH_CORNER ? 3.555 - 0.035 * (x - MOUTH_CORNER) : 3.555 + (MOUTH_CORNER - x) * 0.9);
const EYE = { center: [3.67, 4.06, 0.3], axis: norm3([0.42, 0.12, 1]), radius: 0.07 };
const NOSTRIL = [4.56, 3.8, 0.09];
const BOX_HEAD = [3.0, 3.1, -0.55, 4.8, 4.5, 0.55];

function sdUpperHead(px, py, pz, az) {
  let d = sdEllipsoid(px, py, pz, [3.45, 3.98, 0], [0.42, 0.42, 0.43]); // 頭の後ろ
  d = smin(d, rcz(px, py, pz, [3.62, 3.9, 0], [4.5, 3.74, 0], 0.34, 0.19, 0.58), 0.2); // 鼻すじ
  d = smin(d, rcz(px, py, pz, [3.6, 3.68, 0], [4.56, 3.62, 0], 0.21, 0.12, 0.95), 0.12); // 上あごの歯ぐき側
  d = smin(d, sdEllipsoid(px, py, az, [3.5, 3.7, 0.25], [0.36, 0.28, 0.2]), 0.12); // ほお
  d = smin(d, sdEllipsoid(px, py, az, [3.6, 4.2, 0.25], [0.15, 0.09, 0.11]), 0.08); // 目の上の出っぱり
  d = smin(d, sdEllipsoid(px, py, az, [3.82, 4.16, 0.19], [0.11, 0.06, 0.07]), 0.06); // 目の前の小さな角
  if (px > 3.85 && px < 4.55 && py > 3.85) {
    // 鼻すじのでこぼこ
    for (let x = 3.95; x <= 4.46; x += 0.1) {
      const ty = 4.124 - (x - 3.95) * 0.352;
      d = smin(d, sdEllipsoid(px, py, pz, [x, ty - 0.01, 0], [0.05, 0.03, 0.055]), 0.04);
    }
  }
  return smax(d, lipY(px) - py, 0.02);
}

function sdLowerJaw(px, py, pz, az) {
  let d = rcz(px, py, pz, [3.45, 3.48, 0], [4.5, 3.46, 0], 0.26, 0.13, 0.62);
  d = smin(d, sdEllipsoid(px, py, az, [3.5, 3.42, 0.15], [0.3, 0.2, 0.14]), 0.1); // あごの付け根
  return smax(d, py - lipY(px), 0.02);
}

const sdHead = (px, py, pz, az) => smin(sdUpperHead(px, py, pz, az), sdLowerJaw(px, py, pz, az), 0.05);

// ---------- 足（左右で同じ形。z は絶対値で見る） ----------
const LZ = 0.52;
const HIP = [0.2, 3.1, LZ];
const KNEE = [0.82, 1.95, LZ];
const ANKLE = [0.38, 0.62, LZ];
const BALL = [0.92, 0.13, LZ];
const TOES = [
  [[0.92, 0.13, LZ, 0.105], [1.28, 0.085, LZ, 0.08], [1.56, 0.06, LZ, 0.055]],
  [[0.9, 0.12, LZ - 0.05, 0.095], [1.18, 0.08, LZ - 0.16, 0.07], [1.4, 0.055, LZ - 0.21, 0.05]],
  [[0.9, 0.12, LZ + 0.05, 0.095], [1.16, 0.08, LZ + 0.15, 0.07], [1.37, 0.055, LZ + 0.2, 0.05]],
];
const HALLUX = [[0.5, 0.48, LZ - 0.12, 0.045], [0.42, 0.31, LZ - 0.14, 0.03]];
const BOX_LEG = [-0.45, -0.05, 0.0, 1.8, 3.75, 1.0];

function sdLeg(px, py, az) {
  let d = rcz(px, py, az, HIP, KNEE, 0.56, 0.25, 0.72); // 太もも
  d = smin(d, sdEllipsoid(px, py, az, [0.62, 2.72, LZ + 0.02], [0.42, 0.62, 0.36]), 0.2); // 太ももの前の筋肉
  d = smin(d, sdSphere(px, py, az, KNEE, 0.23), 0.12);
  d = smin(d, rcz(px, py, az, KNEE, ANKLE, 0.26, 0.14, 0.85), 0.12); // すね
  d = smin(d, sdSphere(px, py, az, ANKLE, 0.155), 0.08);
  d = smin(d, rcz(px, py, az, ANKLE, BALL, 0.145, 0.115, 0.9), 0.06); // 足の甲
  if (py < 0.35) {
    for (const t of TOES) {
      d = smin(d, sdRoundCone(px, py, az, t[0], t[1], t[0][3], t[1][3]), 0.05);
      d = smin(d, sdRoundCone(px, py, az, t[1], t[2], t[1][3], t[2][3]), 0.03);
    }
  }
  d = smin(d, sdRoundCone(px, py, az, HALLUX[0], HALLUX[1], HALLUX[0][3], HALLUX[1][3]), 0.04);
  return d;
}

// ---------- 腕 ----------
const SHOULDER = [2.18, 2.74, 0.46];
const ELBOW = [2.44, 2.45, 0.53];
const WRIST = [2.6, 2.36, 0.5];
const FINGERS = [
  [2.73, 2.21, 0.53, 0.035, 0.022],
  [2.67, 2.17, 0.46, 0.033, 0.02],
];
const BOX_ARM = [1.95, 1.95, 0.25, 2.9, 2.95, 0.75];

function sdArm(px, py, az) {
  let d = sdRoundCone(px, py, az, SHOULDER, ELBOW, 0.1, 0.07);
  d = smin(d, sdRoundCone(px, py, az, ELBOW, WRIST, 0.07, 0.052), 0.03);
  for (const f of FINGERS) d = smin(d, sdRoundCone(px, py, az, WRIST, f, f[3], f[4]), 0.02);
  return d;
}

// ---------- つめ ----------
const CLAWS = [
  ...TOES.map((t) => {
    const tip = t[2];
    return [[tip[0] - 0.02, tip[1], tip[2]], [tip[0] + 0.13, tip[1] - 0.05, tip[2] + (tip[2] - LZ) * 0.3], 0.05, 0.006];
  }),
  [HALLUX[1], [0.4, 0.22, LZ - 0.15], 0.028, 0.005],
  ...FINGERS.map((f) => [[f[0], f[1], f[2]], [f[0] + 0.04, f[1] - 0.08, f[2]], 0.022, 0.004]),
];
const nearClaws = (px, py) => py < 0.45 || (px > 2.5 && px < 2.9 && py < 2.3);

function sdClaws(px, py, az) {
  let d = 10;
  for (const [a, b, r1, r2] of CLAWS) d = Math.min(d, sdRoundCone(px, py, az, a, b, r1, r2));
  return d;
}

// ---------- 全体（細部なし） ----------
function sdBase(px, py, pz) {
  const az = Math.abs(pz);
  let d = 10;
  if (boxDist(px, py, pz, BOX_TORSO) < 0.4) d = sdTorso(px, py, pz);
  if (boxDist(px, py, pz, BOX_HEAD) < 0.4) d = smin(d, sdHead(px, py, pz, az), 0.18);
  if (boxDist(px, py, az, BOX_LEG) < 0.4) d = smin(d, sdLeg(px, py, az), 0.3);
  if (boxDist(px, py, az, BOX_ARM) < 0.3) d = smin(d, sdArm(px, py, az), 0.09);
  if (nearClaws(px, py)) d = smin(d, sdClaws(px, py, az), 0.015);
  return d;
}

// 背中のでこぼこ（皮骨）を背中の上にのせるため、先に背中の高さを測っておく
const SCUTE_X0 = -4.3;
const SCUTE_STEP = 0.14;
const SCUTES = [];
for (let x = SCUTE_X0; x <= 2.45; x += SCUTE_STEP) {
  let y = 4.8;
  for (let i = 0; i < 200; i++) {
    const d = sdBase(x, y, 0);
    if (d < 0.001) break;
    y -= Math.max(d * 0.8, 0.001);
  }
  const s = mix(0.45, 1, smoothstep(-4.3, -0.5, x)) * (x > 1.8 ? mix(1, 0.6, smoothstep(1.8, 2.45, x)) : 1);
  SCUTES.push([x, y, s]);
}

function sdScutes(px, py, az) {
  const i = Math.round((px - SCUTE_X0) / SCUTE_STEP);
  let d = 10;
  for (let j = i - 1; j <= i + 1; j++) {
    const sc = SCUTES[j];
    if (!sc) continue;
    const [x, y, s] = sc;
    d = Math.min(d, sdEllipsoid(px, py, az, [x, y - 0.012, 0], [0.05 * s, 0.035 * s, 0.045 * s]));
    d = Math.min(d, sdEllipsoid(px, py, az, [x + SCUTE_STEP / 2, y - 0.03 * s, 0.13 * s], [0.035 * s, 0.025 * s, 0.032 * s]));
  }
  return d;
}

/** しわと、ゆるい凹凸 */
function detailBumps(px, py, pz) {
  let d = 0.006 * fbm(px * 3.5, py * 3.5, pz * 3.5);
  const az = Math.abs(pz);
  const neck = smoothstep(2.25, 2.55, px) * (1 - smoothstep(3.0, 3.3, px)) * smoothstep(0.15, 0.35, az);
  if (neck > 0) d += 0.008 * neck * Math.sin(42 * (0.8 * px - 0.6 * py));
  const belly = smoothstep(2.75, 2.3, py) * smoothstep(0.3, 0.9, px) * (1 - smoothstep(1.8, 2.3, px));
  if (belly > 0) d += 0.006 * belly * Math.sin(34 * px);
  return d;
}

const halfGap = (x) => 0.024 * smoothstep(MOUTH_CORNER - 0.02, MOUTH_CORNER + 0.16, x);

function sdf(px, py, pz) {
  let d = sdBase(px, py, pz);
  if (d < 0.3) {
    const az = Math.abs(pz);
    if (az < 0.3 && py > 2.4 && px > -4.5 && px < 2.6) d = smin(d, sdScutes(px, py, az), 0.03);
    d += detailBumps(px, py, pz);
    if (px > 3.3) {
      d = withEye(d, px, py, az, EYE);
      d = smax(d, -sdEllipsoid(px, py, az, NOSTRIL, [0.03, 0.014, 0.022]), 0.008); // 鼻の穴
      if (px > MOUTH_CORNER - 0.03) d = smax(d, -(Math.abs(py - lipY(px)) - halfGap(px)), 0.006); // 口のすき間
    }
  }
  return smax(d, -py, 0.02); // 足の裏を平らに
}

// ---------- 色 ----------
const PAL = {
  back: hex(0x383b27),
  side: hex(0x67664a),
  belly: hex(0xc9b690),
  stripe: hex(0x22241a),
  lip: hex(0x9c8a6a),
  mouth: hex(0x4f2323),
  nostril: hex(0x1c1a14),
  claw: hex(0xd8ccae),
  sole: hex(0x30312a),
  eyeRing: hex(0x29281d),
};

const isClaw = (px, py, az) => nearClaws(px, py) && sdClaws(px, py, az) < 0.012;

function color([px, py, pz], [, ny]) {
  const az = Math.abs(pz);
  if (isClaw(px, py, az)) return PAL.claw;
  const toLip = Math.abs(py - lipY(px));
  // 口の中（すき間の内側）。口の角は開けると大きくのびるので、まわりごと暗くする
  if (px > MOUTH_CORNER - 0.08 && toLip < halfGap(px) + 0.03 && Math.abs(ny) > 0.35) return PAL.mouth;
  if (px > 3.45 && px < 3.8 && toLip < 0.05) return lerp3(PAL.mouth, PAL.side, smoothstep(0.02, 0.05, toLip));
  let c = lerp3(PAL.belly, PAL.side, smoothstep(-0.55, 0.05, ny));
  c = lerp3(c, PAL.back, smoothstep(0.1, 0.85, ny));
  if (px > -5.0 && px < 2.6 && py > 1.6) {
    const s = Math.sin(px * 5.3 + 0.9 * fbm(px * 1.5, py * 1.5, pz * 1.5));
    c = lerp3(c, PAL.stripe, smoothstep(0.45, 0.8, s) * smoothstep(-0.05, 0.6, ny) * 0.65);
  }
  const m = fbm(px * 2.2 + 5, py * 2.2, pz * 2.2);
  c = c.map((v) => v * (1 + 0.14 * m));
  if (px > MOUTH_CORNER - 0.05 && toLip < 0.07 && Math.abs(ny) < 0.55) c = lerp3(c, PAL.lip, 0.35 * (1 - toLip / 0.07));
  const de = Math.hypot(px - EYE.center[0], py - EYE.center[1], az - EYE.center[2]);
  if (de < 0.16) c = lerp3(c, PAL.eyeRing, 0.5 * (1 - smoothstep(0.09, 0.16, de)));
  const dn = Math.hypot((px - NOSTRIL[0]) / 1.4, py - NOSTRIL[1], az - NOSTRIL[2]);
  if (dn < 0.05) c = lerp3(c, PAL.nostril, 1 - smoothstep(0.02, 0.05, dn));
  if (py < 0.06) c = lerp3(c, PAL.sole, 0.6);
  return c;
}

/** 頭の前と足先は小さいうろこ。つめにはうろこをつけない */
const detail = ([px, py, pz]) => [
  Math.max(smoothstep(3.75, 4.1, px), 1 - smoothstep(0.6, 1.2, py)),
  isClaw(px, py, Math.abs(pz)) ? 0 : 1,
];

// ---------- 骨と重み ----------
const legBones = (s, tag) => [
  [`thigh.${tag}`, "hips", [HIP[0], HIP[1], s * LZ], [KNEE[0], KNEE[1], s * LZ]],
  [`shin.${tag}`, `thigh.${tag}`, [KNEE[0], KNEE[1], s * LZ], [ANKLE[0], ANKLE[1], s * LZ]],
  [`foot.${tag}`, `shin.${tag}`, [ANKLE[0], ANKLE[1], s * LZ], [BALL[0], BALL[1], s * LZ]],
  [`toe.${tag}`, `foot.${tag}`, [BALL[0], BALL[1], s * LZ], [1.56, 0.06, s * LZ]],
];
const armBones = (s, tag) => [
  [`upperArm.${tag}`, "spine2", [SHOULDER[0], SHOULDER[1], s * SHOULDER[2]], [ELBOW[0], ELBOW[1], s * ELBOW[2]]],
  [`forearm.${tag}`, `upperArm.${tag}`, [ELBOW[0], ELBOW[1], s * ELBOW[2]], [WRIST[0], WRIST[1], s * WRIST[2]]],
  [`hand.${tag}`, `forearm.${tag}`, [WRIST[0], WRIST[1], s * WRIST[2]], [2.72, 2.19, s * 0.5]],
];
const BONES = [
  ["hips", null, [0.15, 3.35, 0], [0.9, 3.28, 0]],
  ["spine1", "hips", [0.9, 3.28, 0], [1.65, 3.15, 0]],
  ["spine2", "spine1", [1.65, 3.15, 0], [2.3, 3.22, 0]],
  ["neck1", "spine2", [2.3, 3.22, 0], [2.85, 3.6, 0]],
  ["neck2", "neck1", [2.85, 3.6, 0], [3.3, 3.86, 0]],
  ["head", "neck2", [3.3, 3.86, 0], [4.6, 3.85, 0]],
  ["jaw", "head", [3.42, 3.6, 0], [4.55, 3.42, 0]],
  ["tail1", "hips", [-0.3, 3.36, 0], [-1.3, 3.27, 0]],
  ["tail2", "tail1", [-1.3, 3.27, 0], [-2.4, 3.1, 0]],
  ["tail3", "tail2", [-2.4, 3.1, 0], [-3.5, 2.93, 0]],
  ["tail4", "tail3", [-3.5, 2.93, 0], [-4.6, 2.78, 0]],
  ["tail5", "tail4", [-4.6, 2.78, 0], [-5.85, 2.64, 0]],
  ...legBones(1, "R"),
  ...legBones(-1, "L"),
  ...armBones(1, "R"),
  ...armBones(-1, "L"),
];
const TORSO_BONES = ["hips", "spine1", "spine2", "neck1", "neck2", "tail1", "tail2", "tail3", "tail4", "tail5"];

function skin(px, py, pz) {
  const az = Math.abs(pz);
  const tag = pz >= 0 ? "R" : "L";
  return blendGroups([
    [sdTorso(px, py, pz), () => byDistance(BONES, TORSO_BONES, px, py, pz)],
    [
      boxDist(px, py, pz, BOX_HEAD) < 0.3 ? sdHead(px, py, pz, az) : 10,
      () => {
        // 下あごは jaw、それ以外は head についていく
        const jaw = smoothstep(0.03, -0.03, py - lipY(px)) * smoothstep(3.4, 3.62, px);
        return [["head", 1 - jaw], ["jaw", jaw]];
      },
    ],
    [
      boxDist(px, py, az, BOX_LEG) < 0.3 ? Math.min(sdLeg(px, py, az), sdClaws(px, py, az)) : 10,
      () => byDistance(BONES, ["thigh", "shin", "foot", "toe"].map((n) => `${n}.${tag}`), px, py, pz),
    ],
    [
      boxDist(px, py, az, BOX_ARM) < 0.2 ? Math.min(sdArm(px, py, az), sdClaws(px, py, az)) : 10,
      () => byDistance(BONES, ["upperArm", "forearm", "hand"].map((n) => `${n}.${tag}`), px, py, pz),
    ],
  ]);
}

// ---------- 歯（骨につけて、あとで描く） ----------
function makeTeeth() {
  const surfaceZ = (x, y) => {
    if (sdf(x, y, 0) > 0) return null;
    let z = 0;
    for (let i = 0; i < 400 && sdf(x, y, z) < 0; i++) z += 0.002;
    return z;
  };
  const teeth = [];
  for (let i = 0; i < 12; i++) {
    const x = 3.74 + i * 0.075;
    const bell = Math.sin((i / 11) * Math.PI);
    const yu = lipY(x) + 0.04;
    const zu = surfaceZ(x, yu);
    const yl = lipY(x) - 0.035;
    const zl = surfaceZ(x, yl);
    for (const s of [1, -1]) {
      if (zu) {
        // 長さを少しずつばらつかせて、先だけがくちびるからのぞくように
        const jitter = 0.8 + 0.4 * hash(i, s, 3);
        const len = (0.05 + 0.032 * bell) * jitter;
        teeth.push({ bone: "head", base: [x, yu, s * (zu - 0.03)], dir: norm3([-0.12, -1, 0.04 * s]), length: len, radius: (0.016 + 0.006 * bell) * jitter });
      }
      if (zl && i % 2 === 0) {
        const len = 0.055 + 0.03 * bell;
        teeth.push({ bone: "jaw", base: [x + 0.03, yl, s * (zl - 0.04)], dir: norm3([0.1, 1, -0.03 * s]), length: len, radius: 0.017 + 0.006 * bell });
      }
    }
  }
  return teeth;
}

export default {
  name: "trex",
  grid: { min: [-6.02, -0.04, -1.02], max: [4.86, 4.52, 1.02], h: 0.02 },
  scales: { big: 20, small: 34 },
  sdf,
  color,
  detail,
  skin,
  bones: BONES,
  eyes: [1, -1].map((s) => ({ center: [EYE.center[0], EYE.center[1], s * EYE.center[2]], axis: [EYE.axis[0], EYE.axis[1], s * EYE.axis[2]], radius: EYE.radius })),
  teeth: makeTeeth(),
};
