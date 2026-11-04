import * as THREE from "three";

// 肌はソフビ人形のように、つるっとやわらかく。
// 頂点ごとの gloss（0〜1）で、角・つめ・くちばしだけつやを出す（scripts/dino3d/*.mjs で決めている）。
// ふちに少しだけ体の色の光を足して、背景の絵から浮き立たせる。
export const createDinoSkinMaterial = () => {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
  material.customProgramCacheKey = () => "dino-skin";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float gloss;\nvarying float vGloss;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGloss = gloss;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vGloss;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.28, vGloss);")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float dinoRim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);
        totalEmissiveRadiance += diffuseColor.rgb * dinoRim * 0.3;`,
      );
  };
  return material;
};

/**
 * ふちどり。体を裏返して、画面の上で px だけふくらませて描く（背景と同じ、シール絵本ふうの線）。
 * 骨で動いたあとの法線（objectNormal。裏向きの面にする前の向き）でふくらませるので、骨入りのメッシュ（SkinnedMesh）に使う。
 * 少し奥（depth、ワールド単位）へずらして、体の小さなくぼみには線が出ないようにする（足と胴の重なりには出る）。
 * 画面の大きさ（viewport）は描く直前に入れる
 */
export const createOutlineMaterial = (color: THREE.ColorRepresentation, px: number, depth: number) => {
  const uniforms = { outlinePx: { value: px }, outlineDepth: { value: depth }, viewport: { value: new THREE.Vector2(1920, 1080) } };
  const material = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  material.customProgramCacheKey = () => "dino-outline";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float outlinePx;\nuniform float outlineDepth;\nuniform vec2 viewport;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        mvPosition.z -= outlineDepth;
        gl_Position = projectionMatrix * mvPosition;
        vec2 outlineDir = normalize((projectionMatrix * vec4(normalMatrix * objectNormal, 0.0)).xy * viewport + 1e-6);
        gl_Position.xy += outlineDir * outlinePx * 2.0 / viewport * gl_Position.w;`,
      );
  };
  return { material, uniforms };
};
