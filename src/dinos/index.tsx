import React from "react";
import type { DinoKind } from "../data/types";
import { Brachiosaurus } from "./Brachiosaurus";
import { Pteranodon } from "./Pteranodon";
import { Stegosaurus } from "./Stegosaurus";
import { TRex } from "./TRex";
import { Triceratops } from "./Triceratops";
import type { DinoProps } from "./types";

export const DINO_COMPONENTS: Record<DinoKind, React.FC<DinoProps>> = {
  trex: TRex,
  triceratops: Triceratops,
  brachiosaurus: Brachiosaurus,
  stegosaurus: Stegosaurus,
  pteranodon: Pteranodon,
};

/** 画面での横幅（px）。種類ごとに大きさを変える */
export const DINO_WIDTH: Record<DinoKind, number> = {
  trex: 780,
  triceratops: 800,
  brachiosaurus: 700,
  stegosaurus: 780,
  pteranodon: 680,
};
