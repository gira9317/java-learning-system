import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getMe, type User } from "@/api/auth-api";
import { ApiError } from "@/api/client";

// Server Component 用。ブラウザから届いた Cookie ヘッダーを、そのまま API へ渡すために取り出す
export async function getCookieHeader() {
  return (await headers()).get("cookie") ?? "";
}

/** サインイン中のユーザー。未サインインなら null（同じリクエスト内では API を 1 回だけ呼ぶ） */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    return await getMe({ cookie: await getCookieHeader() });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
});

/** ページ用。未サインインならサインインへ、初期パスワードのままならパスワード変更へ移す */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/password");
  return user;
}
