"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLessons } from "@/api/lessons-api";
import { getLessonSubmissions, type LessonSubmissions } from "@/api/submissions-api";
import type { Lesson } from "@/lib/lessons";
import { REVIEW_UPDATED_EVENT } from "@/lib/review-events";

/** ページを再取得せず、提出状態だけを更新する。Monaco・フロー図のstateを作り直さない。 */
export function useLiveLesson(initialLesson: Lesson, initialLessons: Lesson[], initialSubmissions: LessonSubmissions, questionNo: number) {
  const [submissions,setSubmissions] = useState(initialSubmissions);
  const [lessons,setLessons] = useState(initialLessons);
  const sequence = useRef(0);
  const active = useRef(false);
  const refresh = useCallback(async () => {
    const version = ++sequence.current;
    try {
      const [nextSubmissions,nextLessons] = await Promise.all([
        getLessonSubmissions(initialLesson.id,{questionNo}),getLessons(),
      ]);
      if (!active.current || version !== sequence.current) return;
      setSubmissions(nextSubmissions);
      setLessons(nextLessons);
    } catch {
      // 通信エラーで編集中の内容や表示中のレビュー結果を消さず、次の更新で再試行する。
    }
  },[initialLesson.id,questionNo]);
  useEffect(() => {
    active.current = true;
    function update() { if (document.visibilityState === "visible") void refresh(); }
    window.addEventListener(REVIEW_UPDATED_EVENT,update);
    window.addEventListener("focus",update);
    document.addEventListener("visibilitychange",update);
    const initialUpdate = window.setTimeout(update,0);
    return () => {
      active.current = false;
      window.clearTimeout(initialUpdate);
      window.removeEventListener(REVIEW_UPDATED_EVENT,update);
      window.removeEventListener("focus",update);
      document.removeEventListener("visibilitychange",update);
    };
  },[refresh]);
  return { lesson: {...initialLesson,status:submissions.lessonStatus},lessons,submissions,refresh };
}
