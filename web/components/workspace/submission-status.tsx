import type { Stage } from "@/api/submissions-api";

/** ペインに渡す、提出まわりの状態と操作 */
export type SubmitControl = {
  stage: Stage;
  /** 最新の提出に付いたレビューコメント */
  comment: string | null;
  /** 提出できない理由。押せないボタンにマウスを乗せたときに出す（帯には出さない） */
  blockedReason?: string;
  /** 現在のコードの採点結果など、提出前に満たす必要のある条件。 */
  validationReason?: string;
  submitting: boolean;
};

export function SubmitButton({ control, onClick }: { control: SubmitControl; onClick: () => void }) {
  const { stage, submitting, blockedReason, validationReason } = control;
  // 無効なボタンにはマウスの出入りが届かないブラウザがあるので、説明は外側の span に付ける
  return (
    <span title={!stage.canSubmit ? stage.status === "none" ? blockedReason : undefined : validationReason}>
      <button type="button" className="btn btn-primary" onClick={onClick} disabled={!stage.canSubmit || submitting || Boolean(validationReason)}>
        {submitting ? "提出しています…" : stage.status === "rejected" ? "再提出する" : "提出する"}
      </button>
    </span>
  );
}

/** ペインの見出しの下に出す、提出の状態の 1 行。まだ提出できない段階では出さない */
export function StageBanner({ control, dark = false }: { control: SubmitControl; dark?: boolean }) {
  const { stage, comment } = control;
  if (stage.status === "none" && !stage.canSubmit) return null;

  const tone = {
    // コードペインは下地が白でも黒でも同じ色になるよう、不透明な背景を使う。
    info: dark ? "bg-tile-1 text-body-muted" : "bg-parchment text-ink-muted-80",
    wait: dark ? "bg-[#15334f] text-[#d7ebff]" : "bg-primary/10 text-ink",
    ok: dark ? "bg-[#143d25] text-[#d8f5df]" : "bg-success/10 text-ink",
    ng: dark ? "bg-[#4b2020] text-[#ffe0dc]" : "bg-danger/10 text-ink",
  };

  let className = tone.info;
  let text: React.ReactNode;
  if (stage.status === "pending") {
    className = tone.wait;
    text = "レビュー待ちです。結果が出るまで再提出はできません。";
  } else if (stage.status === "approved") {
    className = tone.ok;
    text = <>承認されました。{comment && <span className="opacity-80">「{comment}」</span>}</>;
  } else if (stage.status === "rejected") {
    className = tone.ng;
    text = (
      <>
        <span className="font-semibold">差し戻されました：</span>「{comment}」 直して再提出してください。
      </>
    );
  } else {
    text = "「採点する」で確認してから提出してください。提出すると研修担当者がレビューします。";
  }

  return (
    <p role="status" className={`shrink-0 px-4 py-2 type-caption ${className}`}>
      {text}
    </p>
  );
}
