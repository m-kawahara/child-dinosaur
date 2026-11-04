// プテラノドンの形・色・骨（翼を広げた形で作る）。かわいい 3D：大きな頭と目、短い黄色のくちばし、ピンク。
// 座標: x が前（頭の向き）、y が上（背中）、z が右の翼。体の真ん中が原点。単位はだいたいメートル。
import { byDistance, blendGroups } from "./mesh.mjs";
import {
  boxDist, clamp, FACE, headSpace, hex, lerp3, makeMouth, mix, nearEye, norm3, placeEyes, rcz, sdEllipsoid, sdRoundCone, smin, smoothstep,
  spotAmount, surfaceZ, withEye,
} from "./sdf.mjs";

// ---------- 体・首 ----------
function sdBody(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0, 0, 0], [0.42, 0.2, 0.19]);
  d = smin(d, sdEllipsoid(px, py, pz, [0.12, -0.05, 0], [0.3, 0.18, 0.16]), 0.08); // 胸
  d = smin(d, sdEllipsoid(px, py, pz, [-0.35, 0.0, 0], [0.2, 0.11, 0.11]), 0.08); // 腰
  d = smin(d, sdRoundCone(px, py, pz, [-0.45, 0.0, 0], [-0.68, -0.02, 0], 0.055, 0.02), 0.04); // 短いしっぽ
  d = smin(d, rcz(px, py, pz, [0.35, 0.05, 0], [0.72, 0.18, 0], 0.11, 0.085, 0.9), 0.08); // 首
  return d;
}

// ---------- 頭（頭の座標で作り、首の先を中心に大きくして置く） ----------
const HEAD = headSpace([0.72, 0.18], 2.1);
const { toHead, fromHead } = HEAD;

/** くちばしの合わせ目。口の角が少し上がって、にっこりして見える */
const lipY = (x) => mix(0.185, 0.125, clamp((x - 0.92) / 0.44, 0, 1)) + 0.02 * smoothstep(0.98, 0.9, x);
const MOUTH = makeMouth(HEAD, lipY, 0.93, 0.006);

const sdCrest = (px, py, pz) => rcz(px, py, pz, [0.8, 0.32, 0], [0.45, 0.52, 0], 0.07, 0.035, 0.35);
const sdBeak = (px, py, pz) =>
  Math.min(rcz(px, py, pz, [0.98, 0.22, 0], [1.36, 0.145, 0], 0.075, 0.03, 0.65), rcz(px, py, pz, [0.96, 0.15, 0], [1.3, 0.115, 0], 0.06, 0.025, 0.65));

function sdHeadLocal(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.86, 0.24, 0], [0.17, 0.13, 0.11]); // まるい頭
  d = smin(d, sdCrest(px, py, pz), 0.05);
  return smin(d, sdBeak(px, py, pz), 0.05);
}
/** 頭（体の座標で受けて、体の座標の距離を返す） */
const sdHead = (px, py, pz) => sdHeadLocal(...toHead(px, py, pz)) * HEAD.scale;
const BOX_HEAD = [...fromHead([0.4, -0.05, -0.2]), ...fromHead([1.45, 0.62, 0.2])];

// ---------- 翼（右。左は z の絶対値で同じ形）。本物より少し短くして、頭と体を目立たせる ----------
const WING_SPAN = 0.82;
const wz = ([x, y, z]) => [x, y, z * WING_SPAN];
const SHOULDER = [0.18, 0.06, 0.12];
const ELBOW = wz([0.32, 0.1, 0.62]);
const WRIST = wz([0.52, 0.11, 1.32]);
const KNUCKLE = wz([0.48, 0.1, 1.85]);
const FINGER = wz([-0.02, 0.08, 2.75]);
const TIP = wz([-0.62, 0.04, 3.45]);
const WING_BONES = [
  [SHOULDER, ELBOW, 0.065, 0.05],
  [ELBOW, WRIST, 0.05, 0.04],
  [WRIST, KNUCKLE, 0.04, 0.034],
  [KNUCKLE, FINGER, 0.034, 0.022],
  [FINGER, TIP, 0.022, 0.012],
];
// 翼の前のふちと後ろのふち（z ごとの x）。先へいくほど細くなり、後ろのふちは少しへこむ
const LEAD = [[0.12, 0.18], [0.62, 0.32], [1.32, 0.52], [1.85, 0.48], [2.75, -0.02], [3.45, -0.62]].map(([z, x], i) => [i ? z * WING_SPAN : z, x]);
const TRAIL = [[0.12, -0.32], [0.3, -0.52], [0.9, -0.44], [1.5, -0.5], [2.2, -0.48], [2.8, -0.5], [3.2, -0.56], [3.45, -0.62]].map(([z, x], i) => [i ? z * WING_SPAN : z, x]);
const at = (tab, z) => {
  if (z <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (z <= tab[i][0]) return mix(tab[i - 1][1], tab[i][1], (z - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]));
  return tab[tab.length - 1][1];
};
const WING_Z = 3.45 * WING_SPAN;
/** 膜の高さ。前のふちから後ろへ、少しふくらむ */
const membraneY = (x, az) => {
  const lead = at(LEAD, az), trail = at(TRAIL, az);
  const s = clamp((lead - x) / Math.max(0.05, lead - trail), 0, 1);
  return mix(0.08, 0.04, az / WING_Z) + 0.05 * Math.sin(Math.PI * s) * (1 - az / WING_Z);
};

function sdMembrane(px, py, az) {
  const lead = at(LEAD, az), trail = at(TRAIL, az);
  const d2 = Math.max(px - lead, trail - px, az - WING_Z, 0.1 - az) * 0.7;
  return Math.max(d2, Math.abs(py - membraneY(px, az)) - 0.022);
}

function sdWing(px, py, az) {
  let d = sdMembrane(px, py, az);
  for (const [a, b, r1, r2] of WING_BONES) d = smin(d, sdRoundCone(px, py, az, a, b, r1, r2), 0.03);
  // 手首の小さな指（まるいつめ）
  for (let i = 0; i < 3; i++) d = Math.min(d, sdRoundCone(px, py, az, WRIST, [WRIST[0] + 0.1, WRIST[1] - 0.01 * i, WRIST[2] - 0.03 + 0.03 * i], 0.018, 0.01));
  return d;
}

// ---------- 後ろ足（翼の膜の後ろにつながる） ----------
const LEG = [[-0.3, -0.04, 0.1, 0.05], [-0.42, -0.1, 0.22, 0.04], [-0.55, -0.12, 0.3, 0.028], [-0.68, -0.13, 0.31, 0.02]];
function sdLeg(px, py, az) {
  let d = 10;
  for (let i = 0; i < LEG.length - 1; i++) d = smin(d, sdRoundCone(px, py, az, LEG[i], LEG[i + 1], LEG[i][3], LEG[i + 1][3]), 0.02);
  return d;
}

function sdBase(px, py, pz) {
  const az = Math.abs(pz);
  let d = sdBody(px, py, pz);
  if (boxDist(px, py, pz, BOX_HEAD) < 0.2) d = smin(d, sdHead(px, py, pz), 0.08);
  if (az > 0.05) d = smin(d, sdWing(px, py, az), 0.06);
  if (px < -0.2) d = smin(d, sdLeg(px, py, az), 0.03);
  return d;
}

const EYE_AT = fromHead([0.88, 0.27]);
const { eye: EYE, eyes: EYES } = placeEyes(sdBase, EYE_AT[0], EYE_AT[1], norm3([0.3, 0.15, 1]), 0.046 * HEAD.scale, hex(0xf08fb0));

function sdf(px, py, pz) {
  let d = sdBase(px, py, pz);
  if (d < 0.1 && px > 0.7) {
    d = withEye(d, px, py, Math.abs(pz), EYE);
    d = MOUTH.carve(d, px, py);
  }
  return d;
}

// ---------- 色 ----------
const PAL = {
  body: hex(0xf08fb0),
  back: hex(0xe882a6),
  belly: hex(0xffe0ea),
  wingTop: hex(0xf6a6c2),
  wingUnder: hex(0xffd3e2),
  wingEdge: hex(0xe27aa1),
  beak: hex(0xffd36a),
  beakTip: hex(0xf7a64a),
  crest: hex(0xff8a65),
  crestTip: hex(0xff6f5a),
};

const CHEEK_AT = fromHead([0.95, 0.19]);
const CHEEK = [CHEEK_AT[0], CHEEK_AT[1], surfaceZ(sdBase, CHEEK_AT[0], CHEEK_AT[1]), 0.06];

function region(px, py, pz) {
  const az = Math.abs(pz);
  if (px > 0.7) {
    const [hx, hy, hz] = toHead(px, py, pz);
    if (hx > 0.97 && sdBeak(hx, hy, hz) < 0.006) return { kind: "beak", t: clamp((hx - 1.05) / 0.34, 0, 1) };
    if (hy > 0.3 && sdCrest(hx, hy, hz) < 0.006) return { kind: "crest", t: clamp((0.8 - hx) / 0.35, 0, 1) };
  }
  if (az > 0.2 && sdMembrane(px, py, az) < 0.014) return { kind: "membrane" };
  return { kind: "skin" };
}

function color([px, py, pz], [, ny]) {
  const az = Math.abs(pz);
  const r = region(px, py, pz);
  const mouth = MOUTH.at(px, py, ny);
  const inside = FACE.mouth;
  if (r.kind === "beak") return lerp3(lerp3(PAL.beak, PAL.beakTip, smoothstep(0.6, 1, r.t)), inside, mouth.inside);
  if (r.kind === "crest") return lerp3(PAL.crest, PAL.crestTip, r.t);
  if (r.kind === "membrane") {
    // 翼の膜：上は少しこいピンク、下は明るい。後ろのふちは少しこく
    const c = lerp3(PAL.wingUnder, PAL.wingTop, smoothstep(-0.3, 0.3, ny));
    const lead = at(LEAD, az), trail = at(TRAIL, az);
    const s = clamp((lead - px) / Math.max(0.05, lead - trail), 0, 1);
    return lerp3(c, PAL.wingEdge, smoothstep(0.86, 1, s) * 0.6);
  }
  let c = lerp3(PAL.belly, PAL.body, Math.max(smoothstep(-0.4, 0.1, ny), nearEye(px, py, az, EYE)));
  c = lerp3(c, PAL.back, smoothstep(0.4, 0.9, ny));
  c = lerp3(c, FACE.cheek, 0.7 * spotAmount(px, py, az, [CHEEK]));
  return lerp3(c, inside, mouth.inside);
}

/** くちばしととさかはつやつや */
const gloss = ([px, py, pz]) => {
  const kind = region(px, py, pz).kind;
  return kind === "beak" ? 0.8 : kind === "crest" ? 0.4 : 0;
};

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
  ["head", "neck", [0.72, 0.18, 0], fromHead([1.38, 0.14])],
  ["jaw", "head", fromHead([0.9, 0.17]), fromHead([1.32, 0.11])],
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
    [
      boxDist(px, py, pz, BOX_HEAD) < 0.2 ? sdHead(px, py, pz) : 10,
      () => {
        // 下のくちばしは jaw
        const jaw = MOUTH.jawWeight(px, py);
        return [["head", 1 - jaw], ["jaw", jaw]];
      },
    ],
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
  grid: { min: [-0.78, -0.3, -2.92], max: [2.25, 1.05, 2.92], h: 0.015 },
  sdf,
  color,
  gloss,
  skin,
  bones: BONES,
  eyes: EYES,
};
