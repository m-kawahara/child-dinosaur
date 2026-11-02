// 恐竜のなき声を作って public/cries/<種類>.wav と cries.json に書き出す。
// 使い方: `npm run cries`（全部）／ `npm run cries -- trex`（1つだけ）
// 声の高さ・長さ・響きは scripts/cries/recipes.mjs に書いてある。変えたら作り直す。
// cries.json には、声の長さ（秒）と口の開きの折れ線が入る（動画のタイミングと口の動きに使う）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "./cries/recipes.mjs";
import { finish, SR, wavBytes } from "./cries/synth.mjs";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "cries");
const INDEX = join(OUT_DIR, "cries.json");
const ALL = Object.keys(RECIPES);

const names = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ALL;
for (const name of names) {
  if (!ALL.includes(name)) {
    console.error(`知らない恐竜です: ${name}（${ALL.join(", ")}）`);
    process.exit(1);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
// 1ぴきだけ作り直すときも、ほかの恐竜の分は残す
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : {};
const round = (x) => Number(x.toFixed(3));
for (const name of names) {
  const { samples, mouth } = RECIPES[name]();
  const out = finish(samples);
  writeFileSync(join(OUT_DIR, `${name}.wav`), wavBytes(out));
  // 声の長さは口が閉じるまで（残響はナレーションと少し重なってもよい）
  const seconds = mouth[mouth.length - 1][0];
  index[name] = { seconds: round(seconds), mouth: mouth.map(([t, v]) => [round(t), round(v)]) };
  console.log(`${name.padEnd(14)} ${seconds.toFixed(2)}s（残響まで ${(out.length / SR).toFixed(2)}s）`);
}
// 1ぴき1行で書く
writeFileSync(INDEX, `{\n${Object.entries(index).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n}\n`);
console.log("public/cries/cries.json を書きました");
