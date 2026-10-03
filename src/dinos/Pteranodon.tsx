import React from "react";
import { Cheek, DinoSvg, Eye, rot, shade } from "./parts";
import type { DinoProps } from "./types";

export const Pteranodon: React.FC<DinoProps> = ({ pose, color, accent, width }) => {
  const outline = shade(color, 0.45);
  const far = shade(color, 0.78);
  const wing = (fill: string) => (
    <>
      <path d="M205 150 L 30 48 Q 70 150 160 196 Z" fill={fill} />
      <path d="M205 150 L 30 48" fill="none" strokeWidth={9} stroke={shade(fill, 0.8)} />
    </>
  );
  return (
    <DinoSvg width={width} viewBox={[-20, -20, 480, 340]} outline={outline} bob={pose.bob}>
      <g transform={rot(pose.wing * 0.8 - 22, 205, 150)}>{wing(far)}</g>
      <ellipse cx={172} cy={182} rx={18} ry={8} fill={far} />
      <ellipse cx={215} cy={160} rx={55} ry={26} fill={color} />
      <ellipse cx={222} cy={168} rx={38} ry={13} fill={accent} stroke="none" />
      <g transform={rot(pose.head, 262, 150)}>
        <path d="M272 130 L 198 102 L 270 146 Z" fill={accent} />
        <g transform={rot(pose.jaw * 20, 304, 150)}>
          <path d="M300 148 L 372 147 L 302 160 Z" fill={accent} />
        </g>
        <path d="M298 127 L 382 141 L 304 152 Z" fill={shade(color, 0.85)} />
        <ellipse cx={284} cy={140} rx={32} ry={24} fill={color} />
        <Eye cx={290} cy={134} r={10} blink={pose.blink} />
        <Cheek cx={300} cy={150} r={7} />
      </g>
      <g transform={rot(pose.wing - 8, 210, 152)}>{wing(color)}</g>
    </DinoSvg>
  );
};
