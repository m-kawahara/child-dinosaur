import React from "react";
import { Cheek, DinoSvg, Eye, Leg, rot, shade } from "./parts";
import type { DinoProps } from "./types";

const IVORY = "#fff3d6";
const PLATES: [number, number][] = [
  [125, 40],
  [160, 56],
  [198, 66],
  [236, 62],
  [270, 50],
  [298, 36],
];

export const Stegosaurus: React.FC<DinoProps> = ({ pose, color, accent, width }) => {
  const outline = shade(color, 0.45);
  const far = shade(color, 0.78);
  const backY = (x: number) => 180 - 62 * Math.sqrt(Math.max(0, 1 - ((x - 205) / 105) ** 2));
  return (
    <DinoSvg width={width} viewBox={[-20, -40, 480, 360]} outline={outline} bob={pose.bob}>
      <Leg x={152} y={215} w={44} h={78} angle={-pose.leg * 20} color={far} />
      <Leg x={268} y={212} w={42} h={80} angle={pose.leg * 20} color={far} />
      {PLATES.map(([x, h], i) => {
        const y = backY(x) + 12;
        return (
          <path
            key={x}
            d={`M${x - 20} ${y} Q ${x - 22} ${y - h * 0.6} ${x} ${y - h} Q ${x + 22} ${y - h * 0.6} ${x + 20} ${y} Z`}
            fill={accent}
          />
        );
      })}
      <g transform={rot(pose.tail, 112, 185)}>
        <path d="M44 150 L 24 112 L 58 146 Z" fill={IVORY} />
        <path d="M30 156 L 0 128 L 42 152 Z" fill={IVORY} />
        <path d="M122 162 Q 62 172 18 152 Q 48 205 122 212 Z" fill={color} />
      </g>
      <ellipse cx={205} cy={180} rx={105} ry={62} fill={color} />
      <ellipse cx={210} cy={212} rx={75} ry={22} fill="#fff" opacity={0.35} stroke="none" />
      <Leg x={136} y={222} w={46} h={78} angle={pose.leg * 20} color={color} />
      <Leg x={286} y={216} w={42} h={82} angle={-pose.leg * 20} color={color} />
      <g transform={rot(pose.head, 292, 192)}>
        <ellipse cx={310} cy={196} rx={36} ry={26} fill={color} />
        <g transform={rot(pose.jaw * 16, 330, 214)}>
          <ellipse cx={356} cy={216} rx={26} ry={9} fill={shade(color, 1.5)} />
        </g>
        <ellipse cx={350} cy={200} rx={38} ry={26} fill={color} />
        <Eye cx={358} cy={192} r={10} blink={pose.blink} />
        <Cheek cx={372} cy={208} r={7} />
        <path d="M366 214 Q 376 218 386 210" fill="none" opacity={1 - pose.jaw} strokeWidth={4} />
      </g>
    </DinoSvg>
  );
};
