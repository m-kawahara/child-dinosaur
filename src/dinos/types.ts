export type DinoPose = {
  /** 脚のふり -1〜1（sin の値） */
  leg: number;
  /** からだの上下（px、マイナスで上） */
  bob: number;
  /** しっぽの角度（度） */
  tail: number;
  /** くちの開き 0〜1 */
  jaw: number;
  /** まばたき 0=開く 1=閉じる */
  blink: number;
  /** あたま（くび）の角度（度、マイナスで上を向く） */
  head: number;
  /** つばさの角度（度） */
  wing: number;
};

export const restPose: DinoPose = { leg: 0, bob: 0, tail: 0, jaw: 0, blink: 0, head: 0, wing: 0 };

export type DinoProps = {
  pose: DinoPose;
  color: string;
  accent: string;
  /** 表示する横幅（px） */
  width: number;
};
