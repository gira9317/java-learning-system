/** 実DB・起動中API・runnerを使う確認。検証用ユーザーは最後に削除する。api/で実行。 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { pool } from "../src/db.js";
import { hashToken } from "../src/lib/session.js";
import { getExercises, getPublicExercises } from "../src/lib/exercises.js";
import { canSubmitGrade, gradeCode, maskHidden } from "../src/lib/runner.js";
import { completeLesson } from "../src/lib/progress.js";
import { readabilitySolutions } from "./readability-solutions.js";
import { advancedSolutions } from "./advanced-solutions.js";

// 問題文の仕様から作った参照実装。クライアントには配信しない。
const solutions: Record<number, string[]> = {
  1: [
    'System.out.println("Hello, Java!");',
    'System.out.println("おはようございます"); System.out.println("Javaの学習を始めます");',
    'System.out.println("こんにちは、"+args[0]+"さん");',
    'System.out.println(args[0]); System.out.println(args[1]);',
    'System.out.println(args[0]+"-"+args[1]);',
  ],
  2: [
    'System.out.println(Integer.parseInt(args[0])+Integer.parseInt(args[1]));',
    'System.out.println(Integer.parseInt(args[0])*Integer.parseInt(args[1]));',
    'int n=Integer.parseInt(args[0]); System.out.println(n/60+":"+n%60);',
    'System.out.println((Integer.parseInt(args[0])+Integer.parseInt(args[1])+Integer.parseInt(args[2]))/3);',
    'System.out.println("合計: "+(Integer.parseInt(args[0])*Integer.parseInt(args[1]))+"円");',
  ],
  3: [
    'System.out.println(Integer.parseInt(args[0])>=60?"合格":"不合格");',
    'System.out.println(Integer.parseInt(args[0])%2==0?"偶数":"奇数");',
    'int n=Integer.parseInt(args[0]); System.out.println(n>0?"正":n<0?"負":"ゼロ");',
    'int h=Integer.parseInt(args[0]); System.out.println(h>=9&&h<18?"営業中":"営業時間外");',
    'int n=Integer.parseInt(args[0]); System.out.println(n>=80?"A":n>=60?"B":"C");',
  ],
  4: [
    'System.out.println(switch(Integer.parseInt(args[0])){case 1->"登録";case 2->"検索";case 3->"終了";default->"無効";});',
    'System.out.println(switch(Integer.parseInt(args[0])){case 1->"月";case 2->"火";case 3->"水";case 4->"木";case 5->"金";case 6->"土";case 7->"日";default->"無効";});',
    'System.out.println(switch(Integer.parseInt(args[0])){case 1,2,3,4,5->"平日";case 6,7->"休日";default->"無効";});',
    'int a=Integer.parseInt(args[1]),b=Integer.parseInt(args[2]); switch(args[0]){case "add":System.out.println(a+b);break;case "sub":System.out.println(a-b);break;case "mul":System.out.println(a*b);break;default:System.out.println("無効");}',
    'System.out.println(switch(Integer.parseInt(args[0])){case 3,4,5->"春";case 6,7,8->"夏";case 9,10,11->"秋";case 12,1,2->"冬";default->"無効";});',
  ],
  5: [
    'for(int i=1;i<=Integer.parseInt(args[0]);i++)System.out.println(i);',
    'int s=0; for(int i=1;i<=Integer.parseInt(args[0]);i++)s+=i; System.out.println(s);',
    'int s=0; for(int i=2;i<=Integer.parseInt(args[0]);i+=2)s+=i; System.out.println(s);',
    'for(int i=1;i<=9;i++)System.out.println(Integer.parseInt(args[0])*i);',
    'int p=1; for(int i=1;i<=Integer.parseInt(args[0]);i++)p*=i; System.out.println(p);',
  ],
  6: [
    'int n=Integer.parseInt(args[0]);while(n>0)System.out.println(n--);System.out.println("終了");',
    'int n=Integer.parseInt(args[0]),c=n==0?1:0;while(n>0){c++;n/=10;}System.out.println(c);',
    'int n=Integer.parseInt(args[0]),s=0;while(n>0){s+=n%10;n/=10;}System.out.println(s);',
    'int n=Integer.parseInt(args[0]),c=0;while(n%2==0){c++;n/=2;}System.out.println(c);',
    'int n=Integer.parseInt(args[0]),v=Integer.parseInt(args[1]),s=0,c=0;while(s<n){s+=v;c++;}System.out.println(c);',
  ],
  7: [
    'int[] v=java.util.Arrays.stream(args).mapToInt(Integer::parseInt).toArray();int s=0;for(int x:v)s+=x;System.out.println(s);',
    'int[] v=java.util.Arrays.stream(args).mapToInt(Integer::parseInt).toArray();int m=v[0];for(int x:v)if(x>m)m=x;System.out.println(m);',
    'for(int i=args.length-1;i>=0;i--)System.out.println(args[i]);',
    'int c=0;for(String a:args)if(Integer.parseInt(a)>=60)c++;System.out.println(c);',
    'int found=-1;for(int i=1;i<args.length;i++)if(args[0].equals(args[i])){found=i-1;break;}System.out.println(found);',
  ],
  8: [
    'System.out.println(add(Integer.parseInt(args[0]),Integer.parseInt(args[1])));',
    'System.out.println(max(Integer.parseInt(args[0]),Integer.parseInt(args[1])));',
    'System.out.println(isEven(Integer.parseInt(args[0])));',
    'System.out.println(sum(java.util.Arrays.stream(args).mapToInt(Integer::parseInt).toArray()));',
    'System.out.println(isPrime(Integer.parseInt(args[0])));',
  ],
  9: [
    'Counter c=new Counter(Integer.parseInt(args[0]));c.increment();System.out.println(c.getCount());',
    'System.out.println(new Rectangle(Integer.parseInt(args[0]),Integer.parseInt(args[1])).area());',
    'Student s=new Student(args[0],Integer.parseInt(args[1]));System.out.println(s.name+":"+(s.isPassed()?"合格":"不合格"));',
    'Account a=new Account(Integer.parseInt(args[0]));a.deposit(Integer.parseInt(args[1]));System.out.println(a.getBalance());',
    'Counter a=new Counter(Integer.parseInt(args[0])),b=new Counter(Integer.parseInt(args[1]));a.increment();a.increment();System.out.println(a.getCount());System.out.println(b.getCount());',
  ],
  10: [
    'try{System.out.println(Integer.parseInt(args[0]));}catch(NumberFormatException e){System.out.println("整数を指定してください");}',
    'try{System.out.println(Integer.parseInt(args[0])/Integer.parseInt(args[1]));}catch(ArithmeticException e){System.out.println("0では割れません");}',
    'try{int[] a={10,20,30};System.out.println(a[Integer.parseInt(args[0])]);}catch(ArrayIndexOutOfBoundsException e){System.out.println("範囲外です");}',
    'if(args.length==0){System.out.println("数値を指定してください");return;}try{System.out.println(Integer.parseInt(args[0])*2);}catch(NumberFormatException e){System.out.println("整数を指定してください");}',
    'try{System.out.println(Integer.parseInt(args[0]));}catch(NumberFormatException e){System.out.println("変換失敗");}finally{System.out.println("処理終了");}',
  ],
  11: ['System.out.println("こんにちは");', 'System.out.println("おはようございます");', 'System.out.println("太郎");', 'System.out.println("こんにちは");System.out.println("よろしくお願いします");', 'System.out.println("開始");System.out.println("練習中");System.out.println("終了");'],
  12: ['System.out.println(3);', 'System.out.println(2+3);', 'System.out.println("2 + 3");', 'System.out.println("人数: "+3);', 'System.out.println("合計: "+(2+3));'],
  13: ['int count=3;System.out.println(count);', 'String name="花子";System.out.println(name);', 'int count=2;count=count+1;System.out.println(count);', 'String name="太郎";int age=20;System.out.println(name+":"+age);', 'int price=120,count=3;System.out.println(price*count);'],
  14: ['int a=4,b=2;System.out.println(a+b);', 'int a=7,b=3;System.out.println(a-b);', 'int a=3,b=4;System.out.println(a*b);', 'int a=7,b=2;System.out.println(a/b);', 'int a=7,b=2;System.out.println(a%b);'],
  15: ['System.out.println(args[0]);', 'System.out.println(args[0]);System.out.println(args[1]);', 'int number=Integer.parseInt(args[0]);System.out.println(number);', 'int a=Integer.parseInt(args[0]),b=Integer.parseInt(args[1]);System.out.println(a+b);', 'int price=Integer.parseInt(args[0]),count=Integer.parseInt(args[1]);System.out.println(price*count);'],
};
const methods = `static int add(int a,int b){return a+b;} static int max(int a,int b){return a>b?a:b;}
static boolean isEven(int n){return n%2==0;} static int sum(int[] a){int s=0;for(int n:a)s+=n;return s;}
static boolean isPrime(int n){if(n<2)return false;for(int i=2;i*i<=n;i++)if(n%i==0)return false;return true;}`;
const classes = `class Counter{private int n;Counter(int n){this.n=n;}void increment(){n++;}int getCount(){return n;}}
class Rectangle{int w,h;Rectangle(int w,int h){this.w=w;this.h=h;}int area(){return w*h;}}
class Student{String name;int score;Student(String n,int s){name=n;score=s;}boolean isPassed(){return score>=60;}}
class Account{int balance;Account(int b){balance=b;}void deposit(int a){balance+=a;}int getBalance(){return balance;}}`;
function solution(lesson: number, question: number) {
  if (lesson === 16) return readabilitySolutions[question - 1];
  return `${lesson === 9 ? classes : ""} public class Main {${lesson === 8 ? methods : ""} public static void main(String[] args){${solutions[lesson][question - 1]}}}`;
}

const ids: string[] = [];
const base = process.env.CHECK_API_URL ?? "http://localhost:4000";
async function fixture(role: "user" | "admin") {
  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  await pool.query(`INSERT INTO users(id,employee_no,name,role,password_hash,must_change_password) VALUES($1,$2,'exercise verification',$3,'not-a-login-hash',false)`, [id, `VERIFY-${id}`, role]);
  ids.push(id);
  await pool.query(`INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')`, [hashToken(token), id]);
  return { id, token };
}
async function request(path: string, token: string, method = "GET", body?: unknown, expected = 200) {
  const response = await fetch(`${base}${path}`, { method, headers: { cookie: `session=${token}`, origin: "http://localhost:3000", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
  return json;
}

try {
  const user = await fixture("user");
  const admin = await fixture("admin");
  await pool.query(`INSERT INTO lesson_progress(user_id,lesson_id,status) VALUES($1,1,'in-progress')`, [user.id]);
  const detail = await request("/lessons/1", user.token);
  assert.equal(detail.lesson.exercises.length, 5);
  assert.ok(detail.lesson.exercises.every((q: Record<string, unknown>) => !("tests" in q)));
  const catalog = await request("/lessons/catalog", user.token);
  assert.equal(catalog.lessons.length, 21);
  assert.deepEqual(catalog.lessons.slice(0,5).map((l: {id:number}) => l.id), [11,12,13,14,15]);
  assert.deepEqual(catalog.lessons.map((l: {number:number}) => l.number), Array.from({length:21},(_,i)=>i+1));
  assert.deepEqual(catalog.lessons.slice(-8).map((l: {id:number}) => l.id), [9,16,10,17,18,19,20,21]);
  await pool.query(`INSERT INTO lesson_progress(user_id,lesson_id,status) VALUES($1,11,'in-progress')`,[user.id]);
  const introState = await request("/lessons/11/submissions?question=1",user.token);
  assert.equal(introState.code.canSubmit,true);
  assert.equal(introState.flow.canSubmit,false);
  const introCode = await request("/lessons/11/submissions?question=1",user.token,"POST",{kind:"code",content:{code:solution(11,1)}},201);
  await request(`/admin/submissions/${introCode.submission.id}/approve`,admin.token,"POST",{});
  console.log("PASS: novice-first order, sequential display numbers, code-only introductory submissions");
  await pool.query(`INSERT INTO lesson_progress(user_id,lesson_id,status) VALUES($1,16,'in-progress')`, [user.id]);
  const readable = await request("/lessons/16", user.token);
  assert.equal(readable.lesson.level, "refactor");
  assert.equal(readable.lesson.exercises.length, 5);
  assert.ok(readable.lesson.material_md.includes("神クラス"));
  const readabilityState = await request("/lessons/16/submissions?question=1", user.token);
  assert.equal(readabilityState.flow.canSubmit, false);
  assert.equal(readabilityState.code.canSubmit, true);
  const refactored = await request("/lessons/16/submissions?question=1",user.token,"POST",{kind:"code",content:{code:solution(16,1)}},201);
  await request(`/admin/submissions/${refactored.submission.id}/approve`,admin.token,"POST",{});
  console.log("PASS: refactoring lesson material, code-only submission and review");
  await request("/lessons/1/submissions?question=6", user.token, "GET", undefined, 400);
  await request("/lessons/2/drafts/code?question=1", user.token, "PUT", { code: "locked" }, 409);
  await request("/lessons/1/drafts/code?question=1", user.token, "PUT", { code: "first answer" });
  await request("/lessons/1/drafts/code?question=2", user.token, "PUT", { code: "second answer" });
  for (const n of [1, 2]) {
    const saved = await request(`/lessons/1/submissions?question=${n}`, user.token);
    assert.equal(saved.drafts.code.content.code, n === 1 ? "first answer" : "second answer");
  }
  // 同じレッスンでも、別の問題のフロー図承認を流用してコードを提出できない。
  const flow = await request("/lessons/1/submissions?question=1", user.token, "POST", { kind: "flow", content: { nodes: [], edges: [] } }, 201);
  await request(`/admin/submissions/${flow.submission.id}/approve`, admin.token, "POST", {});
  await request("/lessons/1/submissions?question=2", user.token, "POST", { kind: "code", content: { code: solution(1, 2) } }, 409);
  const code = await request("/lessons/1/submissions?question=1", user.token, "POST", { kind: "code", content: { code: solution(1, 1) } }, 201);
  const reviewed = await request(`/admin/submissions/${code.submission.id}/approve`, admin.token, "POST", {});
  assert.equal(reviewed.lessonCompleted, false);
  const remaining = await request("/lessons/1/submissions?question=2", user.token);
  assert.equal(remaining.drafts.code.content.code, "second answer");
  const submitted = await request("/lessons/1/submissions?question=1", user.token);
  assert.equal(submitted.drafts.code, null);
  assert.equal(submitted.code.status, "approved");
  assert.equal(remaining.code.status, "none");
  const reviewDetail = await request(`/admin/submissions/${code.submission.id}`, admin.token);
  assert.equal(reviewDetail.submission.question.number, 1);
  console.log("PASS: API authentication, question-scoped drafts/submissions, review isolation, locked lessons");

  const grade = await request("/lessons/1/grade?question=2", user.token, "POST", { code: solution(1, 2) });
  assert.ok(grade.compile.ok && grade.results.every((r: { ok: boolean }) => r.ok));
  const run = await request("/lessons/1/run?question=3", user.token, "POST", { code: solution(1, 3), args: ["太郎"], stdin: "" });
  assert.equal(run.result.stdout.trim(), "こんにちは、太郎さん");

  // レッスン全体の完了は5問が揃った場合だけ。検証用ユーザーの記録のみ追加する。
  for (let n = 2; n <= 5; n++) {
    await pool.query(`INSERT INTO submissions(user_id,lesson_id,question_no,kind,content,status) VALUES($1,1,$2,'code','{}','approved')`, [user.id, n]);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    assert.equal(await completeLesson(client, user.id, 1), 2);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  assert.equal((await pool.query(`SELECT status FROM lesson_progress WHERE user_id=$1 AND lesson_id=1`, [user.id])).rows[0].status, "completed");
  console.log("PASS: question-specific execution/grading and completion after all 5 approvals");

  let caseCount = 0;
  for (const lesson of [...[11,12,13,14,15], ...Array.from({length:9},(_,i)=>i+1),16,10]) {
    const questions = await getExercises(lesson);
    const visible = await getPublicExercises(lesson);
    assert.equal(questions.length, 5);
    for (const question of questions) {
      if (lesson > 10) assert.ok(question.starterCode.includes("System.out.println"));
      const publicQuestion = visible[question.number - 1];
      assert.equal(publicQuestion.examples.length, question.tests.filter((t) => !t.hidden).length);
      const result = await gradeCode(lesson, solution(lesson, question.number), question.number);
      assert.ok(result?.compile.ok, `Compile ${lesson}-${question.number}: ${result?.compile.output}`);
      assert.ok(result.results.every((r) => r.ok), `Grade ${lesson}-${question.number}: ${JSON.stringify(result.results)}`);
      const masked = maskHidden(result);
      assert.ok(masked.results.filter((r) => r.hidden).every((r) => r.expected === "（非公開）"));
      caseCount += result.results.length;
      if (lesson === 16) {
        const original = await gradeCode(lesson, question.starterCode, question.number);
        assert.ok(original?.compile.ok && original.results.every((r) => r.ok), `Original behavior 16-${question.number}`);
        assert.equal(original.results.length, result.results.length);
      }
    }
    console.log(`PASS: Lesson ${lesson}, all 5 reference programs`);
  }
  console.log(`PASS: 80 reference programs, ${caseCount} test cases; 5 original refactoring programs also verified`);

  // 応用編：複数ファイル（package）の参照解答。自由制作はコンパイルが通れば提出できる
  let advancedCases = 0;
  for (const lesson of [17, 18, 19, 20, 21]) {
    const questions = await getExercises(lesson);
    assert.equal(questions.length, 5);
    for (const question of questions) {
      const sol = advancedSolutions[lesson][question.number - 1];
      const result = await gradeCode(lesson, sol.code, question.number, sol.files ?? []);
      assert.ok(result?.compile.ok, `Compile ${lesson}-${question.number}: ${result?.compile.output}`);
      assert.ok(result.results.every((r) => r.ok), `Grade ${lesson}-${question.number}: ${JSON.stringify(result.results)}`);
      assert.ok(canSubmitGrade(result));
      if (question.mode === "open") assert.equal(result.mode, "open");
      else assert.ok(result.results.length > 0);
      if (question.starterFiles) {
        const starter = await gradeCode(lesson, question.starterCode, question.number, question.starterFiles);
        assert.ok(starter?.compile.ok, `Starter compiles ${lesson}-${question.number}: ${starter?.compile.output}`);
      }
      advancedCases += result.results.length;
    }
    console.log(`PASS: Lesson ${lesson}, all 5 reference programs (multi-file)`);
  }
  console.log(`PASS: 25 advanced reference programs, ${advancedCases} test cases`);

  // 応用編の API：複数ファイルの提出・自由制作の提出・対話の実行と持ち主の確認
  await pool.query(`INSERT INTO lesson_progress(user_id,lesson_id,status) VALUES($1,17,'in-progress'),($1,20,'in-progress'),($1,21,'in-progress')`, [user.id]);
  const advancedLesson = await request("/lessons/17", user.token);
  assert.equal(advancedLesson.lesson.multi_file, true);
  assert.equal(advancedLesson.lesson.level, "advanced");
  const pay = advancedSolutions[17][0];
  const multi = await request("/lessons/17/submissions?question=1", user.token, "POST", { kind: "code", content: { code: pay.code, files: pay.files } }, 201);
  const stored = await request(`/admin/submissions/${multi.submission.id}`, admin.token);
  assert.equal(stored.submission.content.files.length, pay.files!.length);
  await request("/lessons/17/grade?question=1", user.token, "POST", { code: pay.code, files: [{ path: "../evil/X.java", content: "" }] }, 400);
  const openQ = await request("/lessons/20?question=1", user.token);
  assert.equal(openQ.lesson.exercises[0].mode, "open");
  assert.equal(openQ.lesson.exercises[0].interactive, "console");
  const vending = advancedSolutions[20][0];
  await request("/lessons/20/submissions?question=1", user.token, "POST", { kind: "code", content: { code: vending.code, files: vending.files } }, 201);
  await request("/lessons/20/submissions?question=2", user.token, "POST", { kind: "code", content: { code: "public class Main { oops }" } }, 422);
  const game = advancedSolutions[21][3];
  const started = await request("/lessons/21/sessions?question=4", user.token, "POST", { code: game.code, files: game.files });
  assert.ok(started.compile.ok && started.sessionId);
  assert.match(started.first.output, /  1 2 3 4 5 6 7 8/);
  const reply = await request(`/lessons/21/sessions/${started.sessionId}/input?question=4`, user.token, "POST", { line: "3 4" });
  assert.match(reply.output, /白: [1-8] [1-8]/);
  await request(`/lessons/21/sessions/${started.sessionId}/input?question=4`, admin.token, "POST", { line: "3 4" }, 404);
  await request(`/lessons/21/sessions/${started.sessionId}?question=4`, user.token, "DELETE");
  await request(`/lessons/21/sessions/${started.sessionId}/input?question=4`, user.token, "POST", { line: "3 4" }, 404);
  console.log("PASS: multi-file submissions, open-mode submissions, interactive sessions and their ownership");
} finally {
  if (ids.length) await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [ids]);
  await pool.end();
}
