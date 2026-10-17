// 検証用の改善例。APIでは配信しない。解答の構造はこの例だけに限定しない。
export const readabilitySolutions = [
`public class Main {
    public static void main(String[] args) {
        int unitPriceYen = Integer.parseInt(args[0]);
        int quantity = Integer.parseInt(args[1]);
        System.out.println("合計: " + calculateSubtotal(unitPriceYen, quantity) + "円");
    }
    static int calculateSubtotal(int unitPriceYen, int quantity) {
        return unitPriceYen * quantity;
    }
}`,
`public class Main {
    public static void main(String[] args) {
        int age = Integer.parseInt(args[0]);
        boolean hasConsent = args[1].equals("yes");
        System.out.println(registrationMessage(age, hasConsent));
    }
    static String registrationMessage(int age, boolean hasConsent) {
        if (age < 0) return "入力エラー";
        if (age < 18 && !hasConsent) return "同意が必要";
        return "登録できます";
    }
}`,
`public class Main {
    static final int FREE_SHIPPING_THRESHOLD_YEN = 3000;
    static final int SHIPPING_FEE_YEN = 500;
    public static void main(String[] args) {
        int unitPriceYen = Integer.parseInt(args[0]);
        int quantity = Integer.parseInt(args[1]);
        int subtotalYen = calculateSubtotal(unitPriceYen, quantity);
        int shippingFeeYen = calculateShippingFee(subtotalYen);
        System.out.println(formatReceipt(subtotalYen, shippingFeeYen));
    }
    static int calculateSubtotal(int unitPriceYen, int quantity) {
        return unitPriceYen * quantity;
    }
    static int calculateShippingFee(int subtotalYen) {
        if (subtotalYen >= FREE_SHIPPING_THRESHOLD_YEN) return 0;
        return SHIPPING_FEE_YEN;
    }
    static String formatReceipt(int subtotalYen, int shippingFeeYen) {
        int totalYen = subtotalYen + shippingFeeYen;
        return "商品代金: " + subtotalYen + "円 / 送料: " + shippingFeeYen + "円 / 合計: " + totalYen + "円";
    }
}`,
`public class Main {
    public static void main(String[] args) {
        Order order = new Order(args[0], Integer.parseInt(args[1]), Integer.parseInt(args[2]));
        System.out.println(ReceiptFormatter.format(order));
    }
}
class Order {
    private final String productName;
    private final int unitPriceYen;
    private final int quantity;
    Order(String productName, int unitPriceYen, int quantity) {
        this.productName = productName;
        this.unitPriceYen = unitPriceYen;
        this.quantity = quantity;
    }
    String getProductName() { return productName; }
    int getQuantity() { return quantity; }
    int calculateSubtotal() { return unitPriceYen * quantity; }
}
class ReceiptFormatter {
    static String format(Order order) {
        return order.getProductName() + " x " + order.getQuantity() + " = " + order.calculateSubtotal() + "円";
    }
}`,
`public class Main {
    public static void main(String[] args) {
        Address address = new Address(args[0]);
        Profile profile = new Profile(address);
        User user = new User(profile);
        System.out.println("配送先: " + user.getShippingCity());
    }
}
class User {
    private final Profile profile;
    User(Profile profile) { this.profile = profile; }
    String getShippingCity() { return profile.getShippingCity(); }
}
class Profile {
    private final Address address;
    Profile(Address address) { this.address = address; }
    String getShippingCity() { return address.getCity(); }
}
class Address {
    private final String city;
    Address(String city) { this.city = city; }
    String getCity() { return city; }
}`,
];
