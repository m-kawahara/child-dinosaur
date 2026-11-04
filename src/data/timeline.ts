import type { Cries, DinoAction, DinoEntry, DinoKind, Episode, SceneTiming, VoiceDurations } from "./types";

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

  // エンディング：なき声があるときは、ナレーションのあとに1ぴきずつ鳴く時間をとる
  const ed = voice("ending", episode.ending.narration);
  const criers = episode.dinos.filter((d) => cries[d.kind]).length;
  const goodbye = criers > 0 ? 10 + criers * ENDING_ACTION_GAP + fps : 2 * fps;
  push("ending", 20, ed, Math.max(6 * fps, 20 + ed.voiceFrames + goodbye));

  return { scenes, total: cursor };
};
