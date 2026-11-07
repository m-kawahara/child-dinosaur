import * as THREE from "three";
import type { DinoAsset } from "./dinoAsset";
import { DinoRig, type DinoPose3D, footPath, type LegRest, solveLeg, TAU } from "./rigBase";

export type Gait = { stride: number; lift: number; stance: number };

/** 4本足の恐竜の作り。骨の名前は thigh/shin/foot/toe（うしろ足）と upperArm/forearm/hand/finger（前足） */
export type QuadrupedSpec = {
  gait: Gait;
  /** 首の骨（付け根から順に。頭は "head"） */
  necks: string[];
  tails: number;
  /** 歩くときの腰の上下と、首のうなずき */
  bob: number;
  nod: number;
  /** 口を開ききったときのあごの角度（ラジアン） */
  jawOpen: number;
};

/** その時点の歩きの状態（恐竜ごとの動きを足すときに使う） */
export type StepState = { k: number; ph: number; idle: number; calm: number };

type Leg = { upper: string; lower: string; foot: string; toe: string; phase: number; front: boolean; rest: LegRest };

/** 4本足で歩く恐竜。恐竜ごとのアクションは adjustBody で足す */
export abstract class QuadrupedRig extends DinoRig {
  private readonly legs: Leg[];

  constructor(
    asset: DinoAsset,
    protected readonly spec: QuadrupedSpec,
  ) {
    super(asset);
    // 歩く順番は 左うしろ → 左まえ → 右うしろ → 右まえ（4本足の動物のふつうの歩き方）
    const hind = (tag: string, phase: number) => this.leg(`thigh.${tag}`, `shin.${tag}`, `foot.${tag}`, `toe.${tag}`, phase, false);
    const front = (tag: string, phase: number) => this.leg(`upperArm.${tag}`, `forearm.${tag}`, `hand.${tag}`, `finger.${tag}`, phase, true);
    this.legs = [hind("L", 0), front("L", 0.25), hind("R", 0.5), front("R", 0.75)];
  }

  private leg(upper: string, lower: string, foot: string, toe: string, phase: number, front: boolean): Leg {
    return { upper, lower, foot, toe, phase, front, rest: this.legRest(upper, lower, foot, toe) };
  }

  /** 体（腰・首・しっぽ）にアクションを足す。足はこのあと地面に合わせる */
  protected abstract adjustBody(pose: DinoPose3D, s: StepState): void;

  update(pose: DinoPose3D) {
    const p = pose.walk === undefined ? undefined : ((pose.walk % 1) + 1) % 1;
    const k = p === undefined ? 0 : THREE.MathUtils.clamp(pose.stride ?? 1, 0, 1.3);
    const ph = p ?? 0;
    const idle = pose.idle ?? 0;
    const calm = Math.max(0, 1 - k);
    const { spec } = this;

    // 腰：うしろ足の1歩ごとに少し上下。止まっているときは、ゆっくり息をする
    const hipsRest = this.restHead.get("hips")!;
    const breath = calm * Math.sin(idle * 0.07);
    const bob = -spec.bob * k * Math.cos(TAU * 2 * ph) + 0.01 * breath;
    const pitch = 0.01 * k * Math.sin(TAU * 2 * ph + 0.6);
    const hips = this.bone("hips");
    hips.position.set(hipsRest.x, hipsRest.y + bob, 0);
    hips.rotation.set(0, 0, pitch);

    const sway = k * Math.sin(TAU * ph);
    this.bone("spine1").rotation.set(0, -0.01 * sway, 0);
    this.bone("spine2").rotation.set(0, -0.01 * sway, 0);
    const nod = spec.nod * k * Math.sin(TAU * 2 * ph + 1.4) + 0.012 * calm * Math.sin(idle * 0.05 + 0.8);
    for (const n of spec.necks) this.bone(n).rotation.set(0, (0.012 * sway) / spec.necks.length, nod / spec.necks.length);
    this.bone("head").rotation.set(0, 0, -nod * 0.4);
    this.openJaw(pose.jaw ?? 0, spec.jawOpen);
    this.blink(pose.blink ?? 0);
    for (let i = 1; i <= spec.tails; i++) {
      const v = 0.03 * k * Math.sin(TAU * 2 * ph - i * 0.7);
      const h = 0.06 * k * Math.sin(TAU * ph - i * 0.6) + 0.03 * calm * Math.sin(idle * 0.045 - i * 0.5);
      this.bone(`tail${i}`).rotation.set(0, h, v - (i === 1 ? pitch : 0));
    }

    // 押し合い：腰ごと前（後ろ）へ出て、前へ押すときは頭を下げる。足はこのあと地面に合わせるので残る
    const lean = pose.lean ?? 0;
    if (lean !== 0) {
      hips.position.x += 0.35 * lean;
      hips.position.y -= 0.05 * Math.abs(lean);
      hips.rotation.z -= 0.04 * lean;
      this.bone(spec.necks[0]).rotation.z -= 0.08 * lean;
    }

    this.adjustBody(pose, { k, ph, idle, calm });

    const gait = { ...spec.gait, stride: spec.gait.stride * k, lift: spec.gait.lift * k };
    for (const leg of this.legs) {
      const r = leg.rest;
      const restMet = Math.atan2(r.ankle.y - r.ball.y, r.ankle.x - r.ball.x);
      const restToe = Math.atan2(r.tip.y - r.ball.y, r.tip.x - r.ball.x);
      const f = footPath(p === undefined ? 0 : (ph + leg.phase) % 1, gait);
      const ball = p === undefined ? { ...r.ball } : { x: r.ball.x + f.dx, y: r.ball.y + f.dy };
      let met = restMet;
      let toe = restToe;
      if (p !== undefined && f.swing >= 0) {
        // 浮いているあいだは、足首を曲げて指先を少し下に向ける
        const lift = Math.sin(Math.PI * f.swing);
        met = restMet + k * (leg.front ? -0.25 : 0.3) * lift;
        toe = restToe - 0.3 * k * lift;
      }
      const joint = this.jointNow(leg.upper);
      const [a, b, c, d] = solveLeg(r, joint.pos, ball, met, toe, !leg.front, joint.parentAngle);
      this.bone(leg.upper).rotation.set(0, 0, a);
      this.bone(leg.lower).rotation.set(0, 0, b);
      this.bone(leg.foot).rotation.set(0, 0, c);
      this.bone(leg.toe).rotation.set(0, 0, d);
    }
  }
}
