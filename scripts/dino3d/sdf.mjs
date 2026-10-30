// 恐竜の形を組み立てる部品（距離関数）と、小さな数学・ノイズ。
// 距離関数は「表面までの距離（中はマイナス）」を返す。

// ---------- 数学 ----------
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** なめらかにくっつける */
export const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
export const smax = (a, b, k) => -smin(-a, -b, k);
export const norm3 = ([x, y, z]) => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};

// ---------- 色 ----------
export const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
export const lerp3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

// ---------- ノイズ ----------
export const hash = (x, y, z) => {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x, y, z) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const a = mix(hash(xi, yi, zi), hash(xi + 1, yi, zi), u);
  const b = mix(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u);
  const c = mix(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u);
  const d = mix(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u);
  return mix(mix(a, b, v), mix(c, d, v), w) * 2 - 1;
};
export const fbm = (x, y, z) =>
  vnoise(x, y, z) * 0.55 + vnoise(x * 2.03 + 17.1, y * 2.03, z * 2.03) * 0.3 + vnoise(x * 4.1, y * 4.1 + 9.3, z * 4.1) * 0.15;

// ---------- 形の部品 ----------
export const sdSphere = (px, py, pz, c, r) => Math.hypot(px - c[0], py - c[1], pz - c[2]) - r;

export const sdEllipsoid = (px, py, pz, c, r) => {
  const x = (px - c[0]) / r[0], y = (py - c[1]) / r[1], z = (pz - c[2]) / r[2];
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const x1 = x / r[0], y1 = y / r[1], z1 = z / r[2];
  const k1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
  return (k0 * (k0 - 1)) / k1;
};

/** 軸 u, v, w（単位ベクトル）にそって置いた楕円体 */
export const sdOrientedEllipsoid = (px, py, pz, c, [u, v, w], r) => {
  const qx = px - c[0], qy = py - c[1], qz = pz - c[2];
  return sdEllipsoid(
    qx * u[0] + qy * u[1] + qz * u[2],
    qx * v[0] + qy * v[1] + qz * v[2],
    qx * w[0] + qy * w[1] + qz * w[2],
    [0, 0, 0],
    r,
  );
};

/** 両端の太さがちがう筒（Inigo Quilez の round cone） */
export const sdRoundCone = (px, py, pz, a, b, r1, r2) => {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
};

/** 横（z）方向につぶした筒。a と b は同じ z にあること */
export const rcz = (px, py, pz, a, b, r1, r2, zs) => sdRoundCone(px, py, a[2] + (pz - a[2]) / zs, a, b, r1, r2) * zs;

/** 点をつないだ先細りの筒（角やしっぽ）。points は [x, y, z, 半径] */
export const sdChain = (px, py, pz, points) => {
  let d = 10;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    d = Math.min(d, sdRoundCone(px, py, pz, a, b, a[3], b[3]));
  }
  return d;
};

/** 軸 n のまわりの輪（まぶた） */
export const sdRing = (px, py, pz, c, n, R, r) => {
  const qx = px - c[0], qy = py - c[1], qz = pz - c[2];
  const h = qx * n[0] + qy * n[1] + qz * n[2];
  const rad = Math.hypot(qx - h * n[0], qy - h * n[1], qz - h * n[2]);
  return Math.hypot(rad - R, h) - r;
};

export const boxDist = (px, py, pz, b) => {
  const dx = Math.max(b[0] - px, 0, px - b[3]);
  const dy = Math.max(b[1] - py, 0, py - b[4]);
  const dz = Math.max(b[2] - pz, 0, pz - b[5]);
  return Math.hypot(dx, dy, dz);
};

/** 目のくぼみに目を入れて、まぶたの輪で囲む */
export const withEye = (d, px, py, az, eye) => {
  d = smax(d, -sdSphere(px, py, az, eye.center, eye.radius * 1.22), 0.02);
  return smin(d, sdRing(px, py, az, eye.center, eye.axis, eye.radius * 1.2, eye.radius * 0.34), 0.025);
};
