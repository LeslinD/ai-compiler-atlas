import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 编译器论文地图 · 每日阅读档案",
  description: "面向 AI 编译器、Kernel DSL、DSA、测试与 Agent 的可追溯论文阅读工作台。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
