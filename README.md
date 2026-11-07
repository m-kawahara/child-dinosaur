# きょうりゅう だいしゅうごう！

子ども向けの恐竜アニメを [Remotion](https://www.remotion.dev/) で作るプロジェクトです。恐竜はコードで組み立てたかわいい 3D（大きな目、つるっとした肌、ふちどり）、背景や文字はふちどりのあるシール絵本ふうの 2D です。恐竜のなき声もコードで作ります。

## 使い方

```sh
npm install
npm run studio      # ブラウザでプレビューしながら調整する
npm run render      # だい1わ を out/episode1.mp4 に書き出す
npm run thumbnail   # だい1わ のサムネイルを out/thumb1.png（1280x720）に書き出す
npm run render:2    # だい2わ（おすもう）を out/episode2.mp4 に
npm run thumbnail:2 # out/thumb2.png
```

| 回 | データ | Studio の名前 |
| --- | --- | --- |
| だい1わ きょうりゅう だいしゅうごう！（5ひきの紹介） | `src/data/episode1.ts` | `episode1` / `thumbnail-episode1` |
| だい2わ きょうりゅう おすもう たいかい！（ティラノサウルス vs トリケラトプス） | `src/data/episode2.ts` | `episode2` / `thumbnail-episode2` |

## 3D の恐竜

恐竜はオープニング・本編・エンディング・サムネイルとも 3D で描きます（本編は `src/scenes/Dino3DScene.tsx`、オープニングとエンディングの並び方は `src/scenes/lineup.ts`）。`src/dinos/` の SVG の恐竜は、3D のない種類のときだけ使います。

最初に一度 `npm run dinos` を実行してください。`public/models/` に恐竜ごとの `.bin` と `.json` ができます（1ぴき10秒ほど）。1ぴきだけ作り直すときは `npm run dinos -- triceratops` のように名前をつけます。作り直せるので git には入れていません。

見た目は、背景の絵本にあわせた「かわいい 3D」です。大きな丸い目でまばたきし、肌はつるっとしていて、体の色はテロップと同じ色（おなかは明るい色）、頭は大きめ、角・つめ・とげの先はまるく、背景と同じこい紫のふちどりがつきます。どの恐竜も口を開けられ、なき声に合わせて口が動きます。

| 恐竜 | 動き |
| --- | --- |
| ティラノサウルス | 2本足で歩く、ほえる（あごが開く） |
| トリケラトプス | 4本足で歩く、頭突き |
| ブラキオサウルス | 4本足で歩く、首をのばしてもぐもぐ |
| ステゴサウルス | 4本足で歩く、とげのしっぽを振る |
| プテラノドン | はばたいて飛ぶ、ぐるっと回る |

| どこを変える | ファイル |
| --- | --- |
| 形・色・骨（恐竜ごと）。頭の大きさは `headSpace`、色は `PAL` | `scripts/dino3d/<名前>.mjs` |
| 5ひき共通の部品（目の置き方・口・チークの色など） | `scripts/dino3d/sdf.mjs` |
| 動き（歩く・止まる・アクション） | `src/three/<名前>Rig.ts`（4本足の共通部分は `quadrupedRig.ts`、IK は `rigBase.ts`） |
| 目・まぶた・歯・ふちどりの太さ | `src/three/rigBase.ts` |
| 肌のつや・ふちどりの描き方 | `src/three/dinoMaterial.ts` |
| 歩く速さ・止まる位置・カメラ・飛ぶ高さ・ふきだしの位置 | `src/scenes/Dino3DScene.tsx` の `STAGES` |
| 登場・退場の長さ | `src/data/timeline.ts` の `STAGE_FRAMES_3D` |
| 並べるときの大きさ（`npm run dinos` のログの back / front / height） | `src/three/models.ts` の `MODEL_INFO` |

Studio の `Dino3DTest` で1ぴきずつ見られます（`name` と `view` を切りかえる。`sheet` にすると、横・斜め・顔のアップ・口を開けたアクションを 2x2 でまとめて見られます）。本物らしい歩幅で歩くので、3D の恐竜のシーンは登場と退場に時間をかけています。

## なき声

`npm run cries` を実行すると、`public/cries/<恐竜>.wav` と `cries.json`（声の長さと口の開き）ができます（数秒）。1ぴきだけ作り直すときは `npm run cries -- trex` のように名前をつけます。音はプログラムで合成しているので、素材サイトの規約を気にせず YouTube に出せます。作り直せるので git には入れていません。

| 恐竜 | なき声 |
| --- | --- |
| ティラノサウルス | ガオーッ（うなりながら、だんだん低く） |
| トリケラトプス | フンッ（鼻息）＋ブモォー |
| ブラキオサウルス | ボオォーン（低くやさしい） |
| ステゴサウルス | フゴッ フゴッ |
| プテラノドン | クワッ クワーッ |

- 声の高さ・長さ・響きは `scripts/cries/recipes.mjs`、音を作る部品は `scripts/cries/synth.mjs`。変えたら `npm run cries` を実行する
- 動画の中での大きさは `src/audio.ts` の `CRY_VOLUME`（ナレーションより少し大きく聞こえるくらいにしてある）
- 本編では「止まって鳴く → ナレーション → もう1回アクションして鳴く → 退場」の順。声がナレーションに重ならないように、シーンの長さは自動でのびる
- エンディングでは、ナレーションのあとに1ぴきずつ鳴いて「ばいばい」
- 口の開きは `cries.json` の折れ線に合わせて動く。なき声のファイルがないときは、鳴かずに前と同じ流れになる

## ナレーション（VOICEVOX）

1. [VOICEVOX](https://voicevox.hiroshiba.jp/) を入れて起動する
2. `npm run voice` を実行すると `public/voice/episode1/*.wav` と `durations.json` ができる
   - だい2わ は `npm run voice:2`（`npm run voice -- --episode episode2` と同じ）。声は回ごとのフォルダ `public/voice/<回>/` に分かれる
   - 話者の一覧：`npm run voice -- --list`
   - 話者と速さは `src/data/<回>.ts` の `voice` に書く（クレジットの文字もここ）
   - ためしに別の声で聞く：`npm run voice -- --speaker 8`
3. 各シーンの長さは、声の長さに合わせて自動で変わる（声がないときは文字数から見積もる）

ナレーションの文章を変えたら、もう一度 `npm run voice`（だい2わ は `npm run voice:2`）を実行してください。シーンの時間を確かめるときは `node scripts/print-timeline.mjs episode2`。

`public/voice/`・`public/cries/`・`public/bgm/`・`public/se/` は git に入れていません。音声となき声は作り直せますし、BGM・効果音は素材サイトの規約で再配布できないことが多いためです。YouTube に出した回の音声や素材は、書き出した MP4 といっしょに git の外（クラウドドライブなど）に保存しておいてください。

## BGM・効果音

次のファイルを置くと自動で使われます（ないファイルは鳴らしません）。

| ファイル | 使う場面 |
| --- | --- |
| `public/bgm/bgm.mp3` | ずっと流れる BGM（ナレーション中は小さくなる） |
| `public/se/kira.mp3` | タイトルが出るとき |
| `public/se/pop.mp3` | 名前テロップが出るとき |
| `public/se/stomp.mp3` | トリケラトプスの頭突き、おすもうでぶつかるとき |
| `public/se/munch.mp3` | ブラキオサウルスがもぐもぐ |
| `public/se/swish.mp3` | ステゴサウルスのしっぽ |
| `public/se/flap.mp3` | プテラノドンのはばたき |

ティラノサウルスがほえる声は、なき声（`public/cries/trex.wav`）が受け持ちます。

素材の例：[DOVA-SYNDROME](https://dova-s.jp/)（BGM）、[効果音ラボ](https://soundeffect-lab.info/)（効果音）。どちらも各サイトの利用規約を確認してから使ってください。

## 新しい回を作る

`src/data/episode1.ts` をコピーして、恐竜・ナレーション・色を変え、`src/data/episodes.ts` の `EPISODES` に足します（Studio に回の名前で出てきます）。`package.json` に `render:N` などを足しておくと便利です。

- タイトルの下のひとこと（`opening.subtitle`）、エンディングの大きな文字とひとこと（`ending.title` / `ending.subtitle`）もここに書きます
- 恐竜の `color` と `accent` は、テロップの番号のまる・ひとことの帯・右上の進み具合の色に使います。3D の恐竜の体とおなかの色も、episode1 の色にそろえてあります（変えるときは `scripts/dino3d/<名前>.mjs` の `PAL` も直して `npm run dinos`）
- 「だい 1 わ」の数字は `id`（`episode1` など）からとります

### おすもうの取組（`bout`）

`episode2.ts` のように `bout` を書くと、恐竜の紹介のあとに取組のシーン（`src/scenes/BoutScene.tsx`）が入ります。けがをしない、かわいいおすもうです。

- `east` / `west` は恐竜の id。いまの振り付けは east がティラノサウルス、west がトリケラトプス（west が勝つ）用です
- 場面は「face（はっけよい）→ charge（のこった）→ roar（ほえて押す）→ comeback（押し返す）→ finish（しりもち）→ winner（勝ち）→ friends（なかなおり）」。`lines` に場面ごとのナレーション、`captions` に大きく出す文字を書きます
- 動き（位置・押し合い・しりもち）と土俵の大きさは `src/animation/bout.ts` の `BOUT` と `BEATS`。足がすべらないように、位置の動きから歩きを計算しています（押されて下がるときは後ろ向きに歩く）
- 場面の長さは `src/data/timeline.ts` の `BEAT_FRAMES`。ほえる場面と勝った場面は、なき声のあとにナレーションが始まります
- 押し合いのポーズは `lean`（前へ押す / 後ろでこらえる）、しりもちは `sit`（ティラノサウルスだけ。形は `trexRig.ts` の `SIT`）
- 土俵は `src/components/Dohyo.tsx`（3D と同じカメラで地面に描く）
- `bout` がある回のサムネイルは、2ひきが向き合う「VS」の絵になります

デザインの部品：背景 `src/components/Background.tsx`（昼と夕方）、シールふうの文字とラベル `Sticker.tsx`、テロップと進み具合 `Telop.tsx`、アクションのふきだし `ActionBubble.tsx`（文字と位置は `Dino3DScene.tsx` の `STAGES`）。

## YouTube に出す前に

- 概要欄にクレジットを書く：`VOICEVOX:（キャラクター名）`、BGM・効果音のサイト名
- 「子ども向け」に設定する（COPPA の決まり）
- Remotion のライセンス：個人や3人以下の会社は無料。それより大きい会社で使うときは有料
