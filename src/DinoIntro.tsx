import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { BGM_FILE } from "./audio";
import type { AudioAvailability, Episode, SceneTiming } from "./data/types";
import { DinoScene } from "./scenes/DinoScene";
import { Ending } from "./scenes/Ending";
import { Opening } from "./scenes/Opening";

export type DinoIntroProps = {
  episode: Episode;
  scenes: SceneTiming[];
  audio: AudioAvailability;
};

const BGM_VOLUME = 0.25;
const BGM_DUCKED = 0.09;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const DinoIntro: React.FC<DinoIntroProps> = ({ episode, scenes, audio }) => {
  const { durationInFrames } = useVideoConfig();
  const voiceRanges = scenes
    .filter((s) => s.hasVoice)
    .map((s) => [s.from + s.voiceStart, s.from + s.voiceStart + s.voiceFrames] as const);

  // ナレーション中はBGMを小さく。最後はフェードアウト
  const bgmVolume = (f: number) => {
    const duck = Math.max(0, ...voiceRanges.map(([a, b]) => interpolate(f, [a - 10, a, b, b + 15], [0, 1, 1, 0], clamp)));
    const fade = interpolate(f, [durationInFrames - 60, durationInFrames], [1, 0], clamp);
    return (BGM_VOLUME + (BGM_DUCKED - BGM_VOLUME) * duck) * fade;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#d9f3ff" }}>
      {scenes.map((timing) => {
        const dino = episode.dinos.find((d) => d.id === timing.key);
        return (
          <Sequence key={timing.key} from={timing.from} durationInFrames={timing.duration} name={timing.key}>
            {timing.key === "opening" ? (
              <Opening episode={episode} timing={timing} audio={audio} />
            ) : timing.key === "ending" ? (
              <Ending episode={episode} timing={timing} />
            ) : dino ? (
              <DinoScene dino={dino} timing={timing} audio={audio} />
            ) : null}
          </Sequence>
        );
      })}
      {audio.bgm ? <Audio src={staticFile(BGM_FILE)} loop volume={bgmVolume} /> : null}
    </AbsoluteFill>
  );
};
