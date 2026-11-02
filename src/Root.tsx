import React from "react";
import { type CalculateMetadataFunction, Composition, staticFile, Still } from "remotion";
import { ACTION_SE, BGM_FILE, CRIES_FILE, SE_FILES } from "./audio";
import { episode1 } from "./data/episode1";
import { buildTimeline } from "./data/timeline";
import type { Cries, VoiceDurations } from "./data/types";
import { DinoIntro, type DinoIntroProps } from "./DinoIntro";
import { Dino3DTest, type Dino3DTestView } from "./scenes/Dino3DTest";
import type { DinoModelName } from "./three/dinoAsset";
import { Thumbnail } from "./Thumbnail";

const FPS = 30;

// 開発サーバーは無いファイルにも HTML を返すことがあるので、中身の種類も見る
const exists = async (path: string) => {
  try {
    const res = await fetch(staticFile(path));
    return res.ok && !(res.headers.get("content-type") ?? "").includes("text/html");
  } catch {
    return false;
  }
};

/** 作ってあれば読む（声の長さは npm run voice、なき声は npm run cries） */
const loadJson = async <T,>(path: string, fallback: T): Promise<T> => ((await exists(path)) ? (await fetch(staticFile(path))).json() : fallback);

const calculateMetadata: CalculateMetadataFunction<DinoIntroProps> = async ({ props }) => {
  const durations = await loadJson<VoiceDurations>("voice/durations.json", {});
  const cries = await loadJson<Cries>(CRIES_FILE, {});
  const { scenes, total } = buildTimeline(props.episode, durations, FPS, cries);
  const sePaths = [...Object.values(SE_FILES), ...Object.values(ACTION_SE)].filter((p): p is string => p !== undefined);
  const seFound = await Promise.all(sePaths.map(exists));
  return {
    durationInFrames: total,
    props: {
      ...props,
      scenes,
      audio: { bgm: await exists(BGM_FILE), se: Object.fromEntries(sePaths.map((p, i) => [p, seFound[i]])), cries },
    },
  };
};

const initial = buildTimeline(episode1, {}, FPS);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="DinoIntro"
      component={DinoIntro}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={initial.total}
      defaultProps={{ episode: episode1, scenes: initial.scenes, audio: { bgm: false, se: {}, cries: {} } }}
      calculateMetadata={calculateMetadata}
    />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} defaultProps={{ episode: episode1 }} />
    <Composition
      id="Dino3DTest"
      component={Dino3DTest}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={225}
      defaultProps={{ name: "triceratops" as DinoModelName, view: "demo" as Dino3DTestView }}
    />
  </>
);
