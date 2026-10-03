import type { Episode } from "./types";

// 1本目：きょうりゅう だいしゅうごう！
// ナレーションを変えたら `npm run voice` で音声を作り直す。
export const episode1: Episode = {
  id: "episode1",
  title: "きょうりゅう だいしゅうごう！",
  opening: {
    narration: "きょうりゅう だいしゅうごう！ きょうは、げんきな きょうりゅうたちが あそびに きたよ。",
  },
  dinos: [
    {
      id: "trex",
      kind: "trex",
      name: "ティラノサウルス",
      fact: "おおきさ やく12メートル",
      color: "#6cc070",
      accent: "#fbe29a",
      action: "roar",
      narration:
        "さいしょは ティラノサウルス！ おおきな くちと するどい はで、ガオーッと ほえるよ。きょうりゅうの おうさまなんだ。",
    },
    {
      id: "triceratops",
      kind: "triceratops",
      name: "トリケラトプス",
      fact: "つのが 3ぼん",
      color: "#f2a65a",
      accent: "#fff1c9",
      action: "headbutt",
      narration:
        "つぎは トリケラトプス！ あたまに つのが さんぼん あるよ。おおきな えりまきで からだを まもるんだ。",
    },
    {
      id: "brachiosaurus",
      kind: "brachiosaurus",
      name: "ブラキオサウルス",
      fact: "くびが とっても ながい",
      color: "#79b8e8",
      accent: "#e3f3ff",
      action: "longneck",
      narration:
        "こんどは ブラキオサウルス！ ながーい くびを のばして、たかい きの はっぱを むしゃむしゃ たべるよ。",
    },
    {
      id: "stegosaurus",
      kind: "stegosaurus",
      name: "ステゴサウルス",
      fact: "せなかに いたが いっぱい",
      color: "#b58ad6",
      accent: "#f6c86b",
      action: "tailswing",
      narration:
        "ステゴサウルスも きたよ！ せなかに おおきな いたが ならんでいて、しっぽの トゲを ぶんぶん ふるんだ。",
    },
    {
      id: "pteranodon",
      kind: "pteranodon",
      name: "プテラノドン",
      fact: "そらを とぶ",
      color: "#f08fb0",
      accent: "#ffe0ea",
      action: "fly",
      narration:
        "さいごは プテラノドン！ おおきな つばさを ひろげて、おそらを すいすい とんでいくよ。",
    },
  ],
  ending: {
    narration: "みんな、あえて よかったね！ また いっしょに あそぼうね。ばいばーい！",
  },
};
