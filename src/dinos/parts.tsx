import React from "react";

/** 色を暗く（f<1）または明るく（f>1）する */
export const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

export const rotatePoint = (x: number, y: number, cx: number, cy: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return `${cx + dx * Math.cos(a) - dy * Math.sin(a)},${cy + dx * Math.sin(a) + dy * Math.cos(a)}`;
};

export const rot = (deg: number, cx: number, cy: number) => `rotate(${deg} ${cx} ${cy})`;

export const DinoSvg: React.FC<{
  width: number;
  viewBox: [number, number, number, number];
  outline: string;
  bob: number;
  children: React.ReactNode;
}> = ({ width, viewBox, outline, bob, children }) => (
  <svg width={width} height={(width * viewBox[3]) / viewBox[2]} viewBox={viewBox.join(" ")} style={{ overflow: "visible" }}>
    <g transform={`translate(0 ${bob})`} stroke={outline} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round">
      {children}
    </g>
  </svg>
);

export const Eye: React.FC<{ cx: number; cy: number; r: number; blink: number }> = ({ cx, cy, r, blink }) => {
  const open = 1 - blink * 0.92;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * open} fill="#fff" strokeWidth={3} />
      <ellipse cx={cx + r * 0.2} cy={cy} rx={r * 0.62} ry={r * 0.62 * open} fill="#2b2b3a" stroke="none" />
      {open > 0.4 ? <circle cx={cx + r * 0.42} cy={cy - r * 0.25} r={r * 0.24} fill="#fff" stroke="none" /> : null}
    </g>
  );
};

export const Cheek: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.7} fill="#ff8fa3" opacity={0.65} stroke="none" />
);

/** 腰（x, y）を軸に回る、まるい脚 */
export const Leg: React.FC<{ x: number; y: number; w: number; h: number; angle: number; color: string }> = ({
  x,
  y,
  w,
  h,
  angle,
  color,
}) => (
  <g transform={rot(angle, x, y)}>
    <rect x={x - w / 2} y={y - w / 2} width={w} height={h} rx={w / 2} fill={color} />
    <ellipse cx={x + w * 0.22} cy={y + h - w / 2} rx={w * 0.68} ry={w * 0.36} fill={color} />
    {[-0.2, 0.22, 0.62].map((o) => (
      <circle key={o} cx={x + w * o} cy={y + h - w / 2 + w * 0.12} r={w * 0.1} fill="#fff8e7" strokeWidth={2} />
    ))}
  </g>
);

export const Spots: React.FC<{ spots: [number, number, number][]; color: string }> = ({ spots, color }) => (
  <g fill={color} stroke="none" opacity={0.55}>
    {spots.map(([x, y, r]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
    ))}
  </g>
);
