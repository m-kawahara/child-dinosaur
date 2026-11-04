import { interpolate } from "remotion";
import type { CryInfo } from "../data/types";

/** なき声のいまの様子。mouth は口の開き（0〜1）、over は声が終わったあと */
export type CryNow = { mouth: number; over: boolean };

/** 鳴きはじめてから seconds 秒の口の開き（cries.json の折れ線から） */
export const cryAt = (cry: CryInfo, seconds: number): CryNow => ({
  mouth: interpolate(
    seconds,
    cry.mouth.map(([t]) => t),
    cry.mouth.map(([, v]) => v),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  ),
  over: seconds >= cry.seconds,
});
