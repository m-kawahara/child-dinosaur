import type { Episode } from "./types";

// 2本目：きょうりゅう おすもう たいかい！（けがのない ちからくらべ）
// ナレーションを変えたら `npm run voice:2` で音声を作り直す。
// 色は episode1 と同じ（3D の恐竜の色もこれに合わせてある）
export const episode2: Episode = {
  id: "episode2",
  // 空白で行が分かれる（2行にする）
  title: "きょうりゅう おすもうたいかい！",
  voice: { speaker: 3, speed: 0.95, credit: "VOICEVOX:ずんだもん" },
  opening: {
    narration: "きょうりゅう おすもう たいかい！ きょうは ティラノサウルスと トリケラトプスが、おすもうで ちからくらべを するよ。",
    subtitle: "どっちが つよいかな？",
  },
  dinos: [
    {
      id: "trex",
      kind: "trex",
      name: "ティラノサウルス",
      fact: "ひがしの かた",
      color: "#6cc070",
      accent: "#fbe29a",
      action: "roar",
      narration: "ひがしの かた、ティラノサウルス！ おおきな からだで、ちからでは まけないぞ。",
    },
    {
      id: "triceratops",
      kind: "triceratops",
      name: "トリケラトプス",
      fact: "にしの かた",
      color: "#f2a65a",
      accent: "#fff1c9",
      action: "headbutt",
      narration: "にしの かた、トリケラトプス！ じまんの つのと えりまきで、ぐいぐい おすよ。",
    },
  ],
  bout: {
    east: "trex",
    west: "triceratops",
    lines: {
      face: "ふたりとも、どひょうに あがったよ。みあって、みあって。はっけよーい！",
      charge: "のこった！ ドーンと ぶつかって、おしあいだ。のこった、のこった！",
      roar: "ティラノサウルスが ほえた！ トリケラトプス、どひょうの はしっこで がんばれ！",
      comeback: "トリケラトプスが あたまを さげて、ぐいぐい おしかえす！",
      finish: "ティラノサウルス、どひょうの そとに でちゃった。ぽてん！ まいったー。",
      winner: "トリケラトプスの かち！ やったね！",
      friends: "おすもうの あとは、なかなおり。ふたりとも、よく がんばったね！",
    },
    captions: {
      face: "はっけよい",
      charge: "のこった！",
      comeback: "ぐいぐい！",
      finish: "ぽてん！",
      winner: "トリケラトプスの かち！",
      friends: "なかよし！",
    },
  },
  ending: {
    narration: "どっちも つよくて、かっこよかったね！ また いっしょに あそぼうね。ばいばーい！",
    title: "またね！",
    subtitle: "どっちも がんばったね",
  },
};
