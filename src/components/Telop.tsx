import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "./font";

/** 名前テロップ。from〜until の間だけ、ポンと出てくる */
export const Telop: React.FC<{ name: string; fact: string; color: string; from: number; until: number }> = ({
  name,
  fact,
  color,
  from,
  until,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - from, fps, config: { damping: 9, stiffness: 140 } });
  const out = spring({ frame: frame - until, fps, config: { damping: 200 } });
  const scale = pop * (1 - out);
  if (scale <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 70,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        transform: `scale(${scale})`,
        fontFamily,
      }}
    >
      <div
        style={{
          background: "#fff",
          border: `10px solid ${color}`,
          borderRadius: 60,
          padding: "18px 64px 22px",
          textAlign: "center",
          boxShadow: "0 12px 0 rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ fontSize: 110, color: "#3a3150", lineHeight: 1.1, letterSpacing: 4 }}>{name}</div>
        <div style={{ fontSize: 46, color: "#7a6c8f", marginTop: 6 }}>{fact}</div>
      </div>
    </div>
  );
};
