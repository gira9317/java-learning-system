import { GlobalNav } from "@/components/global-nav";

// 管理画面（研修担当者用）の共通レイアウト。権限の確認は各ページの requireAdmin で行う
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <GlobalNav variant="admin" />
      <main className="flex-1 bg-parchment">
        <div className="mx-auto max-w-[1080px] px-4 pt-8 pb-16 sm:px-6 sm:pt-12">{children}</div>
      </main>
    </>
  );
}
