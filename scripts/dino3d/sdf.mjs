// 恐竜の形を組み立てる部品（距離関数）と、小さな数学、5ひき共通の顔の部品。
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

export const boxDist = (px, py, pz, b) => {
  const dx = Math.max(b[0] - px, 0, px - b[3]);
  const dy = Math.max(b[1] - py, 0, py - b[4]);
  const dz = Math.max(b[2] - pz, 0, pz - b[5]);
  return Math.hypot(dx, dy, dz);
};

/** 目の穴をあける。目（別のメッシュ）は表面から少し出っぱり、穴とのすき間がこい紫のふちに見える */
export const withEye = (d, px, py, az, eye) => smax(d, -sdSphere(px, py, az, eye.center, eye.radius * 1.1), eye.radius * 0.25);

/**
 * 高さ (x, y) のところで、右（z が大きいほう）から体の表面をさがして、表面の z を返す。
 * 部品の箱から遠いと距離関数は大きな値（10）を返すので、1歩は 0.05 までにする
 */
export const surfaceZ = (sdf, x, y, from = 2) => {
  let z = from;
  for (let i = 0; i < 1000; i++) {
    const d = sdf(x, y, z);
    if (d < 0.0005) return z;
    z -= clamp(d * 0.9, 0.0005, 0.05);
    if (z < 0) return null;
  }
  return null;
};

/**
 * かわいい目の置き方。(x, y) の高さの右の表面から、axis にそって半径の inset 倍だけ中に目の中心を置く
 * （目は表面から少し出っぱる）。左右の目と、まぶたの色 lid をまとめて返す
 */
export const placeEyes = (sdf, x, y, axis, radius, lid, inset = 0.4) => {
  const z = surfaceZ(sdf, x, y);
  const c = [x - axis[0] * radius * inset, y - axis[1] * radius * inset, z - axis[2] * radius * inset];
  const right = { center: c, axis, radius };
  return {
    eye: right,
    eyes: [1, -1].map((s) => ({ center: [c[0], c[1], s * c[2]], axis: [axis[0], axis[1], s * axis[2]], radius, lid })),
  };
};

/** 目のまわりの度合い（目の穴のふちにおなかの色などをつけないため） */
export const nearEye = (px, py, az, eye) =>
  1 - smoothstep(eye.radius * 1.3, eye.radius * 1.6, Math.hypot(px - eye.center[0], py - eye.center[1], az - eye.center[2]));

/** 顔の色（5ひき共通）：ほおのチーク、口の中、舌、つめ・角 */
export const FACE = { cheek: hex(0xff8fa3), mouth: hex(0xc2475a), tongue: hex(0xff8597), nail: hex(0xfff3d6) };

/** 頭だけを大きくする座標の写し方。頭は「頭の座標」で作り、首のつけ根 pivot を中心に scale 倍して置く */
export const headSpace = (pivot, scale) => ({
  scale,
  /** 体の座標 → 頭の座標 */
  toHead: (px, py, pz) => [pivot[0] + (px - pivot[0]) / scale, pivot[1] + (py - pivot[1]) / scale, pz / scale],
  /** 頭の座標 → 体の座標 */
  fromHead: ([x, y, z = 0]) => [pivot[0] + (x - pivot[0]) * scale, pivot[1] + (y - pivot[1]) * scale, z * scale],
});

/**
 * 口。lipY は頭の座標での口の線（口を閉じたときの上あごと下あごの境目）、corner は口の角の x、gap は口のすき間の半分の幅。
 * 返す関数は体の座標で使う
 */
export const makeMouth = ({ toHead, scale }, lipY, corner, gap) => {
  const halfGap = (hx) => gap * smoothstep(corner - 0.02, corner + 0.15, hx);
  /** 口の線からの高さ（上あご側がプラス） */
  const dist = (px, py) => {
    const [hx, hy] = toHead(px, py, 0);
    return (hy - lipY(hx)) * scale;
  };
  return {
    dist,
    /** 口のすき間をあける */
    carve: (d, px, py) => {
      const [hx] = toHead(px, py, 0);
      return hx > corner - 0.03 ? smax(d, -(Math.abs(dist(px, py)) - halfGap(hx) * scale), 0.008) : d;
    },
    /**
     * inside は口の中の度合い（すき間の内側の面ほど 1）。0 か 1 かで分けると口のふちがギザギザになるので、なめらかに。
     * near は口のまわり（下を向いていても、おなかの色をつけない）
     */
    at: (px, py, ny) => {
      const [hx] = toHead(px, py, 0);
      if (hx < corner - 0.3) return { inside: 0, near: 0 };
      const g = halfGap(hx) * scale;
      const d = dist(px, py);
      return {
        inside: smoothstep(g + 0.045, g + 0.012, Math.abs(d)) * smoothstep(0.15, 0.5, Math.abs(ny)) * smoothstep(corner - 0.08, corner + 0.02, hx),
        near: d > 0 ? smoothstep(0.34, 0.2, d) : smoothstep(0.08, 0.03, -d),
      };
    },
    /** 下あご（jaw の骨）の重み */
    jawWeight: (px, py) => smoothstep(0.03, -0.03, dist(px, py)) * smoothstep(corner - 0.18, corner + 0.02, toHead(px, py, 0)[0]),
  };
};

/** 点の近さで色をまぜる（ほおのチークやまだら）。spots は [x, y, z, 半径]、z は右側の値（左右同じにする） */
export const spotAmount = (px, py, az, spots) => {
  let m = 0;
  for (const [x, y, z, r] of spots) {
    const d = Math.hypot(px - x, py - y, az - z);
    if (d < r) m = Math.max(m, 1 - smoothstep(r * 0.6, r, d));
  }
  return m;
};
