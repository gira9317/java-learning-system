import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { GlobalNav } from "@/components/global-nav";
import {
  BookIcon,
  CheckIcon,
  CodeIcon,
  FlowIcon,
  PlayIcon,
  SparkIcon,
} from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { SessionLink } from "@/components/session-link";
import { WorkspacePreview } from "@/components/workspace-preview";
import { getCatalog } from "@/api/lessons-api";
import { pad } from "@/lib/lessons";

const steps = [
  {
    icon: BookIcon,
    title: "読む",
    body: "研修資料をもとにした教材で、文法と考え方を押さえます。",
  },
  {
    icon: FlowIcon,
    title: "描く",
    body: "コードを書く前に、フローチャートで処理の流れを設計します。",
  },
  {
    icon: CodeIcon,
    title: "書く",
    body: "ブラウザ上のエディタでJavaを書き、その場で実行します。",
  },
  {
    icon: SparkIcon,
    title: "確かめる",
    body: "自動採点で確かめてから提出し、研修担当者のレビューを受けます。",
  },
];

// マーケティング（ランディング）ページ。モバイルを基準に、幅が広がるほど段組みを増やす。
export default function MarketingPage() {
  return (
    <>
      <GlobalNav variant="marketing" />
      <main className="flex-1">
        {/* Hero — light tile */}
        <section className="bg-canvas px-4 pt-14 text-center sm:px-6 sm:pt-20">
          <p className="type-body-strong text-ink-muted-48 sm:type-tagline">
            新人研修 Java コース
          </p>
          <h1 className="type-hero mx-auto mt-3 max-w-[18ch]">
            読んで、描いて、
            <br />
            書いて、確かめる。
          </h1>
          <p className="type-lead mx-auto mt-4 max-w-[40ch] text-balance text-ink-muted-80 sm:mt-5">
            教材・フローチャート・Javaコードを、ひとつの画面で。
          </p>
          <div className="mx-auto mt-8 flex max-w-90 flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <SessionLink className="btn btn-primary btn-primary-lg" guestLabel="サインインして始める" />
            <Link
              href="#features"
              className="btn btn-secondary btn-secondary-lg"
            >
              詳しく見る
            </Link>
          </div>
          <div className="mx-auto mt-12 max-w-270 sm:mt-16">
            <WorkspacePreview />
          </div>
        </section>

        {/* How — dark tile */}
        <section
          id="how"
          className="on-dark scroll-mt-11 bg-tile-1 px-4 py-16 text-white sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-270">
            <h2 className="type-display-lg text-center">
              ひとつのレッスン、
              <br className="sm:hidden" />
              4つのステップ。
            </h2>
            <p className="type-body mx-auto mt-4 max-w-[46ch] text-center text-body-muted">
              フロー図が承認されるとコードを提出でき、両方が承認されると次のレッスンに進めます。
            </p>
            <ol className="mt-10 grid gap-px overflow-hidden rounded-lg bg-white/10 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="flex gap-5 bg-tile-2 p-6 sm:block sm:p-8"
                >
                  <div className="flex shrink-0 items-start justify-between text-body-muted">
                    <step.icon size={26} />
                    <span className="hidden type-fine sm:inline">0{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="type-tagline sm:mt-10">{step.title}</h3>
                    <p className="type-caption mt-2 text-body-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features — parchment tile */}
        <section
          id="features"
          className="scroll-mt-11 bg-parchment px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-270">
            <h2 className="type-display-lg text-center">
              考える力から、書く力へ。
            </h2>
            <p className="type-body mx-auto mt-4 max-w-[44ch] text-center text-ink-muted-80">
              いきなりコードを書くのではなく、まず処理の流れを図にする。研修の現場で大切にしてきた順番を、そのまま画面にしました。
            </p>
            <div className="mt-10 grid gap-4 sm:mt-14 md:grid-cols-3 md:gap-5">
              <FeatureCard
                title="フローチャートで設計"
                body="開始・処理・条件分岐・入出力のノードを並べてつなぐだけ。True / False の分岐まで自動でチェックします。"
                visual={<FlowVisual />}
              />
              <FeatureCard
                title="ブラウザでJavaを実行"
                body="インストールは不要。書いたコードはその場でコンパイル・実行され、標準出力を確認できます。"
                visual={<CodeVisual />}
              />
              <FeatureCard
                title="すぐに返ってくる採点"
                body="テストケースとルールで、コードと図の両方を自動採点。どこが違うのかを具体的に示します。"
                visual={<GradeVisual />}
              />
            </div>
          </div>
        </section>

        {/* Curriculum — light tile */}
        <section
          id="curriculum"
          className="scroll-mt-11 bg-canvas px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-220">
            <h2 className="type-display-lg text-center">
              10のレッスンで、基礎をひと通り。
            </h2>
            <p className="type-body mx-auto mt-4 max-w-[40ch] text-center text-ink-muted-80">
              前のレッスンを完了すると、次のレッスンが解放されます。
            </p>
            <ol className="mt-10 grid border-t border-hairline sm:mt-12 md:grid-cols-2 md:gap-x-10">
              <Suspense fallback={<CurriculumSkeleton />}>
                <CurriculumItems />
              </Suspense>
            </ol>
          </div>
        </section>

        {/* For trainers — dark tile */}
        <section className="on-dark bg-tile-2 px-4 py-16 text-white sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-270 gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="type-caption-strong text-body-muted">
                研修担当者の方へ
              </p>
              <h2 className="type-display-lg mt-2">
                紙の資料を、そのまま教材に。
              </h2>
              <p className="type-body mt-4 text-body-muted">
                これまで使ってきた研修資料を Markdown
                にするだけで、演習付きのデジタル教材として配信できます。
              </p>
            </div>
            <ul className="divide-y divide-white/10 rounded-lg bg-tile-3 px-5">
              {[
                ["Markdown 教材の取り込み", "提供中"],
                ["受講者ごとの進捗・成績の確認", "今後提供予定"],
                ["紙資料からの学習シナリオ自動生成", "今後提供予定"],
              ].map(([label, state]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <span className="type-body">{label}</span>
                  <span
                    className={`shrink-0 type-fine ${state === "提供中" ? "text-primary-on-dark" : "text-body-muted"}`}
                  >
                    {state}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-canvas px-4 py-20 text-center sm:px-6 sm:py-24">
          <h2 className="type-hero mx-auto max-w-[20ch] text-balance">
            最初の一行から、
            <br />
            始めよう。
          </h2>
          <p className="type-body mx-auto mt-4 max-w-[36ch] text-ink-muted-80">
            アカウントは研修担当者から配布されます。
          </p>
          <div className="mt-8">
            <SessionLink className="btn btn-primary btn-primary-lg w-full max-w-90 sm:w-auto" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

async function CurriculumItems() {
  const lessons = await getCatalog();
  return lessons.map((lesson) => (
    <li
      key={lesson.id}
      className="flex items-baseline gap-4 border-b border-hairline py-4"
    >
      <span className="type-caption-strong w-6 shrink-0 text-ink-muted-48">
        {pad(lesson.number)}
      </span>
      <span className="type-body flex-1">{lesson.title}</span>
      <span className="type-caption shrink-0 text-ink-muted-48">
        {lesson.minutes}分
      </span>
    </li>
  ));
}

function CurriculumSkeleton() {
  return Array.from({ length: 10 }, (_, i) => (
    <li key={i} className="border-b border-hairline py-4" aria-hidden>
      <span className="block h-6 animate-pulse rounded-full bg-parchment" />
    </li>
  ));
}

function FeatureCard({
  title,
  body,
  visual,
}: {
  title: string;
  body: string;
  visual: ReactNode;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-hairline bg-canvas">
      <div className="grid h-45 place-items-center bg-pearl" aria-hidden>
        {visual}
      </div>
      <div className="p-6">
        <h3 className="type-body-strong">{title}</h3>
        <p className="type-caption mt-2 text-ink-muted-80">{body}</p>
      </div>
    </article>
  );
}

function FlowVisual() {
  return (
    <svg viewBox="0 0 160 140" className="h-35" fill="none">
      <path
        d="M80 30v14M80 76v8M50 60H30v40M110 60h20v40"
        stroke="#7a7a7a"
        strokeWidth="1.3"
      />
      <rect x="52" y="10" width="56" height="20" rx="10" fill="#1d1d1f" />
      <text x="80" y="24" textAnchor="middle" fontSize="9" fill="#fff">
        開始
      </text>
      <polygon
        points="80,44 112,60 80,76 48,60"
        fill="#fff"
        stroke="#0071e3"
        strokeWidth="2"
      />
      <text x="80" y="63" textAnchor="middle" fontSize="8" fill="#1d1d1f">
        条件
      </text>
      <text
        x="38"
        y="55"
        textAnchor="middle"
        fontSize="7"
        fontWeight="600"
        fill="#333"
      >
        True
      </text>
      <text
        x="124"
        y="55"
        textAnchor="middle"
        fontSize="7"
        fontWeight="600"
        fill="#333"
      >
        False
      </text>
      <rect
        x="6"
        y="100"
        width="48"
        height="20"
        rx="4"
        fill="#fff"
        stroke="#1d1d1f"
      />
      <rect
        x="106"
        y="100"
        width="48"
        height="20"
        rx="4"
        fill="#fff"
        stroke="#1d1d1f"
      />
    </svg>
  );
}

function CodeVisual() {
  return (
    <div className="w-[78%] rounded-sm bg-tile-3 p-4 text-left font-mono text-[11px] leading-[1.8] text-white/85">
      <p>
        <span className="text-[#ff7ab2]">if</span> (score &gt;={" "}
        <span className="text-[#d9c97c]">60</span>) {"{"}
      </p>
      <p className="pl-4">
        println(<span className="text-[#fc6a5d]">&quot;合格&quot;</span>);
      </p>
      <p>{"}"}</p>
      <p className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2 font-sans text-white/55">
        <PlayIcon size={9} /> 合格
      </p>
    </div>
  );
}

function GradeVisual() {
  return (
    <ul className="w-[78%] space-y-2 rounded-sm bg-canvas p-4 text-left text-[12px]">
      {[
        ["入力 80 → 合格", true],
        ["入力 60 → 合格", true],
        ["入力 59 → 不合格", false],
      ].map(([label, ok]) => (
        <li key={label as string} className="flex items-center gap-2">
          <span
            className={`grid size-4 place-items-center rounded-full text-white ${ok ? "bg-success" : "bg-danger"}`}
          >
            {ok ? (
              <CheckIcon size={10} strokeWidth={3} />
            ) : (
              <span className="text-[9px] font-bold">!</span>
            )}
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
