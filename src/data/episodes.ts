import { episode1 } from "./episode1";
import { episode2 } from "./episode2";
import type { Episode } from "./types";

/** 作れる回の一覧。Remotion の Composition の id は、それぞれの id（"episode1" など） */
export const EPISODES: Episode[] = [episode1, episode2];

export const findEpisode = (id: string) => {
  const ep = EPISODES.find((e) => e.id === id);
  if (!ep) throw new Error(`回 "${id}" がありません（${EPISODES.map((e) => e.id).join(", ")}）`);
  return ep;
};
