import type { DinoEntry } from "../data/types";
import type { Dino3DItem } from "../three/Dino3D";
import { MODEL_INFO, modelOf } from "../three/models";
import type { DinoPose3D } from "../three/rigBase";

// オープニングとエンディングで、恐竜たちを地面に1列に並べる（飛ぶ恐竜は空）。
// 横幅は STAGE_CAMERA で画面に入る範囲（だいたい x = -8.3〜8.3）に合わせる

/** 背の高いブラキオサウルスは、ほかより小さめに（タイトルにかからないように） */
const RELATIVE_SIZE: Partial<Record<DinoEntry["kind"], number>> = { brachiosaurus: 0.8 };
const LEFT = -8.0;
const RIGHT = 8.0;
const GAP = 0.25;
const MAX_STRIDE = 1.15;

export type LineupSlot = { entry: DinoEntry; x: number; scale: number };

/** 歩く恐竜を左から順に、全体が画面に入る大きさで並べる */
export const lineup = (dinos: DinoEntry[]) => {
  const walkers = dinos.filter((d) => !MODEL_INFO[modelOf(d.kind)].flies);
  const rel = (d: DinoEntry) => RELATIVE_SIZE[d.kind] ?? 1;
  const lengths = walkers.map((d) => {
    const m = MODEL_INFO[modelOf(d.kind)];
    return (m.front - m.back) * rel(d);
  });
  const scale = (RIGHT - LEFT - GAP * (walkers.length - 1)) / lengths.reduce((a, b) => a + b, 0);
  let cursor = LEFT;
  const slots: LineupSlot[] = walkers.map((entry) => {
    const m = MODEL_INFO[modelOf(entry.kind)];
    const s = scale * rel(entry);
    const x = cursor - m.back * s;
    cursor = x + m.front * s + GAP;
    return { entry, x, scale: s };
  });
  return { slots, flyers: dinos.filter((d) => MODEL_INFO[modelOf(d.kind)].flies) };
};

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * 列のまま歩いてきて、arrive のフレームで止まる。列全体の速さ（ワールド単位/フレーム）は speed。
 * 1ぴきずつ歩く速さ（歩幅 × 周期）を列の速さに合わせるので、足がすべらない
 */
export const walkInItems = (slots: LineupSlot[], frame: number, arrive: number, speed: number, slowDown: number, extra: (slot: LineupSlot) => DinoPose3D) => {
  const u = (f: number) => (f < arrive ? smooth((arrive - f) / slowDown) : 0);
  let behind = 0;
  for (let f = frame; f < arrive; f++) behind += speed * u(f);
  return slots.map((slot): Dino3DItem => {
    const m = MODEL_INFO[modelOf(slot.entry.kind)];
    const cycle = (MAX_STRIDE * m.strideWorld * slot.scale) / speed;
    return {
      name: modelOf(slot.entry.kind),
      x: slot.x - behind,
      scale: slot.scale,
      pose: { walk: frame / cycle, stride: MAX_STRIDE * u(frame), idle: frame + slot.x * 20, ...extra(slot) },
    };
  });
};
