# きょうりゅう だいしゅうごう！

子ども向けの恐竜アニメを [Remotion](https://www.remotion.dev/) で作るプロジェクトです。恐竜はすべてコードで描いた SVG です。

## 使い方

```sh
npm install
npm run studio      # ブラウザでプレビューしながら調整する
npm run render      # out/episode1.mp4 に書き出す
npm run thumbnail   # out/thumb1.png（1280x720）に書き出す
```

## 3D の恐竜

本編の恐竜のシーン（5ひきとも）は 3D で描きます（`src/scenes/Dino3DScene.tsx`）。オープニング・エンディング・サムネイルの恐竜は SVG のままです。

最初に一度 `npm run dinos` を実行してください。`public/models/` に恐竜ごとの `.bin` と `.json` ができます（1ぴき10秒ほど）。1ぴきだけ作り直すときは `npm run dinos -- triceratops` のように名前をつけます。作り直せるので git には入れていません。

| 恐竜 | 動き |
| --- | --- |
| ティラノサウルス | 2本足で歩く、ほえる（あごが開く） |
| トリケラトプス | 4本足で歩く、頭突き |
| ブラキオサウルス | 4本足で歩く、首をのばしてもぐもぐ |
| ステゴサウルス | 4本足で歩く、とげのしっぽを振る |
| プテラノドン | はばたいて飛ぶ、ぐるっと回る |

| どこを変える | ファイル |
| --- | --- |
| 形・色・骨（恐竜ごと） | `scripts/dino3d/<名前>.mjs` |
| 動き（歩く・止まる・アクション） | `src/three/<名前>Rig.ts`（4本足の共通部分は `quadrupedRig.ts`、IK は `rigBase.ts`） |
| うろこの質感 | `src/three/dinoMaterial.ts` |
| 歩く速さ・止まる位置・カメラ・飛ぶ高さ | `src/scenes/Dino3DScene.tsx` の `STAGES` |
| 登場・退場の長さ | `src/data/timeline.ts` の `STAGE_FRAMES_3D` |

Studio の `Dino3DTest` で1ぴきずつ見られます（`name` と `view` を切りかえる）。本物らしい歩幅で歩くので、3D の恐竜のシーンは登場と退場に時間をかけています。

## ナレーション（VOICEVOX）

1. [VOICEVOX](https://voicevox.hiroshiba.jp/) を入れて起動する
2. `npm run voice` を実行すると `public/voice/*.wav` と `durations.json` ができる
   - 話者の一覧：`npm run voice -- --list`
   - 話者と速さは `src/data/episode1.ts` の `voice` に書く（クレジットの文字もここ）
   - ためしに別の声で聞く：`npm run voice -- --speaker 8`
3. 各シーンの長さは、声の長さに合わせて自動で変わる（声がないときは文字数から見積もる）

ナレーションの文章を変えたら、もう一度 `npm run voice` を実行してください。

`public/voice/`・`public/bgm/`・`public/se/` は git に入れていません。音声は作り直せますし、BGM・効果音は素材サイトの規約で再配布できないことが多いためです。YouTube に出した回の音声や素材は、書き出した MP4 といっしょに git の外（クラウドドライブなど）に保存しておいてください。

## BGM・効果音

次のファイルを置くと自動で使われます（ないファイルは鳴らしません）。

| ファイル | 使う場面 |
| --- | --- |
| `public/bgm/bgm.mp3` | ずっと流れる BGM（ナレーション中は小さくなる） |
| `public/se/kira.mp3` | タイトルが出るとき |
| `public/se/pop.mp3` | 名前テロップが出るとき |
| `public/se/roar.mp3` | ティラノサウルスがほえる |
| `public/se/stomp.mp3` | トリケラトプスの頭突き |
| `public/se/munch.mp3` | ブラキオサウルスがもぐもぐ |
| `public/se/swish.mp3` | ステゴサウルスのしっぽ |
| `public/se/flap.mp3` | プテラノドンのはばたき |

素材の例：[DOVA-SYNDROME](https://dova-s.jp/)（BGM）、[効果音ラボ](https://soundeffect-lab.info/)（効果音）。どちらも各サイトの利用規約を確認してから使ってください。

## 新しい回を作る

`src/data/episode1.ts` をコピーして、恐竜・ナレーション・色を変えます。恐竜の絵は `src/dinos/`、動きは `src/animation/` にあります。

## YouTube に出す前に

- 概要欄にクレジットを書く：`VOICEVOX:（キャラクター名）`、BGM・効果音のサイト名
- 「子ども向け」に設定する（COPPA の決まり）
- Remotion のライセンス：個人や3人以下の会社は無料。それより大きい会社で使うときは有料
