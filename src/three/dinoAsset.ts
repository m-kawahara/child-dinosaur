import * as THREE from "three";
import { staticFile } from "remotion";

// scripts/build-dinos.mjs が書き出したモデル（public/models/<名前>.{bin,json}）を読む
export type DinoModelName = "trex" | "triceratops" | "stegosaurus" | "brachiosaurus" | "pteranodon";

type V3 = [number, number, number];

export type DinoMeta = {
  vertexCount: number;
  indexCount: number;
  offsets: Record<"position" | "normal" | "color" | "gloss" | "skinIndex" | "skinWeight" | "index", number>;
  /** モデルの大きさ（models.ts の MODEL_INFO を合わせるときに見る） */
  bounds: { min: V3; max: V3 };
  bones: { name: string; parent: number; head: V3; tail: V3 }[];
  /** lid はまぶたの色（sRGB、0〜1） */
  eyes: { center: V3; axis: V3; radius: number; lid: V3 }[];
  teeth: { bone: string; base: V3; dir: V3; length: number; radius: number }[];
};

export type DinoAsset = { meta: DinoMeta; geometry: THREE.BufferGeometry };

// 色は sRGB で入っているので、three.js が使う linear に直す
const SRGB_TO_LINEAR = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

const loading = new Map<DinoModelName, Promise<DinoAsset>>();

const load = async (name: DinoModelName): Promise<DinoAsset> => {
  const [meta, buf] = await Promise.all([
    fetch(staticFile(`models/${name}.json`)).then((r) => {
      if (!r.ok) throw new Error(`public/models/${name}.json がありません。\`npm run dinos\` で作ってください。`);
      return r.json() as Promise<DinoMeta>;
    }),
    fetch(staticFile(`models/${name}.bin`)).then((r) => r.arrayBuffer()),
  ]);
  const n = meta.vertexCount;
  const o = meta.offsets;
  const srgb = new Uint8Array(buf, o.color, n * 4);
  const color = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    color[i * 3] = SRGB_TO_LINEAR[srgb[i * 4]];
    color[i * 3 + 1] = SRGB_TO_LINEAR[srgb[i * 4 + 1]];
    color[i * 3 + 2] = SRGB_TO_LINEAR[srgb[i * 4 + 2]];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(buf, o.position, n * 3), 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(buf, o.normal, n * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
  geometry.setAttribute("gloss", new THREE.BufferAttribute(new Uint8Array(buf, o.gloss, n), 1, true));
  geometry.setAttribute("skinIndex", new THREE.BufferAttribute(new Uint8Array(buf, o.skinIndex, n * 4), 4));
  geometry.setAttribute("skinWeight", new THREE.BufferAttribute(new Uint8Array(buf, o.skinWeight, n * 4), 4, true));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, o.index, meta.indexCount), 1));
  return { meta, geometry };
};

export const loadDinoAsset = (name: DinoModelName) => {
  let p = loading.get(name);
  if (!p) {
    p = load(name);
    loading.set(name, p);
  }
  return p;
};
