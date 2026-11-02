import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export const GROUND_Y = 900;

/** シール絵本ふうの、こい紫のふちどり */
export const INK = "#3a3150";

const SKY = { day: "#8fd3f7", evening: "#ffcf9e" } as const;
export type BackgroundVariant = keyof typeof SKY;

const CLOUD = "M-110 30 Q -140 -10 -90 -25 Q -80 -75 -20 -65 Q 20 -105 70 -60 Q 130 -70 125 -15 Q 160 10 120 35 Z";
const STAR = "M0 -28 L 8 -8 L 28 -8 L 12 6 L 18 26 L 0 14 L -18 26 L -12 6 L -28 -8 L -8 -8 Z";

const Cloud: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <path d={CLOUD} transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" stroke={INK} strokeWidth={6 / s} strokeLinejoin="round" />
);

/** 顔のある太陽。光のつぶがゆっくり回る */
const Sun: React.FC<{ frame: number }> = ({ frame }) => (
  <g transform="translate(1680 190)" stroke={INK} strokeWidth={6} strokeLinejoin="round">
    <g transform={`rotate(${frame * 0.3})`}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect key={a} x={-15} y={-152} width={30} height={46} rx={15} fill="#ffb938" transform={`rotate(${a})`} />
      ))}
    </g>
    <circle r={92} fill="#ffd95a" />
    <circle cx={-30} cy={-12} r={9} fill={INK} stroke="none" />
    <circle cx={30} cy={-12} r={9} fill={INK} stroke="none" />
    <circle cx={-54} cy={20} r={13} fill="#ff8fa8" stroke="none" opacity={0.7} />
    <circle cx={54} cy={20} r={13} fill="#ff8fa8" stroke="none" opacity={0.7} />
    <path d="M-28 22 Q 0 46 28 22" fill="none" strokeLinecap="round" />
  </g>
);

const Palm: React.FC<{ x: number; s: number; sway: number }> = ({ x, s, sway }) => (
  <g transform={`translate(${x} ${GROUND_Y + 10}) scale(${s})`} stroke={INK} strokeWidth={6 / s} strokeLinejoin="round">
    <path d="M-14 0 Q -6 -150 10 -300 L 30 -300 Q 12 -150 14 0 Z" fill="#c48a52" />
    <g transform={`rotate(${sway} 20 -300)`} fill="#4fae5c">
      {[-160, -120, -60, -20, 30].map((a) => (
        <ellipse key={a} cx={20} cy={-300} rx={110} ry={26} transform={`rotate(${a} 20 -300) translate(90 0)`} />
      ))}
    </g>
  </g>
);

const Fern: React.FC<{ x: number; s: number }> = ({ x, s }) => (
  <g transform={`translate(${x} ${GROUND_Y + 30}) scale(${s})`} fill="#5cba66" stroke={INK} strokeWidth={6 / s} strokeLinejoin="round">
    {[-60, -30, 0, 30, 60].map((a) => (
      <ellipse key={a} cx={0} cy={-55} rx={20} ry={60} transform={`rotate(${a} 0 0)`} />
    ))}
  </g>
);

/** 背景のゆれ。背景の上に重ねるもの（3D の恐竜など）も同じだけ動かす */
export const backgroundTransform = (frame: number, shake: number) =>
  `translate(${shake * Math.sin(frame * 2.1) * 14}px, ${shake * Math.cos(frame * 2.7) * 10}px) scale(1.03)`;

/**
 * 空・太陽・雲・火山・丘・砂地。ふちどりのあるシール絵本ふう。
 * frameOffset にシーンの開始フレームを渡すと、シーンが変わっても雲が飛ばない。
 * variant="evening" は夕方（エンディング用）
 */
export const Background: React.FC<{ shake?: number; frameOffset?: number; variant?: BackgroundVariant }> = ({
  shake = 0,
  frameOffset = 0,
  variant = "day",
}) => {
  const frame = useCurrentFrame() + frameOffset;
  const drift = (speed: number, offset: number) => ((frame * speed + offset) % 2400) - 240;
  const smoke = (frame * 0.6) % 120;
  const evening = variant === "evening";
  return (
    <AbsoluteFill style={{ transform: backgroundTransform(frame, shake) }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%">
        <rect width={1920} height={1080} fill={SKY[variant]} />
        <rect y={560} width={1920} height={520} fill="#fff" opacity={evening ? 0.25 : 0.3} />
        {evening ? (
          <>
            <circle cx={1520} cy={700} r={130} fill="#ff9a5a" stroke={INK} strokeWidth={6} />
            {[
              [560, 120, 1],
              [1380, 90, 0.8],
              [1180, 420, 0.6],
              [300, 330, 0.7],
            ].map(([x, y, s], i) => (
              <path
                key={i}
                d={STAR}
                transform={`translate(${x} ${y}) scale(${s * (1 + 0.08 * Math.sin(frame * 0.12 + i * 2))})`}
                fill="#fff6c9"
                stroke={INK}
                strokeWidth={5 / s}
                strokeLinejoin="round"
              />
            ))}
          </>
        ) : (
          <Sun frame={frame} />
        )}
        <Cloud x={drift(0.6, 300)} y={170} s={1.0} />
        <Cloud x={drift(0.4, 1200)} y={290} s={0.75} />
        <Cloud x={drift(0.5, 1900)} y={130} s={0.85} />
        {/* 火山とけむり */}
        <g stroke={INK} strokeWidth={6} strokeLinejoin="round">
          <path d="M120 760 L 380 420 L 470 420 L 760 760 Z" fill="#b49bd0" />
          <path d="M380 420 L 470 420 L 455 470 Q 437 452 425 478 Q 412 452 395 470 Z" fill="#ff7b54" />
          {[0, 40, 80].map((o) => {
            const t = (smoke + o) % 120;
            return <circle key={o} cx={425 + Math.sin(t * 0.08) * 20} cy={400 - t * 2} r={22 + t * 0.35} fill="#f4f0f8" strokeWidth={5} opacity={0.95 - t / 140} />;
          })}
          {/* 丘と砂地（地面の高さは 3D の恐竜の足もとと合わせてある） */}
          <path d="M-10 800 Q 300 620 640 760 T 1300 720 T 1930 700 L 1930 1090 L -10 1090 Z" fill={evening ? "#8fc977" : "#9ad67f"} />
          <path d="M-10 860 Q 500 800 960 850 T 1930 830 L 1930 1090 L -10 1090 Z" fill={evening ? "#a9d37a" : "#b5e07c"} />
          <path d={`M-10 ${GROUND_Y + 4} Q 480 ${GROUND_Y - 14} 960 ${GROUND_Y + 4} T 1930 ${GROUND_Y + 4} L 1930 1090 L -10 1090 Z`} fill="#f0cd88" />
        </g>
        <g fill="#e0b46a">
          {[
            [300, 1010, 22, 9],
            [760, 1050, 16, 7],
            [1240, 1000, 20, 8],
            [1660, 1040, 24, 9],
          ].map(([cx, cy, rx, ry]) => (
            <ellipse key={cx} cx={cx} cy={cy} rx={rx} ry={ry} />
          ))}
        </g>
        <Palm x={1500} s={1} sway={Math.sin(frame * 0.05) * 3} />
        <Palm x={1760} s={0.75} sway={Math.sin(frame * 0.05 + 1) * 3} />
        <Fern x={180} s={1} />
        <Fern x={1350} s={0.8} />
      </svg>
    </AbsoluteFill>
  );
};
