import { interpolate } from "remotion";
import type { DinoAction } from "../data/types";
import type { DinoPose } from "../dinos/types";
import { flapPose } from "./walk";

export type ActionResult = {
  pose: Partial<DinoPose>;
  /** 恐竜の位置ずらし（px） */
  dx: number;
  dy: number;
  /** 画面のゆれ 0〜1 */
  shake: number;
};

export const ACTION_FRAMES: Record<DinoAction, number> = {
  roar: 60,
  headbutt: 70,
  longneck: 120,
  tailswing: 80,
  fly: 110,
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const none: ActionResult = { pose: {}, dx: 0, dy: 0, shake: 0 };

/** t はアクション開始からのフレーム。範囲外なら何もしない */
export const actionAt = (action: DinoAction, t: number): ActionResult => {
  const len = ACTION_FRAMES[action];
  if (t < 0 || t > len) return action === "fly" ? { ...none, pose: flapPose(t) } : none;

  switch (action) {
    case "roar": {
      const jaw = interpolate(t, [0, 8, 45, 58], [0, 1, 1, 0], clamp);
      return {
        pose: { jaw, head: -14 * jaw, tail: Math.sin(t * 0.9) * 6 * jaw },
        dx: 0,
        dy: 0,
        shake: interpolate(t, [6, 12, 40, 50], [0, 1, 1, 0], clamp),
      };
    }
    case "headbutt": {
      // 2回 あたまを下げて ぐっと前へ
      const cycle = (t % 35) / 35;
      const push = Math.sin(cycle * Math.PI);
      return { pose: { head: 16 * push, jaw: 0.2 * push }, dx: 45 * push, dy: 0, shake: push > 0.9 ? 0.4 : 0 };
    }
    case "longneck": {
      // くびを のばして ゆらゆら、もぐもぐ
      const up = interpolate(t, [0, 20, 100, 120], [0, 1, 1, 0], clamp);
      return {
        pose: { head: -12 * up + Math.sin(t * 0.12) * 6 * up, jaw: up * (0.5 + 0.5 * Math.sin(t * 0.6)) * 0.6 },
        dx: 0,
        dy: 0,
        shake: 0,
      };
    }
    case "tailswing": {
      const amp = interpolate(t, [0, 10, 65, 80], [0, 1, 1, 0], clamp);
      return { pose: { tail: Math.sin(t * 0.32) * 32 * amp, head: -4 * amp }, dx: 0, dy: 0, shake: 0 };
    }
    case "fly": {
      // ぐるっと 大きく ひと回り
      const p = t / len;
      return {
        pose: { ...flapPose(t, 0.55), jaw: 0.4 * Math.sin(p * Math.PI) },
        dx: Math.sin(p * Math.PI * 2) * 220,
        dy: -Math.sin(p * Math.PI) * 90 + Math.sin(p * Math.PI * 2) * 40,
        shake: 0,
      };
    }
  }
};
