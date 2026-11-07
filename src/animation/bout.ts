import { Easing, interpolate } from "remotion";
import type { BeatTiming, BoutBeat } from "../data/types";

// おすもうの振り付け。east（ティラノサウルス）は左から右を向き、west（トリケラトプス）は右から左を向く。
// 位置はワールド単位（土俵のまん中が x=0）。足がすべらないように、位置の変化から歩きを出す（stepsAlong）

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
type Ease = (t: number) => number;
const ease = (t: number, [a, b]: [number, number], [from, to]: [number, number], easing: Ease = Easing.inOut(Easing.quad)) =>
  interpolate(t, [a, b], [from, to], { ...clamp, easing });
const smoothBump = (u: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, u)));

export const BOUT = {
  /** 土俵の半径（俵の内側） */
  ringRadius: 5.4,
  /** 押し合っているときの、腰と腰のあいだ */
  contact: 9.0,
  /** 向き合って立つときの、腰と腰のあいだ */
  faceGap: 10.6,
  /** 画面の外から歩いてくる、腰の位置 */
  offstage: 18.5,
  /** 歩いて入ってくるフレーム数（速くすると足がすべる） */
  walkIn: 175,
  /** ぶつかるまでのフレーム数 */
  rush: 26,
  /** ほえて押したときの、まん中の位置 */
  roarShift: 0.9,
  /** 押し返したときの、まん中の位置 */
  comebackShift: -1.6,
  /** ティラノがしりもちをつく、腰の位置（土俵の外） */
  outX: -8.2,
  /** なかなおりで、ティラノが立ち上がって歩いていく腰の位置と、顔を寄せたときの腰と腰のあいだ */
  friendsEast: -7.0,
  friendsGap: 9.4,
  /** しりもちの「ぽてん」のフレーム（finish の頭から） */
  plop: 44,
};

/** その場面に入ってからのフレーム t と、場面の長さ、ナレーションまでの前置き */
type Beat = { t: number; dur: number; lead: number };
export type BodyNow = { x: number; lean: number; butt: number; sit: number };
export type BoutNow = { east: BodyNow; west: BodyNow; shake: number };

const half = BOUT.contact / 2;
const pair = (center: number, eastLean: number, westLean: number, extra: Partial<{ butt: number; sit: number; shake: number }> = {}): BoutNow => ({
  east: { x: center - half, lean: eastLean, butt: 0, sit: extra.sit ?? 0 },
  west: { x: center + half, lean: westLean, butt: extra.butt ?? 0, sit: 0 },
  shake: extra.shake ?? 0,
});
const impact = (t: number, at: number, size = 0.8) => interpolate(t, [at, at + 3, at + 18], [0, size, 0], clamp);

const BEATS: Record<BoutBeat, (b: Beat) => BoutNow> = {
  // 両側から歩いてきて、向き合って腰を落とす
  face: ({ t }) => {
    const crouch = ease(t, [BOUT.walkIn - 10, BOUT.walkIn + 25], [0, 0.3]);
    const x = ease(t, [0, BOUT.walkIn], [BOUT.offstage, BOUT.faceGap / 2], Easing.out(Easing.sin));
    return { east: { x: -x, lean: crouch, butt: 0, sit: 0 }, west: { x, lean: crouch, butt: 0, sit: 0 }, shake: 0 };
  },
  // ぶつかって、押し合う（のこった、のこった）
  charge: ({ t, dur }) => {
    const rushIn = ease(t, [0, BOUT.rush], [BOUT.faceGap / 2, half], Easing.in(Easing.quad));
    const j = t < BOUT.rush ? 0 : smoothBump((t - BOUT.rush) / (dur - BOUT.rush)) * Math.sin((2 * Math.PI * (t - BOUT.rush)) / 48);
    const base = ease(t, [0, BOUT.rush], [0.3, 0.85]);
    const off = 0.35 * j;
    const now = pair(off, base + 0.15 * j, base - 0.15 * j, { shake: impact(t, BOUT.rush) });
    if (t < BOUT.rush) {
      now.east.x = -rushIn;
      now.west.x = rushIn;
    }
    return now;
  },
  // ティラノがほえながら押して、トリケラは土俵ぎわでこらえる
  roar: ({ t, dur, lead }) => {
    const push = ease(t, [10, Math.max(lead, 55)], [0, BOUT.roarShift]);
    const hold = t < lead ? 0 : 0.2 * Math.sin((t - lead) * 0.22) * smoothBump((t - lead) / (dur - lead));
    return pair(push + 0.1 * hold, ease(t, [0, 20], [0.85, 1.0]), ease(t, [10, 40], [0.85, -0.5]) + hold);
  },
  // トリケラが頭を下げて押し返す
  comeback: ({ t }) =>
    pair(ease(t, [15, 95], [BOUT.roarShift, BOUT.comebackShift]), ease(t, [0, 20], [1.0, -0.6]), ease(t, [0, 15], [-0.5, 1.0]), {
      butt: ease(t, [0, 15], [0, 0.7]),
    }),
  // 最後のひと押しで、ティラノは土俵の外へ。ぽてん、としりもち
  finish: ({ t }) => {
    const now = pair(BOUT.comebackShift, 0, 0, { shake: impact(t, BOUT.plop, 0.9) });
    now.east.x = ease(t, [4, 36], [BOUT.comebackShift - half, BOUT.outX], Easing.out(Easing.quad));
    now.east.lean = t < 30 ? ease(t, [0, 20], [-0.6, -1.0]) : ease(t, [30, BOUT.plop], [-1.0, 0]);
    now.east.sit = ease(t, [28, BOUT.plop], [0, 1], Easing.out(Easing.back(2.2)));
    now.west.butt = interpolate(t, [0, 8, 22, 60], [0.7, 1.0, 1.0, 0], clamp);
    now.west.lean = interpolate(t, [0, 10, 30, 60], [1.0, 1.2, 1.0, 0], clamp);
    return now;
  },
  // トリケラが勝って、うれしそうに鳴く（ティラノはすわったまま）
  winner: ({ t, lead }) => {
    const now = pair(BOUT.comebackShift, 0, 0, { sit: 1 });
    now.east.x = BOUT.outX;
    now.west.butt = 0.35 * smoothBump((t - 10) / Math.max(30, lead - 10));
    return now;
  },
  // なかなおり：トリケラが近づき、ティラノは立ち上がって歩いてくる。最後に顔を寄せる
  friends: ({ t }) => {
    const nuzzle = ease(t, [130, 150], [0, 0.3]);
    return {
      east: {
        x: ease(t, [70, 125], [BOUT.outX, BOUT.friendsEast]),
        lean: nuzzle,
        butt: 0,
        sit: ease(t, [20, 60], [1, 0]),
      },
      west: { x: ease(t, [10, 70], [BOUT.comebackShift + half, BOUT.friendsEast + BOUT.friendsGap]), lean: nuzzle, butt: 0, sit: 0 },
      shake: 0,
    };
  },
};

/** シーンの頭からのフレームで、いまの場面を探す */
export const beatAt = (beats: BeatTiming[], frame: number) => beats.findLast((b) => frame >= b.from) ?? beats[0];

/** そのフレームの2ひきの位置と姿勢 */
export const boutAt = (beats: BeatTiming[], frame: number): BoutNow => {
  const b = beatAt(beats, frame);
  return BEATS[b.beat]({ t: frame - b.from, dur: b.duration, lead: b.voiceStart - b.from });
};

/**
 * 位置の動きから、歩きの位相と歩幅を出す（足がすべらないように）。
 * 向いている方へ進むときは位相が増え、押されて下がるときは減る（後ろ向きに歩く）。
 * strideWorld は大きさ（scale）をかけたもの。歩幅は 1.3 まで（それより速いと少しすべる）
 */
export const stepsAlong = (xs: number[], facing: 1 | -1, strideWorld: number, cycle: number) => {
  const out: { walk: number; stride: number }[] = [];
  let phase = 0;
  for (let f = 0; f < xs.length; f++) {
    const v = ((xs[f + 1] ?? xs[f]) - xs[f]) * facing;
    const stride = Math.min(1.3, (Math.abs(v) * cycle) / strideWorld);
    out.push({ walk: phase, stride });
    if (stride > 0.02) phase += Math.sign(v) / cycle;
  }
  return out;
};
