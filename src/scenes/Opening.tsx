import React from "react";
import { Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { blinkAt, flapPose, walkPose } from "../animation/walk";
import { SE_FILES, voiceFile } from "../audio";
import { Background, GROUND_Y } from "../components/Background";
import { Dino } from "../components/Dino";
import { fontFamily } from "../components/font";
import type { AudioAvailability, Episode, SceneTiming } from "../data/types";

const TITLE_COLORS = ["#ff7b54", "#ffb938", "#5cc46b", "#4aa8e8", "#b58ad6", "#f08fb0"];

export const Title: React.FC<{ text: string; delay?: number; size?: number }> = ({ text, delay = 0, size = 130 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", fontFamily, fontSize: size }}>
      {[...text].map((ch, i) => {
        const s = spring({ frame: frame - delay - i * 3, fps, config: { damping: 8, stiffness: 160 } });
        const wobble = Math.sin((frame + i * 6) * 0.12) * 6 * s;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              color: TITLE_COLORS[i % TITLE_COLORS.length],
              WebkitTextStroke: `${size * 0.1}px #fff`,
              paintOrder: "stroke fill",
              textShadow: "0 10px 0 rgba(58,49,80,0.25)",
              transform: `translateY(${(1 - s) * -400 + wobble}px) scale(${s})`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const Opening: React.FC<{ episode: Episode; timing: SceneTiming; audio: AudioAvailability }> = ({
  episode,
  timing,
  audio,
}) => {
  const frame = useCurrentFrame();
  // 恐竜たちが シーンの間に 画面を横切るように
  const speed = (2400 + episode.dinos.length * 330) / timing.duration;
  return (
    <>
      <Background frameOffset={timing.from} />
      <div style={{ position: "absolute", top: 240, left: 0, right: 0 }}>
        <Title text={episode.title} delay={10} />
      </div>
      {episode.dinos.map((dino, i) => {
        const x = -250 - i * 330 + frame * speed;
        const flying = dino.kind === "pteranodon";
        const pose = flying ? flapPose(frame + i * 7) : walkPose(frame + i * 7);
        return (
          <Dino
            key={dino.id}
            dino={dino}
            pose={{ ...pose, blink: blinkAt(frame, i * 17) }}
            x={x}
            y={flying ? 640 + (pose.bob ?? 0) : GROUND_Y + 20}
            scale={0.45}
          />
        );
      })}
      {timing.hasVoice ? (
        <Sequence from={timing.voiceStart} layout="none">
          <Audio src={staticFile(voiceFile("opening"))} />
        </Sequence>
      ) : null}
      {audio.se[SE_FILES.title] ? (
        <Sequence from={10} durationInFrames={60} layout="none">
          <Audio src={staticFile(SE_FILES.title)} volume={0.6} />
        </Sequence>
      ) : null}
    </>
  );
};
