export type LessonStatus = "completed" | "in-progress" | "locked";

export type Lesson = {
  id: number;
  title: string;
  summary: string;
  minutes: number;
  status: LessonStatus;
};

// レッスン本体と進捗は API（api/lessons-api.ts）から取得する。ここには型と表示用の補助だけを置く。

export const statusLabel: Record<LessonStatus, string> = {
  completed: "完了",
  "in-progress": "学習中",
  locked: "未解放",
};

export function pad(n: number) {
  return String(n).padStart(2, "0");
}
