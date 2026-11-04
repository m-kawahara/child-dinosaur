// シーンの開始フレームを表示する（確認用）
const { buildTimeline } = await import("../src/data/timeline.ts");
const { episode1 } = await import("../src/data/episode1.ts");
const { readFile } = await import("node:fs/promises");
let durations = {};
try { durations = JSON.parse(await readFile(new URL("../public/voice/durations.json", import.meta.url), "utf8")); } catch {}
let cries = {};
try { cries = JSON.parse(await readFile(new URL("../public/cries/cries.json", import.meta.url), "utf8")); } catch {}
const { scenes, total } = buildTimeline(episode1, durations, 30, cries);
for (const s of scenes) console.log(s.key.padEnd(14), "from", String(s.from).padStart(5), "dur", s.duration, "voice at", s.voiceStart, s.hasVoice ? "" : "(no voice)");
console.log("total", total, "frames =", (total / 30).toFixed(1), "s");
