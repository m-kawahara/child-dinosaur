import React from "react";
import { Cheek, DinoSvg, Eye, Leg, Spots, rot, shade } from "./parts";
import type { DinoProps } from "./types";

export const Brachiosaurus: React.FC<DinoProps> = ({ pose, color, accent, width }) => {
  const outline = shade(color, 0.45);
  const far = shade(color, 0.78);
  return (
    <DinoSvg width={width} viewBox={[-20, -20, 480, 460]} outline={outline} bob={pose.bob}>
      <Leg x={250} y={300} w={48} h={110} angle={-pose.leg * 16} color={far} />
      <Leg x={122} y={310} w={48} h={100} angle={pose.leg * 16} color={far} />
      <g transform={rot(pose.tail, 92, 290)}>
        <path d="M100 268 Q 30 280 -12 335 Q 50 322 108 322 Z" fill={color} />
      </g>
      <g transform={rot(pose.head, 255, 262)}>
        <path d="M222 255 Q 252 150 302 72 L 344 90 Q 302 172 292 278 Z" fill={color} />
        <Spots color={outline} spots={[[285, 140, 8], [270, 185, 9], [300, 105, 6]]} />
        <g transform={rot(pose.jaw * 18, 312, 74)}>
          <ellipse cx={342} cy={80} rx={32} ry={12} fill={accent} />
        </g>
        <ellipse cx={332} cy={64} rx={42} ry={28} fill={color} />
        <circle cx={326} cy={40} r={10} fill={color} />
        <Eye cx={342} cy={56} r={10} blink={pose.blink} />
        <Cheek cx={358} cy={72} r={8} />
        <path d="M352 82 Q 362 86 372 78" fill="none" opacity={1 - pose.jaw} strokeWidth={4} />
      </g>
      <ellipse cx={180} cy={290} rx={110} ry={70} fill={color} />
      <ellipse cx={190} cy={322} rx={80} ry={28} fill={accent} stroke="none" />
      <Spots color={outline} spots={[[140, 250, 11], [180, 236, 8], [215, 255, 10]]} />
      <Leg x={265} y={305} w={50} h={108} angle={pose.leg * 16} color={color} />
      <Leg x={108} y={315} w={50} h={98} angle={-pose.leg * 16} color={color} />
    </DinoSvg>
  );
};
