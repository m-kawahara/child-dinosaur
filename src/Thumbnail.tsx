import React from "react";
import { AbsoluteFill } from "remotion";
import { Background, GROUND_Y } from "./components/Background";
import { Dino } from "./components/Dino";
import type { Episode } from "./data/types";
import { Title } from "./scenes/Opening";

/** 1920x1080 で組んで 1280x720 に縮める */
export const Thumbnail: React.FC<{ episode: Episode }> = ({ episode }) => {
  const [trex, ...others] = episode.dinos;
  return (
    <AbsoluteFill style={{ width: 1920, height: 1080, transform: "scale(0.6667)", transformOrigin: "top left" }}>
      <Background frameOffset={200} />
      {others.slice(0, 3).map((d, i) => (
        <Dino key={d.id} dino={d} pose={{ head: -6 }} x={1250 + i * 230} y={GROUND_Y + 20 - (i % 2) * 40} scale={0.38} />
      ))}
      <Dino dino={trex} pose={{ jaw: 1, head: -14 }} x={600} y={GROUND_Y + 60} scale={1.1} />
      <div style={{ position: "absolute", top: 60, left: 40, right: 40 }}>
        <Title text={episode.title} delay={-100} size={124} />
      </div>
    </AbsoluteFill>
  );
};
