import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { blinkAt } from "../animation/walk";
import { SE_FILES, voiceFile } from "../audio";
import { Background, backgroundTransform } from "../components/Background";
import { Pill, StickerText } from "../components/Sticker";
import type { AudioAvailability, Episode, SceneTiming } from "../data/types";
import { type Dino3DItem, Dinos3D } from "../three/Dino3D";
import { modelOf } from "../three/models";
import { STAGE_CAMERA } from "./Dino3DScene";
import { lineup, walkInItems } from "./lineup";

/** "episode1" → 1 */
export const episodeNumber = (episode: Episode) => Number(episode.id.match(/\d+/)?.[0] ?? 1);

// 恐竜の列は、シーンの7割くらいで並び終わる。速すぎると足がせかせかするので、画面の左から入るくらいの距離にする
const PARADE_SPEED = 0.055;
const SLOW_DOWN = 45;

export const Opening: React.FC<{ episode: Episode; timing: SceneTiming; audio: AudioAvailability }> = ({ episode, timing, audio }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { slots, flyers } = lineup(episode.dinos);
  const arrive = Math.round(timing.duration * 0.72);
  const items: Dino3DItem[] = [
    // まばたきは1ぴきずつずらす
    ...walkInItems(slots, frame, arrive, PARADE_SPEED, SLOW_DOWN, (slot) => ({ blink: blinkAt(frame, 200 + Math.round(slot.x * 13)) })),
    // 空の恐竜は、タイトルの上の空を横切る（タイトルのうしろだと、白い体が文字のすき間から見えてしまう）
    ...flyers.map((d, i) => ({
      name: modelOf(d.kind),
      x: -11 + (22 * frame) / timing.duration - i * 3,
      y: 7.55 + 0.12 * Math.sin(frame * 0.07) - i * 0.6,
      scale: 0.5,
      pose: { flap: frame / 18, idle: frame, blink: blinkAt(frame, 40 + i * 31) },
    })),
  ];
  const titleChars = episode.title.replace(/\s/g, "").length;
  return (
    <>
      <Background frameOffset={timing.from} />
      <AbsoluteFill style={{ transform: backgroundTransform(frame + timing.from, 0) }}>
        <Dinos3D items={items} width={width} height={height} camera={STAGE_CAMERA} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 60, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <Pill size={46} delay={2} rotate={-3}>
          だい {episodeNumber(episode)} わ
        </Pill>
        <StickerText text={episode.title} size={168} delay={10} />
        {episode.opening.subtitle ? (
          <Pill size={42} delay={10 + titleChars * 3 + 12} style={{ marginTop: 10 }}>
            {episode.opening.subtitle}
          </Pill>
        ) : null}
      </div>
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
