import type { DinoAsset } from "./dinoAsset";
import { type Gait, QuadrupedRig } from "./quadrupedRig";
import type { DinoPose3D } from "./rigBase";

const GAIT: Gait = { stride: 1.1, lift: 0.32, stance: 0.65 };

/** 1周期で、歩幅 1 のときに体が進む距離 */
export const TRICERATOPS_STRIDE_WORLD = GAIT.stride / GAIT.stance;

/** トリケラトプス：4本足で歩く、頭突き */
export class TriceratopsRig extends QuadrupedRig {
  constructor(asset: DinoAsset) {
    super(asset, { gait: GAIT, necks: ["neck"], tails: 4, bob: 0.035, nod: 0.03, jawOpen: 0.4 });
    this.update({});
  }

  /** 頭突き：足は地面にのこしたまま体ごと前へ出て、頭を下げて角を前に向ける */
  protected adjustBody(pose: DinoPose3D) {
    const butt = pose.butt ?? 0;
    if (butt === 0) return;
    const hips = this.bone("hips");
    hips.position.x += 0.28 * butt;
    hips.position.y -= 0.04 * butt;
    hips.rotation.z -= 0.035 * butt;
    this.bone("neck").rotation.z -= 0.22 * butt;
    this.bone("head").rotation.z -= 0.16 * butt;
  }
}
