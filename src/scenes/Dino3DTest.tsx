import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { blinkAt } from "../animation/walk";
import { Background } from "../components/Background";
import { type CameraSpec, Dino3D } from "../three/Dino3D";
import type { DinoModelName } from "../three/dinoAsset";
import type { DinoPose3D } from "../three/rigBase";
import { BRACHIOSAURUS_STRIDE_WORLD } from "../three/brachiosaurusRig";
import { STEGOSAURUS_STRIDE_WORLD } from "../three/stegosaurusRig";
import { TRICERATOPS_STRIDE_WORLD } from "../three/triceratopsRig";
import { TREX_STRIDE_WORLD } from "../three/trexRig";
import { STAGE_CAMERA } from "./Dino3DScene";

/** sheet は横・斜め・顔のアップ・アクションを 2x2 にまとめて見る */
export type Dino3DTestView = "demo" | "side" | "tq" | "closeup" | "action" | "sheet";
type CameraView = Exclude<Dino3DTestView, "demo" | "sheet">;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Setup = {
  strideWorld: number;
  cycle: number;
  start: number;
  /** 空を飛ぶ恐竜の高さ（歩かない） */
  altitude?: number;
  cameras: Record<CameraView, CameraSpec>;
  action: (t: number) => DinoPose3D;
  /** sheet で見せるアクションの瞬間（アクションが始まってからのフレーム） */
  peak: number;
};

// 恐竜ごとの、確認用カメラと動き
const SETUP: Record<DinoModelName, Setup> = {
  trex: {
    strideWorld: TREX_STRIDE_WORLD,
    cycle: 36,
    start: -8.5,
    cameras: {
      side: { position: [-0.6, 2.5, 19], lookAt: [-0.6, 2.4, 0], fov: 30 },
      tq: { position: [8.5, 4.2, 11], lookAt: [-0.2, 2.3, 0], fov: 32 },
      closeup: { position: [6.6, 4.6, 3.6], lookAt: [4.1, 4.0, 0.2], fov: 30 },
      action: { position: [7.6, 4.0, 5.6], lookAt: [2.8, 3.6, 0], fov: 36 },
    },
    action: (t) => {
      const open = interpolate(t, [0, 15, 55, 70], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.quad) });
      return { jaw: open, raise: open };
    },
    peak: 35,
  },
  triceratops: {
    strideWorld: TRICERATOPS_STRIDE_WORLD,
    cycle: 28,
    start: -6.5,
    cameras: {
      side: { position: [0.2, 2.0, 16], lookAt: [0.2, 1.9, 0], fov: 30 },
      tq: { position: [7.5, 3.6, 9.5], lookAt: [0.4, 1.7, 0], fov: 32 },
      closeup: { position: [7.0, 3.1, 3.8], lookAt: [4.0, 2.5, 0.2], fov: 34 },
      action: { position: [6.5, 2.8, 7.5], lookAt: [1.6, 1.9, 0], fov: 34 },
    },
    action: (t) => ({ butt: Math.sin(Math.PI * Math.min(1, Math.max(0, ((t % 35) / 35)))) * (t < 70 ? 1 : 0) }),
    peak: 17,
  },
  stegosaurus: {
    strideWorld: STEGOSAURUS_STRIDE_WORLD,
    cycle: 26,
    start: -6.3,
    cameras: {
      side: { position: [-0.3, 1.9, 15], lookAt: [-0.3, 1.8, 0], fov: 30 },
      tq: { position: [7.0, 3.8, 9.0], lookAt: [-0.2, 1.7, 0], fov: 32 },
      closeup: { position: [5.8, 1.8, 3.0], lookAt: [3.45, 1.1, 0.15], fov: 32 },
      action: { position: [-2.0, 4.2, 8.5], lookAt: [-1.6, 1.9, 0], fov: 38 },
    },
    action: (t) => {
      const amp = interpolate(t, [0, 10, 65, 80], [0, 1, 1, 0], clamp);
      return { tailSwing: Math.sin(t * 0.32) * amp };
    },
    peak: 24,
  },
  brachiosaurus: {
    strideWorld: BRACHIOSAURUS_STRIDE_WORLD,
    cycle: 30,
    start: -8.0,
    cameras: {
      side: { position: [-0.4, 3.6, 26], lookAt: [-0.4, 3.5, 0], fov: 30 },
      tq: { position: [9.5, 5.5, 13], lookAt: [0.3, 3.4, 0], fov: 34 },
      closeup: { position: [8.4, 7.4, 4.2], lookAt: [5.2, 6.85, 0.2], fov: 32 },
      action: { position: [8.5, 5.5, 9.5], lookAt: [2.6, 4.6, 0], fov: 38 },
    },
    action: (t) => {
      const up = interpolate(t, [0, 20, 100, 120], [0, 1, 1, 0], clamp);
      return { reach: up, munch: up * (0.5 + 0.5 * Math.sin(t * 0.6)) };
    },
    peak: 50,
  },
  pteranodon: {
    strideWorld: 0,
    cycle: 22,
    start: -9,
    altitude: 3.8,
    cameras: {
      side: { position: [0.4, 0.4, 9], lookAt: [0.4, 0, 0], fov: 34 },
      tq: { position: [3.5, 2.2, 5.5], lookAt: [0.3, 0, 0], fov: 40 },
      closeup: { position: [2.1, 0.7, 2.2], lookAt: [0.75, 0.3, 0.45], fov: 34 },
      action: { position: [0.4, -2.5, 6], lookAt: [0.3, 0, 0], fov: 44 },
    },
    action: (t) => ({ bank: 0.35 * Math.sin((t / 110) * Math.PI * 2) * (t >= 0 && t < 110 ? 1 : 0) }),
    peak: 27,
  },
};

// demo：歩いてきて、ゆっくり止まって、アクション
const STOP_START = 84;
const STOP_END = 120;
const ACTION_START = 130;
const strideAt = (f: number) => interpolate(f, [STOP_START, STOP_END], [1, 0], { ...clamp, easing: Easing.inOut(Easing.quad) });

/** 3D の恐竜の見た目と動きを確かめるためのテスト用シーン */
export const Dino3DTest: React.FC<{ name: DinoModelName; view: Dino3DTestView }> = ({ name, view }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const setup = SETUP[name];
  if (view === "sheet") {
    // 4つの向きを 2x2 に。右下はアクションのいちばん大きいところで、口も開ける（なき声の口）
    const views: CameraView[] = ["side", "tq", "closeup", "action"];
    return (
      <AbsoluteFill>
        {views.map((v, i) => (
          <div key={v} style={{ position: "absolute", left: (i % 2) * (width / 2), top: Math.floor(i / 2) * (height / 2), width: width / 2, height: height / 2, overflow: "hidden" }}>
            <Background />
            <AbsoluteFill>
              <Dino3D
                name={name}
                width={width / 2}
                height={height / 2}
                pose={{ idle: frame, flap: frame / setup.cycle, ...(v === "action" ? { ...setup.action(setup.peak), jaw: 1 } : {}) }}
                x={0}
                y={0}
                camera={setup.cameras[v]}
              />
            </AbsoluteFill>
          </div>
        ))}
      </AbsoluteFill>
    );
  }
  let pose: DinoPose3D = { idle: frame, flap: frame / setup.cycle, blink: blinkAt(frame) };
  let x = 0;
  let y = 0;
  if (setup.altitude !== undefined) {
    // 飛ぶ恐竜：demo では空を横切る
    if (view === "demo") {
      x = setup.start + frame * 0.08;
      y = setup.altitude;
    }
    if (view === "action" || view === "demo") pose = { ...pose, ...setup.action(frame - 10) };
  } else if (view === "demo") {
    let travelled = 0;
    for (let f = 0; f < frame; f++) travelled += (strideAt(f) / setup.cycle) * setup.strideWorld;
    pose = { ...pose, walk: frame / setup.cycle, stride: strideAt(frame), ...setup.action(frame - ACTION_START) };
    x = setup.start + travelled;
  } else if (view === "action") {
    pose = { ...pose, ...setup.action(frame - 10) };
  }
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill>
        <Dino3D name={name} width={width} height={height} pose={pose} x={x} y={y} camera={view === "demo" ? STAGE_CAMERA : setup.cameras[view]} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
