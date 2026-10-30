import * as THREE from "three";

// うろこはメッシュには入れず、シェーダーで描く。
// 骨で動く前の位置（vRest）で模様を決めるので、歩いてもうろこが体にくっついたまま。
// 頂点ごとの detail = (小さいうろこの割合, うろこの強さ) は scripts/dino3d/*.mjs で決めている。
const scalesGlsl = (big: number, small: number) => /* glsl */ `
varying vec3 vRest;
varying vec2 vDetail;

vec3 dinoHash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

// いちばん近い点と2番目に近い点までの距離（ボロノイ）
vec2 dinoCells(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int x = -1; x <= 1; x++)
  for (int y = -1; y <= 1; y++)
  for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 r = g + dinoHash(i + g) - f;
    float d = dot(r, r);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
  }
  return sqrt(vec2(f1, f2));
}

float dinoCellHeight(vec3 q) {
  vec2 c = dinoCells(q);
  return smoothstep(0.0, 0.3, c.y - c.x);
}

// 0 = うろこのすき間、1 = うろこの真ん中。遠くて細かすぎるときは fade を下げる。
// 大きさを場所でなめらかに変えると模様がのびてしまうので、大小2つの模様を混ぜる
float dinoScaleHeight(vec3 p, float small, out float fade) {
  vec3 qa = p * ${big.toFixed(1)};
  vec3 qb = p * ${small.toFixed(1)};
  float fa = 1.0 - smoothstep(0.12, 0.45, length(fwidth(qa)));
  float fb = 1.0 - smoothstep(0.12, 0.45, length(fwidth(qb)));
  fade = mix(fa, fb, small);
  return mix(dinoCellHeight(qa), dinoCellHeight(qb), small);
}

// 高さ h の凹凸で法線を傾ける（Mikkelsen の bump mapping）
vec3 dinoPerturb(vec3 surfPos, vec3 surfNorm, float h, float faceDir) {
  vec3 sx = dFdx(surfPos);
  vec3 sy = dFdy(surfPos);
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`;

export const createDinoSkinMaterial = (scales: { big: number; small: number }) => {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
  material.customProgramCacheKey = () => `dino-skin-${scales.big}-${scales.small}`;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 detail;\nvarying vec3 vRest;\nvarying vec2 vDetail;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = position;\nvDetail = detail;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${scalesGlsl(scales.big, scales.small)}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float dinoFade;
        float dinoH = dinoScaleHeight(vRest, vDetail.x, dinoFade);
        dinoFade *= vDetail.y;
        diffuseColor.rgb *= mix(1.0, mix(0.84, 1.04, dinoH), dinoFade);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        normal = dinoPerturb(-vViewPosition, normal, dinoH * 0.006 * dinoFade, faceDirection);`,
      );
  };
  return material;
};
