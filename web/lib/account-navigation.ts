import type { User } from "@/api/auth-api";

export function accountDestination(user: User | null) {
  if (!user) return { href: "/login", label: "サインイン" };
  if (user.mustChangePassword) return { href: "/password", label: "パスワードを変更" };
  return user.role === "admin"
    ? { href: "/admin", label: "管理画面へ" }
    : { href: "/home", label: "ホームへ" };
}
