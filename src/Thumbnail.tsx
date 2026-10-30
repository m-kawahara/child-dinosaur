import React from "react";
import { AbsoluteFill } from "remotion";
import { Background, GROUND_Y } from "./components/Background";
import { Dino } from "./components/Dino";
import { fontFamily } from "./components/font";
import type { DinoEntry, Episode } from "./data/types";
import { TITLE_COLORS } from "./scenes/Opening";

const OUTLINE = "#3a3150";

/** 小さな画面でも読めるように、こい色のふちどりで タイトルを 2行にする */
const ThumbTitle: React.FC<{ text: string; size: number }> = ({ text, size }) => {
  let n = 0;
  return (
    <div style={{ fontFamily, fontSize: size, lineHeight: 1.12, textAlign: "center" }}>
      {text.split(/\s+/).map((line, l) => (
        <div key={l}>
          {[...line].map((ch) => {
            const i = n++;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  color: TITLE_COLORS[i % TITLE_COLORS.length],
                  WebkitTextStroke: `${size * 0.14}px ${OUTLINE}`,
                  paintOrder: "stroke fill",
                  textShadow: `0 ${size * 0.08}px 0 ${OUTLINE}`,
                  transform: `rotate(${i % 2 ? 5 : -5}deg) translateY(${i % 2 ? 8 : -8}px)`,
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

/** 1920x1080 で組んで 1280x720 に縮める */
export const Thumbnail: React.FC<{ episode: Episode }> = ({ episode }) => {
  const star = episode.dinos[0];
  const rest = episode.dinos.slice(1);
  const walkers = rest.filter((d) => d.kind !== "pteranodon").slice(0, 3);
  const flyer: DinoEntry | undefined = rest.find((d) => d.kind === "pteranodon");
  return (
    <AbsoluteFill style={{ width: 1920, height: 1080, transform: "scale(0.6667)", transformOrigin: "top left" }}>
      <Background frameOffset={200} />
      {flyer ? <Dino dino={flyer} pose={{ wing: 20, jaw: 0.6 }} x={1180} y={640} scale={0.62} /> : null}
      {walkers.map((d, i) => (
        <Dino
          key={d.id}
          dino={d}
          pose={{ head: -8, jaw: 0.6 }}
          x={1120 + i * 285}
          y={GROUND_Y + 110 - (i % 2) * 50}
          scale={0.55}
        />
      ))}
      <Dino dino={star} pose={{ jaw: 1, head: -14 }} x={520} y={GROUND_Y + 170} scale={1.25} />
      <div style={{ position: "absolute", top: 20, left: 0, right: 0 }}>
        <ThumbTitle text={episode.title} size={180} />
      </div>
    </AbsoluteFill>
  );
};
