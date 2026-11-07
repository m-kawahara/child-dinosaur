import type { DinoAction, DinoKind } from "./data/types";

/** public/se に置く効果音のファイル名 */
export const SE_FILES = {
  title: "se/kira.mp3",
  pop: "se/pop.mp3",
};

/** アクションの効果音（public/se）。ティラノサウルスがほえる声は、なき声（cries/trex.wav）が受け持つ */
export const ACTION_SE: Partial<Record<DinoAction, string>> = {
  headbutt: "se/stomp.mp3",
  longneck: "se/munch.mp3",
  tailswing: "se/swish.mp3",
  fly: "se/flap.mp3",
};

export const BGM_FILE = "bgm/bgm.mp3";

/** ナレーションの声は回ごとのフォルダに置く（npm run voice -- --episode <id>） */
export const voiceFile = (episodeId: string, key: string) => `voice/${episodeId}/${key}.wav`;
export const voiceDurationsFile = (episodeId: string) => `voice/${episodeId}/durations.json`;

/** npm run cries で作る、なき声と、その長さ・口の動き */
export const CRIES_FILE = "cries/cries.json";
export const cryFile = (kind: DinoKind) => `cries/${kind}.wav`;
/** なき声の大きさ（ナレーションは 1）。書き出した動画で、ナレーションより少し大きく聞こえるくらい */
export const CRY_VOLUME = 0.45;
