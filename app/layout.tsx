import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 编译器论文阅读",
  description: "逐日阅读 AI 编译器、GPU kernel、编译器测试与程序分析论文。",
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
