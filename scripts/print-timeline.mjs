// シーンの開始フレームを表示する（確認用）。node scripts/print-timeline.mjs [episode2]
const { buildTimeline } = await import("../src/data/timeline.ts");
const id = process.argv[2] ?? "episode1";
const episode = (await import(`../src/data/${id}.ts`))[id];
const { readFile } = await import("node:fs/promises");
let durations = {};
try { durations = JSON.parse(await readFile(new URL(`../public/voice/${id}/durations.json`, import.meta.url), "utf8")); } catch {}
let cries = {};
try { cries = JSON.parse(await readFile(new URL("../public/cries/cries.json", import.meta.url), "utf8")); } catch {}
const { scenes, total } = buildTimeline(episode, durations, 30, cries);
for (const s of scenes) {
  console.log(s.key.padEnd(14), "from", String(s.from).padStart(5), "dur", s.duration, "voice at", s.voiceStart, s.hasVoice ? "" : "(no voice)");
  for (const b of s.beats ?? []) console.log("  " + b.beat.padEnd(12), "from", String(s.from + b.from).padStart(5), "dur", b.duration, "voice at", b.voiceStart - b.from, b.hasVoice ? "" : "(no voice)");
}
console.log("total", total, "frames =", (total / 30).toFixed(1), "s");
