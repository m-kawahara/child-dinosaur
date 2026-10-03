import React from "react";
import { Cheek, DinoSvg, Eye, Leg, Spots, rot, shade } from "./parts";
import type { DinoProps } from "./types";

const IVORY = "#fff3d6";

export const Triceratops: React.FC<DinoProps> = ({ pose, color, accent, width }) => {
  const outline = shade(color, 0.45);
  const far = shade(color, 0.78);
  const frillDots = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (0.5 + i * 0.12);
    return [315 + Math.cos(a) * 56, 125 - Math.sin(a) * 68] as const;
  });
  return (
    <DinoSvg width={width} viewBox={[-20, -20, 480, 340]} outline={outline} bob={pose.bob}>
      <Leg x={145} y={215} w={46} h={82} angle={-pose.leg * 20} color={far} />
      <Leg x={275} y={215} w={46} h={82} angle={pose.leg * 20} color={far} />
      <g transform={rot(pose.tail, 100, 180)}>
        <path d="M112 158 Q 50 170 12 205 Q 60 210 118 205 Z" fill={color} />
      </g>
      <ellipse cx={205} cy={175} rx={115} ry={72} fill={color} />
      <ellipse cx={215} cy={212} rx={80} ry={28} fill={accent} stroke="none" />
      <Spots color={outline} spots={[[150, 135, 11], [185, 118, 8], [220, 128, 10], [130, 170, 7]]} />
      <Leg x={122} y={222} w={48} h={80} angle={pose.leg * 20} color={color} />
      <Leg x={292} y={222} w={48} h={80} angle={-pose.leg * 20} color={color} />
      <g transform={rot(pose.head, 300, 175)}>
        <ellipse cx={315} cy={125} rx={62} ry={75} fill={color} />
        <ellipse cx={318} cy={128} rx={46} ry={58} fill={accent} stroke="none" />
        {frillDots.map(([x, y]) => (
          <circle key={`${x}`} cx={x} cy={y} r={7} fill={outline} stroke="none" opacity={0.5} />
        ))}
        <path d="M328 100 Q 352 55 382 32 Q 365 75 346 110 Z" fill={shade(IVORY, 0.88)} />
        <g transform={rot(pose.jaw * 16, 352, 178)}>
          <path d="M345 168 Q 382 186 410 176 Q 396 198 352 194 Z" fill={accent} />
        </g>
        <ellipse cx={360} cy={150} rx={55} ry={42} fill={color} />
        <path d="M398 132 Q 432 148 414 178 Q 400 172 390 160 Z" fill={shade(color, 0.72)} />
        <path d="M384 124 L 398 96 L 402 128 Z" fill={IVORY} />
        <path d="M340 108 Q 368 62 402 40 Q 382 85 360 116 Z" fill={IVORY} />
        <Eye cx={362} cy={138} r={13} blink={pose.blink} />
        <Cheek cx={382} cy={162} r={10} />
        <path d="M372 175 Q 388 181 400 172" fill="none" opacity={1 - pose.jaw} strokeWidth={4} />
      </g>
    </DinoSvg>
  );
};
