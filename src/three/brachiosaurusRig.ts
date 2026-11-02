import type { DinoAsset } from "./dinoAsset";
import { type Gait, QuadrupedRig, type StepState } from "./quadrupedRig";
import type { DinoPose3D } from "./rigBase";

const GAIT: Gait = { stride: 1.3, lift: 0.35, stance: 0.68 };

/** 1周期で、歩幅 1 のときに体が進む距離 */
export const BRACHIOSAURUS_STRIDE_WORLD = GAIT.stride / GAIT.stance;

const NECKS = ["neck1", "neck2", "neck3", "neck4"];

/** ブラキオサウルス：4本足でゆっくり歩く、首をのばして高い葉を食べる */
export class BrachiosaurusRig extends QuadrupedRig {
  constructor(asset: DinoAsset) {
    super(asset, { gait: GAIT, necks: NECKS, tails: 5, bob: 0.03, nod: 0.02, jawOpen: 0.36 });
    this.update({});
  }

  /** 首のばし：reach で首を上へ、頭は少し下向きに。munch で口をもぐもぐ */
  protected adjustBody(pose: DinoPose3D, s: StepState) {
    const reach = pose.reach ?? 0;
    const munch = pose.munch ?? 0;
    // 止まっているときは首がゆっくりゆれる
    const drift = 0.02 * s.calm * Math.sin(s.idle * 0.035);
    NECKS.forEach((n, i) => {
      this.bone(n).rotation.z += 0.07 * reach * (1 - i * 0.15) + drift;
    });
    this.bone("head").rotation.z += -0.2 * reach + 0.06 * munch;
    this.openJaw(Math.max(pose.jaw ?? 0, 0.5 * munch), 0.36);
  }
}
