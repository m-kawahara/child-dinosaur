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
    gl.toneMapping = THREE.ACESFilmicToneMapping;
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
      <hemisphereLight args={["#d8ecff", "#8a7a5a", 0.6]} />
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

const DinoMesh: React.FC<{ name: DinoModelName; asset: DinoAsset; pose: DinoPose3D; x: number; y: number; scale: number }> = ({
  name,
  asset,
  pose,
  x,
  y,
  scale,
}) => {
  const rig = useMemo(() => new RIGS[name](asset), [name, asset]);
  rig.update(pose);
  return <primitive object={rig.group} position={[x, y, 0]} scale={scale} />;
};

/**
 * モデルを読み終えるまで待つ。書き出し中の ThreeCanvas はフレームが変わったときしか描かないので、
 * 読み終えてからキャンバスを作る（作ったときに1回描く）。
 */
const useDinoAsset = (name: DinoModelName) => {
  const [asset, setAsset] = useState<DinoAsset | null>(null);
  const [handle] = useState(() => delayRender(`3D の恐竜（${name}）を読み込み中`));
  useEffect(() => {
    loadDinoAsset(name).then(setAsset, (e) => cancelRender(e));
  }, [name]);
  // キャンバスが自分の delayRender を登録してから手放す
  useLayoutEffect(() => {
    if (asset) continueRender(handle);
  }, [asset, handle]);
  return asset;
};

/** 背景の上に重ねる、背景が透明な 3D の恐竜。y は空を飛ぶときの高さ */
export const Dino3D: React.FC<{
  name: DinoModelName;
  width: number;
  height: number;
  pose: DinoPose3D;
  x: number;
  y?: number;
  scale?: number;
  camera: CameraSpec;
}> = ({ name, width, height, pose, x, y = 0, scale = 1, camera }) => {
  const asset = useDinoAsset(name);
  if (!asset) return null;
  return (
    <ThreeCanvas width={width} height={height} shadows gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}>
      <CameraRig {...camera} />
      <Lighting />
      <DinoMesh name={name} asset={asset} pose={pose} x={x} y={y} scale={scale} />
    </ThreeCanvas>
  );
};
