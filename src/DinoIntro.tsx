import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { BGM_FILE } from "./audio";
import type { AudioAvailability, Episode, SceneTiming } from "./data/types";
import { BoutScene } from "./scenes/BoutScene";
import { DinoScene } from "./scenes/DinoScene";
import { Ending } from "./scenes/Ending";
import { Opening } from "./scenes/Opening";
import { Dino3DScene, has3D } from "./scenes/Dino3DScene";

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
  // 取組のシーンは、場面ごとにナレーションがある
  const voiceRanges = scenes
    .flatMap((s) => [s, ...(s.beats ?? []).map((b) => ({ ...b, from: s.from }))])
    .filter((v) => v.hasVoice)
    .map((v) => [v.from + v.voiceStart, v.from + v.voiceStart + v.voiceFrames] as const);

  // ナレーション中はBGMを小さく。最後はフェードアウト
  const bgmVolume = (f: number) => {
    const duck = Math.max(0, ...voiceRanges.map(([a, b]) => interpolate(f, [a - 10, a, b, b + 15], [0, 1, 1, 0], clamp)));
    const fade = interpolate(f, [durationInFrames - 60, durationInFrames], [1, 0], clamp);
    return (BGM_VOLUME + (BGM_DUCKED - BGM_VOLUME) * duck) * fade;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#d9f3ff" }}>
      {scenes.map((timing) => {
        const index = episode.dinos.findIndex((d) => d.id === timing.key);
        const dino = episode.dinos[index];
        const colors = episode.dinos.map((d) => d.color);
        return (
          <Sequence key={timing.key} from={timing.from} durationInFrames={timing.duration} name={timing.key}>
            {timing.key === "opening" ? (
              <Opening episode={episode} timing={timing} audio={audio} />
            ) : timing.key === "ending" ? (
              <Ending episode={episode} timing={timing} audio={audio} />
            ) : timing.key === "bout" ? (
              <BoutScene episode={episode} timing={timing} audio={audio} />
            ) : dino && has3D(dino.kind) ? (
              <Dino3DScene episodeId={episode.id} dino={dino} timing={timing} audio={audio} index={index} colors={colors} />
            ) : dino ? (
              <DinoScene episodeId={episode.id} dino={dino} timing={timing} audio={audio} index={index} colors={colors} />
            ) : null}
          </Sequence>
        );
      })}
      {audio.bgm ? <Audio src={staticFile(BGM_FILE)} loop volume={bgmVolume} /> : null}
    </AbsoluteFill>
  );
};
