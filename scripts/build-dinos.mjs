// 3D の恐竜モデルを作って public/models/<名前>.{bin,json} に書き出す。
// 使い方: `npm run dinos`（全部）／ `npm run dinos -- triceratops`（1つだけ）
// 形・色・骨は scripts/dino3d/<名前>.mjs に書いてある。形を変えたら作り直す。
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { polygonize, writeModel } from "./dino3d/mesh.mjs";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "models");
const ALL = ["trex", "triceratops", "stegosaurus", "brachiosaurus", "pteranodon"];

const names = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ALL;
for (const name of names) {
  if (!ALL.includes(name)) {
    console.error(`知らない恐竜です: ${name}（${ALL.join(", ")}）`);
    process.exit(1);
  }
  const started = Date.now();
  const log = (msg) => console.log(`[${name}] ${((Date.now() - started) / 1000).toFixed(1).padStart(5)}s  ${msg}`);
  const { default: dino } = await import(`./dino3d/${name}.mjs`);
  log("shape loaded");
  writeModel(OUT_DIR, dino, polygonize(dino.sdf, dino.grid, log), log);
}
