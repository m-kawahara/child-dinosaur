import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export const GROUND_Y = 900;

const Cloud: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity={0.95}>
    <ellipse cx={0} cy={0} rx={90} ry={45} />
    <ellipse cx={-70} cy={15} rx={60} ry={35} />
    <ellipse cx={75} cy={12} rx={65} ry={38} />
    <ellipse cx={10} cy={-30} rx={55} ry={40} />
  </g>
);

const Palm: React.FC<{ x: number; s: number; sway: number }> = ({ x, s, sway }) => (
  <g transform={`translate(${x} ${GROUND_Y + 10}) scale(${s})`} stroke="#6b4a2b" strokeWidth={6} strokeLinejoin="round">
    <path d="M-14 0 Q -6 -150 10 -300 L 30 -300 Q 12 -150 14 0 Z" fill="#b07a45" />
    <g transform={`rotate(${sway} 20 -300)`} fill="#3f9b52" stroke="#2d6e3a">
      {[-160, -120, -60, -20, 30].map((a) => (
        <ellipse key={a} cx={20} cy={-300} rx={110} ry={26} transform={`rotate(${a} 20 -300) translate(90 0)`} />
      ))}
    </g>
  </g>
);

const Fern: React.FC<{ x: number; s: number }> = ({ x, s }) => (
  <g transform={`translate(${x} ${GROUND_Y + 30}) scale(${s})`} fill="#4fae5c" stroke="#2d6e3a" strokeWidth={5}>
    {[-60, -30, 0, 30, 60].map((a) => (
      <ellipse key={a} cx={0} cy={-55} rx={20} ry={60} transform={`rotate(${a} 0 0)`} />
    ))}
  </g>
);

/** frameOffset にシーンの開始フレームを渡すと、シーンが変わっても雲が飛ばない */
export const Background: React.FC<{ shake?: number; frameOffset?: number }> = ({ shake = 0, frameOffset = 0 }) => {
  const frame = useCurrentFrame() + frameOffset;
  const sx = shake * Math.sin(frame * 2.1) * 14;
  const sy = shake * Math.cos(frame * 2.7) * 10;
  const drift = (speed: number, offset: number) => ((frame * speed + offset) % 2400) - 240;
  const smoke = (frame * 0.6) % 120;
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(1.03)` }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7ccbf5" />
            <stop offset="1" stopColor="#d9f3ff" />
          </linearGradient>
        </defs>
        <rect width={1920} height={1080} fill="url(#sky)" />
        <circle cx={1650} cy={170} r={95} fill="#ffd95a" stroke="#ffb938" strokeWidth={10} />
        <Cloud x={drift(0.6, 300)} y={170} s={1.1} />
        <Cloud x={drift(0.4, 1200)} y={280} s={0.8} />
        <Cloud x={drift(0.5, 1900)} y={140} s={0.9} />
        {/* 火山とけむり */}
        <path d="M120 760 L 380 420 L 470 420 L 760 760 Z" fill="#a98bc4" stroke="#7b5f97" strokeWidth={8} strokeLinejoin="round" />
        <path d="M380 420 L 470 420 L 455 470 Q 425 450 395 470 Z" fill="#ff7b54" />
        {[0, 40, 80].map((o) => {
          const t = (smoke + o) % 120;
          return <circle key={o} cx={425 + Math.sin(t * 0.08) * 20} cy={400 - t * 2} r={22 + t * 0.35} fill="#ece8f2" stroke="#c9c0d8" strokeWidth={4} opacity={0.9 - t / 140} />;
        })}
        <path d="M0 800 Q 300 620 640 760 T 1300 720 T 1920 700 L 1920 1080 L 0 1080 Z" fill="#8fd17a" stroke="#5fa34b" strokeWidth={8} />
        <path d="M0 860 Q 500 800 960 850 T 1920 830 L 1920 1080 L 0 1080 Z" fill="#b7e07a" />
        <rect y={GROUND_Y} width={1920} height={1080 - GROUND_Y} fill="#e8c784" />
        <path d={`M0 ${GROUND_Y} Q 480 ${GROUND_Y - 20} 960 ${GROUND_Y} T 1920 ${GROUND_Y} L 1920 ${GROUND_Y + 14} L 0 ${GROUND_Y + 14} Z`} fill="#c9a463" />
        <Palm x={1500} s={1} sway={Math.sin(frame * 0.05) * 3} />
        <Palm x={1760} s={0.75} sway={Math.sin(frame * 0.05 + 1) * 3} />
        <Fern x={180} s={1} />
        <Fern x={1350} s={0.8} />
      </svg>
    </AbsoluteFill>
  );
};
