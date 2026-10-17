// 解説動画の表示。登録された URL の種類に合わせて埋め込み方を変える
// - YouTube（watch / youtu.be / shorts / embed）→ youtube-nocookie の埋め込み
// - 動画ファイル（.mp4 / .webm / .ogg / .mov）→ <video>
// - それ以外 → そのまま iframe（社内の動画サービスの埋め込み用 URL など）

const VIDEO_FILE = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;

function youtubeId(url: URL) {
  if (url.hostname === "youtu.be") return url.pathname.slice(1);
  if (url.hostname.endsWith("youtube.com") || url.hostname.endsWith("youtube-nocookie.com")) {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const m = url.pathname.match(/^\/(embed|shorts|live)\/([^/?#]+)/);
    if (m) return m[2];
  }
  return null;
}

export function VideoEmbed({ url, title }: { url: string; title: string }) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    // 不正な URL は下で「表示できません」にする
  }
  if (!parsed || parsed.protocol !== "https:") {
    return <VideoPlaceholder text="動画の URL が正しくないため表示できません。" />;
  }

  const frame = "aspect-video w-full overflow-hidden rounded-lg bg-black";
  const id = youtubeId(parsed);

  if (id && /^[\w-]{6,20}$/.test(id)) {
    return (
      <div className={frame}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
          title={title}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  if (VIDEO_FILE.test(parsed.pathname)) {
    return (
      <div className={frame}>
        <video src={parsed.href} controls preload="metadata" className="size-full" title={title} />
      </div>
    );
  }

  return (
    <div className={frame}>
      <iframe src={parsed.href} title={title} className="size-full" allow="fullscreen; picture-in-picture" allowFullScreen />
    </div>
  );
}

export function VideoPlaceholder({ text = "解説動画は準備中です。" }: { text?: string }) {
  return (
    <div className="grid aspect-video w-full place-items-center rounded-lg bg-tile-1 px-6 text-center type-caption text-body-muted">
      {text}
    </div>
  );
}
