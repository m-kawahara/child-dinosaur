import type { Episode, SceneTiming, VoiceDurations } from "./types";

export const ENTER_FRAMES = 75;
export const EXIT_FRAMES = 60;
export const ACTION_DELAY = 10;
const HOLD_AFTER_VOICE = 25;

// 音声がまだ無いときは文字数から長さを見積もる（子ども向けのゆっくりめ）
const estimateSeconds = (text: string) => Math.max(2.5, text.replace(/\s/g, "").length * 0.17);

export const buildTimeline = (episode: Episode, durations: VoiceDurations, fps: number) => {
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
    const stand = Math.max(v.voiceFrames, 4 * fps) + HOLD_AFTER_VOICE;
    push(dino.id, ENTER_FRAMES, v, ENTER_FRAMES + stand + EXIT_FRAMES);
  }

  const ed = voice("ending", episode.ending.narration);
  push("ending", 20, ed, Math.max(6 * fps, 20 + ed.voiceFrames + 2 * fps));

  return { scenes, total: cursor };
};
