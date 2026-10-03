import React from "react";
import type { DinoEntry } from "../data/types";
import { DINO_COMPONENTS, DINO_WIDTH } from "../dinos";
import { type DinoPose, restPose } from "../dinos/types";

/** 足もとの位置（x=左右の中心, y=地面）を指定して恐竜を置く */
export const Dino: React.FC<{
  dino: Pick<DinoEntry, "kind" | "color" | "accent">;
  pose: Partial<DinoPose>;
  x: number;
  y: number;
  scale?: number;
}> = ({ dino, pose, x, y, scale = 1 }) => {
  const Component = DINO_COMPONENTS[dino.kind];
  const width = DINO_WIDTH[dino.kind] * scale;
  return (
    <div style={{ position: "absolute", left: x - width / 2, top: y, transform: "translateY(-92%)" }}>
      <Component pose={{ ...restPose, ...pose }} color={dino.color} accent={dino.accent} width={width} />
    </div>
  );
};
