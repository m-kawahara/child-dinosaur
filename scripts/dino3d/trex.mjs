// ティラノサウルスの形・色・骨。かわいい 3D：大きなまるい頭と目、つるっとした肌、明るい緑。
// 座標: x が前（頭の向き）、y が上、z が右。地面が y=0。単位はだいたいメートル。
import { byDistance, blendGroups } from "./mesh.mjs";
import {
  boxDist, FACE, headSpace, hex, lerp3, makeMouth, nearEye, norm3, placeEyes, rcz, sdEllipsoid, sdRoundCone, smax, smin, smoothstep,
  spotAmount, surfaceZ, withEye,
} from "./sdf.mjs";

// ---------- 胴・首・しっぽ（z=0 が中心） ----------
const TAIL = [
  [0.3, 3.4, 0.7],
  [-0.8, 3.3, 0.58],
  [-1.85, 3.13, 0.44],
  [-2.8, 2.96, 0.31],
  [-3.65, 2.83, 0.2],
  [-4.3, 2.74, 0.12],
];
const BOX_TORSO = [-4.5, 1.8, -1.1, 3.55, 4.55, 1.1];

function sdTorso(px, py, pz) {
  let d = sdEllipsoid(px, py, pz, [0.25, 3.4, 0], [1.0, 0.72, 0.7]); // 腰
  d = smin(d, sdEllipsoid(px, py, pz, [1.25, 3.08, 0], [1.35, 1.05, 0.9]), 0.4); // まるい胴
  d = smin(d, sdEllipsoid(px, py, pz, [1.1, 2.55, 0], [1.05, 0.6, 0.74]), 0.4); // おなか
  d = smin(d, sdEllipsoid(px, py, pz, [2.1, 3.0, 0], [0.78, 0.82, 0.7]), 0.4); // 胸
  d = smin(d, rcz(px, py, pz, [2.2, 3.2, 0], [3.0, 3.72, 0], 0.68, 0.56, 0.86), 0.35); // 太い首
  d = smin(d, sdEllipsoid(px, py, pz, [-0.6, 3.25, 0], [1.1, 0.7, 0.62]), 0.4); // しっぽの付け根
  for (let i = 0; i < TAIL.length - 1; i++) {
    const a = TAIL[i], b = TAIL[i + 1];
    d = smin(d, rcz(px, py, pz, [a[0], a[1], 0], [b[0], b[1], 0], a[2], b[2], 0.82), 0.2);
  }
  return d;
}

// ---------- 頭（大きくてまるい） ----------
// 頭は「頭の座標」で形を作り、首のつけ根を中心に大きくして置く
const HEAD = headSpace([3.0, 3.75], 1.18);
const { toHead, fromHead } = HEAD;

// ここから下の数字は頭の座標
/** 口の線（口を閉じたときの上あごと下あごの境目）。口の角が少し上がって、にっこりして見える */
const lipY = (x) => 3.6 + 0.14 * smoothstep(3.95, 3.4, x);
const MOUTH = makeMouth(HEAD, lipY, 3.48, 0.022);

function sdUpperHead(px, py, pz, az) {
  let d = sdEllipsoid(px, py, pz, [3.65, 4.12, 0], [0.68, 0.64, 0.58]); // まるい頭
  d = smin(d, rcz(px, py, pz, [3.9, 3.98, 0], [4.65, 3.86, 0], 0.5, 0.36, 0.84), 0.3); // 鼻先
  d = smin(d, sdEllipsoid(px, py, az, [3.62, 3.8, 0.28], [0.46, 0.36, 0.32]), 0.2); // ほお
  return smax(d, lipY(px) - py, 0.03);
}

function sdLowerJaw(px, py, pz, az) {
  let d = rcz(px, py, pz, [3.5, 3.5, 0], [4.52, 3.5, 0], 0.38, 0.28, 0.8);
  d = smin(d, sdEllipsoid(px, py, az, [3.55, 3.48, 0.22], [0.42, 0.3, 0.26]), 0.15); // あごの付け根
  return smax(d, py - lipY(px), 0.03);
}

/** 頭（体の座標で受けて、体の座標の距離を返す） */
const sdHead = (px, py, pz) => {
  const [hx, hy, hz] = toHead(px, py, pz);
  const az = Math.abs(hz);
  return smin(sdUpperHead(hx, hy, hz, az), sdLowerJaw(hx, hy, hz, az), 0.05) * HEAD.scale;
};
const BOX_HEAD = [...fromHead([2.85, 2.95, -0.85]), ...fromHead([5.2, 4.95, 0.85])];

// ---------- 足（左右で同じ形。z は絶対値で見る） ----------
const LZ = 0.52;
const HIP = [0.2, 3.1, LZ];
const KNEE = [0.82, 1.95, LZ];
const ANKLE = [0.38, 0.62, LZ];
const BALL = [0.92, 0.13, LZ];
// 太くてまるい3本の指
const TOES = [
  [[0.92, 0.15, LZ, 0.15], [1.38, 0.11, LZ, 0.115]],
  [[0.9, 0.14, LZ - 0.08, 0.13], [1.26, 0.1, LZ - 0.24, 0.1]],
  [[0.9, 0.14, LZ + 0.08, 0.13], [1.26, 0.1, LZ + 0.24, 0.1]],
];
const BOX_LEG = [-0.6, -0.05, 0.0, 1.8, 3.85, 1.15];

function sdLeg(px, py, az) {
  let d = rcz(px, py, az, HIP, KNEE, 0.66, 0.32, 0.75); // 太もも
  d = smin(d, sdEllipsoid(px, py, az, [0.6, 2.7, LZ + 0.02], [0.5, 0.72, 0.44]), 0.25); // 太ももの前の筋肉
  d = smin(d, rcz(px, py, az, KNEE, ANKLE, 0.32, 0.2, 0.9), 0.18); // すね
  d = smin(d, rcz(px, py, az, ANKLE, BALL, 0.2, 0.16, 0.9), 0.1); // 足の甲
  if (py < 0.45) for (const [a, b] of TOES) d = smin(d, sdRoundCone(px, py, az, a, b, a[3], b[3]), 0.06);
  return d;
}

// ---------- 腕（小さくて、ぷっくり） ----------
const SHOULDER = [2.3, 2.82, 0.5];
const ELBOW = [2.55, 2.5, 0.6];
const WRIST = [2.78, 2.44, 0.58];
const FINGERS = [
  [2.96, 2.33, 0.62, 0.065, 0.05],
  [2.9, 2.27, 0.5, 0.06, 0.045],
];
const BOX_ARM = [2.0, 2.0, 0.2, 3.15, 3.1, 0.85];

function sdArm(px, py, az) {
  let d = sdRoundCone(px, py, az, SHOULDER, ELBOW, 0.16, 0.12);
  d = smin(d, sdRoundCone(px, py, az, ELBOW, WRIST, 0.12, 0.1), 0.05);
  for (const f of FINGERS) d = smin(d, sdRoundCone(px, py, az, WRIST, f, f[3], f[4]), 0.04);
  return d;
}

// ---------- つめ（先のまるい、クリーム色） ----------
const CLAWS = [
  ...TOES.map(([, tip]) => [[tip[0] - 0.02, tip[1], tip[2]], [tip[0] + 0.09, tip[1] - 0.04, tip[2] + (tip[2] - LZ) * 0.2], tip[3] * 0.62, tip[3] * 0.32]),
  ...FINGERS.map((f) => [[f[0], f[1], f[2]], [f[0] + 0.035, f[1] - 0.06, f[2]], f[4] * 0.8, f[4] * 0.45]),
];
const nearClaws = (px, py) => py < 0.4 || (px > 2.8 && px < 3.1 && py < 2.45);

function sdClaws(px, py, az) {
  let d = 10;
  for (const [a, b, r1, r2] of CLAWS) d = Math.min(d, sdRoundCone(px, py, az, a, b, r1, r2));
  return d;
}

// ---------- 全体 ----------
function sdBase(px, py, pz) {
  const az = Math.abs(pz);
  let d = 10;
  if (boxDist(px, py, pz, BOX_TORSO) < 0.4) d = sdTorso(px, py, pz);
  if (boxDist(px, py, pz, BOX_HEAD) < 0.4) d = smin(d, sdHead(px, py, pz), 0.2);
  if (boxDist(px, py, az, BOX_LEG) < 0.4) d = smin(d, sdLeg(px, py, az), 0.3);
  if (boxDist(px, py, az, BOX_ARM) < 0.3) d = smin(d, sdArm(px, py, az), 0.1);
  if (nearClaws(px, py)) d = smin(d, sdClaws(px, py, az), 0.02);
  return smax(d, -py, 0.02); // 足の裏を平らに
}

// 目は頭の横の表面から少し出っぱるように置く
const EYE_AT = fromHead([3.98, 4.27]);
const { eye: EYE, eyes: EYES } = placeEyes(sdBase, EYE_AT[0], EYE_AT[1], norm3([0.3, 0.2, 1]), 0.22 * HEAD.scale, hex(0x6cc070));

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
  body: hex(0x6cc070),
  back: hex(0x5aae61),
  spot: hex(0x46a052),
  belly: hex(0xfbe29a),
  nostril: hex(0x2f6b3a),
};

// 背中のまだら：横の表面の上のほうに、大きな丸をならべる
const SPOTS = [
  [-3.3, 3.0, 0.16],
  [-2.35, 3.25, 0.22],
  [-1.3, 3.55, 0.27],
  [-0.2, 3.85, 0.3],
  [0.95, 3.95, 0.32],
  [1.95, 3.78, 0.26],
  [...fromHead([3.4, 4.58]).slice(0, 2), 0.18],
].map(([x, y, r]) => [x, y, surfaceZ(sdBase, x, y) ?? 0, r]);
const CHEEK_AT = fromHead([4.2, 3.84]);
const CHEEK = [CHEEK_AT[0], CHEEK_AT[1], surfaceZ(sdBase, CHEEK_AT[0], CHEEK_AT[1]), 0.2];
const NOSTRIL = fromHead([4.92, 3.99, 0.15]);

const isClaw = (px, py, az) => nearClaws(px, py) && sdClaws(px, py, az) < 0.012;

function color([px, py, pz], [, ny]) {
  const az = Math.abs(pz);
  if (isClaw(px, py, az)) return FACE.nail;
  const mouth = MOUTH.at(px, py, ny);
  // おなか（下を向いたところ）は明るい色、背中は少しこく。足・口・目のまわりにはおなかの色をつけない
  const leg = smoothstep(0.05, -0.1, Math.min(sdLeg(px, py, az), sdArm(px, py, az)) - sdTorso(px, py, pz));
  let c = lerp3(PAL.belly, PAL.body, Math.max(smoothstep(-0.45, -0.28, ny), mouth.near, nearEye(px, py, az, EYE), leg));
  c = lerp3(c, PAL.back, smoothstep(0.35, 0.9, ny));
  c = lerp3(c, PAL.spot, spotAmount(px, py, az, SPOTS));
  c = lerp3(c, FACE.cheek, 0.7 * spotAmount(px, py, az, [CHEEK]));
  const dn = Math.hypot((px - NOSTRIL[0]) * 0.8, py - NOSTRIL[1], az - NOSTRIL[2]);
  c = lerp3(c, PAL.nostril, 1 - smoothstep(0.03, 0.05, dn));
  // 口の中：下あごの真ん中は舌
  const inside = ny > 0 && az < 0.18 ? FACE.tongue : FACE.mouth;
  return lerp3(c, inside, mouth.inside);
}

/** つめはつやつや、口の中は少しぬれたつや */
const gloss = ([px, py, pz], [, ny]) => (isClaw(px, py, Math.abs(pz)) ? 1 : 0.6 * MOUTH.at(px, py, ny).inside);

// ---------- 骨と重み ----------
const legBones = (s, tag) => [
  [`thigh.${tag}`, "hips", [HIP[0], HIP[1], s * LZ], [KNEE[0], KNEE[1], s * LZ]],
  [`shin.${tag}`, `thigh.${tag}`, [KNEE[0], KNEE[1], s * LZ], [ANKLE[0], ANKLE[1], s * LZ]],
  [`foot.${tag}`, `shin.${tag}`, [ANKLE[0], ANKLE[1], s * LZ], [BALL[0], BALL[1], s * LZ]],
  [`toe.${tag}`, `foot.${tag}`, [BALL[0], BALL[1], s * LZ], [1.5, 0.08, s * LZ]],
];
const armBones = (s, tag) => [
  [`upperArm.${tag}`, "spine2", [SHOULDER[0], SHOULDER[1], s * SHOULDER[2]], [ELBOW[0], ELBOW[1], s * ELBOW[2]]],
  [`forearm.${tag}`, `upperArm.${tag}`, [ELBOW[0], ELBOW[1], s * ELBOW[2]], [WRIST[0], WRIST[1], s * WRIST[2]]],
  [`hand.${tag}`, `forearm.${tag}`, [WRIST[0], WRIST[1], s * WRIST[2]], [2.94, 2.3, s * 0.56]],
];
const BONES = [
  ["hips", null, [0.15, 3.35, 0], [0.9, 3.28, 0]],
  ["spine1", "hips", [0.9, 3.28, 0], [1.65, 3.15, 0]],
  ["spine2", "spine1", [1.65, 3.15, 0], [2.3, 3.25, 0]],
  ["neck1", "spine2", [2.3, 3.25, 0], [2.75, 3.55, 0]],
  ["neck2", "neck1", [2.75, 3.55, 0], [3.15, 3.8, 0]],
  ["head", "neck2", [3.15, 3.8, 0], fromHead([5.0, 3.9])],
  ["jaw", "head", fromHead([3.42, 3.68]), fromHead([4.7, 3.42])],
  ["tail1", "hips", [-0.3, 3.36, 0], [-1.2, 3.27, 0]],
  ["tail2", "tail1", [-1.2, 3.27, 0], [-2.2, 3.08, 0]],
  ["tail3", "tail2", [-2.2, 3.08, 0], [-3.1, 2.92, 0]],
  ["tail4", "tail3", [-3.1, 2.92, 0], [-3.8, 2.81, 0]],
  ["tail5", "tail4", [-3.8, 2.81, 0], [-4.4, 2.73, 0]],
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
      boxDist(px, py, pz, BOX_HEAD) < 0.3 ? sdHead(px, py, pz) : 10,
      () => {
        // 下あごは jaw、それ以外は head についていく
        const jaw = MOUTH.jawWeight(px, py);
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

// ---------- 歯（骨につけて、あとで描く）。小さくて先のまるい歯を、口の前のほうにだけ ----------
function makeTeeth() {
  const teeth = [];
  const row = (bone, list, above, dir) => {
    for (const [hx, length] of list) {
      const [x, y] = fromHead([hx, lipY(hx) + above]);
      const z = surfaceZ(sdf, x, y);
      if (!z) continue;
      for (const s of [1, -1]) {
        teeth.push({ bone, base: [x, y, s * (z - 0.06)], dir, length: length * HEAD.scale, radius: 0.034 * HEAD.scale });
      }
    }
  };
  row("head", [[4.25, 0.065], [4.45, 0.075], [4.65, 0.07], [4.82, 0.055]], 0.03, norm3([0.1, -1, 0]));
  row("jaw", [[4.35, 0.06], [4.6, 0.055]], -0.03, norm3([0.1, 1, 0]));
  return teeth;
}

export default {
  name: "trex",
  grid: { min: [-4.48, -0.04, -1.14], max: [5.45, 5.05, 1.14], h: 0.02 },
  sdf,
  color,
  gloss,
  skin,
  bones: BONES,
  eyes: EYES,
  teeth: makeTeeth(),
};
