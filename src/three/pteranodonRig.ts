import type { DinoAsset } from "./dinoAsset";
import { DinoRig, type DinoPose3D, TAU } from "./rigBase";

const WING = ["humerus", "radius", "hand", "finger1", "finger2"];
// 翼の骨ごとの、はばたきの大きさと遅れ（先へいくほど遅れて、しなる）
const WING_AMP = [1, 0.25, 0.3, 0.35, 0.3];
const WING_LAG = [0, 0.35, 0.7, 1.05, 1.4];

/** はばたきの角度。振り下ろしを速く、振り上げをゆっくりに */
const stroke = (w: number) => 0.5 * Math.cos(w) + 0.12 * Math.cos(2 * w);

/**
 * プテラノドン：空を飛ぶ。横から見ると翼が手前と奥へのびて見えにくいので、
 * 体を少しこちらへ向けて、下から見上げるような角度で飛ばす（翼が画面に広がる）
 */
export class PteranodonRig extends DinoRig {
  constructor(asset: DinoAsset) {
    super(asset);
    // 前後の傾き → 左右の傾き → 向き の順に回す
    this.bone("hips").rotation.order = "YXZ";
    this.update({});
  }

  update(pose: DinoPose3D) {
    const w = TAU * (pose.flap ?? 0);
    const idle = pose.idle ?? 0;
    const bank = pose.bank ?? 0;

    const hipsRest = this.restHead.get("hips")!;
    const hips = this.bone("hips");
    // 振り下ろすと体が少し上がる
    hips.position.set(hipsRest.x, hipsRest.y - 0.06 * Math.sin(w), 0);
    hips.rotation.set(-0.38 + bank, -0.55, 0.06 + 0.03 * Math.sin(w + 0.8) + (pose.pitch ?? 0));

    WING.forEach((name, i) => {
      const a = stroke(w - WING_LAG[i]) * WING_AMP[i];
      const sweep = i === 0 ? 0.1 * Math.sin(w) : 0;
      this.bone(`${name}.R`).rotation.set(-a, sweep, 0);
      this.bone(`${name}.L`).rotation.set(a, -sweep, 0);
    });
    // 首と頭はぶれにくく、少しだけゆれる
    this.bone("neck").rotation.set(0, 0, 0.05 * Math.sin(w + 1) + 0.02 * Math.sin(idle * 0.05));
    this.bone("head").rotation.set(0, 0.03 * Math.sin(idle * 0.04), -0.04 * Math.sin(w));
    for (const tag of ["R", "L"]) {
      this.bone(`thigh.${tag}`).rotation.set(0, 0, 0.08 * Math.sin(w - 0.5));
      this.bone(`shin.${tag}`).rotation.set(0, 0, 0.05 * Math.sin(w - 1));
    }
  }
}
