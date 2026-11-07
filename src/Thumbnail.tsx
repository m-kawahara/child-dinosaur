import React from "react";
import { AbsoluteFill } from "remotion";
import { INK } from "./components/Background";
import { Pill, StickerText } from "./components/Sticker";
import type { Episode } from "./data/types";
import { episodeNumber } from "./scenes/Opening";
import { type Dino3DItem, Dinos3D } from "./three/Dino3D";
import { MODEL_INFO, modelOf } from "./three/models";

// 小さな画面でも目立つように、黄色の集中線と白まじりの大きなタイトル
const TITLE_COLORS = ["#ff7b54", "#ffffff", "#5cc46b", "#4aa8e8", "#ffffff", "#f08fb0", "#ffffff", "#b58ad6"];
const BURST = { x: 510, y: 705 };

/** 主役（1ぴき目）は手前で大きくほえて、ほかは右の奥。ほぼ水平のカメラで、みんな同じ地面に立つ */
const CAMERA = { position: [1.0, 3.0, 15] as [number, number, number], lookAt: [1.0, 4.1, 0] as [number, number, number], fov: 36 };
const BACK_SPOTS = [
  { x: 4.4, z: -2.5 },
  { x: 7.6, z: -12 },
  { x: 10.4, z: -4.5 },
];

/** おすもうの回：東（左）と西（右）が、こちらへ少し体を向けて押し合う */
const BOUT_CAMERA = { position: [0, 3.4, 21] as [number, number, number], lookAt: [0, 5.6, 0] as [number, number, number], fov: 36 };const boutItems = (episode: Episode): Dino3DItem[] => {
  const bout = episode.bout!;
  const model = (id: string) => modelOf(episode.dinos.find((d) => d.id === id)!.kind);
  return [
    { name: model(bout.east), x: -5.6, z: 0.6, turn: -0.3, pose: { jaw: 1, raise: 0.5, lean: 0.4, idle: 0 } },
    { name: model(bout.west), x: 5.9, z: 0.6, turn: Math.PI + 0.3, scale: 1.1, pose: { butt: 0.6, lean: 0.6, jaw: 0.2, idle: 20 } },
  ];
};

const items = (episode: Episode): Dino3DItem[] => {
  if (episode.bout) return boutItems(episode);
  const [star, ...rest] = episode.dinos;
  const walkers = rest.filter((d) => !MODEL_INFO[modelOf(d.kind)].flies);
  const flyers = rest.filter((d) => MODEL_INFO[modelOf(d.kind)].flies);
  return [
    { name: modelOf(star.kind), x: -4.6, z: 1.2, turn: -0.5, pose: { jaw: 1, raise: 0.5, idle: 0 } },
    ...walkers.slice(0, BACK_SPOTS.length).map((d, i) => ({ name: modelOf(d.kind), ...BACK_SPOTS[i], scale: 0.7, turn: -0.3, pose: { idle: i * 30 } })),
    ...flyers.slice(0, 1).map((d) => ({ name: modelOf(d.kind), x: 6.8, y: 4.5, z: -1, scale: 0.85, pose: { flap: 0.15, bank: 0.2 } })),
  ];
};

/** 1920x1080 で組んで 1280x720 に縮める */
export const Thumbnail: React.FC<{ episode: Episode }> = ({ episode }) => (
  <AbsoluteFill style={{ width: 1920, height: 1080, transform: "scale(0.6667)", transformOrigin: "top left", background: "#ffd95a" }}>
    <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(${BURST.x} ${BURST.y})`} fill="#fff" opacity={0.45}>
        {Array.from({ length: 16 }, (_, i) => (
          <polygon key={i} points="0,0 2300,-226 2300,226" transform={`rotate(${i * 22.5})`} />
        ))}
      </g>
      <g stroke={INK} strokeWidth={9} strokeLinejoin="round">
        <path d="M-15 915 Q 480 840 960 900 T 1935 885 L 1935 1095 L -15 1095 Z" fill="#7cc46a" />
        <path d="M-15 990 Q 480 968 960 990 T 1935 990 L 1935 1095 L -15 1095 Z" fill="#f3d491" />
      </g>
    </svg>
    <AbsoluteFill>
      <Dinos3D items={items(episode)} width={1920} height={1080} camera={episode.bout ? BOUT_CAMERA : CAMERA} />
    </AbsoluteFill>
    {episode.bout ? (
      <div style={{ position: "absolute", left: 0, right: 0, top: 440 }}>
        <StickerText text="VS" size={210} colors={["#ff4d4d", "#ffffff"]} letterSpacing={-6} />
      </div>
    ) : null}
    <div style={{ position: "absolute", top: 34, left: 0, right: 0 }}>
      <StickerText text={episode.title} size={episode.bout ? 172 : 196} colors={TITLE_COLORS} letterSpacing={3} lineHeight={1.08} />
    </div>
    <div style={{ position: "absolute", top: 40, left: 40 }}>
      <Pill size={54} rotate={-6} background={INK} color="#fff">
        だい{episodeNumber(episode)}わ
      </Pill>
    </div>
    <div style={{ position: "absolute", right: 70, bottom: 40 }}>
      <Pill size={72} rotate={-3} background="#ff7b54" color="#fff" style={{ borderRadius: 42 }}>
        {episode.bout ? "おすもう たいけつ！" : `${episode.dinos.length}ひき とうじょう！`}
      </Pill>
    </div>
  </AbsoluteFill>
);
