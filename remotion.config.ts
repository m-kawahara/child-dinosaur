import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// 3D のティラノを GPU で描く（指定しないと WebGL が遅いソフトウェア描画になることがある）
Config.setChromiumOpenGlRenderer("angle");
