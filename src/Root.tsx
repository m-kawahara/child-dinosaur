import React from "react";
import { type CalculateMetadataFunction, Composition, staticFile, Still } from "remotion";
import { BGM_FILE, SE_FILES } from "./audio";
import { episode1 } from "./data/episode1";
import { buildTimeline } from "./data/timeline";
import type { VoiceDurations } from "./data/types";
import { DinoIntro, type DinoIntroProps } from "./DinoIntro";
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

const loadDurations = async (): Promise<VoiceDurations> => {
  if (!(await exists("voice/durations.json"))) return {};
  return (await fetch(staticFile("voice/durations.json"))).json();
};

const calculateMetadata: CalculateMetadataFunction<DinoIntroProps> = async ({ props }) => {
  const durations = await loadDurations();
  const { scenes, total } = buildTimeline(props.episode, durations, FPS);
  const sePaths = Object.values(SE_FILES);
  const seFound = await Promise.all(sePaths.map(exists));
  return {
    durationInFrames: total,
    props: {
      ...props,
      scenes,
      audio: { bgm: await exists(BGM_FILE), se: Object.fromEntries(sePaths.map((p, i) => [p, seFound[i]])) },
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
      defaultProps={{ episode: episode1, scenes: initial.scenes, audio: { bgm: false, se: {} } }}
      calculateMetadata={calculateMetadata}
    />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} defaultProps={{ episode: episode1 }} />
  </>
);
