import React from "react";
import { Cheek, DinoSvg, Eye, Leg, Spots, rot, rotatePoint, shade } from "./parts";
import type { DinoProps } from "./types";

export const TRex: React.FC<DinoProps> = ({ pose, color, accent, width }) => {
  const outline = shade(color, 0.45);
  const far = shade(color, 0.78);
  const jawDeg = pose.jaw * 24;
  const headBottom = (x: number) => 92 + 46 * Math.sqrt(Math.max(0, 1 - ((x - 305) / 70) ** 2));
  return (
    <DinoSvg width={width} viewBox={[-20, -20, 440, 340]} outline={outline} bob={pose.bob}>
      <Leg x={182} y={215} w={42} h={92} angle={-pose.leg * 25} color={far} />
      <g transform={rot(pose.tail, 140, 178)}>
        <path d="M150 140 Q 80 150 5 118 Q 55 195 150 218 Z" fill={color} />
      </g>
      <ellipse cx={205} cy={180} rx={88} ry={68} fill={color} />
      <ellipse cx={262} cy={140} rx={34} ry={40} fill={color} stroke="none" />
      <ellipse cx={232} cy={202} rx={50} ry={40} fill={accent} stroke="none" />
      <Spots color={outline} spots={[[170, 140, 10], [196, 124, 8], [148, 168, 7], [176, 172, 5]]} />
      <Leg x={215} y={222} w={44} h={86} angle={pose.leg * 25} color={color} />
      <g transform={rot(Math.sin(pose.leg * 2) * 8 - pose.jaw * 35, 266, 192)}>
        <rect x={260} y={185} width={36} height={16} rx={8} fill={color} />
      </g>
      <g transform={rot(pose.head, 255, 140)}>
        <polygon points={`258,128 352,118 ${rotatePoint(352, 142, 258, 128, jawDeg)}`} fill="#b8323f" />
        <g transform={rot(jawDeg, 258, 128)}>
          <ellipse cx={305} cy={133} rx={55} ry={19} fill={accent} />
        </g>
        <ellipse cx={305} cy={92} rx={70} ry={46} fill={color} />
        {pose.jaw > 0.05
          ? [285, 310, 335].map((x) => {
              const y = headBottom(x);
              return <polygon key={x} points={`${x - 6},${y - 3} ${x + 6},${y - 3} ${x},${y + 11}`} fill="#fff" strokeWidth={2} />;
            })
          : null}
        <Spots color={outline} spots={[[270, 70, 6], [288, 58, 5]]} />
        <Eye cx={318} cy={78} r={15} blink={pose.blink} />
        <circle cx={362} cy={84} r={3} fill={outline} stroke="none" />
        <Cheek cx={336} cy={112} r={11} />
        <path d="M335 125 Q 350 131 363 117" fill="none" opacity={1 - pose.jaw} strokeWidth={4} />
      </g>
    </DinoSvg>
  );
};
