import type { Metadata } from "next";
import "./globals.css";
import "./weekly.css";

export const metadata: Metadata = {
  title: "AI 编译器论文洞察",
  description: "按日阅读 AI 编译器、Tile 抽象、新硬件后端、编译器测试与自动优化论文，并按周整理研究关系。",
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
