import type { DinoAsset } from "./dinoAsset";
import { type Gait, QuadrupedRig } from "./quadrupedRig";
import type { DinoPose3D } from "./rigBase";

const GAIT: Gait = { stride: 0.95, lift: 0.28, stance: 0.65 };

/** 1周期で、歩幅 1 のときに体が進む距離 */
export const STEGOSAURUS_STRIDE_WORLD = GAIT.stride / GAIT.stance;

/** ステゴサウルス：4本足で歩く、とげのついたしっぽを振る */
export class StegosaurusRig extends QuadrupedRig {
  constructor(asset: DinoAsset) {
    super(asset, { gait: GAIT, necks: ["neck"], tails: 4, bob: 0.03, nod: 0.025 });
    this.update({});
  }

  /** しっぽ振り：tailSwing（-1〜1）の向きへ、先ほど大きく振る。少し持ち上げて、横から見てもわかるように */
  protected adjustBody(pose: DinoPose3D) {
    const swing = pose.tailSwing ?? 0;
    if (swing === 0) return;
    for (let i = 1; i <= 4; i++) {
      const b = this.bone(`tail${i}`);
      b.rotation.y += 0.2 * swing * (0.6 + i * 0.2);
      b.rotation.z += 0.05 * Math.abs(swing);
    }
    this.bone("hips").rotation.y -= 0.04 * swing;
  }
}
