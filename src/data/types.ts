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
  /** subtitle はタイトルの下に小さく出すひとこと */
  opening: { narration: string; subtitle?: string };
  dinos: DinoEntry[];
  /** title は大きく出す文字、subtitle はその下のひとこと */
  ending: { narration: string; title?: string; subtitle?: string };
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

/** なき声（cries/cries.json）。seconds は声の長さ、mouth は口の開き（0〜1）の折れ線 [[秒, 開き], ...] */
export type CryInfo = { seconds: number; mouth: [number, number][] };
export type Cries = Partial<Record<DinoKind, CryInfo>>;

export type AudioAvailability = {
  bgm: boolean;
  se: Record<string, boolean>;
  /** npm run cries で作ったなき声（作っていなければ空） */
  cries: Cries;
};
