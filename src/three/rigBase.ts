import * as THREE from "three";
import type { DinoAsset } from "./dinoAsset";
import { createDinoSkinMaterial } from "./dinoMaterial";

/** 3D の恐竜の姿勢。恐竜ごとに使うものだけ見る */
export type DinoPose3D = {
  /** 歩きの周期（0〜1 をくり返す）。止まっているときは undefined */
  walk?: number;
  /** 歩幅の大きさ。歩き出しや止まるときに少しずつ変える（既定は 1） */
  stride?: number;
  /** 立っているときの呼吸とゆれ。フレーム数を入れる */
  idle?: number;
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

/** 骨入りの恐竜。骨・目・歯をつけるところまでを受け持つ。動きは恐竜ごとのクラスで */
export abstract class DinoRig {
  readonly group = new THREE.Group();
  protected readonly bones = new Map<string, THREE.Bone>();
  protected readonly restHead = new Map<string, V2>();
  protected readonly restTail = new Map<string, V2>();

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
    const mesh = new THREE.SkinnedMesh(geometry, createDinoSkinMaterial(meta.scales));
    mesh.add(list[meta.bones.findIndex((b) => b.parent < 0)]);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.group.add(mesh);

    const toLocal = (bone: string, p: [number, number, number]) => {
      const h = meta.bones.find((b) => b.name === bone)!.head;
      return new THREE.Vector3(p[0] - h[0], p[1] - h[1], p[2] - h[2]);
    };
    // 目：つやのある黄色い目に、たての黒目
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: "#c98b22", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: "#090705", roughness: 0.2 });
    for (const eye of meta.eyes) {
      const axis = new THREE.Vector3(...eye.axis);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(eye.radius, 32, 24), eyeMat);
      ball.position.copy(toLocal("head", eye.center));
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(eye.radius, 24, 16), pupilMat);
      pupil.scale.set(0.16, 0.62, 0.16);
      pupil.position.copy(axis.clone().multiplyScalar(eye.radius * 0.88));
      pupil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
      ball.add(pupil);
      this.bones.get("head")!.add(ball);
    }
    const toothMat = new THREE.MeshStandardMaterial({ color: "#e8dcc0", roughness: 0.35 });
    for (const t of meta.teeth) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(t.radius, t.length, 10), toothMat);
      const dir = new THREE.Vector3(...t.dir);
      tooth.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      tooth.position.copy(toLocal(t.bone, t.base).addScaledVector(dir, t.length / 2));
      tooth.castShadow = true;
      this.bones.get(t.bone)!.add(tooth);
    }
  }

  protected bone(name: string) {
    return this.bones.get(name)!;
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
