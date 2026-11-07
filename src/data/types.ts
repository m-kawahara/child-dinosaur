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

/**
 * おすもうの取組の場面（この順に進む）。
 * face: 向き合う / charge: ぶつかって押し合う / roar: east がほえて west が下がる / comeback: west が押し返す /
 * finish: east が土俵の外でしりもち / winner: west が勝って鳴く / friends: なかなおり
 * （並び順は timeline.ts の BOUT_BEATS）
 */
export type BoutBeat = "face" | "charge" | "roar" | "comeback" | "finish" | "winner" | "friends";

/** おすもうの取組。east（左から来る）は trex、west（右から来て勝つ）は triceratops の振り付け */
export type Bout = {
  /** 恐竜の id（dinos の中のもの） */
  east: string;
  west: string;
  /** 場面ごとのナレーション */
  lines: Record<BoutBeat, string>;
  /** 場面ごとに画面に大きく出す文字 */
  captions?: Partial<Record<BoutBeat, string>>;
};

export type Episode = {
  id: string;
  title: string;
  voice: VoiceSettings;
  /** subtitle はタイトルの下に小さく出すひとこと */
  opening: { narration: string; subtitle?: string };
  dinos: DinoEntry[];
  /** あれば、恐竜の紹介のあとに取組をする */
  bout?: Bout;
  /** title は大きく出す文字、subtitle はその下のひとこと */
  ending: { narration: string; title?: string; subtitle?: string };
};

/** voice/<回>/durations.json のキー（"opening" / 恐竜の id / "bout-<場面>" / "ending"） */
export type VoiceDurations = Record<string, number>;

/** 取組の中の1場面。from と voiceStart はシーンの頭から数える */
export type BeatTiming = {
  beat: BoutBeat;
  from: number;
  duration: number;
  voiceStart: number;
  voiceFrames: number;
  hasVoice: boolean;
};

export type SceneTiming = {
  key: string;
  from: number;
  duration: number;
  /** ナレーションが始まるシーン内のフレーム */
  voiceStart: number;
  voiceFrames: number;
  hasVoice: boolean;
  /** 取組のシーン（key が "bout"）だけ。ナレーションは場面ごとにある */
  beats?: BeatTiming[];
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
