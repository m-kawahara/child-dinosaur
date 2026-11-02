import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INK } from "./Background";
import { fontFamily } from "./font";

/** ものさし（大きさのひとこと用）と、きらきら（それ以外） */
const FactIcon: React.FC<{ kind: "ruler" | "star" }> = ({ kind }) => (
  <svg width={48} height={48} viewBox="0 0 48 48" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
    {kind === "ruler" ? (
      <>
        <rect x={4} y={16} width={40} height={16} rx={4} />
        <path d="M12 16v7M20 16v5M28 16v7M36 16v5" />
      </>
    ) : (
      <path d="M24 5 L 29 19 L 43 24 L 29 29 L 24 43 L 19 29 L 5 24 L 19 19 Z" />
    )}
  </svg>
);

/** from〜until の間だけ、ポンと出てきてすっと消える */
const usePop = (from: number, until: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - from, fps, config: { damping: 9, stiffness: 140 } });
  const out = spring({ frame: frame - until, fps, config: { damping: 200 } });
  return pop * (1 - out);
};

/** 名前テロップ。番号のまる（恐竜の色）、名前、ひとこと */
export const Telop: React.FC<{
  name: string;
  fact: string;
  color: string;
  accent: string;
  number: number;
  from: number;
  until: number;
}> = ({ name, fact, color, accent, number, from, until }) => {
  const scale = usePop(from, until);
  if (scale <= 0.001) return null;
  return (
    <div style={{ position: "absolute", top: 70, left: 0, right: 0, display: "flex", justifyContent: "center", fontFamily, fontWeight: 800, color: INK }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 36,
          background: "#fff",
          border: `8px solid ${INK}`,
          borderRadius: 56,
          padding: "26px 60px 30px 30px",
          boxShadow: `0 14px 0 ${INK}`,
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            flexShrink: 0,
            borderRadius: "50%",
            background: color,
            border: `7px solid ${INK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 88,
            color: "#fff",
            WebkitTextStroke: `12px ${INK}`,
            paintOrder: "stroke fill",
          }}
        >
          {number}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 106, lineHeight: 1.05, letterSpacing: 4 }}>{name}</div>
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: accent,
              border: `5px solid ${INK}`,
              borderRadius: 999,
              padding: "6px 28px 8px 18px",
              fontSize: 42,
            }}
          >
            <FactIcon kind={fact.startsWith("おおきさ") ? "ruler" : "star"} />
            {fact}
          </div>
        </div>
      </div>
    </div>
  );
};

/** 右上の「いま何ひき目か」。恐竜の色のまるを並べ、いまの恐竜を大きく */
export const SceneProgress: React.FC<{ colors: string[]; current: number; from: number; until: number }> = ({ colors, current, from, until }) => {
  const scale = usePop(from + 6, until);
  if (scale <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        right: 56,
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "#fff",
        border: `6px solid ${INK}`,
        borderRadius: 999,
        padding: "10px 26px",
        boxShadow: `0 8px 0 ${INK}`,
        fontFamily,
        fontWeight: 800,
        fontSize: 38,
        color: INK,
        transform: `scale(${scale})`,
        transformOrigin: "right center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {colors.map((c, i) => {
          const now = i === current;
          return (
            <div
              key={i}
              style={{
                width: now ? 38 : 24,
                height: now ? 38 : 24,
                borderRadius: "50%",
                background: c,
                border: `${now ? 5 : 4}px solid ${INK}`,
                opacity: now || i < current ? 1 : 0.45,
              }}
            />
          );
        })}
      </div>
      {current + 1} / {colors.length}
    </div>
  );
};
