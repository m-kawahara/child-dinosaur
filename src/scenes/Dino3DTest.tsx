import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { type CameraSpec, Dino3D } from "../three/Dino3D";
import type { DinoModelName } from "../three/dinoAsset";
import type { DinoPose3D } from "../three/rigBase";
import { BRACHIOSAURUS_STRIDE_WORLD } from "../three/brachiosaurusRig";
import { STEGOSAURUS_STRIDE_WORLD } from "../three/stegosaurusRig";
import { TRICERATOPS_STRIDE_WORLD } from "../three/triceratopsRig";
import { TREX_STRIDE_WORLD } from "../three/trexRig";
import { STAGE_CAMERA } from "./Dino3DScene";

export type Dino3DTestView = "demo" | "side" | "tq" | "closeup" | "action";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Setup = {
  strideWorld: number;
  cycle: number;
  start: number;
  /** 空を飛ぶ恐竜の高さ（歩かない） */
  altitude?: number;
  cameras: Record<Exclude<Dino3DTestView, "demo">, CameraSpec>;
  action: (t: number) => DinoPose3D;
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
      closeup: { position: [5.4, 4.35, 2.4], lookAt: [3.95, 3.85, 0.1], fov: 30 },
      action: { position: [7.2, 3.6, 5.2], lookAt: [2.6, 3.4, 0], fov: 34 },
    },
    action: (t) => {
      const open = interpolate(t, [0, 15, 55, 70], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.quad) });
      return { jaw: open, raise: open };
    },
  },
  triceratops: {
    strideWorld: TRICERATOPS_STRIDE_WORLD,
    cycle: 28,
    start: -6.5,
    cameras: {
      side: { position: [0.2, 2.0, 16], lookAt: [0.2, 1.9, 0], fov: 30 },
      tq: { position: [7.5, 3.6, 9.5], lookAt: [0.4, 1.7, 0], fov: 32 },
      closeup: { position: [6.6, 3.0, 3.2], lookAt: [3.6, 2.4, 0.2], fov: 32 },
      action: { position: [6.5, 2.8, 7.5], lookAt: [1.6, 1.9, 0], fov: 34 },
    },
    action: (t) => ({ butt: Math.sin(Math.PI * Math.min(1, Math.max(0, ((t % 35) / 35)))) * (t < 70 ? 1 : 0) }),
  },
  stegosaurus: {
    strideWorld: STEGOSAURUS_STRIDE_WORLD,
    cycle: 26,
    start: -6.3,
    cameras: {
      side: { position: [-0.3, 1.9, 15], lookAt: [-0.3, 1.8, 0], fov: 30 },
      tq: { position: [7.0, 3.8, 9.0], lookAt: [-0.2, 1.7, 0], fov: 32 },
      closeup: { position: [4.6, 1.8, 2.2], lookAt: [3.1, 1.2, 0.1], fov: 32 },
      action: { position: [-2.0, 4.2, 8.5], lookAt: [-1.6, 1.9, 0], fov: 38 },
    },
    action: (t) => {
      const amp = interpolate(t, [0, 10, 65, 80], [0, 1, 1, 0], clamp);
      return { tailSwing: Math.sin(t * 0.32) * amp };
    },
  },
  brachiosaurus: {
    strideWorld: BRACHIOSAURUS_STRIDE_WORLD,
    cycle: 30,
    start: -8.0,
    cameras: {
      side: { position: [-0.4, 3.6, 26], lookAt: [-0.4, 3.5, 0], fov: 30 },
      tq: { position: [9.5, 5.5, 13], lookAt: [0.3, 3.4, 0], fov: 34 },
      closeup: { position: [6.6, 7.0, 2.6], lookAt: [4.85, 6.65, 0.1], fov: 32 },
      action: { position: [8.5, 5.5, 9.5], lookAt: [2.6, 4.6, 0], fov: 38 },
    },
    action: (t) => {
      const up = interpolate(t, [0, 20, 100, 120], [0, 1, 1, 0], clamp);
      return { reach: up, munch: up * (0.5 + 0.5 * Math.sin(t * 0.6)) };
    },
  },
  pteranodon: {
    strideWorld: 0,
    cycle: 22,
    start: -9,
    altitude: 3.8,
    cameras: {
      side: { position: [0.4, 0.4, 9], lookAt: [0.4, 0, 0], fov: 34 },
      tq: { position: [3.5, 2.2, 5.5], lookAt: [0.3, 0, 0], fov: 40 },
      closeup: { position: [1.9, 0.55, 1.1], lookAt: [1.05, 0.2, 0], fov: 34 },
      action: { position: [0.4, -2.5, 6], lookAt: [0.3, 0, 0], fov: 44 },
    },
    action: (t) => ({ bank: 0.35 * Math.sin((t / 110) * Math.PI * 2) * (t >= 0 && t < 110 ? 1 : 0) }),
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
  let pose: DinoPose3D = { idle: frame, flap: frame / setup.cycle };
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
    pose = { walk: frame / setup.cycle, stride: strideAt(frame), idle: frame, ...setup.action(frame - ACTION_START) };
    x = setup.start + travelled;
  } else if (view === "action") {
    pose = { idle: frame, ...setup.action(frame - 10) };
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
