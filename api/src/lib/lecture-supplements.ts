import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";

export const SUPPLEMENT_START = "<!-- lecture-supplement:start -->";
export const SUPPLEMENT_END = "<!-- lecture-supplement:end -->";
export const INTRO_START = "<!-- lecture-intro:start -->";
export const INTRO_END = "<!-- lecture-intro:end -->";
const text = z.string().trim().min(1);
const supplementSchema = z.object({
  questions: z.array(z.object({
    prompt: text,
    choices: z.array(text).length(4).refine((items) => new Set(items).size === 4, "Choices must be distinct"),
    correctIndex: z.number().int().min(0).max(3),
    explanation: text,
    applied: z.boolean(),
  })).length(5),
  introduction: text,
  column: z.tuple([text, text]),
});
export type LectureSupplement = z.infer<typeof supplementSchema>;

export async function loadLectureSupplements() {
  const dir = join(process.cwd(), "content", "lectures");
  const files = (await readdir(dir)).filter((file) => /^supplements(?:-\d+)?\.json$/.test(file)).sort();
  const supplements: Record<string, LectureSupplement> = {};
  const columns: Record<string, [string, string]> = {};
  for (const file of files) {
    const entries = z.record(z.string().regex(/^\d{2}-\d{2}$/), z.object({ column: z.tuple([text, text]) })).parse(JSON.parse(await readFile(join(dir, file), "utf8")));
    for (const [key, value] of Object.entries(entries)) {
      if (columns[key]) throw new Error(`Duplicate lecture supplement: ${key}`);
      columns[key] = value.column;
    }
  }
  const guideSchema = z.tuple([text, z.array(z.tuple([text, text, text])).length(4), z.tuple([text, text, text, text, text, text])]);
  const guideFiles = (await readdir(dir)).filter((file) => /^beginner-guides(?:-\d+)?\.json$/.test(file)).sort();
  for (const file of guideFiles) {
    const entries = z.record(z.string().regex(/^\d{2}-\d{2}$/), guideSchema).parse(JSON.parse(await readFile(join(dir, file), "utf8")));
    for (const [key, [intro, concepts, applied]] of Object.entries(entries)) {
      if (!columns[key] || supplements[key]) throw new Error(`Missing column or duplicate guide: ${key}`);
      const terms = concepts.map((c) => c[0]);
      const meanings = concepts.map((c) => c[1]);
      const rawQuestions = concepts.map(([term, meaning, example], i) => ({
        prompt: i === 0 ? `「${meaning}」に当てはまるものはどれですか。` : i === 2 ? `「${example}」という例に当てはまるものはどれですか。` : `「${term}」の説明はどれですか。`,
        choices: i === 0 || i === 2 ? terms : meanings,
        correctIndex: i,
        explanation: `**${term}**：${meaning}。\n\n例：${example}。`,
        applied: false,
      }));
      rawQuestions.push({ prompt: applied[0], choices: applied.slice(1, 5), correctIndex: 0, explanation: applied[5], applied: true });
      const questions = rawQuestions.map((question, i) => {
        const bytes = createHash("sha256").update(`${key}:${i}`).digest();
        const order = [0, 1, 2, 3].sort((a, b) => bytes[a] - bytes[b]);
        return { ...question, choices: order.map((n) => question.choices[n]), correctIndex: order.indexOf(question.correctIndex) };
      });
      const introduction = `## まずはここから\n\n${intro}\n\n### 最初に覚える4つの言葉\n\n${concepts.map(([term, meaning, example]) => `#### ${term}\n\n${meaning}。\n\n**具体例：** ${example}。`).join("\n\n")}\n\n### この講義の読み方\n\nまず上の意味と具体例を確認し、下の4択に挑戦しましょう。詳しい仕組みやコードは「詳しい説明」、発展した内容は「Option」で後から読めます。1回で全てを暗記する必要はありません。`;
      supplements[key] = supplementSchema.parse({ questions, introduction, column: columns[key] });
    }
  }
  if (Object.keys(supplements).length !== Object.keys(columns).length) throw new Error("Some lectures have no beginner guide");
  return supplements;
}

export function renderLectureSupplement(supplement: LectureSupplement) {
  const questions = supplement.questions.map((question, i) =>
    `### 問${i + 1}${question.applied ? "【応用】" : ""}\n\n${question.prompt}\n\n#### 選択肢\n\n${question.choices.map((choice, n) => `- ${"ABCD"[n]}. ${choice}`).join("\n")}\n\n#### 解答・解説\n\n正解: ${"ABCD"[question.correctIndex]}\n\n${question.explanation}`,
  ).join("\n\n");
  return `${SUPPLEMENT_START}\n\n## 確認しよう\n\n${questions}\n\n## Option：${supplement.column[0]}\n\n${supplement.column[1]}\n\n${SUPPLEMENT_END}`;
}

export function mergeLectureIntroduction(material: string, introduction: string) {
  const md = material.replace(/\r\n/g, "\n");
  const start = md.indexOf(INTRO_START);
  const end = md.indexOf(INTRO_END);
  const extra = `${INTRO_START}\n\n${introduction}\n\n${INTRO_END}`;
  if (start >= 0 || end >= 0) {
    if (start < 0 || end < start || md.indexOf(INTRO_START, start + 1) >= 0) throw new Error("Invalid introduction boundaries");
    return `${md.slice(0, start)}${extra}${md.slice(end + INTRO_END.length)}`;
  }
  const front = md.match(/^---\ntitle: .+\n---\n+/)?.[0] ?? "";
  return `${front}${extra}\n\n${md.slice(front.length)}`;
}

/** 本文や末尾の独自追記は残し、旧確認ブロックまたは生成済みの補足だけを更新する。 */
export function mergeLectureSupplement(material: string, supplement: LectureSupplement) {
  const normalized = material.replace(/\r\n/g, "\n");
  const start = normalized.indexOf(SUPPLEMENT_START);
  const end = normalized.indexOf(SUPPLEMENT_END);
  const extra = renderLectureSupplement(supplement);
  if (start >= 0 || end >= 0) {
    if (start < 0 || end < start || normalized.indexOf(SUPPLEMENT_START, start + 1) >= 0) {
      throw new Error("Invalid lecture supplement boundaries");
    }
    const after = normalized.slice(end + SUPPLEMENT_END.length).trim();
    return `${normalized.slice(0, start).trimEnd()}\n\n${extra}${after ? `\n\n${after}` : ""}\n`;
  }
  const body = normalized.replace(/(?:^|\n)> \*\*確認しよう\*\*[^\n]*(?:\n>[^\n]*)*/g, "").trimEnd();
  return `${body}\n\n${extra}\n`;
}
