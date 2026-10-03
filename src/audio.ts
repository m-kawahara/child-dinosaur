import type { DinoAction } from "./data/types";

/** public/se に置く効果音のファイル名 */
export const SE_FILES = {
  title: "se/kira.mp3",
  pop: "se/pop.mp3",
  roar: "se/roar.mp3",
  headbutt: "se/stomp.mp3",
  longneck: "se/munch.mp3",
  tailswing: "se/swish.mp3",
  fly: "se/flap.mp3",
} satisfies Record<"title" | "pop" | DinoAction, string>;

export const BGM_FILE = "bgm/bgm.mp3";

export const voiceFile = (key: string) => `voice/${key}.wav`;
