export type DinoKind = "trex" | "triceratops" | "brachiosaurus" | "stegosaurus" | "pteranodon";
export type DinoAction = "roar" | "headbutt" | "longneck" | "tailswing" | "fly";

export type DinoEntry = {
  id: string;
  kind: DinoKind;
  /** テロップに大きく出す名前（カタカナ） */
  name: string;
  /** 名前の下に小さく出すひとこと */
  fact: string;
  color: string;
  accent: string;
  action: DinoAction;
  narration: string;
};

export type VoiceSettings = {
  /** VOICEVOX の話者ID（`npm run voice -- --list` で一覧） */
  speaker: number;
  /** 話す速さ（1 が普通） */
  speed: number;
  /** YouTube の概要欄に書くクレジット */
  credit: string;
};

export type Episode = {
  id: string;
  title: string;
  voice: VoiceSettings;
  opening: { narration: string };
  dinos: DinoEntry[];
  ending: { narration: string };
};

/** voice/durations.json のキー（"opening" / 恐竜の id / "ending"） */
export type VoiceDurations = Record<string, number>;

export type SceneTiming = {
  key: string;
  from: number;
  duration: number;
  /** ナレーションが始まるシーン内のフレーム */
  voiceStart: number;
  voiceFrames: number;
  hasVoice: boolean;
};

export type AudioAvailability = {
  bgm: boolean;
  se: Record<string, boolean>;
};
