import React from "react";
import { AbsoluteFill } from "remotion";
import type { CameraSpec } from "../three/Dino3D";
import { INK } from "./Background";

/** 地面（y=0）の点を、水平に見るカメラで画面に写す */
const projector = (camera: CameraSpec, width: number, height: number) => {
  const f = height / 2 / Math.tan(((camera.fov / 2) * Math.PI) / 180);
  const [cx, cy, cz] = camera.position;
  return (x: number, z: number) => {
    const d = cz - z;
    return [width / 2 + ((x - cx) * f) / d, height / 2 + (cy * f) / d] as const;
  };
};

/** 奥行きはつぶして、2D の丘にかからないようにする */
const DEPTH = 0.45;

/**
 * シールふうの土俵。3D の恐竜と同じカメラで地面に写すので、恐竜の足もとにぴったり合う。
 * radius は俵の内側の半径（ワールド単位）
 */
export const Dohyo: React.FC<{ camera: CameraSpec; width: number; height: number; radius: number }> = ({ camera, width, height, radius }) => {
  const at = projector(camera, width, height);
  const ring = (r: number, n = 72) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return at(r * Math.cos(a), r * DEPTH * Math.sin(a)).join(",");
    }).join(" ");
  const line = (x: number) => {
    const [x1, y1] = at(x, -0.7);
    const [x2, y2] = at(x, 0.7);
    return { x1, y1, x2, y2 };
  };
  const mound = radius + 1.3;
  const [, front] = at(0, mound * DEPTH);
  const [left] = at(-mound, 0);
  const [right] = at(mound, 0);
  const [, mid] = at(0, 0);
  const side = 26;
  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
          {/* 土をもった台の側面（手前だけ見える） */}
          <path
            d={`M${left} ${mid} L${left} ${mid + side} Q ${width / 2} ${front + side * 2.1} ${right} ${mid + side} L${right} ${mid} Z`}
            fill="#d99c5f"
          />
          <polygon points={ring(mound)} fill="#eab877" />
          <polygon points={ring(radius + 0.35)} fill="#f8e2b0" stroke="none" />
        </g>
        {/* 俵：ふちどりの上に、わらの色 */}
        <polygon points={ring(radius + 0.2)} fill="none" stroke={INK} strokeWidth={22} strokeLinejoin="round" />
        <polygon points={ring(radius + 0.2)} fill="none" stroke="#f3d46e" strokeWidth={11} strokeLinejoin="round" />
        {/* しきり線 */}
        {[-0.9, 0.9].map((x) => (
          <g key={x} strokeLinecap="round">
            <line {...line(x)} stroke={INK} strokeWidth={15} />
            <line {...line(x)} stroke="#fff" strokeWidth={7} />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
