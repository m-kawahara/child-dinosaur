import * as THREE from "three";
import type { DinoAsset } from "./dinoAsset";
import { DinoRig, type DinoPose3D, type LegRest, smoothstep, solveLeg, TAU } from "./rigBase";

// 足の運び（ワールド単位）。大きな動物らしく、ゆっくり大きな歩幅で、足は低めに上げる。
// stance は1周期のうち足が地面についている割合（0.5 より大きいので、両足がつく時間がある）
const GAIT = { stride: 1.65, lift: 0.42, stance: 0.62 };

/** 1周期（左右1歩ずつ）で、歩幅 1 のときに体が進む距離 */
export const TREX_STRIDE_WORLD = GAIT.stride / GAIT.stance;

/** しりもちの形（sit = 1 のとき）。腰を下げる割合・後ろへずらす量・後ろへ倒す角度、しっぽ・首・腕・足の直し */
const SIT = { drop: 0.45, back: 0.5, tilt: 0.4, tailLift: 0.3, neck: 0.26, arms: 0.8, feet: 0.9 };

/**
 * 歩くときの体の動き（歩幅 1 のとき）。
 * 腰は足をついた直後にいちばん低く、片足で立つまん中でいちばん高い（体が足の上を乗りこえる）。
 * 前へ進む速さも、低いときに速く、高いときに遅い（surge）。足がつくたびに「ずしん」と体がゆれる（thud）
 */
const BODY = { bob: 0.055, surge: 0.035, pitch: 0.016, thud: 0.022, crouch: 0.03 };
/** 頭は体のゆれを打ち消して、あまり動かない（1 で完全に止まる） */
const HEAD_STEADY = 0.55;

/** ほえるとき（raise = 1）：前かがみで首を前へのばし、しっぽを上げて、頭をふるわせる */
const ROAR = { forward: 0.15, drop: 0.06, lean: 0.07, neck: [-0.05, 0.1], head: 0.23, tail: 0.07, shake: 0.05, arms: 0.15 };

/**
 * ばねのゆれ：足がついてから tau 歩（0〜1 が1歩）たったときの、ゆれて静まる波。
 * freq は1歩のあいだのゆれの回数、decay は静まる速さ。前の歩のゆれの残りも足す
 */
const thud = (tau: number, freq: number, decay: number) => {
  let v = 0;
  for (let m = 0; m < 3; m++) {
    const t = tau + m;
    if (t > 0) v += Math.exp(-decay * t) * Math.sin(TAU * freq * t);
  }
  return v;
};

/** 腰の上下（歩幅 1、1歩の中の位置 u）。しっぽは、腰が少し前にいた高さを追いかける */
const hipsLift = (u: number) => -BODY.bob * Math.cos(TAU * (u - 0.12)) - BODY.thud * thud(u, 2.6, 7);

/**
 * 足先の動き（q は 0〜1）。地面にいるあいだは一定の速さで後ろへ。
 * 浮いているあいだは、すばやく持ち上げて前へ出し、少し出しすぎてから引きもどして、そっと下ろす
 */
const footPath = (q: number, stride: number, lift: number) => {
  if (q < GAIT.stance) {
    const s = q / GAIT.stance;
    return { dx: stride / 2 - stride * s, dy: 0, stance: s, swing: -1 };
  }
  const s = (q - GAIT.stance) / (1 - GAIT.stance);
  const reach = 0.05;
  const fwd = s < 0.85 ? (1 + reach) * smoothstep(s, 0, 0.85) : 1 + reach - reach * smoothstep(s, 0.85, 1);
  const up = Math.sin(Math.PI * (1 - Math.pow(1 - s, 1.6)));
  return { dx: -stride / 2 + stride * fwd, dy: lift * up, stance: -1, swing: s };
};

/** 0〜1 の乱数（同じ n なら同じ値） */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * 立っているときに、ときどき頭の向きを変える。動物のように、すばやく向きを変えて、しばらくじっとする。
 * 返すのは左右（−でカメラのほう）と上下の角度
 */
const lookAround = (t: number) => {
  let start = 0;
  let n = 0;
  let prev = { yaw: -0.08, pitch: 0 };
  let next = prev;
  for (;;) {
    const hold = 45 + 50 * hash(n * 3.1);
    next = { yaw: -0.24 + 0.34 * hash(n * 7.7 + 1), pitch: -0.05 + 0.1 * hash(n * 5.3 + 2) };
    if (t < start + hold) break;
    prev = next;
    start += hold;
    n++;
  }
  const w = smoothstep(t - start, 0, 9);
  return { yaw: THREE.MathUtils.lerp(prev.yaw, next.yaw, w), pitch: THREE.MathUtils.lerp(prev.pitch, next.pitch, w) };
};

/** ティラノサウルス：2本足で歩く、ほえる */
export class TRexRig extends DinoRig {
  private readonly legs: { tag: "R" | "L"; phase: number; rest: LegRest }[];

  constructor(asset: DinoAsset) {
    super(asset);
    this.legs = (["R", "L"] as const).map((tag, i) => ({
      tag,
      phase: i * 0.5,
      rest: this.legRest(`thigh.${tag}`, `shin.${tag}`, `foot.${tag}`, `toe.${tag}`),
    }));
    this.update({});
  }

  update(pose: DinoPose3D) {
    const p = pose.walk === undefined ? undefined : ((pose.walk % 1) + 1) % 1;
    const k = p === undefined ? 0 : THREE.MathUtils.clamp(pose.stride ?? 1, 0, 1.3);
    const ph = p ?? 0;
    // 1歩の中の位置（0 で右か左の足がつく）
    const u = (2 * ph) % 1;
    const raise = pose.raise ?? 0;
    const jaw = pose.jaw ?? 0;
    const lean = pose.lean ?? 0;
    const sit = THREE.MathUtils.clamp(pose.sit ?? 0, 0, 1);
    const idle = pose.idle ?? 0;
    // 止まっているときだけ、息をしたり、まわりを見たりする（押し合いやほえるときはしない）
    const calm = Math.max(0, 1 - k) * Math.max(0, 1 - Math.abs(lean)) * (1 - raise);
    const breath = Math.max(0, 1 - k) * Math.sin(idle * 0.05);
    const look = lookAround(idle);
    // ほえかた：ふだんは前かがみで首を前へ（fwd）。押し合っているときは、相手の上へ頭を上げる（up）
    const over = THREE.MathUtils.clamp(Math.abs(lean), 0, 1);
    const fwd = raise * (1 - over);
    const up = raise * over;

    // ---------- 腰 ----------
    const hipsRest = this.restHead.get("hips")!;
    const lift = k * hipsLift(u) + 0.01 * breath - BODY.crouch * k - ROAR.drop * fwd;
    const surge = k * BODY.surge * Math.sin(TAU * (u - 0.12));
    const pitch = k * (BODY.pitch * Math.sin(TAU * (u - 0.05)) - 0.4 * BODY.thud * thud(u - 0.02, 2.2, 6)) + 0.003 * breath;
    const hips = this.bone("hips");
    hips.position.set(
      hipsRest.x + surge + ROAR.forward * fwd + 0.45 * lean - SIT.back * sit,
      (hipsRest.y + lift) * (1 - SIT.drop * sit) - 0.08 * Math.abs(lean),
      0,
    );
    const bodyPitch = pitch - ROAR.lean * fwd - 0.12 * lean + SIT.tilt * sit;
    hips.rotation.set(0, 0, bodyPitch);

    // ---------- しっぽ ----------
    // 付け根から先へ、腰の上下を遅れて追いかける（重いので少しだけ）。足がつくと、ずしんと先がしなる。
    // 左右には1周期で1往復。ほえるときは持ち上げて、体の前かがみと釣り合わせる
    const segLen = 0.95;
    for (let i = 1; i <= 5; i++) {
      const follow = (k * 0.5 * (hipsLift(u - 0.09 * i) - hipsLift(u - 0.09 * (i - 1)))) / segLen;
      const whip = -k * 0.018 * i * thud(u - 0.05 * i, 1.7, 4.5);
      const side = 0.045 * k * Math.sin(TAU * ph - 0.6 - i * 0.5) + 0.03 * calm * Math.sin(idle * 0.035 - i * 0.55);
      const roar = fwd * (i === 1 ? ROAR.tail : 0.02) - 0.03 * up + 0.04 * raise * jaw * Math.sin(idle * 0.9 - i * 0.8) * (i / 5);
      const fix = i === 1 ? -pitch + 0.06 * lean - SIT.tailLift * sit : -0.05 * sit;
      this.bone(`tail${i}`).rotation.set(0, side, follow + whip + roar + fix + 0.004 * i * breath);
    }

    // ---------- 胴・首・頭 ----------
    // 胴は腰と反対に少しひねる。息を吸うと胸がふくらむ
    const sway = k * Math.sin(TAU * ph);
    this.bone("spine1").rotation.set(0, -0.015 * sway, 0.006 * breath - 0.03 * fwd);
    this.bone("spine2").rotation.set(0, -0.015 * sway, 0.008 * breath - 0.03 * fwd);
    // 首で体のゆれを打ち消して、頭をあまり動かさない。重い頭は、足がつくと少し遅れて沈む
    // （頭のまん中は、腰から前へ 3.5、首の付け根から前へ 1.6 くらい）
    const headDrop = k * hipsLift(u) + 3.5 * pitch;
    const sag = -k * 0.022 * thud(u - 0.07, 2.0, 5);
    const n1 = (-HEAD_STEADY * headDrop) / 1.6 + sag + ROAR.neck[0] * fwd + 0.14 * up - SIT.neck * sit - 0.006 * breath + 0.4 * look.pitch * calm;
    const n2 = -0.5 * sag + ROAR.neck[1] * fwd + 0.12 * up + 0.3 * look.pitch * calm;
    const yaw = look.yaw * calm + 0.012 * sway;
    this.bone("neck1").rotation.set(0, 0.3 * yaw, n1);
    this.bone("neck2").rotation.set(0, 0.3 * yaw, n2);
    // 頭は、首と体の傾きを打ち消して、まっすぐ前を見る。ほえるときは口を前に向けて、ぶるぶるっとふるわせる
    const shake = ROAR.shake * raise * jaw;
    const level = -0.6 * (bodyPitch + n1 + n2) * (1 - raise);
    this.bone("head").rotation.set(
      shake * 0.8 * Math.sin(idle * 0.83),
      0.4 * yaw + shake * Math.sin(idle * 1.13),
      level + ROAR.head * fwd + 0.1 * up + 0.3 * look.pitch * calm,
    );
    this.openJaw(jaw, 0.55);
    this.blink(pose.blink ?? 0);

    // ---------- 足 ----------
    // 足先の位置と、足の甲・指の向きを決めてから、ひざを逆算する
    for (const leg of this.legs) {
      const r = leg.rest;
      const restMet = Math.atan2(r.ankle.y - r.ball.y, r.ankle.x - r.ball.x);
      const restToe = Math.atan2(r.tip.y - r.ball.y, r.tip.x - r.ball.x);
      const toeLen = Math.hypot(r.tip.x - r.ball.x, r.tip.y - r.ball.y);
      const f = footPath(p === undefined ? 0 : (ph + leg.phase) % 1, GAIT.stride * k, GAIT.lift * k);
      const ball = p === undefined ? { ...r.ball } : { x: r.ball.x + f.dx, y: r.ball.y + f.dy };
      ball.x += SIT.feet * sit; // しりもちでは、足を前へ投げ出す
      let met = restMet;
      let toe = restToe;
      if (p !== undefined) {
        if (f.swing < 0) {
          // 体重がかかると足首が少し沈み、けり出す前にかかとが上がる
          met = restMet + k * (0.07 * Math.sin(Math.PI * smoothstep(f.stance, 0, 0.35)) - 0.38 * smoothstep(f.stance, 0.5, 1));
        } else {
          // 浮いているあいだは足首を折りたたんで指を丸め、下ろす前に指をひらく
          const s = f.swing;
          met = restMet + k * (THREE.MathUtils.lerp(-0.38, 0, smoothstep(s, 0.1, 0.95)) - 0.42 * Math.sin(Math.PI * smoothstep(s, 0, 0.8)));
          toe = restToe + k * (-0.7 * Math.sin(Math.PI * smoothstep(s, 0, 0.75)) + 0.12 * Math.sin(Math.PI * smoothstep(s, 0.7, 1)));
          if (ball.y + toeLen * Math.sin(toe) < 0.05) toe = Math.asin(Math.max(-1, (0.05 - ball.y) / toeLen)); // 指先が地面にもぐらないように
        }
      }
      const joint = this.jointNow(`thigh.${leg.tag}`);
      const [a, b, c, d] = solveLeg(r, joint.pos, ball, met, toe, true, joint.parentAngle);
      this.bone(`thigh.${leg.tag}`).rotation.set(0, 0, a);
      this.bone(`shin.${leg.tag}`).rotation.set(0, 0, b);
      this.bone(`foot.${leg.tag}`).rotation.set(0, 0, c);
      this.bone(`toe.${leg.tag}`).rotation.set(0, 0, d);
    }

    // ---------- 腕 ----------
    // 人のようにはふらない。体にひきよせたまま、足がつくたびに少し遅れて、ぷるんとゆれる
    const bounce = k * 0.09 * thud(u - 0.04, 2.4, 5);
    for (const [tag, off] of [["R", 0], ["L", 0.6]] as const) {
      const b = bounce + 0.01 * k * Math.sin(TAU * ph + off);
      this.bone(`upperArm.${tag}`).rotation.set(0, 0, b + ROAR.arms * fwd + SIT.arms * sit);
      this.bone(`forearm.${tag}`).rotation.set(0, 0, 0.7 * b + 0.5 * ROAR.arms * fwd + 0.5 * SIT.arms * sit);
    }
  }
}
