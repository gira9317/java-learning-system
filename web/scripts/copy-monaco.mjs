// Monaco Editor のファイルを public/monaco/vs にコピーする（npm run dev / build の前に自動で実行）。
// CDN から読み込むと、外部につながらない社内ネットワークで使えないため、自分のサーバーから配信する。
import { cp, readFile, stat, writeFile } from "node:fs/promises";

const src = new URL("../node_modules/monaco-editor/min/vs/", import.meta.url);
const dest = new URL("../public/monaco/vs/", import.meta.url);
const marker = new URL("../public/monaco/VERSION", import.meta.url);
const { version } = JSON.parse(await readFile(new URL("../node_modules/monaco-editor/package.json", import.meta.url), "utf8"));

// 同じバージョンがコピー済みなら何もしない
const copied = await readFile(marker, "utf8").catch(() => null);
if (copied?.trim() === version && (await stat(dest).catch(() => null))) {
  process.exit(0);
}

await cp(src, dest, { recursive: true, force: true });
await writeFile(marker, version);
console.log(`monaco-editor ${version} を public/monaco/vs にコピーしました`);
