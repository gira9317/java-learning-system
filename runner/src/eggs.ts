/**
 * イースターエッグ（CTF 風の隠し要素）。受講者のコードと同じコンテナに、こっそり仕掛けを置く。
 *
 *   1. Duke    … 隠しクラス。暗号・リフレクション・例外の原因をたどる。入口は画面の 404 ページ
 *   2. Tux     … コンテナ（Linux）の環境変数と、作業ディレクトリの隠しファイル。Duke の宝物が次の行き先を教える
 *   3. Gopher  … 隠しクラス。100 匹（100 スレッド）が同時に掘るとトンネルが開く。Tux の魚が教える
 *
 * フラグの平文はここに書かない（XOR や Base64 で包んである）。新人向けのお遊びなので、
 * ソースを読んで逆算されるところまでは防がない。
 * 隠しクラスのソースはコンパイル後に消し、.class だけを残す（作業ディレクトリを覗かれてもネタバレしない）。
 */

/** コンテナに渡す環境変数。Java の getenv で文字化けしないよう ASCII だけにする */
export const EGG_ENV = {
  TUX_SAYS:
    "you are inside a little linux box. in linux, files whose names start with a dot are hidden. look around your working directory.",
};

const DUKE_SOURCE = String.raw`
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

public final class Duke {
    private Duke() {}

    private static final String WORDS =
            "m lezi e hssv amxl rs reqi. ewo qc gpeww xs wlsa csy alex mx lmhiw, xlir orsgo amxl xli asvh iwtviwws.";
    private static final String CHECK = "03ae599e1a7aeb2c5e3237a35e8009f9697e5dad112573e60a0566189f8798be";
    private static final int[] TREASURE = {136, 62, 193, 124, 116, 1, 254, 164, 162, 201, 123, 32, 146, 192, 132, 140,
            56, 37, 39, 130, 255, 200, 28, 227, 39, 78, 150, 17, 232, 179, 148, 215, 191};

    public static void hello() {
        System.out.println("やあ、ぼくは Duke。");
        System.out.println("ぼくの言葉は、ぼくの名前の長さだけずれているんだ。");
        System.out.println();
        System.out.println(WORDS);
    }

    private static void $(String word) {
        if (word == null || !CHECK.equals(hash("check:" + word))) {
            System.out.println("トントン…… 返事がない。合言葉が違うみたい。");
            return;
        }
        Treasure treasure = new Treasure(decode(TREASURE, "duke:" + word));
        throw new RuntimeException("ドアは開いた。でも、部屋の中は空っぽに見える……",
                new IllegalStateException("いや、奥にまだ何かある", treasure));
    }

    private static final class Treasure extends Exception {
        private final String flag;
        private final String next = "次は、このコードがどこで動いているのかを調べてみて。まわりの「環境」が何かを教えてくれるはず。";

        private Treasure(String flag) {
            super("宝物は、ぼくの中にしまってある");
            this.flag = flag;
        }

        @Override
        public String toString() {
            return "Duke.Treasure: " + getMessage();
        }
    }

    private static String hash(String text) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String decode(int[] data, String keySource) {
        try {
            byte[] key = MessageDigest.getInstance("SHA-256").digest(keySource.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[data.length];
            for (int i = 0; i < data.length; i++) out[i] = (byte) (data[i] ^ key[i % key.length]);
            return new String(out, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
`;

const GOPHER_SOURCE = String.raw`
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public final class Gopher {
    private Gopher() {}

    private static final int NEEDED = 100;
    /** 最初に dig() が呼ばれてから、この時間だけ仲間を待つ */
    private static final long WINDOW_NANOS = 2_000_000_000L;
    private static final int[] TUNNEL = {190, 212, 76, 107, 15, 103, 232, 111, 207, 43, 113, 220, 58, 97, 116, 140,
            45, 29, 67, 99, 21, 112, 140, 233, 239, 45, 124, 145, 126, 86};

    private static final Set<Thread> DIGGING = ConcurrentHashMap.newKeySet();
    private static final AtomicInteger MOST = new AtomicInteger();
    private static final AtomicInteger CALLS = new AtomicInteger();
    private static final AtomicBoolean OPENED = new AtomicBoolean();
    private static final AtomicLong FIRST = new AtomicLong();

    static {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            if (OPENED.get() || CALLS.get() == 0) return;
            System.out.println("ひとりじゃ掘れないよ。");
            System.out.println("同時に掘っていたのは、最大で " + MOST.get() + " 匹。トンネルを開けるには " + NEEDED + " 匹が同時に掘らないと。");
        }));
    }

    public static void dig() {
        CALLS.incrementAndGet();
        FIRST.compareAndSet(0, System.nanoTime());
        Thread me = Thread.currentThread();
        if (!DIGGING.add(me)) return;
        MOST.accumulateAndGet(DIGGING.size(), Math::max);
        try {
            while (!OPENED.get() && System.nanoTime() - FIRST.get() < WINDOW_NANOS) {
                if (DIGGING.size() >= NEEDED) {
                    if (OPENED.compareAndSet(false, true)) {
                        System.out.println("トンネルが開通した！ " + NEEDED + " 匹のゴーファーが、きみにこれを掘り当てたよ:");
                        System.out.println(decode(TUNNEL, "gopher:tunnel"));
                    }
                    return;
                }
                Thread.sleep(5);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            DIGGING.remove(me);
        }
    }

    private static String decode(int[] data, String keySource) {
        try {
            byte[] key = MessageDigest.getInstance("SHA-256").digest(keySource.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[data.length];
            for (int i = 0; i < data.length; i++) out[i] = (byte) (data[i] ^ key[i % key.length]);
            return new String(out, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
`;

const TUX_FISH = `よく見つけたね。ここはペンギンの巣。
とっておきの魚は Base64 で包んである:

SkFWQXtjMG50NDFuM3JzX2g0djNfczNjcjN0c30=

--
次は地面の下へ。Gopher.dig() …… でも、ひとりじゃ掘れない。
`;

const HIDDEN_CLASSES = [
  { name: "Duke", source: DUKE_SOURCE },
  { name: "Gopher", source: GOPHER_SOURCE },
];

/** 受講者が同じ名前の型を自分で作っていたら、重複のコンパイルエラーにならないよう入れない */
function declares(code: string, name: string) {
  return new RegExp(`\\b(class|interface|enum|record)\\s+${name}\\b`).test(code);
}

/**
 * 仕掛けを置くシェルスクリプト（コンテナの sh に標準入力で渡す）と、一緒にコンパイルするソースの一覧。
 * 受講者のコードはここに入れない（ヒアドキュメントの終わりの印と重なる心配をしなくてよいように）
 */
export function eggSetup(code: string) {
  const classes = HIDDEN_CLASSES.filter((c) => !declares(code, c.name));
  const lines = ["set -e", "mkdir -p /work/.penguin", "cat > /work/.penguin/fish <<'__EGG_EOF__'", TUX_FISH, "__EGG_EOF__"];
  for (const c of classes) {
    lines.push(`cat > /work/${c.name}.java <<'__EGG_EOF__'`, c.source, "__EGG_EOF__");
  }
  return {
    script: lines.join("\n") + "\n",
    sources: classes.map((c) => `/work/${c.name}.java`),
  };
}
