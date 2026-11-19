"use client";

import { Fragment, useState } from "react";
import { CodeIcon, PlusIcon, TrashIcon } from "@/components/icons";
import {
  MAIN_FILE,
  fileError,
  fileName,
  folderError,
  folderOf,
  joinPath,
  type Source,
} from "@/lib/code-files";

/** 名前を入力中の行。どのフォルダに何を作る（名前を変える）か */
type Editing =
  | { mode: "new-file"; folder: string }
  | { mode: "new-folder"; folder: string }
  | { mode: "rename"; path: string };

/**
 * 複数ファイルのレッスンで、コードペインの左に出すファイル一覧。
 * フォルダは package。新しいファイルには package 宣言入りのひな形を入れる（呼び出し側）。
 */
export function FileExplorer({
  sources,
  folders,
  active,
  onOpen,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: {
  sources: Source[];
  folders: string[];
  active: string;
  onOpen: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onRename: (from: string, to: string) => void;
  /** フォルダを消すときは、中のファイルもまとめて消す */
  onDelete: (target: { kind: "file" | "folder"; path: string }) => void;
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // 新しく作る場所。最後に選んだフォルダ（ファイルを選んだら、そのファイルのフォルダ）
  const [current, setCurrent] = useState(folderOf(active));

  function start(next: Editing, initial = "") {
    setEditing(next);
    setName(initial);
    setError(null);
  }

  function confirm() {
    if (!editing) return;
    const value = name.trim();
    if (!value) {
      setEditing(null);
      return;
    }
    if (editing.mode === "new-folder") {
      const problem = folderError(value, editing.folder, folders);
      if (problem) return setError(problem);
      const path = editing.folder ? `${editing.folder}/${value}` : value;
      onCreateFolder(path);
      setCurrent(path);
    } else if (editing.mode === "new-file") {
      const problem = fileError(value, editing.folder, sources);
      if (problem) return setError(problem);
      onCreateFile(joinPath(editing.folder, value));
    } else {
      const folder = folderOf(editing.path);
      const problem = fileError(value, folder, sources, editing.path);
      if (problem) return setError(problem);
      const to = joinPath(folder, value);
      if (to !== editing.path) onRename(editing.path, to);
    }
    setEditing(null);
  }

  // フォルダ・ファイルを木の形に並べる（フォルダが先、それぞれ名前順）
  const rows: { kind: "file" | "folder"; path: string; depth: number }[] = [];
  function walk(folder: string, depth: number) {
    for (const f of folders.filter((x) => folderOf(x) === folder)) {
      rows.push({ kind: "folder", path: f, depth });
      walk(f, depth + 1);
    }
    for (const s of sources.filter(
      (x) => folderOf(x.path) === folder && x.path !== MAIN_FILE,
    )) {
      rows.push({ kind: "file", path: s.path, depth });
    }
  }
  rows.push({ kind: "file", path: MAIN_FILE, depth: 0 });
  walk("", 0);

  const input = (depth: number, placeholder: string) => (
    <li style={{ paddingLeft: 8 + depth * 14 }} className="pr-2 py-1">
      <input
        autoFocus
        value={name}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) confirm();
          if (e.key === "Escape") setEditing(null);
        }}
        onBlur={() => (name.trim() ? confirm() : setEditing(null))}
        className="h-7 w-full rounded-sm border border-primary-on-dark bg-tile-3 px-2 font-mono text-[12px] text-white outline-none placeholder:text-white/30"
      />
      {error && (
        <p className="mt-1 type-fine leading-snug text-[#ff6961]">{error}</p>
      )}
    </li>
  );

  const where = current ? `${current}/` : "（いちばん上）";

  return (
    <nav
      aria-label="ファイル"
      className="flex w-52 shrink-0 flex-col border-r border-white/10 bg-tile-1 text-white"
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-1 px-2">
        <span className="flex gap-1">
          <button
            type="button"
            className="btn rounded-full px-2 py-0.5 type-fine text-white/70 hover:bg-white/10"
            title={`新しいファイル（${where}）`}
            onClick={() => start({ mode: "new-file", folder: current })}
          >
            <PlusIcon size={12} />
            ファイル
          </button>
          <button
            type="button"
            className="btn rounded-full px-2 py-0.5 type-fine text-white/70 hover:bg-white/10"
            title={`新しいフォルダ（${where}）`}
            onClick={() => start({ mode: "new-folder", folder: current })}
          >
            <PlusIcon size={12} />
            フォルダ
          </button>
        </span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto pb-2 font-mono text-[12.5px]">
        {rows.map((row) => {
          const isFolder = row.kind === "folder";
          const selected = isFolder
            ? current === row.path
            : active === row.path;
          if (editing?.mode === "rename" && editing.path === row.path) {
            return (
              <Fragment key={row.path}>
                {input(row.depth, "新しいファイル名（例: Book）")}
              </Fragment>
            );
          }
          return (
            <Fragment key={`${row.kind}:${row.path}`}>
              <li
                className={`group flex items-center gap-1 pr-1 ${selected ? "bg-white/10" : "hover:bg-white/5"}`}
                style={{ paddingLeft: 8 + row.depth * 14 }}
              >
                <button
                  type="button"
                  className={`flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left ${selected ? "text-white" : "text-white/70"}`}
                  onClick={() => {
                    if (isFolder)
                      setCurrent(
                        current === row.path ? folderOf(row.path) : row.path,
                      );
                    else {
                      setCurrent(folderOf(row.path));
                      onOpen(row.path);
                    }
                  }}
                  aria-current={
                    !isFolder && active === row.path ? "true" : undefined
                  }
                >
                  {isFolder ? (
                    <span aria-hidden className="text-white/45">
                      ▾
                    </span>
                  ) : (
                    <CodeIcon size={12} />
                  )}
                  <span className="truncate">
                    {isFolder ? `${fileName(row.path)}/` : fileName(row.path)}
                  </span>
                </button>
                {row.path !== MAIN_FILE && (
                  <span className="hidden shrink-0 gap-0.5 group-focus-within:flex group-hover:flex">
                    {!isFolder && (
                      <button
                        type="button"
                        className="btn rounded-sm px-1 type-fine text-white/55 hover:text-white"
                        title="名前を変える"
                        aria-label={`${row.path} の名前を変える`}
                        onClick={() =>
                          start(
                            { mode: "rename", path: row.path },
                            fileName(row.path).replace(/\.java$/, ""),
                          )
                        }
                      >
                        ✎
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn rounded-sm px-1 text-white/55 hover:text-[#ff6961]"
                      title={isFolder ? "フォルダと中のファイルを削除" : "削除"}
                      aria-label={`${row.path} を削除`}
                      onClick={() =>
                        onDelete({ kind: row.kind, path: row.path })
                      }
                    >
                      <TrashIcon size={12} />
                    </button>
                  </span>
                )}
              </li>
              {editing &&
                editing.mode !== "rename" &&
                isFolder &&
                editing.folder === row.path &&
                input(
                  row.depth + 1,
                  editing.mode === "new-file"
                    ? "クラス名（例: Book）"
                    : "フォルダ名（例: model）",
                )}
            </Fragment>
          );
        })}
        {editing &&
          editing.mode !== "rename" &&
          editing.folder === "" &&
          input(
            0,
            editing.mode === "new-file"
              ? "クラス名（例: Book）"
              : "フォルダ名（例: model）",
          )}
      </ul>

      <p className="shrink-0 border-t border-white/10 px-3 py-2 type-fine leading-snug text-white/40">
        フォルダは package になります。中のファイルには{" "}
        <span className="font-mono">package フォルダ名;</span> が必要です。
      </p>
    </nav>
  );
}
