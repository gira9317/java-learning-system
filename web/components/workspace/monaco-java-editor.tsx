"use client";

import { loader, type BeforeMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { registerJavaCompletions } from "./java-completions";

// Monaco は CDN ではなく自分のサーバーから読み込む（scripts/copy-monaco.mjs が public/monaco/vs にコピーする）
loader.config({ paths: { vs: "/monaco/vs" } });

const THEME = "java-training-dark";
const TAB_SIZE = 4;
/** レインボーインデントの色の数（globals.css の .indent-rainbow-0〜3 と揃える） */
const RAINBOW_COLORS = 4;

/** 今までのエディタと同じ配色の暗いテーマ */
const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "ff7ab2", fontStyle: "bold" },
      { token: "string", foreground: "fc6a5d" },
      { token: "number", foreground: "d9c97c" },
      { token: "comment", foreground: "7f8c98", fontStyle: "italic" },
      { token: "type", foreground: "5dd8ff" },
      { token: "type.identifier", foreground: "5dd8ff" },
    ],
    colors: {
      "editor.background": "#252527",
      "editor.lineHighlightBackground": "#ffffff0a",
      "editorLineNumber.foreground": "#ffffff40",
      "editorLineNumber.activeForeground": "#ffffffaa",
      "editorIndentGuide.background1": "#ffffff14",
      "editorIndentGuide.activeBackground1": "#ffffff40",
      "editorWidget.background": "#2f2f32",
      "editorSuggestWidget.background": "#2f2f32",
      "editorSuggestWidget.selectedBackground": "#0071e366",
    },
  });
  registerJavaCompletions(monaco);
};

/**
 * レインボーインデント（VS Code の拡張機能 indent-rainbow と同じ考え方）。
 * 行頭の空白を 4 文字ごとに区切り、段ごとに違う色を薄く付ける。
 * 4 の倍数になっていない行（インデントの途中で止まっている）と、タブが混ざった行は、行頭の空白全体を赤くする。
 */
function rainbowDecorations(model: Monaco.editor.ITextModel, monaco: typeof Monaco) {
  const decorations: Monaco.editor.IModelDeltaDecoration[] = [];
  for (let line = 1; line <= model.getLineCount(); line++) {
    const text = model.getLineContent(line);
    const indent = text.match(/^[ \t]*/)![0];
    if (indent.length === 0) continue;

    // 空白だけの行（書きかけの行）は、途中でも赤くしない
    const blank = indent.length === text.length;
    const hasTab = indent.includes("\t");
    if (!blank && (hasTab || indent.length % TAB_SIZE !== 0)) {
      decorations.push({
        range: new monaco.Range(line, 1, line, indent.length + 1),
        options: {
          inlineClassName: "indent-rainbow-error",
          hoverMessage: {
            value: hasTab
              ? "インデントにタブが混ざっています。スペースにそろえましょう"
              : `インデントがずれています（スペース ${indent.length} 個）。${TAB_SIZE} の倍数にそろえましょう`,
          },
        },
      });
      continue;
    }

    const levels = Math.floor(indent.length / TAB_SIZE);
    for (let level = 0; level < levels; level++) {
      decorations.push({
        range: new monaco.Range(line, level * TAB_SIZE + 1, line, (level + 1) * TAB_SIZE + 1),
        options: { inlineClassName: `indent-rainbow-${level % RAINBOW_COLORS}` },
      });
    }
  }
  return decorations;
}

const EDITOR_OPTIONS: Monaco.editor.IStandaloneEditorConstructionOptions = {
          // 入力には textarea を使う（新しい EditContext だと、React Flow などページ全体でキーを受け取る部品が
          // 「入力中」と判定できず、Space や Backspace を横取りしてしまうため）
          editContext: false,
          fontFamily: "var(--font-geist-mono), Consolas, 'Courier New', monospace",
          fontSize: 13.5,
          lineHeight: 23,
          tabSize: TAB_SIZE,
          insertSpaces: true,
          detectIndentation: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: false,
          padding: { top: 12, bottom: 12 },
          // 括弧の色分けとガイド線（レインボー）
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: "active", indentation: true, highlightActiveIndentation: true },
          // 補完
          quickSuggestions: { other: true, comments: false, strings: false },
          suggestOnTriggerCharacters: true,
          snippetSuggestions: "top",
          wordBasedSuggestions: "currentDocument",
          tabCompletion: "on",
          // 候補の小窓がペインの端で切れないように
          fixedOverflowWidgets: true,
          renderLineHighlight: "line",
          smoothScrolling: true,
          contextmenu: true,
};

/**
 * Monacoを明示的に所有し、Fast Refresh/Strict Mode後に破棄済みインスタンスを再利用しない。
 * 複数ファイルのときは path ごとにモデルを持ち、ファイルを切り替えても元に戻す履歴やカーソル位置を残す。
 */
export function MonacoJavaEditor({ value, onChange, path = "Main.java" }: { value: string; onChange: (v: string) => void; path?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const modelsRef = useRef(new Map<string, Monaco.editor.ITextModel>());
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const valueRef = useRef(value);
  const pathRef = useRef(path);
  const changeRef = useRef(onChange);
  const applyingValue = useRef(false);
  const [error,setError] = useState(false);
  const [ready,setReady] = useState(false);
  const [attempt,setAttempt] = useState(0);

  useEffect(() => {
    valueRef.current = value;
    pathRef.current = path;
    changeRef.current = onChange;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    // ファイルを切り替えたら、そのファイルのモデルに付け替える（初めて開くファイルはモデルを作る）
    let model = modelsRef.current.get(path);
    if (!model || model.isDisposed()) {
      model = monaco.editor.createModel(value,"java");
      modelsRef.current.set(path,model);
    }
    if (editor.getModel() !== model) {
      editor.setModel(model);
      decorationsRef.current?.set(rainbowDecorations(model,monaco));
    }
    if (model.getValue() === value) return;
    applyingValue.current = true;
    try {
      editor.executeEdits("external-value",[{range:model.getFullModelRange(),text:value,forceMoveMarkers:true}]);
      editor.pushUndoStop();
    } finally { applyingValue.current = false; }
  },[value,onChange,path,ready]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const container: HTMLDivElement = element;
    let active = true;
    let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
    const models = modelsRef.current;
    let observer: ResizeObserver | null = null;
    let listener: Monaco.IDisposable | null = null;
    let decorations: Monaco.editor.IEditorDecorationsCollection | null = null;
    let frame: number | null = null;

    function dispose() {
      observer?.disconnect();
      if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
      listener?.dispose();
      if (editorRef.current === editor) editorRef.current = null;
      if (decorationsRef.current === decorations) decorationsRef.current = null;
      // モデルは別途作成しているため、描画側を破棄してからモデルを破棄する。
      decorations?.clear();
      decorations = null;
      editor?.dispose();
      editor = null;
      for (const m of models.values()) if (!m.isDisposed()) m.dispose();
      models.clear();
      container.replaceChildren();
    }

    void loader.init().then((monaco) => {
      if (!active || !container.isConnected) return;
      defineTheme(monaco);
      monacoRef.current = monaco;
      const createdModel = monaco.editor.createModel(valueRef.current,"java");
      models.set(pathRef.current,createdModel);
      const createdEditor = monaco.editor.create(container,{...EDITOR_OPTIONS,model:createdModel,theme:THEME});
      editor = createdEditor;
      editorRef.current = createdEditor;
      decorations = createdEditor.createDecorationsCollection(rainbowDecorations(createdModel,monaco));
      decorationsRef.current = decorations;
      listener = createdEditor.onDidChangeModelContent(() => {
        const model = editor?.getModel();
        if (!active || !editor || !model || model.isDisposed()) return;
        decorations?.set(rainbowDecorations(model,monaco));
        if (!applyingValue.current) changeRef.current(editor.getValue());
      });
      function layout() {
        if (!active || frame !== null) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          if (!active || !editor || !container.isConnected) return;
          const {width,height} = container.getBoundingClientRect();
          if (width > 0 && height > 0) editor.layout({width,height});
        });
      }
      observer = new ResizeObserver(layout);
      observer.observe(container);
      layout();
      setReady(true);
    }).catch((cause: unknown) => {
      if (!active) return;
      dispose();
      console.error("Java editor initialization failed",cause);
      setError(true);
    });

    return () => { active = false; dispose(); };
  },[attempt]);

  return (
    <div className="relative min-h-0 flex-1 bg-tile-3">
      <div ref={host} className="absolute inset-0" />
      {!ready && !error && <p className="absolute top-4 left-4 type-caption text-white/45">エディタを読み込んでいます…</p>}
      {error && <div className="absolute inset-0 flex flex-col bg-tile-3 p-4">
        <p role="alert" className="type-caption text-white/80">エディタを初期化できませんでした。コードは下の入力欄で引き続き編集・保存できます。</p>
        <button type="button" className="btn btn-secondary mt-2 self-start" onClick={() => { setReady(false); setError(false); setAttempt((current)=>current+1); }}>エディタを再試行</button>
        <textarea aria-label="Javaコード（簡易入力）" className="mt-3 min-h-0 flex-1 resize-none bg-tile-3 p-3 font-mono text-[13px] text-white outline-none" value={value} onChange={(event)=>onChange(event.target.value)} spellCheck={false} />
      </div>}
    </div>
  );
}
