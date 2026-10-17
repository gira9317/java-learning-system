"use client";

import { useState, type FormEvent } from "react";
import { updateLecture, type AdminLecture } from "@/api/admin-api";
import { ApiError } from "@/api/client";
import { Markdown } from "@/components/lecture/markdown";
import { VideoEmbed, VideoPlaceholder } from "@/components/lecture/video-embed";
import { formatDateTime } from "@/lib/format";

type Errors = { videoUrl?: string; materialMd?: string; form?: string };

/** 講義の動画 URL と資料（Markdown）の編集。資料は「編集」と「プレビュー」を切り替えて確認できる */
export function LectureEditForm({ lecture }: { lecture: AdminLecture }) {
  const [videoUrl, setVideoUrl] = useState(lecture.video_url ?? "");
  const [materialMd, setMaterialMd] = useState(lecture.material_md ?? "");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(lecture.updated_at);
  const [dirty, setDirty] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const { lecture: saved } = await updateLecture(lecture.id, { videoUrl, materialMd });
      setSavedAt(saved.updated_at);
      setDirty(false);
    } catch (err) {
      const fields = err instanceof ApiError ? err.body?.fieldErrors : undefined;
      setErrors({
        videoUrl: fields?.videoUrl?.[0],
        materialMd: fields?.materialMd?.[0],
        form: fields ? undefined : err instanceof ApiError ? err.message : "保存に失敗しました。",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <section className="rounded-lg border border-hairline bg-canvas p-5 sm:p-6">
        <label htmlFor="video-url" className="type-tagline block">
          解説動画
        </label>
        <p className="type-caption mt-1 text-ink-muted-80">
          YouTube（限定公開など）の URL、動画ファイル（.mp4 など）の URL、または社内動画サービスの埋め込み用 URL。https:// のみ。空にすると「準備中」になります。
        </p>
        <input
          id="video-url"
          type="url"
          inputMode="url"
          value={videoUrl}
          onChange={(e) => {
            setVideoUrl(e.target.value);
            setDirty(true);
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          aria-invalid={errors.videoUrl ? true : undefined}
          className="field mt-3"
        />
        {errors.videoUrl && <p className="type-caption mt-2 px-1 text-danger">{errors.videoUrl}</p>}
        <div className="mt-4 max-w-[560px]">
          {videoUrl.trim() ? <VideoEmbed url={videoUrl.trim()} title={lecture.title} /> : <VideoPlaceholder />}
        </div>
      </section>

      <section className="rounded-lg border border-hairline bg-canvas p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="material-md" className="type-tagline">
            資料（Markdown）
          </label>
          <div role="tablist" aria-label="資料の表示" className="grid grid-cols-2 gap-1 rounded-full bg-parchment p-1">
            {(["edit", "preview"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`btn min-h-8 rounded-full px-4 type-caption ${
                  tab === key ? "border border-hairline bg-canvas font-semibold text-ink" : "border border-transparent text-ink-muted-80"
                }`}
              >
                {key === "edit" ? "編集" : "プレビュー"}
              </button>
            ))}
          </div>
        </div>
        <p className="type-caption mt-1 text-ink-muted-80">
          見出しは「## 見出し」、コードは「```java」で囲む、表は「| 列 | 列 |」。HTML タグは表示されません。
        </p>

        {tab === "edit" ? (
          <textarea
            id="material-md"
            value={materialMd}
            onChange={(e) => {
              setMaterialMd(e.target.value);
              setDirty(true);
            }}
            rows={24}
            spellCheck={false}
            aria-invalid={errors.materialMd ? true : undefined}
            placeholder={"## " + lecture.title + "\n\n本文を書きます。"}
            className="field mt-3 min-h-[420px] resize-y rounded-lg py-3 font-mono text-[13px] leading-[1.7]"
          />
        ) : (
          <div className="mt-3 min-h-[420px] rounded-lg border border-hairline px-5 py-4">
            {materialMd.trim() ? <Markdown>{materialMd}</Markdown> : <p className="type-caption text-ink-muted-48">資料は空です。</p>}
          </div>
        )}
        {errors.materialMd && <p className="type-caption mt-2 px-1 text-danger">{errors.materialMd}</p>}
      </section>

      {errors.form && (
        <p role="alert" className="type-caption rounded-sm bg-danger/10 px-4 py-3 text-danger">
          {errors.form}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary btn-primary-lg" disabled={saving}>
          {saving ? "保存しています…" : "保存する"}
        </button>
        <span className="type-caption text-ink-muted-48" role="status">
          {dirty ? "未保存の変更があります" : savedAt ? `最終更新 ${formatDateTime(savedAt)}` : ""}
        </span>
      </div>
    </form>
  );
}
