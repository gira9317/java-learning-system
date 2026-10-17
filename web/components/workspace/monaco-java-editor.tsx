"use client";

import Editor, { loader, type BeforeMount, type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useRef } from "react";
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

/** コード演習の Java エディタ（Monaco Editor） */
export function MonacoJavaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rainbow = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);

  const onMount: OnMount = (editor, monaco) => {
    const model = editor.getModel();
    if (!model) return;
    rainbow.current = editor.createDecorationsCollection(rainbowDecorations(model, monaco));
    editor.onDidChangeModelContent(() => {
      rainbow.current?.set(rainbowDecorations(model, monaco));
    });
  };

  return (
    <div className="min-h-0 flex-1 bg-tile-3">
      <Editor
        language="java"
        theme={THEME}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        beforeMount={defineTheme}
        onMount={onMount}
        loading={<p className="p-4 type-caption text-white/45">エディタを読み込んでいます…</p>}
        options={{
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
          automaticLayout: true,
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
        }}
      />
    </div>
  );
}
