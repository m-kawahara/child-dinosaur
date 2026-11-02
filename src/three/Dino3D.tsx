import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BrachiosaurusRig } from "./brachiosaurusRig";
import { type DinoAsset, type DinoModelName, loadDinoAsset } from "./dinoAsset";
import { PteranodonRig } from "./pteranodonRig";
import type { DinoPose3D, DinoRig } from "./rigBase";
import { StegosaurusRig } from "./stegosaurusRig";
import { TRexRig } from "./trexRig";
import { TriceratopsRig } from "./triceratopsRig";

export type CameraSpec = { position: [number, number, number]; lookAt: [number, number, number]; fov: number };

const RIGS: Record<DinoModelName, new (asset: DinoAsset) => DinoRig> = {
  trex: TRexRig,
  triceratops: TriceratopsRig,
  stegosaurus: StegosaurusRig,
  brachiosaurus: BrachiosaurusRig,
  pteranodon: PteranodonRig,
};

const CameraRig: React.FC<CameraSpec> = ({ position, lookAt, fov }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.fov = fov;
    camera.near = 0.1;
    camera.far = 200;
    camera.lookAt(...lookAt);
    camera.updateProjectionMatrix();
  }, [camera, position, lookAt, fov]);
  return null;
};

/** 背景の太陽（右上）に合わせて、右上から光を当てる */
const Lighting: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    // 明るい体の色がくすまないトーンマップ
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
  }, [gl, scene]);
  const key = useMemo(() => {
    const light = new THREE.DirectionalLight("#fff2dc", 2.6);
    // 高めの太陽にして影を短く（影が手前の地面からはみ出さないように）
    light.position.set(2.5, 14, 4.5);
    light.castShadow = true;
    light.shadow.mapSize.set(4096, 4096);
    Object.assign(light.shadow.camera, { left: -14, right: 14, top: 8, bottom: -8, near: 0.5, far: 40 });
    light.shadow.bias = -0.0003;
    light.shadow.normalBias = 0.02;
    return light;
  }, []);
  return (
    <>
      {/* 下からの照り返しは砂地の明るい色に（おなかや翼の裏がくすまないように） */}
      <hemisphereLight args={["#d8ecff", "#f3e6d2", 1.0]} />
      <primitive object={key} />
      <directionalLight position={[-4, 5, -7]} intensity={1.4} color="#cfe2ff" />
      {/* 影を受ける地面は手前だけ。奥まであると、2D の丘の上に影が落ちてしまう */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.005, 5]} receiveShadow>
        <planeGeometry args={[80, 14]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </>
  );
};

/** 1ぴき分の置き方。y は空を飛ぶときの高さ、z は奥行き（マイナスが奥）、turn はこちらへ向ける角度 */
export type Dino3DItem = { name: DinoModelName; pose: DinoPose3D; x: number; y?: number; z?: number; scale?: number; turn?: number };

const DinoMesh: React.FC<{ item: Dino3DItem; asset: DinoAsset }> = ({ item, asset }) => {
  const rig = useMemo(() => new RIGS[item.name](asset), [item.name, asset]);
  rig.update(item.pose);
  return <primitive object={rig.group} position={[item.x, item.y ?? 0, item.z ?? 0]} rotation={[0, item.turn ?? 0, 0]} scale={item.scale ?? 1} />;
};

/**
 * モデルを全部読み終えるまで待つ。書き出し中の ThreeCanvas はフレームが変わったときしか描かないので、
 * 読み終えてからキャンバスを作る（作ったときに1回描く）。
 */
const useDinoAssets = (names: DinoModelName[]) => {
  const key = [...new Set(names)].sort().join(",");
  const [assets, setAssets] = useState<Map<DinoModelName, DinoAsset> | null>(null);
  const [handle] = useState(() => delayRender(`3D の恐竜（${key}）を読み込み中`));
  useEffect(() => {
    const list = key.split(",") as DinoModelName[];
    Promise.all(list.map(loadDinoAsset)).then(
      (loaded) => setAssets(new Map(list.map((n, i) => [n, loaded[i]]))),
      (e) => cancelRender(e),
    );
  }, [key]);
  // キャンバスが自分の delayRender を登録してから手放す
  useLayoutEffect(() => {
    if (assets) continueRender(handle);
  }, [assets, handle]);
  return assets;
};

/** 背景の上に重ねる、背景が透明な 3D の恐竜たち（1つのキャンバスにまとめて描く） */
export const Dinos3D: React.FC<{ items: Dino3DItem[]; width: number; height: number; camera: CameraSpec }> = ({ items, width, height, camera }) => {
  const assets = useDinoAssets(items.map((d) => d.name));
  if (!assets) return null;
  return (
    <ThreeCanvas width={width} height={height} shadows gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}>
      <CameraRig {...camera} />
      <Lighting />
      {items.map((item, i) => (
        <DinoMesh key={i} item={item} asset={assets.get(item.name)!} />
      ))}
    </ThreeCanvas>
  );
};

/** 1ぴきだけのとき */
export const Dino3D: React.FC<{
  name: DinoModelName;
  width: number;
  height: number;
  pose: DinoPose3D;
  x: number;
  y?: number;
  scale?: number;
  camera: CameraSpec;
}> = ({ name, width, height, pose, x, y, scale, camera }) => (
  <Dinos3D items={[{ name, pose, x, y, scale }]} width={width} height={height} camera={camera} />
);
