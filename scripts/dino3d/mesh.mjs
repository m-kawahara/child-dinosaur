// 距離関数からメッシュを作り、色・うろこの細かさ・骨の重みをつけて書き出す。
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clamp, mix } from "./sdf.mjs";

/**
 * 表面を取り出す（surface nets）。粗いグリッドで見当をつけて、表面の近くだけ細かく測る。
 * 頂点は表面にのせ直し、法線は距離関数の傾きから取る。
 */
export function polygonize(sdf, { min, max, h }, log) {
  const NX = Math.round((max[0] - min[0]) / h) + 1;
  const NY = Math.round((max[1] - min[1]) / h) + 1;
  const NZ = Math.round((max[2] - min[2]) / h) + 1;
  const at = (i, j, k) => i + NX * (j + NY * k);
  log(`grid ${NX}x${NY}x${NZ} = ${((NX * NY * NZ) / 1e6).toFixed(1)}M`);

  const C = 4;
  const CNX = Math.ceil((NX - 1) / C) + 2, CNY = Math.ceil((NY - 1) / C) + 2, CNZ = Math.ceil((NZ - 1) / C) + 2;
  const coarse = new Float32Array(CNX * CNY * CNZ);
  for (let k = 0; k < CNZ; k++)
    for (let j = 0; j < CNY; j++)
      for (let i = 0; i < CNX; i++) coarse[i + CNX * (j + CNY * k)] = sdf(min[0] + i * C * h, min[1] + j * C * h, min[2] + k * C * h);

  const field = new Float32Array(NX * NY * NZ);
  const BAND = 0.16;
  for (let k = 0; k < NZ; k++) {
    const ck = k / C, k0 = Math.floor(ck), tk = ck - k0;
    const z = min[2] + k * h;
    for (let j = 0; j < NY; j++) {
      const cj = j / C, j0 = Math.floor(cj), tj = cj - j0;
      const y = min[1] + j * h;
      for (let i = 0; i < NX; i++) {
        const ci = i / C, i0 = Math.floor(ci), ti = ci - i0;
        const c = (a, b, e) => coarse[i0 + a + CNX * (j0 + b + CNY * (k0 + e))];
        const v = mix(
          mix(mix(c(0, 0, 0), c(1, 0, 0), ti), mix(c(0, 1, 0), c(1, 1, 0), ti), tj),
          mix(mix(c(0, 0, 1), c(1, 0, 1), ti), mix(c(0, 1, 1), c(1, 1, 1), ti), tj),
          tk,
        );
        field[at(i, j, k)] = Math.abs(v) < BAND ? sdf(min[0] + i * h, y, z) : v;
      }
    }
  }
  log("field");

  const CX = NX - 1, CY = NY - 1, CZ = NZ - 1;
  const cellVert = new Int32Array(CX * CY * CZ).fill(-1);
  const cellAt = (i, j, k) => i + CX * (j + CY * k);
  const verts = [];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < CZ; k++)
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        let mask = 0;
        for (let b = 0; b < 8; b++) {
          const v = field[at(i + (b & 1), j + ((b >> 1) & 1), k + ((b >> 2) & 1))];
          cv[b] = v;
          if (v < 0) mask |= 1 << b;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of EDGES) {
          if (cv[a] < 0 === cv[b] < 0) continue;
          const t = cv[a] / (cv[a] - cv[b]);
          sx += (a & 1) + t * ((b & 1) - (a & 1));
          sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1));
          sz += ((a >> 2) & 1) + t * (((b >> 2) & 1) - ((a >> 2) & 1));
          n++;
        }
        cellVert[cellAt(i, j, k)] = verts.length / 3;
        verts.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
      }

  const tris = [];
  const quad = (a, b, c, d) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const dist = (p, q) => Math.hypot(verts[p * 3] - verts[q * 3], verts[p * 3 + 1] - verts[q * 3 + 1], verts[p * 3 + 2] - verts[q * 3 + 2]);
    if (dist(a, c) < dist(b, d)) tris.push(a, b, c, a, c, d);
    else tris.push(a, b, d, b, c, d);
  };
  for (let k = 1; k < CZ; k++)
    for (let j = 1; j < CY; j++)
      for (let i = 1; i < CX; i++) {
        const v0 = field[at(i, j, k)] < 0;
        // 辺のまわりの4つのセルを、辺の向きに対して右回りに並べる
        if (v0 !== field[at(i + 1, j, k)] < 0) {
          const q = [cellVert[cellAt(i, j - 1, k - 1)], cellVert[cellAt(i, j, k - 1)], cellVert[cellAt(i, j, k)], cellVert[cellAt(i, j - 1, k)]];
          v0 ? quad(q[0], q[1], q[2], q[3]) : quad(q[3], q[2], q[1], q[0]);
        }
        if (v0 !== field[at(i, j + 1, k)] < 0) {
          const q = [cellVert[cellAt(i - 1, j, k - 1)], cellVert[cellAt(i - 1, j, k)], cellVert[cellAt(i, j, k)], cellVert[cellAt(i, j, k - 1)]];
          v0 ? quad(q[0], q[1], q[2], q[3]) : quad(q[3], q[2], q[1], q[0]);
        }
        if (v0 !== field[at(i, j, k + 1)] < 0) {
          const q = [cellVert[cellAt(i - 1, j - 1, k)], cellVert[cellAt(i, j - 1, k)], cellVert[cellAt(i, j, k)], cellVert[cellAt(i - 1, j, k)]];
          v0 ? quad(q[0], q[1], q[2], q[3]) : quad(q[3], q[2], q[1], q[0]);
        }
      }
  log(`${verts.length / 3} vertices, ${tris.length / 3} triangles`);

  const VN = verts.length / 3;
  const pos = new Float32Array(verts);
  const nrm = new Float32Array(VN * 3);
  const E = 0.003;
  const grad = (x, y, z) => [sdf(x + E, y, z) - sdf(x - E, y, z), sdf(x, y + E, z) - sdf(x, y - E, z), sdf(x, y, z + E) - sdf(x, y, z - E)];
  for (let v = 0; v < VN; v++) {
    let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const d = sdf(x, y, z);
    let g = grad(x, y, z);
    const gl2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
    if (gl2 > 1e-12) {
      const s = clamp((d * 2 * E) / gl2, -h * 0.6, h * 0.6);
      x -= g[0] * s;
      y -= g[1] * s;
      z -= g[2] * s;
      g = grad(x, y, z);
    }
    const l = Math.hypot(g[0], g[1], g[2]) || 1;
    pos.set([x, y, z], v * 3);
    nrm.set([g[0] / l, g[1] / l, g[2] / l], v * 3);
  }
  // 三角形の向きを、1つずつ法線に合わせる。表面にのせ直したときに折れ返った小さな三角形があると、
  // そこだけ裏向きになって穴があき、ふちどりの黒が見えてしまう
  let flipped = 0;
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const n = [0, 1, 2].map((i) => nrm[a * 3 + i] + nrm[b * 3 + i] + nrm[c * 3 + i]);
    if ((uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0) {
      tris[t + 1] = c;
      tris[t + 2] = b;
      flipped++;
    }
  }
  log(`surface refined (${flipped} triangles turned)`);
  return { pos, nrm, tris };
}

// ---------- 骨の重み ----------
const segDist = (px, py, pz, a, b) => {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const t = clamp(((px - a[0]) * bx + (py - a[1]) * by + (pz - a[2]) * bz) / (bx * bx + by * by + bz * bz), 0, 1);
  return Math.hypot(px - a[0] - bx * t, py - a[1] - by * t, pz - a[2] - bz * t);
};

/** 骨までの距離が近いほど重くする。bones は [name, parent, head, tail] の一覧 */
export const byDistance = (bones, names, px, py, pz) => {
  const ws = names.map((n) => {
    const b = bones.find((x) => x[0] === n);
    return 1 / (segDist(px, py, pz, b[2], b[3]) + 0.06) ** 4;
  });
  const sum = ws.reduce((a, b) => a + b, 0);
  return names.map((n, i) => [n, ws[i] / sum]);
};

/**
 * 頂点がどの部品（胴・頭・足…）の表面にあるかを距離で決めて、部品ごとの重みを混ぜる。
 * groups は [部品までの距離, () => [[骨の名前, 重み], ...]] の一覧
 */
export const blendGroups = (groups) => {
  const dmin = Math.min(...groups.map((g) => g[0]));
  const out = new Map();
  for (const [d, weights] of groups) {
    const m = Math.exp(-(d - dmin) / 0.05);
    if (m < 0.01) continue;
    for (const [n, w] of weights()) out.set(n, (out.get(n) ?? 0) + m * w);
  }
  return out;
};

// ---------- 書き出し ----------
/**
 * dino: { name, bones, eyes, teeth, color(p, n), gloss(p, n), skin(p) }
 * color は sRGB の [r, g, b]（0〜1）、gloss はつや（0 = 肌、1 = 角・つめのようにつやつや）。
 * eyes は { center, axis, radius, lid }（lid はまぶたの色。sRGB）
 */
export function writeModel(outDir, dino, { pos, nrm, tris }, log) {
  const VN = pos.length / 3;
  const col = new Uint8Array(VN * 4);
  const gloss = new Uint8Array(VN);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < VN; v++) {
    const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
    const n = [nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]];
    const c = dino.color(p, n);
    col.set([...c.map((x) => Math.round(clamp(x, 0, 1) * 255)), 255], v * 4);
    gloss[v] = Math.round(clamp(dino.gloss(p, n), 0, 1) * 255);
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p[i]);
      max[i] = Math.max(max[i], p[i]);
    }
  }
  const bounds = { min: min.map((x) => Number(x.toFixed(3))), max: max.map((x) => Number(x.toFixed(3))) };
  // models.ts の MODEL_INFO（back / front / height）に写す値
  log(`colors  back ${bounds.min[0]}  front ${bounds.max[0]}  height ${bounds.max[1]}`);

  const boneIndex = Object.fromEntries(dino.bones.map((b, i) => [b[0], i]));
  const skinIndex = new Uint8Array(VN * 4);
  const skinWeight = new Uint8Array(VN * 4);
  for (let v = 0; v < VN; v++) {
    const weights = dino.skin(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    const top = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = top.reduce((a, b) => a + b[1], 0);
    const q = top.map(([, w]) => Math.round((w / total) * 255));
    q[0] += 255 - q.reduce((a, b) => a + b, 0);
    top.forEach(([n], i) => {
      skinIndex[v * 4 + i] = boneIndex[n];
      skinWeight[v * 4 + i] = q[i];
    });
  }
  log("skin weights");

  const index = new Uint32Array(tris);
  const parts = [
    ["position", new Uint8Array(pos.buffer)],
    ["normal", new Uint8Array(nrm.buffer)],
    ["color", col],
    ["gloss", gloss],
    ["skinIndex", skinIndex],
    ["skinWeight", skinWeight],
    ["index", new Uint8Array(index.buffer)],
  ];
  const offsets = {};
  let size = 0;
  for (const [name, bytes] of parts) {
    offsets[name] = size;
    size += Math.ceil(bytes.byteLength / 4) * 4;
  }
  const bin = new Uint8Array(size);
  for (const [name, bytes] of parts) bin.set(bytes, offsets[name]);
  const meta = {
    vertexCount: VN,
    indexCount: index.length,
    offsets,
    bounds,
    bones: dino.bones.map(([name, parent, head, tail]) => ({ name, parent: parent ? boneIndex[parent] : -1, head, tail })),
    eyes: dino.eyes,
    teeth: dino.teeth ?? [],
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${dino.name}.bin`), bin);
  writeFileSync(join(outDir, `${dino.name}.json`), JSON.stringify(meta));
  log(`wrote ${dino.name}.bin (${(size / 1e6).toFixed(1)} MB)`);
}
