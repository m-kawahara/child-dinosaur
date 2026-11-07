import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { type ActionResult, actionAt } from "../animation/actions";
import { type CryNow, cryAt } from "../animation/cry";
import { blinkAt } from "../animation/walk";
import { ACTION_SE, CRY_VOLUME, cryFile, SE_FILES, voiceFile } from "../audio";
import { Background, backgroundTransform } from "../components/Background";
import { ActionBubble } from "../components/ActionBubble";
import { SceneProgress, Telop } from "../components/Telop";
import { ACTION_DELAY, ACTION_FRAMES, stageFrames } from "../data/timeline";
import type { AudioAvailability, DinoEntry, DinoKind, SceneTiming } from "../data/types";
import { BRACHIOSAURUS_STRIDE_WORLD } from "../three/brachiosaurusRig";
import { type CameraSpec, Dino3D } from "../three/Dino3D";
import type { DinoModelName } from "../three/dinoAsset";
import type { DinoPose3D } from "../three/rigBase";
import { STEGOSAURUS_STRIDE_WORLD } from "../three/stegosaurusRig";
import { TRICERATOPS_STRIDE_WORLD } from "../three/triceratopsRig";
import { TREX_STRIDE_WORLD } from "../three/trexRig";

// 横から見るカメラ。地面 y=0 が背景の砂地（GROUND_Y あたり）に来るように合わせてある
export const STAGE_CAMERA: CameraSpec = { position: [0, 3.5, 28], lookAt: [0, 3.5, 0], fov: 20 };
/** STAGE_CAMERA を k 倍うしろへ引いたカメラ。地面の位置は同じまま、恐竜が 1/k の大きさに見える（頭がテロップにかからないように） */
export const pulledBack = (k: number): CameraSpec => ({ position: [0, 3.5 * k, 28 * k], lookAt: [0, 3.5 * k, 0], fov: 20 });

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Common = {
  model: DinoModelName;
  camera: CameraSpec;
  /** 画面で見やすいように大きくする（本物の大きさの比ではない） */
  scale?: number;
  /**
   * アクション（act はそのフレームの動き、t はアクションが始まってからのフレーム）を 3D の姿勢に直す。
   * cry はアクションといっしょに鳴くなき声のいまの様子（なき声がなければ undefined）。口は声に合わせて開く
   */
  actionPose: (act: ActionResult, t: number, cry?: CryNow) => DinoPose3D;
  /** アクションのふきだし。left/top は立ち止まった恐竜の頭（しっぽ）のそばに合わせてある */
  bubble: { text: string; left: number; top: number; tail: "left" | "right" };
};
/** 歩く恐竜。歩幅を足し合わせて進むので、地面についた足がすべらない */
type WalkStage = Common & {
  kind: "walk";
  /** 歩幅 1 で1周期に進む距離（ワールド単位） */
  strideWorld: number;
  /** 1周期のフレーム数 */
  cycle: number;
  maxStride: number;
  /** 立ち止まる腰の位置。登場のスタート位置はここから逆算する */
  standX: number;
  slowDown: number;
  speedUp: number;
};
/** 飛ぶ恐竜。2D と同じように、ゆっくり止まって、また速くなって出ていく */
type FlyStage = Common & { kind: "fly"; altitude: number; flapCycle: number; fromX: number; standX: number; toX: number };
type Stage3D = WalkStage | FlyStage;

const STAGES: Partial<Record<DinoKind, Stage3D>> = {
  trex: {
    kind: "walk",
    model: "trex",
    camera: pulledBack(1.1),
    strideWorld: TREX_STRIDE_WORLD,
    cycle: 24,
    maxStride: 1.15,
    standX: -2.2, // 口の右に、ふきだしが入るところ
    slowDown: 45,
    speedUp: 40,
    actionPose: (act, _t, cry) => {
      const open = cry ? cry.mouth : (act.pose.jaw ?? 0);
      return { jaw: open, raise: open };
    },
    bubble: { text: "ガオーッ！", left: 1290, top: 330, tail: "left" },
  },
  triceratops: {
    kind: "walk",
    model: "triceratops",
    camera: STAGE_CAMERA,
    strideWorld: TRICERATOPS_STRIDE_WORLD,
    cycle: 20,
    maxStride: 1.25,
    standX: -0.7,
    slowDown: 45,
    speedUp: 40,
    actionPose: (act, _t, cry) => ({ butt: (act.pose.head ?? 0) / 16, jaw: cry?.mouth ?? 0 }),
    bubble: { text: "ドーン！", left: 1390, top: 360, tail: "left" },
  },
  stegosaurus: {
    kind: "walk",
    model: "stegosaurus",
    camera: STAGE_CAMERA,
    strideWorld: STEGOSAURUS_STRIDE_WORLD,
    cycle: 18,
    maxStride: 1.25,
    standX: 1.4,
    slowDown: 45,
    speedUp: 40,
    actionPose: (act, _t, cry) => ({ tailSwing: (act.pose.tail ?? 0) / 32, jaw: cry?.mouth ?? 0 }),
    bubble: { text: "ブンブン！", left: 136, top: 420, tail: "right" },
  },
  brachiosaurus: {
    kind: "walk",
    model: "brachiosaurus",
    camera: pulledBack(1.7),
    strideWorld: BRACHIOSAURUS_STRIDE_WORLD,
    cycle: 18,
    maxStride: 1.25,
    standX: -0.5,
    slowDown: 50,
    speedUp: 40,
    // 首をのばしながら鳴いて、鳴きおわってから、もぐもぐ
    actionPose: (act, t, cry) => ({
      reach: interpolate(t, [0, 20, 100, 120], [0, 1, 1, 0], clamp),
      munch: !cry || cry.over ? (act.pose.jaw ?? 0) / 0.6 : 0,
      jaw: cry?.mouth ?? 0,
    }),
    bubble: { text: "もぐもぐ", left: 1370, top: 330, tail: "left" },
  },
  pteranodon: {
    kind: "fly",
    model: "pteranodon",
    camera: STAGE_CAMERA,
    scale: 1.35,
    altitude: 3.0,
    flapCycle: 22,
    fromX: -11,
    standX: 0.3,
    toX: 12,
    // ぐるっと回るときは、曲がる向きに体を傾ける
    actionPose: (_act, t, cry) => ({
      bank: t >= 0 && t <= ACTION_FRAMES.fly ? 0.3 * Math.cos((t / ACTION_FRAMES.fly) * Math.PI * 2) : 0,
      jaw: cry?.mouth ?? 0,
    }),
    bubble: { text: "ビューン！", left: 1240, top: 330, tail: "left" },
  },
};

/** オープニングやエンディングで、恐竜にアクションをさせるとき */
export const actionPose3D = (kind: DinoKind, act: ActionResult, t: number, cry?: CryNow): DinoPose3D => STAGES[kind]?.actionPose(act, t, cry) ?? {};

export const has3D = (kind: DinoKind) => kind in STAGES;

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** そのフレームの歩幅。登場は最後にゆっくり止まり、退場はゆっくり歩き出す */
const strideAt = (s: WalkStage, f: number, enter: number, exitStart: number) => {
  if (f < enter) return s.maxStride * smooth((enter - f) / s.slowDown);
  if (f >= exitStart) return s.maxStride * smooth((f - exitStart) / s.speedUp);
  return 0;
};

/** 腰の位置。歩幅を足し合わせて出す。登場は立ち止まる位置から逆算するので、ちょうど画面の外から入ってくる */
const walkX = (s: WalkStage, frame: number, enter: number, exitStart: number) => {
  const step = (f: number) => (strideAt(s, f, enter, exitStart) / s.cycle) * s.strideWorld;
  let x = s.standX;
  if (frame < enter) for (let f = frame; f < enter; f++) x -= step(f);
  else for (let f = exitStart; f < frame; f++) x += step(f);
  return x;
};

/** 恐竜の位置と姿勢 */
const motion = (s: Stage3D, frame: number, enter: number, exitStart: number, duration: number) => {
  if (s.kind === "walk") {
    return { x: walkX(s, frame, enter, exitStart), y: 0, pose: { walk: frame / s.cycle, stride: strideAt(s, frame, enter, exitStart), idle: frame } };
  }
  const x =
    frame < exitStart
      ? interpolate(frame, [0, enter], [s.fromX, s.standX], { ...clamp, easing: Easing.out(Easing.quad) })
      : interpolate(frame, [exitStart, duration], [s.standX, s.toX], { ...clamp, easing: Easing.in(Easing.quad) });
  // 止まっているあいだも、ふわふわと上下する
  return { x, y: s.altitude + 0.15 * Math.sin(frame * 0.06), pose: { flap: frame / s.flapCycle, idle: frame } };
};

/** 2D のアクションの位置ずらし（px）を、ワールド単位に直す */
const PX_PER_WORLD = 109;

/** 3D の恐竜のシーン。画面の外から来て止まり、アクションをして、出ていく */
export const Dino3DScene: React.FC<{
  episodeId: string;
  dino: DinoEntry;
  timing: SceneTiming;
  audio: AudioAvailability;
  /** 何ひき目か（0 から）と、全員の色（右上の進み具合に使う） */
  index: number;
  colors: string[];
}> = ({ episodeId, dino, timing, audio, index, colors }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const stage = STAGES[dino.kind]!;
  const { enter, exit } = stageFrames(dino);
  const exitStart = timing.duration - exit;

  // アクションは止まってすぐと、（時間があれば）出ていく前にもう1回。なき声があれば、どちらでも鳴く
  // （timeline.ts が、なき声のぶんナレーションを遅らせ、2回目がナレーションのあとになるように時間をとってある）
  const actionLen = ACTION_FRAMES[dino.action];
  const actionStarts = [enter + ACTION_DELAY];
  const second = exitStart - actionLen - 15;
  if (second - actionStarts[0] > actionLen + 30) actionStarts.push(second);
  const current = actionStarts.findLast((s) => frame >= s) ?? actionStarts[0];
  const act = actionAt(dino.action, frame - current);

  const cry = audio.cries[dino.kind];
  const cryNow = cry ? cryAt(cry, (frame - current) / fps) : undefined;
  const actionSe = ACTION_SE[dino.action];

  const m = motion(stage, frame, enter, exitStart, timing.duration);
  const pose: DinoPose3D = { ...m.pose, blink: blinkAt(frame, timing.from), ...stage.actionPose(act, frame - current, cryNow) };

  return (
    <>
      <Background shake={act.shake} frameOffset={timing.from} />
      <AbsoluteFill style={{ transform: backgroundTransform(frame + timing.from, act.shake) }}>
        <Dino3D
          name={stage.model}
          width={width}
          height={height}
          pose={pose}
          x={m.x + act.dx / PX_PER_WORLD}
          y={m.y - act.dy / PX_PER_WORLD}
          scale={stage.scale}
          camera={stage.camera}
        />
      </AbsoluteFill>
      {actionStarts.map((s) => (
        <ActionBubble key={s} {...stage.bubble} from={s} duration={Math.max(actionLen, 50)} colors={[dino.color, "#ffb938", "#ff7b54"]} />
      ))}
      <Telop name={dino.name} fact={dino.fact} color={dino.color} accent={dino.accent} number={index + 1} from={enter - 10} until={exitStart} />
      <SceneProgress colors={colors} current={index} from={enter - 10} until={exitStart} />
      {timing.hasVoice ? (
        <Sequence from={timing.voiceStart} layout="none">
          <Audio src={staticFile(voiceFile(episodeId, dino.id))} />
        </Sequence>
      ) : null}
      {audio.se[SE_FILES.pop] ? (
        <Sequence from={enter - 10} durationInFrames={45} layout="none">
          <Audio src={staticFile(SE_FILES.pop)} volume={0.6} />
        </Sequence>
      ) : null}
      {actionSe && audio.se[actionSe]
        ? actionStarts.map((s) => (
            <Sequence key={s} from={s} durationInFrames={actionLen} layout="none">
              <Audio src={staticFile(actionSe)} volume={0.7} />
            </Sequence>
          ))
        : null}
      {cry
        ? actionStarts.map((s) => (
            <Sequence key={s} from={s} layout="none">
              <Audio src={staticFile(cryFile(dino.kind))} volume={CRY_VOLUME} />
            </Sequence>
          ))
        : null}
    </>
  );
};
