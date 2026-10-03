// VOICEVOX でナレーション音声を作る。
// 使い方: VOICEVOX アプリを起動してから `npm run voice`
//   話者を変える: `npm run voice -- --speaker 3`（3 = ずんだもん ノーマル）
//   話者の一覧:   `npm run voice -- --list`
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { episode1 } = await import("../src/data/episode1.ts");

const { values } = parseArgs({
  options: {
    speaker: { type: "string", default: "3" },
    speed: { type: "string", default: "0.95" },
    host: { type: "string", default: "http://127.0.0.1:50021" },
    list: { type: "boolean", default: false },
  },
});

const api = async (path, init) => {
  const res = await fetch(`${values.host}${path}`, init).catch(() => {
    console.error(`VOICEVOX（${values.host}）につながりません。VOICEVOX アプリを起動してください。`);
    process.exit(1);
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
};

if (values.list) {
  const speakers = await (await api("/speakers")).json();
  for (const s of speakers) for (const st of s.styles) console.log(String(st.id).padStart(4), s.name, st.name);
  process.exit(0);
}

/** WAV の長さ（秒）を、ヘッダーの fmt / data チャンクから計算する */
const wavSeconds = (buf) => {
  let byteRate = 0;
  for (let p = 12; p + 8 <= buf.length; ) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(p + 16);
    if (id === "data") return size / byteRate;
    p += 8 + size + (size % 2);
  }
  throw new Error("WAV の data チャンクが見つかりません");
};

const lines = [
  ["opening", episode1.opening.narration],
  ...episode1.dinos.map((d) => [d.id, d.narration]),
  ["ending", episode1.ending.narration],
];

const outDir = new URL("../public/voice/", import.meta.url);
await mkdir(outDir, { recursive: true });
const durations = {};

for (const [key, text] of lines) {
  const q = new URLSearchParams({ text, speaker: values.speaker });
  const query = await (await api(`/audio_query?${q}`, { method: "POST" })).json();
  query.speedScale = Number(values.speed);
  query.prePhonemeLength = 0.2;
  query.postPhonemeLength = 0.3;
  const wav = Buffer.from(
    await (
      await api(`/synthesis?speaker=${values.speaker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      })
    ).arrayBuffer(),
  );
  await writeFile(new URL(`${key}.wav`, outDir), wav);
  durations[key] = Number(wavSeconds(wav).toFixed(3));
  console.log(`${key.padEnd(14)} ${durations[key]}s  ${text}`);
}

await writeFile(new URL("durations.json", outDir), JSON.stringify(durations, null, 2) + "\n");
console.log("public/voice/durations.json を書きました");
