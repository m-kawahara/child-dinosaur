import * as THREE from "three";
import type { DinoAsset } from "./dinoAsset";
import { DinoRig, type DinoPose3D, footPath, type LegRest, smoothstep, solveLeg, TAU } from "./rigBase";

// 足の運び（ワールド単位）
const GAIT = { stride: 1.5, lift: 0.55, stance: 0.6 };

/** 1周期（左右1歩ずつ）で、歩幅 1 のときに体が進む距離 */
export const TREX_STRIDE_WORLD = GAIT.stride / GAIT.stance;

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
    const raise = pose.raise ?? 0;

    // 腰：1歩ごとに上下して、少し前後に傾く。止まっているときは、ゆっくり息をする
    const hipsRest = this.restHead.get("hips")!;
    const idle = pose.idle ?? 0;
    const calm = Math.max(0, 1 - k);
    const breath = calm * Math.sin(idle * 0.07);
    const bob = -0.05 * k * Math.cos(TAU * 2 * ph) + 0.012 * breath;
    const pitch = 0.015 * k * Math.sin(TAU * 2 * ph) + 0.004 * breath;
    const hips = this.bone("hips");
    hips.position.set(hipsRest.x, hipsRest.y + bob, 0);
    hips.rotation.set(0, 0, pitch);

    // しっぽ：上下と左右に、付け根から先へ遅れて波打つ
    for (let i = 1; i <= 5; i++) {
      const v = 0.035 * k * Math.sin(TAU * 2 * ph - i * 0.7);
      const h = 0.05 * k * Math.sin(TAU * ph - i * 0.55) + 0.025 * calm * Math.sin(idle * 0.045 - i * 0.5);
      this.bone(`tail${i}`).rotation.set(0, h, v - (i === 1 ? pitch : 0) - raise * 0.03);
    }
    // 胴と首：しっぽと反対に少しひねり、頭はぶれにくくする
    const sway = k * Math.sin(TAU * ph);
    this.bone("spine1").rotation.set(0, -0.012 * sway, 0);
    this.bone("spine2").rotation.set(0, -0.012 * sway, 0);
    const nod = 0.02 * k * Math.sin(TAU * 2 * ph + 1.0) + 0.012 * calm * Math.sin(idle * 0.05 + 0.8);
    this.bone("neck1").rotation.set(0, 0.01 * sway, -pitch + nod + raise * 0.14);
    this.bone("neck2").rotation.set(0, 0.01 * sway, -nod * 0.5 + raise * 0.12);
    this.bone("head").rotation.set(0, 0, raise * 0.1);
    this.openJaw(pose.jaw ?? 0, 0.55);
    this.blink(pose.blink ?? 0);

    // 足：足先の位置を決めてから、ひざを逆算する
    const gait = { ...GAIT, stride: GAIT.stride * k, lift: GAIT.lift * k };
    for (const leg of this.legs) {
      const r = leg.rest;
      const restMet = Math.atan2(r.ankle.y - r.ball.y, r.ankle.x - r.ball.x);
      const restToe = Math.atan2(r.tip.y - r.ball.y, r.tip.x - r.ball.x);
      const toeLen = Math.hypot(r.tip.x - r.ball.x, r.tip.y - r.ball.y);
      const f = footPath(p === undefined ? 0 : (ph + leg.phase) % 1, gait);
      const ball = p === undefined ? { ...r.ball } : { x: r.ball.x + f.dx, y: r.ball.y + f.dy };
      let met = restMet;
      let toe = restToe;
      if (p !== undefined) {
        if (f.swing < 0) met = restMet - 0.38 * k * smoothstep(f.stance, 0.55, 1); // けり出す前にかかとが上がる
        else {
          const s = f.swing;
          met = restMet + k * (-0.38 * (1 - smoothstep(s, 0, 0.3)) + 0.35 * Math.sin(Math.PI * s));
          toe = restToe - 0.45 * k * Math.sin(Math.PI * s);
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

    // 腕：歩きに合わせて小さくふる
    for (const [tag, off] of [["R", 0], ["L", Math.PI]] as const) {
      const s = k * Math.sin(TAU * ph + off);
      this.bone(`upperArm.${tag}`).rotation.set(0, 0, 0.08 * s - raise * 0.1);
      this.bone(`forearm.${tag}`).rotation.set(0, 0, 0.06 * s);
    }
  }
}
