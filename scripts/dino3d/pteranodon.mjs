// プテラノドンの形・色・骨（翼を広げた形で作る）。
// 座標: x が前（頭の向き）、y が上（背中）、z が右の翼。体の真ん中が原点。単位はだいたいメートル。
import { byDistance, blendGroups } from "./mesh.mjs";
import { boxDist, clamp, fbm, hex, lerp3, mix, norm3, rcz, sdEllipsoid, sdRoundCone, smax, smin, smoothstep, withEye } from "./sdf.mjs";

// ---------- 体・首・頭 ----------
function sdBody(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0, 0, 0], [0.42, 0.17, 0.16]);
  d = smin(d, sdEllipsoid(px, py, pz, [0.12, -0.05, 0], [0.3, 0.15, 0.13]), 0.08); // 胸
  d = smin(d, sdEllipsoid(px, py, pz, [-0.35, 0.0, 0], [0.2, 0.1, 0.1]), 0.08); // 腰
  d = smin(d, sdRoundCone(px, py, pz, [-0.45, 0.0, 0], [-0.7, -0.02, 0], 0.05, 0.01), 0.04); // 短いしっぽ
  d = smin(d, rcz(px, py, pz, [0.35, 0.05, 0], [0.72, 0.18, 0], 0.1, 0.07, 0.9), 0.08); // 首
  return d;
}

const EYE = { center: [0.86, 0.245, 0.052], axis: norm3([0.3, 0.2, 1]), radius: 0.022 };
const sdCrest = (px, py, pz) => rcz(px, py, pz, [0.8, 0.27, 0], [0.12, 0.62, 0], 0.07, 0.012, 0.3);
const sdBeak = (px, py, pz) =>
  Math.min(rcz(px, py, pz, [0.92, 0.21, 0], [1.95, 0.0, 0], 0.07, 0.008, 0.6), rcz(px, py, pz, [0.9, 0.15, 0], [1.88, -0.01, 0], 0.055, 0.006, 0.6));
const beakLine = (x) => mix(0.17, -0.005, clamp((x - 0.9) / 1.0, 0, 1));

function sdHead(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.84, 0.22, 0], [0.15, 0.085, 0.07]);
  d = smin(d, sdCrest(px, py, pz), 0.05);
  return smin(d, sdBeak(px, py, pz), 0.05);
}

// ---------- 翼（右。左は z の絶対値で同じ形） ----------
const SHOULDER = [0.18, 0.06, 0.12];
const ELBOW = [0.32, 0.1, 0.62];
const WRIST = [0.52, 0.11, 1.32];
const KNUCKLE = [0.48, 0.1, 1.85];
const FINGER = [-0.02, 0.08, 2.75];
const TIP = [-0.62, 0.04, 3.45];
const WING_BONES = [
  [SHOULDER, ELBOW, 0.06, 0.045],
  [ELBOW, WRIST, 0.045, 0.035],
  [WRIST, KNUCKLE, 0.036, 0.03],
  [KNUCKLE, FINGER, 0.03, 0.018],
  [FINGER, TIP, 0.018, 0.005],
];
// 翼の前のふちと後ろのふち（z ごとの x）。先へいくほど細くとがり、後ろのふちは少しへこむ
const LEAD = [[0.12, 0.18], [0.62, 0.32], [1.32, 0.52], [1.85, 0.48], [2.75, -0.02], [3.45, -0.62]];
const TRAIL = [[0.12, -0.32], [0.3, -0.52], [0.9, -0.44], [1.5, -0.5], [2.2, -0.48], [2.8, -0.5], [3.2, -0.56], [3.45, -0.62]];
const at = (tab, z) => {
  if (z <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (z <= tab[i][0]) return mix(tab[i - 1][1], tab[i][1], (z - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]));
  return tab[tab.length - 1][1];
};
const WING_Z = 3.45;
/** 膜の高さ。前のふちから後ろへ、少しふくらむ */
const membraneY = (x, az) => {
  const lead = at(LEAD, az), trail = at(TRAIL, az);
  const s = clamp((lead - x) / Math.max(0.05, lead - trail), 0, 1);
  return mix(0.08, 0.04, az / WING_Z) + 0.05 * Math.sin(Math.PI * s) * (1 - az / WING_Z);
};

function sdMembrane(px, py, az) {
  const lead = at(LEAD, az), trail = at(TRAIL, az);
  const d2 = Math.max(px - lead, trail - px, az - WING_Z, 0.1 - az) * 0.7;
  return Math.max(d2, Math.abs(py - membraneY(px, az)) - 0.02);
}

function sdWing(px, py, az) {
  let d = sdMembrane(px, py, az);
  for (const [a, b, r1, r2] of WING_BONES) d = smin(d, sdRoundCone(px, py, az, a, b, r1, r2), 0.03);
  // 手首の小さな指（つめ）
  for (let i = 0; i < 3; i++) d = Math.min(d, sdRoundCone(px, py, az, WRIST, [WRIST[0] + 0.12, WRIST[1] - 0.01 * i, WRIST[2] - 0.03 + 0.03 * i], 0.014, 0.003));
  return d;
}

// ---------- 後ろ足（翼の膜の後ろにつながる） ----------
const LEG = [[-0.3, -0.04, 0.1, 0.045], [-0.42, -0.1, 0.22, 0.035], [-0.55, -0.12, 0.3, 0.022], [-0.68, -0.13, 0.31, 0.015]];
function sdLeg(px, py, az) {
  let d = 10;
  for (let i = 0; i < LEG.length - 1; i++) d = smin(d, sdRoundCone(px, py, az, LEG[i], LEG[i + 1], LEG[i][3], LEG[i + 1][3]), 0.02);
  return d;
}

const BOX_HEAD = [-0.05, -0.1, -0.2, 2.0, 0.8, 0.2];

function sdf(px, py, pz) {
  const az = Math.abs(pz);
  let d = sdBody(px, py, pz);
  if (boxDist(px, py, pz, BOX_HEAD) < 0.2) d = smin(d, sdHead(px, py, pz), 0.06);
  if (az > 0.05) d = smin(d, sdWing(px, py, az), 0.06);
  if (px < -0.2) d = smin(d, sdLeg(px, py, az), 0.03);
  if (d < 0.1) {
    d += 0.002 * fbm(px * 8, py * 8, pz * 8);
    if (px > 0.75 && px < 1.0) d = withEye(d, px, py, az, EYE);
  }
  return d;
}

// ---------- 色 ----------
const PAL = {
  back: hex(0x6f665b),
  belly: hex(0xe6e0d4),
  head: hex(0xe0d9cc),
  crestBase: hex(0xd9cfc0),
  crest: hex(0xc4452c),
  crestEdge: hex(0x6e2418),
  beak: hex(0xd8c07c),
  beakTip: hex(0x6b5a3b),
  wingTop: hex(0x4a3a31),
  wingUnder: hex(0x8f6f58),
  wingEdge: hex(0x3c2a20),
  wingBone: hex(0x8a7563),
  eyeRing: hex(0x3a3028),
  claw: hex(0x2f2a24),
};

function color([px, py, pz], [, ny]) {
  const az = Math.abs(pz);
  if (px > 0.1) {
    if (sdBeak(px, py, pz) < 0.008 && px > 0.95) {
      // くちばしの合わせ目は細い線で
      const c = lerp3(PAL.beak, PAL.beakTip, smoothstep(1.5, 1.95, px));
      return Math.abs(py - beakLine(px)) < 0.006 ? lerp3(c, PAL.beakTip, 0.7) : c;
    }
    if (sdCrest(px, py, pz) < 0.008 && py > 0.3) {
      const t = clamp((0.8 - px) / 0.68, 0, 1);
      let c = lerp3(PAL.crestBase, PAL.crest, smoothstep(0.1, 0.5, t));
      return lerp3(c, PAL.crestEdge, smoothstep(0.75, 1, t) * 0.7);
    }
  }
  const de = Math.hypot(px - EYE.center[0], py - EYE.center[1], az - EYE.center[2]);
  if (de < 0.045) return lerp3(PAL.eyeRing, PAL.head, smoothstep(0.028, 0.045, de));
  if (az > 0.2 && sdMembrane(px, py, az) < 0.012) {
    // 翼の膜：上は濃い茶色、下は明るい。後ろのふちは濃く、指にそった筋を少し
    let c = lerp3(PAL.wingUnder, PAL.wingTop, smoothstep(-0.3, 0.3, ny));
    const lead = at(LEAD, az), trail = at(TRAIL, az);
    const s = clamp((lead - px) / Math.max(0.05, lead - trail), 0, 1);
    c = lerp3(c, PAL.wingEdge, smoothstep(0.85, 1, s) * 0.6);
    // 膜を支える細い筋（指の向きにそう）をうっすら
    return c.map((v) => v * (0.97 + 0.03 * Math.sin(s * 26 + fbm(px * 3, 0, az * 3) * 2)));
  }
  if (az > 0.15) {
    for (const [a, b, r1, r2] of WING_BONES) if (sdRoundCone(px, py, az, a, b, r1, r2) < 0.01) return PAL.wingBone;
  }
  let c = lerp3(PAL.belly, PAL.back, smoothstep(-0.2, 0.6, ny));
  if (px > 0.6) c = lerp3(c, PAL.head, 0.6);
  return c.map((v) => v * (1 + 0.08 * fbm(px * 6, py * 6, pz * 6)));
}

/** 体は細かい毛のような質感（弱め）、翼の膜とくちばし・とさかは、ほぼつるっと */
function detail([px, py, pz]) {
  const az = Math.abs(pz);
  if (px > 0.95 && sdBeak(px, py, pz) < 0.008) return [1, 0];
  if (sdCrest(px, py, pz) < 0.008 && py > 0.3) return [1, 0.1];
  if (az > 0.2 && sdMembrane(px, py, az) < 0.012) return [1, 0.12];
  return [1, 0.3];
}

// ---------- 骨と重み ----------
const wingBones = (s, tag) => {
  const p = ([x, y, z]) => [x, y, s * z];
  return [
    [`humerus.${tag}`, "spine", p(SHOULDER), p(ELBOW)],
    [`radius.${tag}`, `humerus.${tag}`, p(ELBOW), p(WRIST)],
    [`hand.${tag}`, `radius.${tag}`, p(WRIST), p(KNUCKLE)],
    [`finger1.${tag}`, `hand.${tag}`, p(KNUCKLE), p(FINGER)],
    [`finger2.${tag}`, `finger1.${tag}`, p(FINGER), p(TIP)],
  ];
};
const legBones = (s, tag) => [
  [`thigh.${tag}`, "hips", [LEG[0][0], LEG[0][1], s * LEG[0][2]], [LEG[1][0], LEG[1][1], s * LEG[1][2]]],
  [`shin.${tag}`, `thigh.${tag}`, [LEG[1][0], LEG[1][1], s * LEG[1][2]], [LEG[3][0], LEG[3][1], s * LEG[3][2]]],
];
const BONES = [
  ["hips", null, [-0.2, 0, 0], [-0.7, -0.02, 0]],
  ["spine", "hips", [-0.2, 0, 0], [0.35, 0.05, 0]],
  ["neck", "spine", [0.35, 0.05, 0], [0.72, 0.18, 0]],
  ["head", "neck", [0.72, 0.18, 0], [1.95, 0.0, 0]],
  ...wingBones(1, "R"),
  ...wingBones(-1, "L"),
  ...legBones(1, "R"),
  ...legBones(-1, "L"),
];

function skin(px, py, pz) {
  const az = Math.abs(pz);
  const tag = pz >= 0 ? "R" : "L";
  // 翼は、前のふちの骨に近いところほどその骨に。体に近い膜は胴にもつく
  return blendGroups([
    [sdBody(px, py, pz), () => byDistance(BONES, ["hips", "spine", "neck"], px, py, pz)],
    [boxDist(px, py, pz, BOX_HEAD) < 0.2 ? sdHead(px, py, pz) : 10, () => [["head", 1]]],
    [
      az > 0.05 ? sdWing(px, py, az) : 10,
      () => {
        const bones = ["humerus", "radius", "hand", "finger1", "finger2"].map((n) => `${n}.${tag}`);
        // 膜の点は、同じ z の前のふちの位置で骨を選ぶ（後ろのふちが前の骨から遠くても）
        const lead = [at(LEAD, az), membraneY(at(LEAD, az), az), pz];
        const w = byDistance(BONES, bones, lead[0], lead[1], lead[2]);
        const root = smoothstep(0.55, 0.15, az);
        return [...w.map(([n, x]) => [n, x * (1 - root)]), ["spine", root]];
      },
    ],
    [px < -0.2 ? sdLeg(px, py, az) : 10, () => byDistance(BONES, [`thigh.${tag}`, `shin.${tag}`], px, py, pz)],
  ]);
}

export default {
  name: "pteranodon",
  grid: { min: [-0.78, -0.26, -3.52], max: [2.0, 0.8, 3.52], h: 0.015 },
  scales: { big: 30, small: 45 },
  sdf,
  color,
  detail,
  skin,
  bones: BONES,
  eyes: [1, -1].map((s) => ({ center: [EYE.center[0], EYE.center[1], s * EYE.center[2]], axis: [EYE.axis[0], EYE.axis[1], s * EYE.axis[2]], radius: EYE.radius })),
};
