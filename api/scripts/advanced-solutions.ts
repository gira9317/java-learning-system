// 応用編（レッスン17〜21）の参照解答。APIでは配信しない。解答の構造はこの例だけに限定しない。
// 複数ファイル・package の分け方の一例として、レビューの参考にもする。
export type Solution = { code: string; files?: { path: string; content: string }[] };

const f = (path: string, content: string) => ({ path, content });

/* ---------- 17 継承とインターフェース ---------- */

const payment: Solution = {
  code: `import payment.*;

public class Main {
    public static void main(String[] args) {
        PaymentMethod method = switch (args[0]) {
            case "cash" -> new Cash();
            case "card" -> new CreditCard();
            case "qr" -> new QrPay();
            default -> null;
        };
        if (method == null) {
            System.out.println("無効な支払い方法");
            return;
        }
        int amount = Integer.parseInt(args[1]);
        System.out.println(method.name() + ": 手数料 " + method.fee(amount) + "円");
    }
}
`,
  files: [
    f("payment/PaymentMethod.java", `package payment;

public interface PaymentMethod {
    String name();
    int fee(int amount);
}
`),
    f("payment/Cash.java", `package payment;

public class Cash implements PaymentMethod {
    public String name() { return "現金"; }
    public int fee(int amount) { return 0; }
}
`),
    f("payment/CreditCard.java", `package payment;

public class CreditCard implements PaymentMethod {
    public String name() { return "カード"; }
    public int fee(int amount) { return amount * 3 / 100; }
}
`),
    f("payment/QrPay.java", `package payment;

public class QrPay implements PaymentMethod {
    public String name() { return "QR"; }
    public int fee(int amount) { return amount / 100; }
}
`),
  ],
};

const payroll: Solution = {
  code: `import employee.*;

public class Main {
    public static void main(String[] args) {
        Employee e = args[0].equals("full")
            ? new FullTime(args[1], Integer.parseInt(args[2]))
            : new PartTime(args[1], Integer.parseInt(args[2]), Integer.parseInt(args[3]));
        System.out.println(e.getName() + ": " + e.monthlyPay() + "円");
    }
}
`,
  files: [
    f("employee/Employee.java", `package employee;

public abstract class Employee {
    private final String name;

    protected Employee(String name) { this.name = name; }

    public String getName() { return name; }

    public abstract int monthlyPay();
}
`),
    f("employee/FullTime.java", `package employee;

public class FullTime extends Employee {
    private final int salary;

    public FullTime(String name, int salary) {
        super(name);
        this.salary = salary;
    }

    public int monthlyPay() { return salary; }
}
`),
    f("employee/PartTime.java", `package employee;

public class PartTime extends Employee {
    private static final int REGULAR_HOURS = 160;
    private final int hourlyWage;
    private final int hours;

    public PartTime(String name, int hourlyWage, int hours) {
        super(name);
        this.hourlyWage = hourlyWage;
        this.hours = hours;
    }

    public int monthlyPay() {
        int regular = Math.min(hours, REGULAR_HOURS);
        int overtime = hours - regular;
        return regular * hourlyWage + overtime * hourlyWage * 125 / 100;
    }
}
`),
  ],
};

const notify: Solution = {
  code: `import notify.*;

public class Main {
    public static void main(String[] args) {
        String message = args[0];
        for (int i = 1; i < args.length; i++) {
            Notifier notifier = switch (args[i]) {
                case "email" -> new EmailNotifier();
                case "sms" -> new SmsNotifier();
                case "chat" -> new ChatNotifier();
                default -> null;
            };
            System.out.println(notifier == null ? "[未対応] " + args[i] : notifier.format(message));
        }
    }
}
`,
  files: [
    f("notify/Notifier.java", `package notify;

public interface Notifier {
    String format(String message);
}
`),
    f("notify/EmailNotifier.java", `package notify;

public class EmailNotifier implements Notifier {
    public String format(String message) { return "[メール] " + message; }
}
`),
    f("notify/SmsNotifier.java", `package notify;

public class SmsNotifier implements Notifier {
    private static final int LIMIT = 10;

    public String format(String message) {
        String body = message.length() > LIMIT ? message.substring(0, LIMIT) + "…" : message;
        return "[SMS] " + body;
    }
}
`),
    f("notify/ChatNotifier.java", `package notify;

public class ChatNotifier implements Notifier {
    public String format(String message) { return "[チャット] @channel " + message; }
}
`),
  ],
};

const discount: Solution = {
  code: `import discount.*;

public class Main {
    public static void main(String[] args) {
        int price = Integer.parseInt(args[0]);
        DiscountPolicy policy = switch (args[1]) {
            case "percent" -> new PercentOff(Integer.parseInt(args[2]));
            case "amount" -> new AmountOff(Integer.parseInt(args[2]));
            default -> new NoDiscount();
        };
        System.out.println("支払額: " + policy.apply(price) + "円");
    }
}
`,
  files: [
    f("discount/DiscountPolicy.java", `package discount;

public interface DiscountPolicy {
    int apply(int price);
}
`),
    f("discount/NoDiscount.java", `package discount;

public class NoDiscount implements DiscountPolicy {
    public int apply(int price) { return price; }
}
`),
    f("discount/PercentOff.java", `package discount;

public class PercentOff implements DiscountPolicy {
    private final int percent;

    public PercentOff(int percent) { this.percent = percent; }

    public int apply(int price) { return price - price * percent / 100; }
}
`),
    f("discount/AmountOff.java", `package discount;

public class AmountOff implements DiscountPolicy {
    private final int amount;

    public AmountOff(int amount) { this.amount = amount; }

    public int apply(int price) { return Math.max(0, price - amount); }
}
`),
  ],
};

const shapes: Solution = {
  code: `import java.util.ArrayList;
import java.util.List;
import shape.*;

public class Main {
    public static void main(String[] args) {
        List<Shape> shapes = new ArrayList<>();
        int i = 0;
        while (i < args.length) {
            switch (args[i]) {
                case "rect" -> { shapes.add(new Rectangle(Double.parseDouble(args[i + 1]), Double.parseDouble(args[i + 2]))); i += 3; }
                case "tri" -> { shapes.add(new Triangle(Double.parseDouble(args[i + 1]), Double.parseDouble(args[i + 2]))); i += 3; }
                case "circle" -> { shapes.add(new Circle(Double.parseDouble(args[i + 1]))); i += 2; }
                default -> i++;
            }
        }
        double total = 0;
        for (Shape s : shapes) {
            System.out.println(s.name() + ": " + String.format("%.2f", s.area()));
            total += s.area();
        }
        System.out.println("合計: " + String.format("%.2f", total));
    }
}
`,
  files: [
    f("shape/Shape.java", `package shape;

public interface Shape {
    String name();
    double area();
}
`),
    f("shape/Rectangle.java", `package shape;

public class Rectangle implements Shape {
    private final double width;
    private final double height;

    public Rectangle(double width, double height) { this.width = width; this.height = height; }

    public String name() { return "長方形"; }
    public double area() { return width * height; }
}
`),
    f("shape/Triangle.java", `package shape;

public class Triangle implements Shape {
    private final double base;
    private final double height;

    public Triangle(double base, double height) { this.base = base; this.height = height; }

    public String name() { return "三角形"; }
    public double area() { return base * height / 2; }
}
`),
    f("shape/Circle.java", `package shape;

public class Circle implements Shape {
    private final double radius;

    public Circle(double radius) { this.radius = radius; }

    public String name() { return "円"; }
    public double area() { return Math.PI * radius * radius; }
}
`),
  ],
};

/* ---------- 18 コレクション ---------- */

const cart: Solution = {
  code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    record Item(String name, int price) {}

    public static void main(String[] args) {
        List<Item> cart = new ArrayList<>();
        for (int i = 0; i + 1 < args.length; i += 2) cart.add(new Item(args[i], Integer.parseInt(args[i + 1])));
        if (cart.isEmpty()) {
            System.out.println("かごは空です");
            return;
        }
        int total = 0;
        for (Item item : cart) {
            System.out.println(item.name() + " " + item.price() + "円");
            total += item.price();
        }
        System.out.println("合計: " + total + "円（" + cart.size() + "点）");
    }
}
`,
};

const stock: Solution = {
  code: `import java.util.LinkedHashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> stock = new LinkedHashMap<>();
        for (int i = 0; i + 2 < args.length; i += 3) {
            String item = args[i + 1];
            int count = Integer.parseInt(args[i + 2]);
            if (args[i].equals("in")) {
                stock.merge(item, count, Integer::sum);
            } else {
                int current = stock.getOrDefault(item, 0);
                if (current < count) System.out.println("在庫不足: " + item + "（在庫 " + current + "）");
                else stock.put(item, current - count);
            }
        }
        for (Map.Entry<String, Integer> e : stock.entrySet()) System.out.println(e.getKey() + ": " + e.getValue());
    }
}
`,
};

const words: Solution = {
  code: `import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String w : args) counts.merge(w, 1, Integer::sum);
        List<Map.Entry<String, Integer>> entries = new ArrayList<>(counts.entrySet());
        // sort は安定なので、回数が同じなら最初に出てきた順のまま
        entries.sort((a, b) -> b.getValue() - a.getValue());
        for (Map.Entry<String, Integer> e : entries) System.out.println(e.getKey() + ": " + e.getValue());
    }
}
`,
};

const ranking: Solution = {
  code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    record Score(String name, int points) {}

    public static void main(String[] args) {
        List<Score> scores = new ArrayList<>();
        for (int i = 0; i + 1 < args.length; i += 2) scores.add(new Score(args[i], Integer.parseInt(args[i + 1])));
        List<Score> sorted = new ArrayList<>(scores);
        sorted.sort((a, b) -> b.points() - a.points());
        int sum = 0;
        for (int i = 0; i < sorted.size(); i++) {
            Score s = sorted.get(i);
            int rank = 1;
            for (Score other : sorted) if (other.points() > s.points()) rank++;
            System.out.println(rank + "位 " + s.name() + " " + s.points());
            sum += s.points();
        }
        System.out.println("平均: " + String.format("%.1f", (double) sum / scores.size()));
    }
}
`,
};

const rooms: Solution = {
  code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Main {
    record Reservation(int start, int end) {
        boolean overlaps(Reservation other) { return start < other.end && other.start < end; }
    }

    public static void main(String[] args) {
        Map<String, List<Reservation>> byRoom = new HashMap<>();
        for (int i = 0; i + 2 < args.length; i += 3) {
            String room = args[i];
            Reservation r = new Reservation(Integer.parseInt(args[i + 1]), Integer.parseInt(args[i + 2]));
            String label = room + " " + r.start() + "-" + r.end();
            List<Reservation> list = byRoom.computeIfAbsent(room, k -> new ArrayList<>());
            if (r.start() >= r.end()) System.out.println("時間が正しくありません: " + label);
            else if (list.stream().anyMatch(r::overlaps)) System.out.println("重複のため予約できません: " + label);
            else {
                list.add(r);
                System.out.println("予約できました: " + label);
            }
        }
    }
}
`,
};

/* ---------- 19 小さな業務システム（標準入力のコマンドで動かす） ---------- */

/** 図書の貸出。受講者には library/Book.java・library/Library.java のひな形を渡す */
export const libraryStarter = {
  code: `import java.util.Scanner;
import library.Library;

public class Main {
    public static void main(String[] args) {
        Library library = new Library();
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String[] cmd = sc.nextLine().trim().split(" ");
            // TODO: cmd[0] に応じて library のメソッドを呼び、結果を表示する
        }
    }
}
`,
  files: [
    f("library/Book.java", `package library;

/** 1 冊の本。貸出中なら、借りている人の社員番号を持つ */
public class Book {
    // TODO: 番号・タイトル・借りている人（いなければ null）を持たせる
}
`),
    f("library/Library.java", `package library;

/** 本の登録・貸出・返却をまとめて受け持つ */
public class Library {
    // TODO: 登録した順を保って本を持ち、add / lend / giveBack / list を作る
}
`),
  ],
};

const library: Solution = {
  code: `import java.util.Scanner;
import library.Library;

public class Main {
    public static void main(String[] args) {
        Library library = new Library();
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.isEmpty()) continue;
            String[] cmd = line.split(" ");
            switch (cmd[0]) {
                case "add" -> System.out.println(library.add(cmd[1], cmd[2]));
                case "lend" -> System.out.println(library.lend(cmd[1], cmd[2]));
                case "return" -> System.out.println(library.giveBack(cmd[1]));
                case "list" -> library.list().forEach(System.out::println);
                default -> System.out.println("不明なコマンド: " + cmd[0]);
            }
        }
    }
}
`,
  files: [
    f("library/Book.java", `package library;

public class Book {
    private final String id;
    private final String title;
    private String borrower;

    public Book(String id, String title) {
        this.id = id;
        this.title = title;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public boolean isLent() { return borrower != null; }
    public String getBorrower() { return borrower; }
    void lendTo(String employeeNo) { borrower = employeeNo; }
    void giveBack() { borrower = null; }
}
`),
    f("library/Library.java", `package library;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Library {
    private final Map<String, Book> books = new LinkedHashMap<>();

    public String add(String id, String title) {
        if (books.containsKey(id)) return "登録済みの番号です: " + id;
        books.put(id, new Book(id, title));
        return "登録: " + id + " " + title;
    }

    public String lend(String id, String employeeNo) {
        Book book = books.get(id);
        if (book == null) return "見つかりません: " + id;
        if (book.isLent()) return "貸出中です: " + book.getTitle();
        book.lendTo(employeeNo);
        return "貸出: " + book.getTitle() + " → " + employeeNo;
    }

    public String giveBack(String id) {
        Book book = books.get(id);
        if (book == null) return "見つかりません: " + id;
        if (!book.isLent()) return "貸し出されていません: " + book.getTitle();
        book.giveBack();
        return "返却: " + book.getTitle();
    }

    public List<String> list() {
        List<String> lines = new ArrayList<>();
        for (Book b : books.values()) {
            lines.add(b.getId() + " " + b.getTitle() + (b.isLent() ? "（貸出中: " + b.getBorrower() + "）" : "（在庫あり）"));
        }
        if (lines.isEmpty()) lines.add("本はありません");
        return lines;
    }
}
`),
  ],
};

const register: Solution = {
  code: `import java.util.Scanner;
import shop.Register;

public class Main {
    public static void main(String[] args) {
        Register register = new Register();
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.isEmpty()) continue;
            String[] cmd = line.split(" ");
            switch (cmd[0]) {
                case "item" -> register.addProduct(cmd[1], cmd[2], Integer.parseInt(cmd[3]));
                case "scan" -> System.out.println(register.scan(cmd[1], Integer.parseInt(cmd[2])));
                case "total" -> register.receipt().forEach(System.out::println);
                case "pay" -> System.out.println(register.pay(Integer.parseInt(cmd[1])));
                default -> System.out.println("不明なコマンド: " + cmd[0]);
            }
        }
    }
}
`,
  files: [
    f("shop/Product.java", `package shop;

public record Product(String code, String name, int price) {}
`),
    f("shop/Register.java", `package shop;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Register {
    private static final int TAX_PERCENT = 10;
    private final Map<String, Product> products = new HashMap<>();
    private int subtotal;

    public void addProduct(String code, String name, int price) {
        products.put(code, new Product(code, name, price));
    }

    public String scan(String code, int quantity) {
        Product p = products.get(code);
        if (p == null) return "商品がありません: " + code;
        int amount = p.price() * quantity;
        subtotal += amount;
        return p.name() + " × " + quantity + " = " + amount + "円";
    }

    private int tax() { return subtotal * TAX_PERCENT / 100; }

    private int total() { return subtotal + tax(); }

    public List<String> receipt() {
        return List.of("小計: " + subtotal + "円", "消費税: " + tax() + "円", "合計: " + total() + "円");
    }

    public String pay(int cash) {
        int total = total();
        if (cash < total) return "金額が足りません（あと " + (total - cash) + "円）";
        subtotal = 0;
        return "おつり: " + (cash - total) + "円";
    }
}
`),
  ],
};

const attendance: Solution = {
  code: `import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.Scanner;
import attendance.WorkDay;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long totalWork = 0;
        long totalOver = 0;
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.isEmpty()) continue;
            String[] p = line.split(" ");
            LocalDate date = LocalDate.parse(p[0]);
            LocalTime in = LocalTime.parse(p[1]);
            LocalTime out = LocalTime.parse(p[2]);
            if (!out.isAfter(in)) {
                System.out.println("入力エラー: " + line);
                continue;
            }
            WorkDay day = new WorkDay(in, out);
            String week = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.JAPANESE);
            System.out.println(date + "（" + week + "）: 実働 " + hm(day.workMinutes()) + " 残業 " + hm(day.overtimeMinutes()));
            totalWork += day.workMinutes();
            totalOver += day.overtimeMinutes();
        }
        System.out.println("合計: 実働 " + hm(totalWork) + " 残業 " + hm(totalOver));
    }

    static String hm(long minutes) {
        return minutes / 60 + ":" + String.format("%02d", minutes % 60);
    }
}
`,
  files: [
    f("attendance/WorkDay.java", `package attendance;

import java.time.Duration;
import java.time.LocalTime;

/** 1 日の勤務。休憩は、拘束が 6 時間を超えたら 45 分、8 時間を超えたら 60 分 */
public class WorkDay {
    private static final int REGULAR_MINUTES = 8 * 60;
    private final long spanMinutes;

    public WorkDay(LocalTime in, LocalTime out) {
        spanMinutes = Duration.between(in, out).toMinutes();
    }

    public long breakMinutes() {
        if (spanMinutes > 8 * 60) return 60;
        if (spanMinutes > 6 * 60) return 45;
        return 0;
    }

    public long workMinutes() { return spanMinutes - breakMinutes(); }

    public long overtimeMinutes() { return Math.max(0, workMinutes() - REGULAR_MINUTES); }
}
`),
  ],
};

const todo: Solution = {
  code: `import java.time.LocalDate;
import java.util.Scanner;
import todo.TaskList;

public class Main {
    public static void main(String[] args) {
        TaskList tasks = new TaskList();
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.isEmpty()) continue;
            String[] cmd = line.split(" ", 3);
            switch (cmd[0]) {
                case "add" -> System.out.println(tasks.add(LocalDate.parse(cmd[1]), cmd[2]));
                case "done" -> System.out.println(tasks.done(Integer.parseInt(cmd[1])));
                case "list" -> tasks.list().forEach(System.out::println);
                case "overdue" -> tasks.overdue(LocalDate.parse(cmd[1])).forEach(System.out::println);
                default -> System.out.println("不明なコマンド: " + cmd[0]);
            }
        }
    }
}
`,
  files: [
    f("todo/Task.java", `package todo;

import java.time.LocalDate;

public class Task {
    private final int id;
    private final LocalDate due;
    private final String title;
    private boolean done;

    public Task(int id, LocalDate due, String title) {
        this.id = id;
        this.due = due;
        this.title = title;
    }

    public int getId() { return id; }
    public LocalDate getDue() { return due; }
    public String getTitle() { return title; }
    public boolean isDone() { return done; }
    public void complete() { done = true; }
}
`),
    f("todo/TaskList.java", `package todo;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class TaskList {
    private final List<Task> tasks = new ArrayList<>();
    private int nextId = 1;

    public String add(LocalDate due, String title) {
        Task t = new Task(nextId++, due, title);
        tasks.add(t);
        return "追加: #" + t.getId() + " " + title + "（期限 " + due + "）";
    }

    public String done(int id) {
        for (Task t : tasks) {
            if (t.getId() == id && !t.isDone()) {
                t.complete();
                return "完了: #" + id + " " + t.getTitle();
            }
        }
        return "見つかりません: #" + id;
    }

    private List<Task> open() {
        List<Task> open = new ArrayList<>();
        for (Task t : tasks) if (!t.isDone()) open.add(t);
        open.sort(Comparator.comparing(Task::getDue).thenComparing(Task::getId));
        return open;
    }

    public List<String> list() {
        List<String> lines = new ArrayList<>();
        for (Task t : open()) lines.add("#" + t.getId() + " " + t.getDue() + " " + t.getTitle());
        if (lines.isEmpty()) lines.add("未完了のタスクはありません");
        return lines;
    }

    public List<String> overdue(LocalDate today) {
        List<String> lines = new ArrayList<>();
        for (Task t : open()) if (t.getDue().isBefore(today)) lines.add("期限切れ: #" + t.getId() + " " + t.getDue() + " " + t.getTitle());
        if (lines.isEmpty()) lines.add("期限切れのタスクはありません");
        return lines;
    }
}
`),
  ],
};

const booking: Solution = {
  code: `import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Scanner;
import booking.BookingService;

public class Main {
    public static void main(String[] args) {
        BookingService service = new BookingService();
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (line.isEmpty()) continue;
            String[] cmd = line.split(" ");
            switch (cmd[0]) {
                case "reserve" -> System.out.println(service.reserve(cmd[1], LocalDate.parse(cmd[2]), LocalTime.parse(cmd[3]), LocalTime.parse(cmd[4]), cmd[5]));
                case "cancel" -> System.out.println(service.cancel(Integer.parseInt(cmd[1])));
                case "list" -> service.list(LocalDate.parse(cmd[1])).forEach(System.out::println);
                default -> System.out.println("不明なコマンド: " + cmd[0]);
            }
        }
    }
}
`,
  files: [
    f("booking/Booking.java", `package booking;

import java.time.LocalDate;
import java.time.LocalTime;

public record Booking(int id, String room, LocalDate date, LocalTime start, LocalTime end, String name) {
    public boolean overlaps(Booking other) {
        return room.equals(other.room) && date.equals(other.date) && start.isBefore(other.end) && other.start.isBefore(end);
    }

    public String period() { return start + "-" + end; }
}
`),
    f("booking/BookingService.java", `package booking;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class BookingService {
    private final List<Booking> bookings = new ArrayList<>();
    private int nextId = 1;

    public String reserve(String room, LocalDate date, LocalTime start, LocalTime end, String name) {
        String label = room + " " + date + " " + start + "-" + end;
        if (!start.isBefore(end)) return "時間が正しくありません: " + label;
        Booking candidate = new Booking(nextId, room, date, start, end, name);
        for (Booking b : bookings) {
            if (b.overlaps(candidate)) return "重複のため予約できません: " + label + "（#" + b.id() + " " + b.name() + " と重複）";
        }
        bookings.add(candidate);
        nextId++;
        return "予約 #" + candidate.id() + ": " + label + " " + name;
    }

    public String cancel(int id) {
        boolean removed = bookings.removeIf(b -> b.id() == id);
        return removed ? "取消: #" + id : "見つかりません: #" + id;
    }

    public List<String> list(LocalDate date) {
        List<String> lines = new ArrayList<>();
        bookings.stream()
            .filter(b -> b.date().equals(date))
            .sorted(Comparator.comparing(Booking::room).thenComparing(Booking::start))
            .forEach(b -> lines.add(b.room() + " " + b.period() + " " + b.name() + "（#" + b.id() + "）"));
        if (lines.isEmpty()) lines.add("予約はありません");
        return lines;
    }
}
`),
  ],
};

/* ---------- 20 自由制作（評価はレビュー。参照解答はコンパイルと動作の確認用の一例） ---------- */

/** 自由制作の問題で最初に表示する Main.java。設計メモを書いてから作り始める */
const designNote = (what: string) => `import java.util.Scanner;

/*
 * 【作るもの】${what}
 * 【使い方】（どんな入力をすると、何が起きるか。例も書く）
 * 【クラスの分け方】（どのクラスが何を受け持つか）
 * 【工夫したところ・できなかったこと】
 */
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: ここから作る
    }
}
`;

const vending: Solution = {
  code: `import java.util.Scanner;
import vending.VendingMachine;

public class Main {
    public static void main(String[] args) {
        VendingMachine machine = new VendingMachine();
        machine.addProduct("お茶", 120, 2);
        machine.addProduct("コーヒー", 150, 1);
        machine.addProduct("水", 100, 0);
        Scanner sc = new Scanner(System.in);
        System.out.println(machine.menu());
        System.out.println("コマンド: insert 金額 / buy 番号 / refund / quit");
        while (sc.hasNextLine()) {
            String[] cmd = sc.nextLine().trim().split(" ");
            switch (cmd[0]) {
                case "insert" -> System.out.println(machine.insert(Integer.parseInt(cmd[1])));
                case "buy" -> System.out.println(machine.buy(Integer.parseInt(cmd[1])));
                case "refund" -> System.out.println(machine.refund());
                case "quit" -> { System.out.println(machine.refund()); return; }
                default -> System.out.println("コマンドが正しくありません");
            }
            System.out.println(machine.menu());
        }
    }
}
`,
  files: [
    f("vending/Product.java", `package vending;

public class Product {
    private final String name;
    private final int price;
    private int stock;

    public Product(String name, int price, int stock) { this.name = name; this.price = price; this.stock = stock; }

    public String getName() { return name; }
    public int getPrice() { return price; }
    public boolean isSoldOut() { return stock == 0; }
    void takeOne() { stock--; }
}
`),
    f("vending/VendingMachine.java", `package vending;

import java.util.ArrayList;
import java.util.List;

public class VendingMachine {
    private static final List<Integer> ACCEPTED = List.of(10, 50, 100, 500, 1000);
    private final List<Product> products = new ArrayList<>();
    private int credit;

    public void addProduct(String name, int price, int stock) { products.add(new Product(name, price, stock)); }

    public String insert(int coin) {
        if (!ACCEPTED.contains(coin)) return coin + "円は使えません";
        credit += coin;
        return "投入金額: " + credit + "円";
    }

    public String buy(int number) {
        if (number < 1 || number > products.size()) return "その番号の商品はありません";
        Product p = products.get(number - 1);
        if (p.isSoldOut()) return p.getName() + "は売り切れです";
        if (credit < p.getPrice()) return "お金が足りません（あと " + (p.getPrice() - credit) + "円）";
        p.takeOne();
        credit -= p.getPrice();
        return p.getName() + "が出てきました";
    }

    public String refund() {
        String message = "おつり: " + credit + "円";
        credit = 0;
        return message;
    }

    public String menu() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < products.size(); i++) {
            Product p = products.get(i);
            sb.append(i + 1).append(". ").append(p.getName()).append(" ").append(p.getPrice()).append("円")
              .append(p.isSoldOut() ? "（売り切れ）" : credit >= p.getPrice() ? "（買えます）" : "").append("\\n");
        }
        return sb.append("投入金額: ").append(credit).append("円").toString();
    }
}
`),
  ],
};

const household: Solution = {
  code: `import java.util.Scanner;
import household.Ledger;

public class Main {
    public static void main(String[] args) {
        Ledger ledger = new Ledger();
        Scanner sc = new Scanner(System.in);
        System.out.println("コマンド: in 金額 内容 / out 金額 分類 内容 / report / quit");
        while (sc.hasNextLine()) {
            String[] cmd = sc.nextLine().trim().split(" ", 4);
            switch (cmd[0]) {
                case "in" -> System.out.println(ledger.income(Integer.parseInt(cmd[1]), cmd.length > 2 ? cmd[2] : "収入"));
                case "out" -> System.out.println(ledger.expense(Integer.parseInt(cmd[1]), cmd[2], cmd.length > 3 ? cmd[3] : ""));
                case "report" -> ledger.report().forEach(System.out::println);
                case "quit" -> { return; }
                default -> System.out.println("コマンドが正しくありません");
            }
        }
    }
}
`,
  files: [
    f("household/Entry.java", `package household;

public record Entry(int amount, String category, String memo) {}
`),
    f("household/Ledger.java", `package household;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Ledger {
    private final List<Entry> incomes = new ArrayList<>();
    private final List<Entry> expenses = new ArrayList<>();

    public String income(int amount, String memo) {
        incomes.add(new Entry(amount, "収入", memo));
        return "収入を記録しました: " + amount + "円";
    }

    public String expense(int amount, String category, String memo) {
        expenses.add(new Entry(amount, category, memo));
        return "支出を記録しました: " + category + " " + amount + "円";
    }

    public List<String> report() {
        int in = incomes.stream().mapToInt(Entry::amount).sum();
        Map<String, Integer> byCategory = new LinkedHashMap<>();
        for (Entry e : expenses) byCategory.merge(e.category(), e.amount(), Integer::sum);
        int out = byCategory.values().stream().mapToInt(Integer::intValue).sum();
        List<String> lines = new ArrayList<>();
        lines.add("収入: " + in + "円");
        byCategory.forEach((k, v) -> lines.add("  " + k + ": " + v + "円"));
        lines.add("支出: " + out + "円");
        lines.add("残高: " + (in - out) + "円");
        return lines;
    }
}
`),
  ],
};

const janken: Solution = {
  code: `import java.util.Random;
import java.util.Scanner;
import janken.Hand;
import janken.Result;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Random random = new Random();
        int win = 0, lose = 0, draw = 0;
        System.out.println("じゃんけん（g=グー / c=チョキ / p=パー / q=終わる）");
        while (sc.hasNextLine()) {
            String input = sc.nextLine().trim();
            if (input.equals("q")) break;
            Hand me = Hand.fromKey(input);
            if (me == null) {
                System.out.println("g / c / p / q のどれかを入力してください");
                continue;
            }
            Hand cpu = Hand.values()[random.nextInt(3)];
            Result r = me.against(cpu);
            System.out.println("あなた: " + me.label() + "  相手: " + cpu.label() + " → " + r.label());
            switch (r) { case WIN -> win++; case LOSE -> lose++; default -> draw++; }
        }
        System.out.println(win + "勝 " + lose + "敗 " + draw + "分");
    }
}
`,
  files: [
    f("janken/Result.java", `package janken;

public enum Result {
    WIN("勝ち"), LOSE("負け"), DRAW("あいこ");

    private final String label;

    Result(String label) { this.label = label; }

    public String label() { return label; }
}
`),
    f("janken/Hand.java", `package janken;

public enum Hand {
    ROCK("g", "グー"), SCISSORS("c", "チョキ"), PAPER("p", "パー");

    private final String key;
    private final String label;

    Hand(String key, String label) { this.key = key; this.label = label; }

    public String label() { return label; }

    public static Hand fromKey(String key) {
        for (Hand h : values()) if (h.key.equals(key)) return h;
        return null;
    }

    public Result against(Hand other) {
        if (this == other) return Result.DRAW;
        boolean wins = (this == ROCK && other == SCISSORS) || (this == SCISSORS && other == PAPER) || (this == PAPER && other == ROCK);
        return wins ? Result.WIN : Result.LOSE;
    }
}
`),
  ],
};

const quiz: Solution = {
  code: `import java.util.List;
import java.util.Scanner;
import quiz.Question;

public class Main {
    public static void main(String[] args) {
        List<Question> questions = List.of(
            new Question("Java で文字列を表す型は？", List.of("int", "String", "boolean"), 2),
            new Question("配列の最初の添字は？", List.of("0", "1", "-1"), 1),
            new Question("等しい文字列か比べるメソッドは？", List.of("==", "equals", "compare"), 2)
        );
        Scanner sc = new Scanner(System.in);
        int score = 0;
        for (int i = 0; i < questions.size(); i++) {
            Question q = questions.get(i);
            System.out.println("第" + (i + 1) + "問 " + q.text());
            for (int k = 0; k < q.choices().size(); k++) System.out.println("  " + (k + 1) + ". " + q.choices().get(k));
            if (!sc.hasNextLine()) break;
            String answer = sc.nextLine().trim();
            if (q.isCorrect(answer)) {
                score++;
                System.out.println("正解！");
            } else {
                System.out.println("不正解（正解は " + q.answer() + "）");
            }
        }
        System.out.println("結果: " + score + " / " + questions.size() + " 問正解");
    }
}
`,
  files: [
    f("quiz/Question.java", `package quiz;

import java.util.List;

public record Question(String text, List<String> choices, int answer) {
    public boolean isCorrect(String input) {
        return input.equals(String.valueOf(answer));
    }
}
`),
  ],
};

const ownSystem: Solution = {
  code: `import java.util.Scanner;

/*
 * 【作るもの】社内の備品の貸し出し記録（一例）
 * 【使い方】lend 備品名 名前 / back 備品名 / list / quit
 */
public class Main {
    public static void main(String[] args) {
        java.util.Map<String, String> lent = new java.util.LinkedHashMap<>();
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String[] cmd = sc.nextLine().trim().split(" ");
            switch (cmd[0]) {
                case "lend" -> { lent.put(cmd[1], cmd[2]); System.out.println(cmd[1] + " を " + cmd[2] + " さんに貸しました"); }
                case "back" -> System.out.println(lent.remove(cmd[1]) == null ? "貸し出していません" : cmd[1] + " が返ってきました");
                case "list" -> lent.forEach((k, v) -> System.out.println(k + ": " + v));
                case "quit" -> { return; }
                default -> System.out.println("コマンドが正しくありません");
            }
        }
    }
}
`,
};

/* ---------- 21 オセロ（同じ othello パッケージを、第1問から少しずつ育てる） ---------- */

const othelloStone = f("othello/Stone.java", `package othello;

public enum Stone {
    BLACK('B', "黒"), WHITE('W', "白");

    private final char symbol;
    private final String label;

    Stone(char symbol, String label) { this.symbol = symbol; this.label = label; }

    public char symbol() { return symbol; }
    public String label() { return label; }
    public Stone opposite() { return this == BLACK ? WHITE : BLACK; }

    public static Stone fromSymbol(char c) {
        for (Stone s : values()) if (s.symbol == c) return s;
        return null;
    }
}
`);

const othelloBoard = f("othello/Board.java", `package othello;

import java.util.ArrayList;
import java.util.List;

/** 8×8 の盤面。行・列は 1〜8 で受け取る */
public class Board {
    public static final int SIZE = 8;
    private static final int[][] DIRECTIONS = { {-1, -1}, {-1, 0}, {-1, 1}, {0, -1}, {0, 1}, {1, -1}, {1, 0}, {1, 1} };
    private final Stone[][] cells = new Stone[SIZE][SIZE];

    public static Board initial() {
        Board b = new Board();
        b.cells[3][3] = Stone.WHITE;
        b.cells[3][4] = Stone.BLACK;
        b.cells[4][3] = Stone.BLACK;
        b.cells[4][4] = Stone.WHITE;
        return b;
    }

    /** "...WB..." のような 8 行から作る */
    public static Board parse(List<String> rows) {
        Board b = new Board();
        for (int r = 0; r < SIZE; r++) {
            for (int c = 0; c < SIZE; c++) b.cells[r][c] = Stone.fromSymbol(rows.get(r).charAt(c));
        }
        return b;
    }

    public static boolean inside(int row, int col) {
        return row >= 1 && row <= SIZE && col >= 1 && col <= SIZE;
    }

    /** 置いたときに裏返る石の数（置けなければ 0） */
    public int flips(int row, int col, Stone stone) {
        if (!inside(row, col) || cells[row - 1][col - 1] != null) return 0;
        int total = 0;
        for (int[] d : DIRECTIONS) total += flipsInDirection(row - 1, col - 1, d, stone);
        return total;
    }

    private int flipsInDirection(int r, int c, int[] d, Stone stone) {
        int count = 0;
        int y = r + d[0], x = c + d[1];
        while (y >= 0 && y < SIZE && x >= 0 && x < SIZE && cells[y][x] == stone.opposite()) {
            y += d[0];
            x += d[1];
            count++;
        }
        boolean closed = y >= 0 && y < SIZE && x >= 0 && x < SIZE && cells[y][x] == stone;
        return closed ? count : 0;
    }

    public boolean canPlace(int row, int col, Stone stone) {
        return flips(row, col, stone) > 0;
    }

    /** 置ける場所（上の行から、左から順） */
    public List<int[]> legalMoves(Stone stone) {
        List<int[]> moves = new ArrayList<>();
        for (int r = 1; r <= SIZE; r++) for (int c = 1; c <= SIZE; c++) if (canPlace(r, c, stone)) moves.add(new int[] { r, c });
        return moves;
    }

    /** 置いて裏返す。置けない場所なら何もせず false */
    public boolean place(int row, int col, Stone stone) {
        if (!canPlace(row, col, stone)) return false;
        for (int[] d : DIRECTIONS) {
            int n = flipsInDirection(row - 1, col - 1, d, stone);
            for (int i = 1; i <= n; i++) cells[row - 1 + d[0] * i][col - 1 + d[1] * i] = stone;
        }
        cells[row - 1][col - 1] = stone;
        return true;
    }

    public int count(Stone stone) {
        int n = 0;
        for (Stone[] row : cells) for (Stone s : row) if (s == stone) n++;
        return n;
    }

    /** 画面の盤面と同じ形式で表す */
    public String render() {
        StringBuilder sb = new StringBuilder("  1 2 3 4 5 6 7 8");
        for (int r = 0; r < SIZE; r++) {
            sb.append("\\n").append(r + 1);
            for (int c = 0; c < SIZE; c++) sb.append(' ').append(cells[r][c] == null ? '.' : cells[r][c].symbol());
        }
        return sb.toString();
    }
}
`);

const readBoard = `        Scanner sc = new Scanner(System.in);
        List<String> rows = new ArrayList<>();
        for (int i = 0; i < Board.SIZE; i++) rows.add(sc.nextLine().trim());
        Board board = Board.parse(rows);
        Stone turn = sc.nextLine().trim().equals("W") ? Stone.WHITE : Stone.BLACK;`;

const othelloShow: Solution = {
  code: `import othello.Board;

public class Main {
    public static void main(String[] args) {
        System.out.println(Board.initial().render());
    }
}
`,
  files: [othelloStone, othelloBoard],
};

const othelloMoves: Solution = {
  code: `import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;
import othello.Board;
import othello.Stone;

public class Main {
    public static void main(String[] args) {
${readBoard}
        List<int[]> moves = board.legalMoves(turn);
        if (moves.isEmpty()) System.out.println("置ける場所はありません");
        for (int[] m : moves) System.out.println(m[0] + " " + m[1]);
    }
}
`,
  files: [othelloStone, othelloBoard],
};

const othelloPlace: Solution = {
  code: `import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;
import othello.Board;
import othello.Stone;

public class Main {
    public static void main(String[] args) {
${readBoard}
        String[] move = sc.nextLine().trim().split(" ");
        int row = Integer.parseInt(move[0]);
        int col = Integer.parseInt(move[1]);
        if (!Board.inside(row, col)) System.out.println("範囲外です");
        else if (!board.place(row, col, turn)) System.out.println("そこには置けません");
        else System.out.println(board.render());
    }
}
`,
  files: [othelloStone, othelloBoard],
};

const othelloGame: Solution = {
  code: `import java.util.Scanner;
import othello.Board;
import othello.Computer;
import othello.Stone;

public class Main {
    public static void main(String[] args) {
        Board board = Board.initial();
        Computer computer = new Computer(Stone.WHITE);
        Scanner sc = new Scanner(System.in);
        Stone turn = Stone.BLACK;
        while (!board.legalMoves(Stone.BLACK).isEmpty() || !board.legalMoves(Stone.WHITE).isEmpty()) {
            if (board.legalMoves(turn).isEmpty()) {
                System.out.println(turn.label() + "はパスします");
                turn = turn.opposite();
                continue;
            }
            if (turn == Stone.BLACK) {
                System.out.println(board.render());
                System.out.println("黒の番です（行 列 を入力）");
                if (!sc.hasNextLine()) return;
                String[] in = sc.nextLine().trim().split("\\\\s+");
                if (in.length != 2 || !in[0].matches("\\\\d") || !in[1].matches("\\\\d")) {
                    System.out.println("「行 列」の形で入力してください（例: 3 4）");
                    continue;
                }
                if (!board.place(Integer.parseInt(in[0]), Integer.parseInt(in[1]), Stone.BLACK)) {
                    System.out.println("そこには置けません");
                    continue;
                }
            } else {
                int[] m = computer.choose(board);
                board.place(m[0], m[1], Stone.WHITE);
                System.out.println("白: " + m[0] + " " + m[1]);
            }
            turn = turn.opposite();
        }
        System.out.println(board.render());
        int black = board.count(Stone.BLACK), white = board.count(Stone.WHITE);
        String result = black > white ? "黒の勝ち" : black < white ? "白の勝ち" : "引き分け";
        System.out.println("黒 " + black + " - 白 " + white + " で" + result);
    }
}
`,
  files: [
    othelloStone,
    othelloBoard,
    f("othello/Computer.java", `package othello;

import java.util.List;

/** コンピュータの打ち手。角を最優先し、あとは多く裏返せる場所を選ぶ */
public class Computer {
    private final Stone stone;

    public Computer(Stone stone) { this.stone = stone; }

    public int[] choose(Board board) {
        List<int[]> moves = board.legalMoves(stone);
        int[] best = moves.get(0);
        int bestScore = -1;
        for (int[] m : moves) {
            boolean corner = (m[0] == 1 || m[0] == Board.SIZE) && (m[1] == 1 || m[1] == Board.SIZE);
            int score = board.flips(m[0], m[1], stone) + (corner ? 100 : 0);
            if (score > bestScore) {
                best = m;
                bestScore = score;
            }
        }
        return best;
    }
}
`),
  ],
};

export const advancedSolutions: Record<number, Solution[]> = {
  17: [payment, payroll, notify, discount, shapes],
  18: [cart, stock, words, ranking, rooms],
  19: [library, register, attendance, todo, booking],
  20: [vending, household, janken, quiz, ownSystem],
  21: [othelloShow, othelloMoves, othelloPlace, othelloGame, othelloGame],
};

const openStarter = (what: string) => ({ code: designNote(what) });

/** 問題データ（advanced-exercises.json）に入れる、最初に表示するコードとファイル。レッスン ID → 問題番号（0 始まり） */
export const advancedStarters: Record<number, Record<number, { code: string; files?: { path: string; content: string }[] }>> = {
  19: { 0: libraryStarter },
  20: {
    0: openStarter("自動販売機"),
    1: openStarter("家計簿"),
    2: openStarter("じゃんけんゲーム"),
    3: openStarter("クイズアプリ"),
    4: openStarter("（自分で決める）"),
  },
};
