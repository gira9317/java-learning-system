const START = "<!-- lecture-supplement:start -->";
const END = "<!-- lecture-supplement:end -->";

export type LectureCheckQuestion = { number: number; applied: boolean; prompt: string; choices: string[]; correctIndex: number; explanation: string };

/** 専用マーカー内だけを解釈する。通常のMarkdownや壊れた補足は隠さず表示する。 */
export function splitLectureMaterial(material: string) {
  const normalized = material.replace(/\r\n/g, "\n");
  const intro = normalized.match(/<!-- lecture-intro:start -->\n+([\s\S]*?)\n+<!-- lecture-intro:end -->/);
  const md = intro ? normalized.replace(intro[0], "").trim() : normalized;
  const introduction = intro?.[1].trim() ?? null;
  const fallback = { introduction, body: md, questions: [] as LectureCheckQuestion[], option: null as { title: string; body: string } | null };
  const start = md.indexOf(START);
  const end = md.indexOf(END, start);
  if (start < 0 || end < 0) return fallback;
  const extra = md.slice(start + START.length, end);
  const option = extra.match(/^## Option：(.+)\n+([\s\S]*)$/m);
  if (!option || option.index === undefined) return fallback;
  const quiz = extra.slice(0, option.index);
  const questions: LectureCheckQuestion[] = [];
  const headings = [...quiz.matchAll(/^### 問([1-5])(【応用】)?\n/gm)];
  if (headings.length !== 5) return fallback;
  for (const [i, heading] of headings.entries()) {
    const section = quiz.slice(heading.index! + heading[0].length, headings[i + 1]?.index ?? quiz.length);
    const parts = section.split(/^#### 解答・解説\n/m);
    if (parts.length !== 2 || !parts.every((part) => part.trim()) || Number(heading[1]) !== i + 1) return fallback;
    const promptParts = parts[0].split(/^#### 選択肢\n/m);
    const choices = [...(promptParts[1] ?? "").matchAll(/^- ([ABCD])\. (.+)$/gm)];
    const answer = parts[1].trim().match(/^正解: ([ABCD])\n+([\s\S]+)$/);
    if (promptParts.length !== 2 || choices.length !== 4 || choices.some((choice, n) => choice[1] !== "ABCD"[n]) || !answer) return fallback;
    const values = choices.map((choice) => choice[2].trim());
    if (new Set(values).size !== 4) return fallback;
    questions.push({ number: i + 1, applied: Boolean(heading[2]), prompt: promptParts[0].trim(), choices: values, correctIndex: "ABCD".indexOf(answer[1]), explanation: answer[2].trim() });
  }
  return {
    introduction,
    body: [md.slice(0, start).trim(), md.slice(end + END.length).trim()].filter(Boolean).join("\n\n"),
    questions,
    option: { title: option[1].trim(), body: option[2].trim() },
  };
}
