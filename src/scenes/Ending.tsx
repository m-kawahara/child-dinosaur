import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { actionAt } from "../animation/actions";
import { cryAt } from "../animation/cry";
import { blinkAt } from "../animation/walk";
import { CRY_VOLUME, cryFile, voiceFile } from "../audio";
import { Background, backgroundTransform } from "../components/Background";
import { Pill, StickerText } from "../components/Sticker";
import { ACTION_FRAMES, ENDING_ACTION_GAP, endingFirstAction } from "../data/timeline";
import type { AudioAvailability, DinoEntry, Episode, SceneTiming } from "../data/types";
import { type Dino3DItem, Dinos3D } from "../three/Dino3D";
import { modelOf } from "../three/models";
import { actionPose3D, STAGE_CAMERA } from "./Dino3DScene";
import { lineup } from "./lineup";

// 並んだ恐竜が、左から順番に自分のアクションをして「またね」。
// なき声があるときは、ナレーションが終わってから、1ぴきずつ鳴く（最後は空のプテラノドン）
export const Ending: React.FC<{ episode: Episode; timing: SceneTiming; audio: AudioAvailability }> = ({ episode, timing, audio }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { slots, flyers } = lineup(episode.dinos);
  const withCries = episode.dinos.some((d) => audio.cries[d.kind]);
  const first = endingFirstAction(timing, withCries);
  // 鳴く順番（歩く恐竜が左から、そのあと空の恐竜）
  const order = [...slots.map((s) => s.entry), ...flyers];
  const startOf = (d: DinoEntry) => first + order.indexOf(d) * ENDING_ACTION_GAP;
  const mouthOf = (d: DinoEntry) => {
    const cry = audio.cries[d.kind];
    return cry ? cryAt(cry, (frame - startOf(d)) / fps) : undefined;
  };

  const items: Dino3DItem[] = [
    ...slots.map((slot, i) => {
      const t = frame - startOf(slot.entry);
      const act = actionAt(slot.entry.action, t);
      return {
        name: modelOf(slot.entry.kind),
        x: slot.x,
        scale: slot.scale,
        pose: {
          idle: frame + i * 40,
          blink: blinkAt(frame, i * 31),
          ...(t >= 0 && t <= ACTION_FRAMES[slot.entry.action] ? actionPose3D(slot.entry.kind, act, t, mouthOf(slot.entry)) : {}),
        },
      };
    }),
    // 空の恐竜は、ゆっくり大きな円をえがいて飛ぶ
    ...flyers.map((d, i) => {
      const a = (frame / timing.duration) * Math.PI * 1.4 - 0.4 + i;
      return {
        name: modelOf(d.kind),
        x: 3.2 + 3.4 * Math.sin(a),
        y: 4.6 + 0.6 * Math.cos(a * 2),
        scale: 0.55,
        pose: { flap: frame / 18, idle: frame, blink: blinkAt(frame, 50 + i * 31), bank: 0.25 * Math.cos(a), jaw: mouthOf(d)?.mouth ?? 0 },
      };
    }),
  ];
  return (
    <>
      <Background frameOffset={timing.from} variant="evening" />
      <AbsoluteFill style={{ transform: backgroundTransform(frame + timing.from, 0) }}>
        <Dinos3D items={items} width={width} height={height} camera={STAGE_CAMERA} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 90, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <StickerText text={episode.ending.title ?? "またね！"} size={250} delay={5} letterSpacing={10} />
        {episode.ending.subtitle ? (
          <Pill size={52} delay={30}>
            {episode.ending.subtitle}
          </Pill>
        ) : null}
      </div>
      <div style={{ position: "absolute", right: 32, bottom: 24 }}>
        <Pill size={24} border={3} style={{ background: "rgba(255,255,255,0.9)" }}>
          {episode.voice.credit}
        </Pill>
      </div>
      {timing.hasVoice ? (
        <Sequence from={timing.voiceStart} layout="none">
          <Audio src={staticFile(voiceFile("ending"))} />
        </Sequence>
      ) : null}
      {order.map((d) =>
        audio.cries[d.kind] ? (
          <Sequence key={d.id} from={startOf(d)} layout="none">
            <Audio src={staticFile(cryFile(d.kind))} volume={CRY_VOLUME} />
          </Sequence>
        ) : null,
      )}
    </>
  );
};
