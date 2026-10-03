import React from "react";
import { Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { blinkAt, flapPose, idlePose } from "../animation/walk";
import { voiceFile } from "../audio";
import { Background, GROUND_Y } from "../components/Background";
import { Dino } from "../components/Dino";
import type { Episode, SceneTiming } from "../data/types";
import { Title } from "./Opening";

export const Ending: React.FC<{ episode: Episode; timing: SceneTiming }> = ({ episode, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = episode.dinos.length;
  return (
    <>
      <Background frameOffset={timing.from} />
      <div style={{ position: "absolute", top: 200, left: 0, right: 0 }}>
        <Title text="またね！" delay={5} size={200} />
      </div>
      {episode.dinos.map((dino, i) => {
        const enter = spring({ frame: frame - i * 6, fps, config: { damping: 12 } });
        const hop = Math.max(0, Math.sin((frame - i * 8) * 0.18)) * 40;
        const flying = dino.kind === "pteranodon";
        const pose = flying ? flapPose(frame) : { ...idlePose(frame + i * 9), jaw: hop > 20 ? 0.4 : 0 };
        const x = 260 + (i * 1400) / Math.max(1, n - 1);
        return (
          <Dino
            key={dino.id}
            dino={dino}
            pose={{ ...pose, blink: blinkAt(frame, i * 23) }}
            x={x}
            y={(flying ? 560 + (pose.bob ?? 0) : GROUND_Y + 25 - hop) + (1 - enter) * 700}
            scale={0.5}
          />
        );
      })}
      {timing.hasVoice ? (
        <Sequence from={timing.voiceStart} layout="none">
          <Audio src={staticFile(voiceFile("ending"))} />
        </Sequence>
      ) : null}
    </>
  );
};
