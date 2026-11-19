import type { CodeContent, CodeFile } from "@/api/submissions-api";

/*
 * 複数ファイルのコード演習で使う、ファイルとフォルダの扱い。
 * フォルダは Java の package として扱う（model/Book.java は package model のクラス Book）。
 * パスの規則は API（api/src/schemas/submissions.ts）・実行サーバー（runner/src/sandbox.ts）と同じ。
 */

export const MAIN_FILE = "Main.java";
export const MAX_FILES = 30;

const FOLDER_PART = /^[a-z][a-z0-9_]{0,29}$/;
const CLASS_NAME = /^[A-Z][A-Za-z0-9_]{0,59}$/;
const MAX_DEPTH = 3;

/** 画面で扱う形。Main.java も含めて、パスの順に並べる */
export type Source = CodeFile;

export function toSources(content: CodeContent): Source[] {
  return sortSources([{ path: MAIN_FILE, content: content.code }, ...(content.files ?? [])]);
}

export function toContent(sources: Source[]): CodeContent {
  const main = sources.find((s) => s.path === MAIN_FILE)?.content ?? "";
  const files = sources.filter((s) => s.path !== MAIN_FILE);
  return files.length > 0 ? { code: main, files } : { code: main };
}

/** Main.java を先頭に、あとはフォルダ → ファイル名の順 */
export function sortSources(sources: Source[]) {
  return [...sources].sort((a, b) => (a.path === MAIN_FILE ? -1 : b.path === MAIN_FILE ? 1 : a.path.localeCompare(b.path)));
}

export function folderOf(path: string) {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}

export function fileName(path: string) {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** ファイルから分かるフォルダ（親フォルダも含む）と、空のまま作ったフォルダをまとめる */
export function allFolders(sources: Source[], extra: string[]) {
  const set = new Set<string>();
  for (const p of [...sources.map((s) => folderOf(s.path)), ...extra]) {
    const parts = p.split("/").filter(Boolean);
    for (let i = 1; i <= parts.length; i++) set.add(parts.slice(0, i).join("/"));
  }
  return [...set].sort();
}

/** フォルダ名として正しいか。問題があれば理由を返す */
export function folderError(folder: string, parent: string, folders: string[]) {
  if (!FOLDER_PART.test(folder)) return "フォルダ名（package 名）は、英小文字で始まる英小文字・数字・_ にしてください（例: model）";
  const path = parent ? `${parent}/${folder}` : folder;
  if (path.split("/").length > MAX_DEPTH) return `フォルダは ${MAX_DEPTH} 階層までです`;
  if (folders.includes(path)) return "同じ名前のフォルダがあります";
  return null;
}

/** ファイル名（.java は省略可）として正しいか。問題があれば理由を返す */
export function fileError(name: string, folder: string, sources: Source[], except?: string) {
  const className = name.replace(/\.java$/, "");
  if (!CLASS_NAME.test(className)) return "ファイル名（クラス名）は、英大文字で始まる英数字・_ にしてください（例: Book）";
  const path = joinPath(folder, className);
  if (path === MAIN_FILE) return "Main.java はすでにあります";
  if (sources.some((s) => s.path.toLowerCase() === path.toLowerCase() && s.path !== except)) return "同じ名前のファイルがあります";
  if (sources.length >= MAX_FILES && !except) return `ファイルは ${MAX_FILES} 個までです`;
  return null;
}

export function joinPath(folder: string, className: string) {
  return `${folder ? `${folder}/` : ""}${className.replace(/\.java$/, "")}.java`;
}

/** 新しいファイルのひな形。フォルダの中なら package 宣言を入れておく */
export function newFileTemplate(path: string) {
  const folder = folderOf(path);
  const className = fileName(path).replace(/\.java$/, "");
  const pkg = folder ? `package ${folder.replaceAll("/", ".")};\n\n` : "";
  return `${pkg}public class ${className} {\n}\n`;
}

/** ファイルを別のフォルダへ移したり名前を変えたりしたとき、package 宣言とクラス名を合わせる */
export function retarget(content: string, from: string, to: string) {
  let next = content;
  const fromPkg = folderOf(from).replaceAll("/", ".");
  const toPkg = folderOf(to).replaceAll("/", ".");
  if (fromPkg !== toPkg) {
    const declared = /^\s*package\s+[\w.]+\s*;\s*\n?/m;
    if (declared.test(next)) next = toPkg ? next.replace(declared, `package ${toPkg};\n`) : next.replace(declared, "");
    else if (toPkg) next = `package ${toPkg};\n\n${next}`;
  }
  const fromClass = fileName(from).replace(/\.java$/, "");
  const toClass = fileName(to).replace(/\.java$/, "");
  if (fromClass !== toClass) next = next.replace(new RegExp(`\\b(class|interface|enum|record)\\s+${fromClass}\\b`), `$1 ${toClass}`);
  return next;
}
