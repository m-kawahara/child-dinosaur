import type { BeatTiming, BoutBeat, Cries, DinoAction, DinoEntry, DinoKind, Episode, SceneTiming, VoiceDurations } from "./types";

export const ENTER_FRAMES = 75;
export const EXIT_FRAMES = 60;
export const ACTION_DELAY = 10;

/** アクションの長さ（フレーム） */
export const ACTION_FRAMES: Record<DinoAction, number> = {
  roar: 60,
  headbutt: 70,
  longneck: 120,
  tailswing: 80,
  fly: 110,
};

/** なき声のあと、ナレーションを始めるまでの間 */
const CRY_GAP = 8;
/** ナレーションのあとの2回目のアクションを、ナレーションが終わってから始めるための余白 */
const ENCORE_GAP = 15;
/** エンディングで、恐竜が順番にアクションする間 */
export const ENDING_ACTION_GAP = 45;

/** エンディングで、最初の恐竜がアクションを始めるフレーム。なき声があるときは、ナレーションが終わってから */
export const endingFirstAction = (timing: SceneTiming, withCries: boolean) =>
  withCries && timing.hasVoice ? timing.voiceStart + timing.voiceFrames + 10 : 30;

// 3D の恐竜は本物らしい歩幅で歩くので、出入りに時間をかける（速くすると足がすべる）
const STAGE_FRAMES_3D: Partial<Record<DinoKind, { enter: number; exit: number }>> = {
  trex: { enter: 140, exit: 155 },
  triceratops: { enter: 150, exit: 145 },
  stegosaurus: { enter: 170, exit: 150 },
  brachiosaurus: { enter: 185, exit: 185 },
};

export const stageFrames = (dino: Pick<DinoEntry, "kind">) => STAGE_FRAMES_3D[dino.kind] ?? { enter: ENTER_FRAMES, exit: EXIT_FRAMES };
const HOLD_AFTER_VOICE = 25;

// 音声がまだ無いときは文字数から長さを見積もる（子ども向けのゆっくりめ）
const estimateSeconds = (text: string) => Math.max(2.5, text.replace(/\s/g, "").length * 0.17);

export const buildTimeline = (episode: Episode, durations: VoiceDurations, fps: number, cries: Cries = {}) => {
  const voice = (key: string, text: string) => {
    const seconds = durations[key];
    return {
      hasVoice: seconds !== undefined,
      voiceFrames: Math.ceil((seconds ?? estimateSeconds(text)) * fps),
    };
  };

  const scenes: SceneTiming[] = [];
  let cursor = 0;
  const push = (key: string, voiceStart: number, v: ReturnType<typeof voice>, duration: number) => {
    scenes.push({ key, from: cursor, duration, voiceStart, ...v });
    cursor += duration;
  };

  const op = voice("opening", episode.opening.narration);
  push("opening", 20, op, Math.max(5 * fps, 20 + op.voiceFrames + fps));

  for (const dino of episode.dinos) {
    const v = voice(dino.id, dino.narration);
    const { enter, exit } = stageFrames(dino);
    // なき声があるときは「止まって鳴く → ナレーション → もう1回アクションして鳴く」。声がナレーションに重ならないように
    const cry = cries[dino.kind];
    const cryLead = cry ? ACTION_DELAY + Math.ceil(cry.seconds * fps) + CRY_GAP : 0;
    const encore = cry ? ACTION_FRAMES[dino.action] + ENCORE_GAP : 0;
    const stand = cryLead + Math.max(v.voiceFrames, 4 * fps) + HOLD_AFTER_VOICE + encore;
    push(dino.id, enter + cryLead, v, enter + stand + exit);
  }

  if (episode.bout) {
    const beats = boutBeats(episode, fps, cries, voice);
    const total = beats.reduce((n, b) => n + b.duration, 0);
    push("bout", 0, { hasVoice: false, voiceFrames: 0 }, total);
    scenes[scenes.length - 1].beats = beats;
  }

  // エンディング：なき声があるときは、ナレーションのあとに1ぴきずつ鳴く時間をとる
  const ed = voice("ending", episode.ending.narration);
  const criers = episode.dinos.filter((d) => cries[d.kind]).length;
  const goodbye = criers > 0 ? 10 + criers * ENDING_ACTION_GAP + fps : 2 * fps;
  push("ending", 20, ed, Math.max(6 * fps, 20 + ed.voiceFrames + goodbye));

  return { scenes, total: cursor };
};

/** 取組の場面の順番 */
export const BOUT_BEATS: BoutBeat[] = ["face", "charge", "roar", "comeback", "finish", "winner", "friends"];
export const boutVoiceKey = (beat: BoutBeat) => `bout-${beat}`;

/**
 * 取組の場面ごとの時間（フレーム）。lead は動きを見せてからナレーションを始めるまで、
 * min は場面の最低の長さ（動きが終わるまで）、tail はナレーションのあとの余白。
 * roar と winner の lead は、なき声があればその長さにする（声がナレーションに重ならないように）
 */
export const BEAT_FRAMES: Record<BoutBeat, { lead: number; min: number; tail: number }> = {
  face: { lead: 30, min: 210, tail: 20 },
  charge: { lead: 22, min: 140, tail: 15 },
  roar: { lead: ACTION_FRAMES.roar, min: 150, tail: 25 },
  comeback: { lead: 15, min: 115, tail: 15 },
  finish: { lead: 55, min: 120, tail: 20 },
  winner: { lead: 45, min: 100, tail: 25 },
  friends: { lead: 20, min: 175, tail: 30 },
};

/** なき声のある場面で、なき声を始めるフレーム（場面の頭から） */
export const BOUT_CRY_DELAY = ACTION_DELAY;

/** 場面ごとの「なき声 → ナレーション」の前置き */
export const beatLead = (beat: BoutBeat, cryKind: DinoKind | undefined, cries: Cries, fps: number) => {
  const cry = cryKind ? cries[cryKind] : undefined;
  const base = BEAT_FRAMES[beat].lead;
  return cry ? Math.max(base, BOUT_CRY_DELAY + Math.ceil(cry.seconds * fps) + CRY_GAP) : base;
};

/** その場面で鳴く恐竜（east はほえる場面、west は勝った場面） */
export const beatCrier = (episode: Episode, beat: BoutBeat): DinoKind | undefined => {
  const id = beat === "roar" ? episode.bout?.east : beat === "winner" ? episode.bout?.west : undefined;
  return episode.dinos.find((d) => d.id === id)?.kind;
};

const boutBeats = (
  episode: Episode,
  fps: number,
  cries: Cries,
  voice: (key: string, text: string) => { hasVoice: boolean; voiceFrames: number },
): BeatTiming[] => {
  const bout = episode.bout!;
  let from = 0;
  return BOUT_BEATS.map((beat) => {
    const v = voice(boutVoiceKey(beat), bout.lines[beat]);
    const lead = beatLead(beat, beatCrier(episode, beat), cries, fps);
    const { min, tail } = BEAT_FRAMES[beat];
    const duration = Math.max(min, lead + v.voiceFrames + tail);
    const timing: BeatTiming = { beat, from, duration, voiceStart: from + lead, ...v };
    from += duration;
    return timing;
  });
};
