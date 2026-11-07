import React, { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BOUT, beatAt, boutAt, stepsAlong } from "../animation/bout";
import { cryAt } from "../animation/cry";
import { blinkAt } from "../animation/walk";
import { ACTION_SE, CRY_VOLUME, cryFile, SE_FILES, voiceFile } from "../audio";
import { Background, backgroundTransform } from "../components/Background";
import { Dohyo } from "../components/Dohyo";
import { StickerText } from "../components/Sticker";
import { BOUT_CRY_DELAY, beatCrier, boutVoiceKey } from "../data/timeline";
import type { AudioAvailability, BeatTiming, BoutBeat, Episode, SceneTiming } from "../data/types";
import { Dinos3D } from "../three/Dino3D";
import { MODEL_INFO, modelOf } from "../three/models";
import { pulledBack } from "./Dino3DScene";

/** 土俵ぜんたいと、押し出されたティラノのしっぽまで入るように引いたカメラ */
const CAMERA = pulledBack(1.45);
/** トリケラトプスを少し大きくして、ティラノサウルスと釣り合わせる */
const WEST_SCALE = 1.15;
/** 歩きの1周期のフレーム数（Dino3DScene と同じ） */
const CYCLE = { east: 24, west: 20 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 大きな文字を出すフレーム（場面の頭から）。"voiceEnd" はナレーションの終わりぎわ（はっけよーい） */
const CAPTION_AT: Record<BoutBeat, number | "voiceEnd"> = {
  face: "voiceEnd",
  charge: BOUT.rush,
  roar: 0,
  comeback: 15,
  finish: BOUT.plop,
  winner: 8,
  friends: 140,
};
const captionFrom = (b: BeatTiming) => {
  const at = CAPTION_AT[b.beat];
  return at === "voiceEnd" ? Math.min(b.from + b.duration - 40, b.voiceStart + b.voiceFrames - 30) : b.from + at;
};

/** 押し合いのときに鳴らす音（場面の頭からのフレーム） */
const THUMPS: Partial<Record<BoutBeat, number>> = { charge: BOUT.rush, comeback: 5, finish: BOUT.plop };

/** おすもうの取組。2ひきを1つのキャンバスで向き合わせて、場面ごとにナレーションする */
export const BoutScene: React.FC<{ episode: Episode; timing: SceneTiming; audio: AudioAvailability }> = ({ episode, timing, audio }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const bout = episode.bout!;
  const beats = timing.beats ?? [];
  const east = episode.dinos.find((d) => d.id === bout.east)!;
  const west = episode.dinos.find((d) => d.id === bout.west)!;
  const eastModel = modelOf(east.kind);
  const westModel = modelOf(west.kind);

  // 位置の動きを先に全部出して、そこから歩きを計算する
  const steps = useMemo(() => {
    const track = Array.from({ length: timing.duration }, (_, f) => boutAt(beats, f));
    return {
      east: stepsAlong(track.map((n) => n.east.x), 1, MODEL_INFO[eastModel].strideWorld, CYCLE.east),
      west: stepsAlong(track.map((n) => n.west.x), -1, MODEL_INFO[westModel].strideWorld * WEST_SCALE, CYCLE.west),
    };
  }, [beats, timing.duration, eastModel, westModel]);

  const now = boutAt(beats, frame);
  const beat = beatAt(beats, frame);
  const t = frame - beat.from;

  // なき声：ほえる場面は east、勝った場面は west。口は声に合わせて開く
  const crier = beatCrier(episode, beat.beat);
  const cry = crier ? audio.cries[crier] : undefined;
  const mouth = cry ? cryAt(cry, (t - BOUT_CRY_DELAY) / fps).mouth : beat.beat === "roar" || beat.beat === "winner" ? interpolate(t, [10, 25, 50, 65], [0, 1, 1, 0], clamp) : 0;
  const eastJaw = beat.beat === "roar" ? mouth : beat.beat === "finish" ? interpolate(t, [24, 34, 60, 75], [0, 0.4, 0.4, 0], clamp) : 0;
  const westJaw = beat.beat === "winner" ? mouth : 0;

  const e = steps.east[frame] ?? steps.east[steps.east.length - 1];
  const w = steps.west[frame] ?? steps.west[steps.west.length - 1];
  const items = [
    {
      name: eastModel,
      x: now.east.x,
      z: -0.25,
      pose: { ...e, idle: frame, blink: blinkAt(frame, timing.from), lean: now.east.lean, sit: now.east.sit, jaw: eastJaw, raise: eastJaw * 0.6 },
    },
    {
      name: westModel,
      x: now.west.x,
      z: 0.25,
      turn: Math.PI,
      scale: WEST_SCALE,
      pose: { ...w, idle: frame + 40, blink: blinkAt(frame, timing.from + 37), lean: now.west.lean, butt: now.west.butt, jaw: westJaw },
    },
  ];

  const thump = ACTION_SE.headbutt;
  return (
    <>
      <Background shake={now.shake} frameOffset={timing.from} />
      <AbsoluteFill style={{ transform: backgroundTransform(frame + timing.from, now.shake) }}>
        <Dohyo camera={CAMERA} width={width} height={height} radius={BOUT.ringRadius} />
        <Dinos3D items={items} width={width} height={height} camera={CAMERA} />
      </AbsoluteFill>

      {beats.map((b) => {
        const text = bout.captions?.[b.beat];
        if (!text) return null;
        const from = captionFrom(b);
        const until = b.from + b.duration;
        return (
          <Sequence key={b.beat} from={from} durationInFrames={Math.max(1, until - from)} layout="none">
            <div style={{ position: "absolute", top: 70, left: 0, right: 0 }}>
              <StickerText text={text} size={b.beat === "winner" ? 130 : 170} delay={0} colors={[west.color, "#ffb938", "#ff7b54", east.color]} />
            </div>
            {audio.se[SE_FILES.pop] ? <Audio src={staticFile(SE_FILES.pop)} volume={0.6} /> : null}
          </Sequence>
        );
      })}

      {beats.map((b) =>
        b.hasVoice ? (
          <Sequence key={b.beat} from={b.voiceStart} layout="none">
            <Audio src={staticFile(voiceFile(episode.id, boutVoiceKey(b.beat)))} />
          </Sequence>
        ) : null,
      )}
      {beats.map((b) => {
        const kind = beatCrier(episode, b.beat);
        return kind && audio.cries[kind] ? (
          <Sequence key={b.beat} from={b.from + BOUT_CRY_DELAY} layout="none">
            <Audio src={staticFile(cryFile(kind))} volume={CRY_VOLUME} />
          </Sequence>
        ) : null;
      })}
      {thump && audio.se[thump]
        ? beats.map((b) =>
            THUMPS[b.beat] !== undefined ? (
              <Sequence key={b.beat} from={b.from + THUMPS[b.beat]!} durationInFrames={60} layout="none">
                <Audio src={staticFile(thump)} volume={0.7} />
              </Sequence>
            ) : null,
          )
        : null}
    </>
  );
};
