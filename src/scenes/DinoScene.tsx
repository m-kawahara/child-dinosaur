import React from "react";
import { Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ACTION_FRAMES, actionAt } from "../animation/actions";
import { blinkAt, flapPose, idlePose, walkPose } from "../animation/walk";
import { SE_FILES, voiceFile } from "../audio";
import { Background, GROUND_Y } from "../components/Background";
import { Dino } from "../components/Dino";
import { Telop } from "../components/Telop";
import { ACTION_DELAY, ENTER_FRAMES, EXIT_FRAMES } from "../data/timeline";
import type { AudioAvailability, DinoEntry, SceneTiming } from "../data/types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const DinoScene: React.FC<{ dino: DinoEntry; timing: SceneTiming; audio: AudioAvailability }> = ({
  dino,
  timing,
  audio,
}) => {
  const frame = useCurrentFrame();
  const { duration } = timing;
  const exitStart = duration - EXIT_FRAMES;
  const flying = dino.kind === "pteranodon";

  // アクションは1回目＋（時間があれば）出ていく前にもう1回
  const actionLen = ACTION_FRAMES[dino.action];
  const actionStarts = [ENTER_FRAMES + ACTION_DELAY];
  const second = exitStart - actionLen - 15;
  if (second - actionStarts[0] > actionLen + 30) actionStarts.push(second);
  const current = actionStarts.findLast((s) => frame >= s) ?? actionStarts[0];
  const act = actionAt(dino.action, frame - current);

  const x =
    frame < exitStart
      ? interpolate(frame, [0, ENTER_FRAMES], [-450, 960], { ...clamp, easing: Easing.out(Easing.quad) })
      : interpolate(frame, [exitStart, duration], [960, 2400], { ...clamp, easing: Easing.in(Easing.quad) });
  const walking = frame < ENTER_FRAMES || frame >= exitStart;
  const base = flying ? flapPose(frame) : walking ? walkPose(frame) : idlePose(frame);
  const y = flying ? 780 : GROUND_Y + 30;

  return (
    <>
      <Background shake={act.shake} frameOffset={timing.from} />
      <Dino
        dino={dino}
        pose={{ ...base, ...act.pose, blink: blinkAt(frame, timing.from) }}
        x={x + act.dx}
        y={y + act.dy + (flying ? (base.bob ?? 0) : 0)}
      />
      <Telop name={dino.name} fact={dino.fact} color={dino.color} from={ENTER_FRAMES - 10} until={exitStart} />
      {timing.hasVoice ? (
        <Sequence from={timing.voiceStart} layout="none">
          <Audio src={staticFile(voiceFile(dino.id))} />
        </Sequence>
      ) : null}
      {audio.se[SE_FILES.pop] ? (
        <Sequence from={ENTER_FRAMES - 10} durationInFrames={45} layout="none">
          <Audio src={staticFile(SE_FILES.pop)} volume={0.6} />
        </Sequence>
      ) : null}
      {audio.se[SE_FILES[dino.action]]
        ? actionStarts.map((s) => (
            <Sequence key={s} from={s} durationInFrames={actionLen} layout="none">
              <Audio src={staticFile(SE_FILES[dino.action])} volume={0.7} />
            </Sequence>
          ))
        : null}
    </>
  );
};
