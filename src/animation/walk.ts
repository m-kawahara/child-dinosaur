import type { DinoPose } from "../dinos/types";

const STEP_SPEED = 0.28;

export const walkPose = (frame: number): Partial<DinoPose> => {
  const phase = frame * STEP_SPEED;
  return {
    leg: Math.sin(phase),
    bob: -Math.abs(Math.sin(phase)) * 10,
    tail: Math.sin(phase * 0.5) * 8,
    head: Math.sin(phase) * 2,
  };
};

/** 立っているときの呼吸 */
export const idlePose = (frame: number): Partial<DinoPose> => ({
  bob: Math.sin(frame * 0.08) * 3,
  tail: Math.sin(frame * 0.06) * 5,
  head: Math.sin(frame * 0.05) * 2,
});

export const flapPose = (frame: number, speed = 0.35): Partial<DinoPose> => ({
  wing: Math.sin(frame * speed) * 35,
  bob: Math.cos(frame * speed) * 12,
  tail: 0,
});

/** 約3秒ごとにまばたき */
export const blinkAt = (frame: number, offset = 0) => {
  const t = (frame + offset) % 95;
  return t < 8 ? 1 - Math.abs(t - 4) / 4 : 0;
};
