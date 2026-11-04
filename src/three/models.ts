import type { DinoKind } from "../data/types";
import { BRACHIOSAURUS_STRIDE_WORLD } from "./brachiosaurusRig";
import type { DinoModelName } from "./dinoAsset";
import { STEGOSAURUS_STRIDE_WORLD } from "./stegosaurusRig";
import { TRICERATOPS_STRIDE_WORLD } from "./triceratopsRig";
import { TREX_STRIDE_WORLD } from "./trexRig";

/**
 * 3D モデルの大きさ（腰を 0 にした、しっぽの先 back と頭の先 front、背の高さ）と、
 * 歩幅 1 で1周期に進む距離。並べるときや、画面の外から入れるときに使う。
 * 大きさは npm run dinos のログ（back / front / height）に合わせる
 */
export const MODEL_INFO: Record<DinoModelName, { back: number; front: number; height: number; strideWorld: number; flies: boolean }> = {
  trex: { back: -4.42, front: 5.37, height: 4.94, strideWorld: TREX_STRIDE_WORLD, flies: false },
  triceratops: { back: -3.55, front: 5.0, height: 4.35, strideWorld: TRICERATOPS_STRIDE_WORLD, flies: false },
  stegosaurus: { back: -4.29, front: 4.08, height: 3.93, strideWorld: STEGOSAURUS_STRIDE_WORLD, flies: false },
  brachiosaurus: { back: -5.15, front: 6.1, height: 7.54, strideWorld: BRACHIOSAURUS_STRIDE_WORLD, flies: false },
  pteranodon: { back: -0.7, front: 2.13, height: 0.96, strideWorld: 0, flies: true },
};

/** 恐竜の種類ごとの 3D モデル（今は種類と同じ名前） */
export const modelOf = (kind: DinoKind): DinoModelName => kind;
