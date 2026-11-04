import * as THREE from "three";
import { INK } from "../components/Background";
import type { DinoAsset } from "./dinoAsset";
import { createDinoSkinMaterial, createOutlineMaterial } from "./dinoMaterial";

/** 3D の恐竜の姿勢。恐竜ごとに使うものだけ見る */
export type DinoPose3D = {
  /** 歩きの周期（0〜1 をくり返す）。止まっているときは undefined */
  walk?: number;
  /** 歩幅の大きさ。歩き出しや止まるときに少しずつ変える（既定は 1） */
  stride?: number;
  /** 立っているときの呼吸とゆれ。フレーム数を入れる */
  idle?: number;
  /** まばたき 0〜1（1 で目を閉じる） */
  blink?: number;
  /** 口の開き 0〜1 */
  jaw?: number;
  /** 頭を持ち上げる量 0〜1（ほえるとき） */
  raise?: number;
  /** 頭を下げて前に出る量 0〜1（頭突き） */
  butt?: number;
  /** しっぽを振る向きと大きさ -1〜1 */
  tailSwing?: number;
  /** 首を上へのばす量 0〜1 */
  reach?: number;
  /** 口をもぐもぐする開き 0〜1 */
  munch?: number;
  /** はばたきの周期（1 で1回） */
  flap?: number;
  /** 飛ぶときの体の傾き（左右・前後。ラジアン） */
  bank?: number;
  pitch?: number;
};

export type V2 = { x: number; y: number };

export const TAU = Math.PI * 2;
export const smoothstep = THREE.MathUtils.smoothstep;
export const angleOf = (v: V2) => Math.atan2(v.y, v.x);
export const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
export const len = (v: V2) => Math.hypot(v.x, v.y);
export const rot = (v: V2, a: number): V2 => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });

/** 足の4つの骨（もも・すね・甲・指）の、もとの位置 */
export type LegRest = { hip: V2; knee: V2; ankle: V2; ball: V2; tip: V2 };

/** 歩きの周期 q（0〜1）での足先の位置（もとの位置からのずれ）。前半が地面、後半が浮いている */
export const footPath = (q: number, gait: { stride: number; lift: number; stance: number }) => {
  if (q < gait.stance) {
    const s = q / gait.stance;
    return { dx: gait.stride / 2 - gait.stride * s, dy: 0, stance: s, swing: -1 };
  }
  const s = (q - gait.stance) / (1 - gait.stance);
  return { dx: -gait.stride / 2 + gait.stride * (3 * s * s - 2 * s * s * s), dy: gait.lift * Math.sin(Math.PI * s), stance: -1, swing: s };
};

/**
 * 足先（ball）と、足の甲・指の向き（met, toe はワールドの角度）から、ひざを逆算する（2本の骨の IK）。
 * kneeForward: ひざが前に出る（後ろ足）か、ひじが後ろに出る（前足）か。
 * 返すのは4本の骨それぞれの回転（親の骨からの差）
 */
export const solveLeg = (rest: LegRest, hip: V2, ball: V2, met: number, toe: number, kneeForward: boolean, parentAngle: number) => {
  const LF = len(sub(rest.knee, rest.hip));
  const LT = len(sub(rest.ankle, rest.knee));
  const LM = len(sub(rest.ankle, rest.ball));
  const toeLen = len(sub(rest.tip, rest.ball));
  const ankle = { x: ball.x + LM * Math.cos(met), y: ball.y + LM * Math.sin(met) };
  const toHip = sub(ankle, hip);
  const d = THREE.MathUtils.clamp(len(toHip), Math.abs(LF - LT) + 1e-3, LF + LT - 1e-3);
  const a = Math.acos((LF * LF + d * d - LT * LT) / (2 * LF * d));
  const base = angleOf(toHip);
  const k1 = { x: hip.x + LF * Math.cos(base + a), y: hip.y + LF * Math.sin(base + a) };
  const k2 = { x: hip.x + LF * Math.cos(base - a), y: hip.y + LF * Math.sin(base - a) };
  const knee = (k1.x > k2.x) === kneeForward ? k1 : k2;
  const tip = { x: ball.x + toeLen * Math.cos(toe), y: ball.y + toeLen * Math.sin(toe) };
  // 骨がもとの向きからどれだけ回ったか（ワールド）
  const dUpper = angleOf(sub(knee, hip)) - angleOf(sub(rest.knee, rest.hip));
  const dLower = angleOf(sub(ankle, knee)) - angleOf(sub(rest.ankle, rest.knee));
  const dFoot = angleOf(sub(ball, ankle)) - angleOf(sub(rest.ball, rest.ankle));
  const dToe = angleOf(sub(tip, ball)) - angleOf(sub(rest.tip, rest.ball));
  return [dUpper - parentAngle, dLower - dUpper, dFoot - dLower, dToe - dFoot] as const;
};

/** ふちどりの太さ（1080p の画面での px）と、線を出さない小さなくぼみの深さ（ワールド単位） */
const OUTLINE_PX = 4;
const OUTLINE_DEPTH = 0.08;
// まぶたの角度（目の左右の軸まわり）。開くと頭の中へ引っこみ、閉じると目の前をおおう
const LID_OPEN = -1.35;
const LID_SHUT = 1.3;

// 目：白目に、大きな丸い黒目と、光のつぶ（2D の恐竜の目と同じ作り）
const scleraMat = new THREE.MeshPhysicalMaterial({ color: "#fdfcf8", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
const irisMat = new THREE.MeshStandardMaterial({ color: "#2b2b3a", roughness: 0.25 });
const sparkleMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
const inkMat = new THREE.MeshBasicMaterial({ color: INK });
const eyeRimMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const toothMat = new THREE.MeshStandardMaterial({ color: "#fffaf0", roughness: 0.3 });

/** 先の丸い歯（根もとが y=0、先が y=length） */
const toothGeometry = (radius: number, length: number) =>
  new THREE.LatheGeometry(
    [[1, 0], [0.97, 0.3], [0.84, 0.58], [0.6, 0.82], [0.28, 0.97], [0, 1]].map(([r, y]) => new THREE.Vector2(r * radius, y * length)),
    12,
  );

/** 骨入りの恐竜。骨・目・歯・ふちどりをつけるところまでを受け持つ。動きは恐竜ごとのクラスで */
export abstract class DinoRig {
  readonly group = new THREE.Group();
  protected readonly bones = new Map<string, THREE.Bone>();
  protected readonly restHead = new Map<string, V2>();
  protected readonly restTail = new Map<string, V2>();
  private readonly lids: THREE.Object3D[] = [];

  constructor({ meta, geometry }: DinoAsset) {
    const list = meta.bones.map((b) => {
      const bone = new THREE.Bone();
      bone.name = b.name;
      return bone;
    });
    meta.bones.forEach((b, i) => {
      const bone = list[i];
      if (b.parent >= 0) {
        const p = meta.bones[b.parent].head;
        bone.position.set(b.head[0] - p[0], b.head[1] - p[1], b.head[2] - p[2]);
        list[b.parent].add(bone);
      } else bone.position.set(...b.head);
      this.bones.set(b.name, bone);
      this.restHead.set(b.name, { x: b.head[0], y: b.head[1] });
      this.restTail.set(b.name, { x: b.tail[0], y: b.tail[1] });
    });
    const mesh = new THREE.SkinnedMesh(geometry, createDinoSkinMaterial());
    mesh.add(list[meta.bones.findIndex((b) => b.parent < 0)]);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.group.add(mesh);

    // ふちどりは、同じ形と骨を使うもう1つのメッシュ
    const outline = createOutlineMaterial(INK, OUTLINE_PX, OUTLINE_DEPTH);
    const outlineMesh = new THREE.SkinnedMesh(geometry, outline.material);
    outlineMesh.bind(mesh.skeleton, mesh.bindMatrix);
    outlineMesh.frustumCulled = false;
    outlineMesh.onBeforeRender = (renderer) => renderer.getDrawingBufferSize(outline.uniforms.viewport.value);
    this.group.add(outlineMesh);

    const toLocal = (bone: string, p: [number, number, number]) => {
      const h = meta.bones.find((b) => b.name === bone)!.head;
      return new THREE.Vector3(p[0] - h[0], p[1] - h[1], p[2] - h[2]);
    };
    for (const eye of meta.eyes) this.bone("head").add(this.makeEye(eye, toLocal("head", eye.center)));
    for (const t of meta.teeth) {
      const tooth = new THREE.Mesh(toothGeometry(t.radius, t.length), toothMat);
      tooth.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...t.dir));
      tooth.position.copy(toLocal(t.bone, t.base));
      tooth.castShadow = true;
      this.bones.get(t.bone)!.add(tooth);
    }
  }

  /**
   * 目を1つ作る。目の中の向きは z が外（axis）、y が上、x が左右の軸。
   * 白目のまわりにこい紫のふち、黒目は少し前寄り、光のつぶは右上の前。まぶたは x 軸まわりに回して閉じる
   */
  private makeEye(eye: DinoAsset["meta"]["eyes"][number], position: THREE.Vector3) {
    const r = eye.radius;
    const out = new THREE.Vector3(...eye.axis).normalize();
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(out, -out.y).normalize();
    const side = new THREE.Vector3().crossVectors(up, out);
    // 左右どちらの目でも、黒目と光が頭の前のほうへ寄るように
    const fwd = Math.sign(side.x) || 1;
    const group = new THREE.Group();
    group.position.copy(position);
    group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, out));

    group.add(new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), scleraMat));
    group.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.12, 40, 28), eyeRimMat));
    // 黒目：目の表面にはりつく丸いかさ
    const iris = new THREE.Mesh(new THREE.SphereGeometry(r * 1.006, 40, 12, 0, TAU, 0, 0.7).rotateX(Math.PI / 2), irisMat);
    iris.rotation.y = 0.18 * fwd;
    group.add(iris);
    for (const [x, y, size] of [
      [0.42, 0.3, 0.24],
      [-0.2, -0.32, 0.1],
    ]) {
      // 白目の表面にはりつく、うすい丸
      const dir = new THREE.Vector3(x * fwd, y, Math.sqrt(1 - x * x - y * y));
      const sparkle = new THREE.Mesh(new THREE.SphereGeometry(r * size, 16, 12), sparkleMat);
      sparkle.position.copy(dir).multiplyScalar(r);
      sparkle.scale.z = 0.2;
      sparkle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      group.add(sparkle);
    }
    // まぶた：上半分の殻と、ふちのこい線
    const lid = new THREE.Group();
    const lidMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...eye.lid, THREE.SRGBColorSpace), roughness: 0.62 });
    lid.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.07, 40, 16, 0, TAU, 0, Math.PI / 2), lidMat));
    lid.add(new THREE.Mesh(new THREE.TorusGeometry(r * 1.07, r * 0.07, 8, 48).rotateX(Math.PI / 2), inkMat));
    lid.rotation.x = LID_OPEN;
    this.lids.push(lid);
    group.add(lid);
    return group;
  }

  protected bone(name: string) {
    return this.bones.get(name)!;
  }

  /** まばたき（0 = 開く、1 = 閉じる） */
  protected blink(amount: number) {
    for (const lid of this.lids) lid.rotation.x = THREE.MathUtils.lerp(LID_OPEN, LID_SHUT, amount);
  }

  /** 口を開ける（jaw の骨がある恐竜だけ）。max は開ききったときの角度 */
  protected openJaw(amount: number, max: number) {
    this.bones.get("jaw")?.rotation.set(0, 0, -max * amount);
  }

  protected legRest(upper: string, lower: string, foot: string, toe: string): LegRest {
    return {
      hip: this.restHead.get(upper)!,
      knee: this.restHead.get(lower)!,
      ankle: this.restHead.get(foot)!,
      ball: this.restHead.get(toe)!,
      tip: this.restTail.get(toe)!,
    };
  }

  /**
   * 骨の付け根のいまの位置（横から見た 2D）と、親までの回転の合計。
   * 体の骨は z 回転（上下の曲げ）だけを足し合わせる
   */
  protected jointNow(name: string) {
    const chain: THREE.Bone[] = [];
    for (let b: THREE.Object3D | null = this.bone(name); b instanceof THREE.Bone; b = b.parent) chain.unshift(b);
    let p = { x: 0, y: 0 };
    let a = 0;
    chain.forEach((b, i) => {
      const r = rot({ x: b.position.x, y: b.position.y }, a);
      p = { x: p.x + r.x, y: p.y + r.y };
      if (i < chain.length - 1) a += b.rotation.z;
    });
    return { pos: p, parentAngle: a };
  }

  abstract update(pose: DinoPose3D): void;
}
