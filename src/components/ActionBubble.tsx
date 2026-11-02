import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INK } from "./Background";
import { StickerText } from "./Sticker";

/**
 * アクションのふきだし（「ガオーッ！」など）。from から duration のあいだ、ポンと出る。
 * left/top はふきだしの左上。tail はしっぽ（三角）を出す下の角
 */
export const ActionBubble: React.FC<{
  text: string;
  left: number;
  top: number;
  tail: "left" | "right";
  from: number;
  duration: number;
  colors: string[];
}> = ({ text, left, top, tail, from, duration, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - from, fps, config: { damping: 8, stiffness: 170 } });
  const out = spring({ frame: frame - (from + duration - 10), fps, config: { damping: 200 } });
  const s = pop * (1 - out);
  if (s <= 0.001) return null;
  const tilt = tail === "left" ? 7 : -7;
  return (
    <div style={{ position: "absolute", left, top, transform: `rotate(${tilt}deg) scale(${s})`, transformOrigin: tail === "left" ? "0% 100%" : "100% 100%" }}>
      <div style={{ background: "#fff", border: `8px solid ${INK}`, borderRadius: 60, padding: "18px 64px 30px", boxShadow: `0 10px 0 ${INK}` }}>
        <StickerText text={text} size={96} colors={colors} letterSpacing={0} lineHeight={1} />
      </div>
      <svg
        width={90}
        height={70}
        viewBox="0 0 90 70"
        style={{ position: "absolute", bottom: -56, [tail]: 40, transform: tail === "right" ? "scaleX(-1)" : undefined }}
      >
        <path d="M10 4 L 80 4 L 6 66 Z" fill="#fff" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        <rect x={14} y={0} width={64} height={8} fill="#fff" />
      </svg>
    </div>
  );
};
