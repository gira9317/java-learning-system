import type * as Monaco from "monaco-editor";

// Java の補完候補（新人研修でよく使う範囲）。
// ブラウザの中では Java を解析できないため、キーワード・定型文・よく使うクラスとメソッドを辞書として持つ。
// 書いた変数名などは、Monaco 標準の「文書内の単語」の補完でも出る。

type Snippet = { label: string; detail: string; body: string };

const SNIPPETS: Snippet[] = [
  { label: "sout", detail: "System.out.println();", body: "System.out.println(${1});" },
  { label: "souf", detail: "System.out.printf();", body: 'System.out.printf("${1:%s}%n", ${2});' },
  {
    label: "main",
    detail: "public static void main(String[] args)",
    body: "public static void main(String[] args) {\n\t${0}\n}",
  },
  { label: "fori", detail: "for (int i = 0; i < n; i++)", body: "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}" },
  { label: "for", detail: "for (要素 : 配列)", body: "for (${1:int} ${2:item} : ${3:array}) {\n\t${0}\n}" },
  { label: "if", detail: "if (条件)", body: "if (${1:condition}) {\n\t${0}\n}" },
  { label: "ifelse", detail: "if (条件) … else …", body: "if (${1:condition}) {\n\t${2}\n} else {\n\t${0}\n}" },
  { label: "while", detail: "while (条件)", body: "while (${1:condition}) {\n\t${0}\n}" },
  { label: "dowhile", detail: "do … while (条件)", body: "do {\n\t${0}\n} while (${1:condition});" },
  {
    label: "switch",
    detail: "switch (値) { case … }",
    body: "switch (${1:value}) {\n\tcase ${2:1} -> ${3}\n\tdefault -> ${0}\n}",
  },
  {
    label: "try",
    detail: "try … catch",
    body: "try {\n\t${1}\n} catch (${2:Exception} e) {\n\t${0}\n}",
  },
  {
    label: "method",
    detail: "static メソッド",
    body: "static ${1:void} ${2:name}(${3}) {\n\t${0}\n}",
  },
];

const KEYWORDS = [
  "public", "private", "protected", "static", "final", "class", "interface", "extends", "implements",
  "void", "int", "long", "double", "float", "boolean", "char", "byte", "short",
  "if", "else", "for", "while", "do", "switch", "case", "default", "break", "continue", "return",
  "new", "this", "null", "true", "false", "try", "catch", "finally", "throw", "throws", "import", "package", "var",
];

const CLASSES: Record<string, string> = {
  String: "文字列",
  Integer: "int のラッパークラス",
  Double: "double のラッパークラス",
  Boolean: "boolean のラッパークラス",
  Math: "数学の計算",
  System: "標準入出力など",
  Scanner: "入力を読む（java.util.Scanner）",
  ArrayList: "可変長のリスト（java.util.ArrayList）",
  List: "リスト（java.util.List）",
  HashMap: "キーと値の表（java.util.HashMap）",
  Map: "キーと値の表（java.util.Map）",
  Arrays: "配列の操作（java.util.Arrays）",
  StringBuilder: "文字列を組み立てる",
};

type Member = { name: string; detail: string; method?: boolean; snippet?: string };

/** 「クラス名.」「System.out.」のあとに出す候補 */
const MEMBERS: Record<string, Member[]> = {
  "System.out": [
    { name: "println", detail: "1 行表示する", method: true },
    { name: "print", detail: "改行せずに表示する", method: true },
    { name: "printf", detail: "書式を指定して表示する", method: true },
  ],
  System: [
    { name: "out", detail: "標準出力" },
    { name: "err", detail: "標準エラー出力" },
    { name: "in", detail: "標準入力" },
    { name: "currentTimeMillis", detail: "現在時刻（ミリ秒）", method: true },
  ],
  Integer: [
    { name: "parseInt", detail: "文字列を int にする", method: true },
    { name: "valueOf", detail: "Integer にする", method: true },
    { name: "toString", detail: "文字列にする", method: true },
    { name: "MAX_VALUE", detail: "int の最大値" },
    { name: "MIN_VALUE", detail: "int の最小値" },
  ],
  Double: [
    { name: "parseDouble", detail: "文字列を double にする", method: true },
    { name: "valueOf", detail: "Double にする", method: true },
  ],
  Math: [
    { name: "max", detail: "大きい方", method: true },
    { name: "min", detail: "小さい方", method: true },
    { name: "abs", detail: "絶対値", method: true },
    { name: "pow", detail: "べき乗", method: true },
    { name: "sqrt", detail: "平方根", method: true },
    { name: "round", detail: "四捨五入", method: true },
    { name: "floor", detail: "切り捨て", method: true },
    { name: "ceil", detail: "切り上げ", method: true },
    { name: "random", detail: "0 以上 1 未満の乱数", method: true },
    { name: "PI", detail: "円周率" },
  ],
  String: [
    { name: "valueOf", detail: "文字列にする", method: true },
    { name: "format", detail: "書式を指定して文字列を作る", method: true },
    { name: "join", detail: "区切り文字でつなぐ", method: true },
  ],
  Arrays: [
    { name: "sort", detail: "並べ替える", method: true },
    { name: "toString", detail: "中身を文字列にする", method: true },
    { name: "asList", detail: "リストにする", method: true },
    { name: "fill", detail: "同じ値で埋める", method: true },
  ],
};

/** 変数のあとの「.」に出す、よく使うメソッド（String・List・配列など） */
const COMMON_MEMBERS: Member[] = [
  { name: "length", detail: "配列の長さ（配列）／ 文字数（String は length()）" },
  { name: "equals", detail: "中身が等しいか（String など）", method: true },
  { name: "charAt", detail: "n 文字目（String）", method: true },
  { name: "substring", detail: "部分文字列（String）", method: true },
  { name: "indexOf", detail: "位置を探す（String / List）", method: true },
  { name: "contains", detail: "含むか（String / List）", method: true },
  { name: "isEmpty", detail: "空か（String / List）", method: true },
  { name: "trim", detail: "前後の空白を除く（String）", method: true },
  { name: "split", detail: "区切って配列にする（String）", method: true },
  { name: "toUpperCase", detail: "大文字にする（String）", method: true },
  { name: "toLowerCase", detail: "小文字にする（String）", method: true },
  { name: "startsWith", detail: "〜で始まるか（String）", method: true },
  { name: "replace", detail: "置き換える（String）", method: true },
  { name: "add", detail: "追加する（List）", method: true },
  { name: "get", detail: "取り出す（List / Map）", method: true },
  { name: "size", detail: "要素数（List / Map）", method: true },
  { name: "remove", detail: "取り除く（List / Map）", method: true },
  { name: "put", detail: "登録する（Map）", method: true },
  { name: "nextInt", detail: "整数を読む（Scanner）", method: true },
  { name: "nextLine", detail: "1 行読む（Scanner）", method: true },
  { name: "append", detail: "後ろに足す（StringBuilder）", method: true },
];

let registered = false;

/** 補完を登録する（Monaco 全体で 1 回だけ） */
export function registerJavaCompletions(monaco: typeof Monaco) {
  if (registered) return;
  registered = true;

  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;

  monaco.languages.registerCompletionItemProvider("java", {
    triggerCharacters: ["."],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
      const before = model.getValueInRange(new monaco.Range(position.lineNumber, 1, position.lineNumber, word.startColumn));

      const member = (m: Member, i: number): Monaco.languages.CompletionItem => ({
        label: m.method ? `${m.name}()` : m.name,
        kind: m.method ? CompletionItemKind.Method : CompletionItemKind.Field,
        detail: m.detail,
        insertText: m.method ? `${m.name}(\${1})` : m.name,
        insertTextRules: m.method ? CompletionItemInsertTextRule.InsertAsSnippet : undefined,
        sortText: String(i).padStart(3, "0"),
        range,
      });

      // 「〇〇.」のあと: そのクラスのメンバー、知らない変数なら String / List などのよく使うメソッド
      const qualified = before.match(/([A-Za-z_][\w.]*)\.$/);
      if (qualified) {
        const members = MEMBERS[qualified[1]] ?? COMMON_MEMBERS;
        return { suggestions: members.map(member) };
      }

      const suggestions: Monaco.languages.CompletionItem[] = [
        ...SNIPPETS.map((s) => ({
          label: s.label,
          kind: CompletionItemKind.Snippet,
          detail: s.detail,
          documentation: s.body.replace(/\$\{\d+:?([^}]*)\}/g, "$1").replace(/\t/g, "    "),
          insertText: s.body,
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          sortText: `0${s.label}`,
          range,
        })),
        ...KEYWORDS.map((k) => ({
          label: k,
          kind: CompletionItemKind.Keyword,
          insertText: k,
          sortText: `1${k}`,
          range,
        })),
        ...Object.entries(CLASSES).map(([name, detail]) => ({
          label: name,
          kind: CompletionItemKind.Class,
          detail,
          insertText: name,
          sortText: `2${name}`,
          range,
        })),
      ];
      return { suggestions };
    },
  });
}
