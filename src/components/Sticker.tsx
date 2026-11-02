import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INK } from "./Background";
import { fontFamily } from "./font";

export const TITLE_COLORS = ["#ff7b54", "#ffb938", "#5cc46b", "#4aa8e8", "#b58ad6", "#f08fb0"];

/**
 * シールのような文字。1文字ずつ色を変えて少し傾け、こい紫でふちどる。
 * text は空白で行を分ける。delay を渡すと1文字ずつ上から落ちてきて弾む（undefined なら止まったまま）
 */
export const StickerText: React.FC<{
  text: string;
  size: number;
  delay?: number;
  colors?: string[];
  lineHeight?: number;
  letterSpacing?: number;
}> = ({ text, size, delay, colors = TITLE_COLORS, lineHeight = 1.12, letterSpacing = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let n = 0;
  return (
    <div style={{ fontFamily, fontSize: size, lineHeight, letterSpacing, textAlign: "center", fontWeight: 800 }}>
      {text.split(/\s+/).map((line, l) => (
        <div key={l} style={{ whiteSpace: "nowrap" }}>
          {[...line].map((ch) => {
            const i = n++;
            const s = delay === undefined ? 1 : spring({ frame: frame - delay - i * 3, fps, config: { damping: 8, stiffness: 160 } });
            const wobble = delay === undefined ? 0 : Math.sin((frame + i * 6) * 0.12) * 6 * s;
            const tilt = i % 2 ? 5 : -5;
            const lift = i % 3 === 1 ? size * 0.06 : 0;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  color: colors[i % colors.length],
                  WebkitTextStroke: `${size * 0.13}px ${INK}`,
                  paintOrder: "stroke fill",
                  textShadow: `0 ${size * 0.1}px 0 ${INK}`,
                  transform: `translateY(${(1 - s) * -400 + wobble + lift}px) rotate(${tilt}deg) scale(${s})`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** ふちどりのある丸いラベル。delay を渡すとポンと出てくる */
export const Pill: React.FC<{
  children: React.ReactNode;
  size: number;
  delay?: number;
  rotate?: number;
  background?: string;
  color?: string;
  border?: number;
  style?: React.CSSProperties;
}> = ({ children, size, delay, rotate = 0, background = "#fff", color = INK, border, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = delay === undefined ? 1 : spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 150 } });
  if (s <= 0.001) return null;
  const b = border ?? Math.max(4, size * 0.13);
  return (
    <div
      style={{
        display: "inline-block",
        fontFamily,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.2,
        color,
        background,
        border: `${b}px solid ${INK}`,
        borderRadius: 999,
        padding: `${size * 0.12}px ${size * 0.8}px ${size * 0.2}px`,
        boxShadow: `0 ${b * 1.2}px 0 ${INK}`,
        whiteSpace: "nowrap",
        transform: `rotate(${rotate}deg) scale(${s})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
