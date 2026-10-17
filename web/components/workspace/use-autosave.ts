"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/** 手を止めてから保存するまでの時間 */
const DELAY_MS = 1000;

/**
 * 値が変わったら、手を止めて DELAY_MS 後に自動で保存する（下書きの保存用）。
 * ページを離れる瞬間（別のページへの移動・再読み込み・タブを閉じる）にも、未保存の分を送る。
 * 最初に渡された値（開いた時点の内容）は保存しない。
 */
export function useAutosave<T>(value: T, save: (value: T, options: { keepalive: boolean }) => Promise<unknown>) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const serialized = JSON.stringify(value);
  const lastSaved = useRef(serialized);
  const pending = useRef<T | null>(null);
  const saveRef = useRef(save);
  // 保存用の関数は描画のたびに変わりうるので、最新のものを覚えておく
  useEffect(() => {
    saveRef.current = save;
  });

  function flush(keepalive: boolean) {
    const target = pending.current;
    if (target === null) return;
    pending.current = null;
    const text = JSON.stringify(target);
    if (text === lastSaved.current) return;
    setStatus("saving");
    saveRef.current(target, { keepalive }).then(
      () => {
        lastSaved.current = text;
        setStatus("saved");
      },
      () => {
        // 失敗したら、次の変更か離脱のときにもう一度送る
        pending.current = target;
        setStatus("error");
      },
    );
  }

  // 変わったら、少し待ってから保存する
  useEffect(() => {
    if (serialized === lastSaved.current) return;
    pending.current = JSON.parse(serialized) as T;
    const timer = setTimeout(() => flush(false), DELAY_MS);
    return () => clearTimeout(timer);
  }, [serialized]);

  // ページを離れる瞬間と、画面を閉じた（別のタブ・別のページに移った）ときに、未保存の分を送る
  useEffect(() => {
    const onPageHide = () => flush(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      // アプリ内の移動（「教材」タブへの切り替えなど）でエディタが閉じるとき
      flush(true);
    };
  }, []);

  return status;
}

/** ペインの見出しに出す、保存の状態 */
export function autosaveLabel(status: AutosaveStatus) {
  return { idle: "", saving: "保存しています…", saved: "下書きを保存しました", error: "下書きを保存できませんでした" }[status];
}
