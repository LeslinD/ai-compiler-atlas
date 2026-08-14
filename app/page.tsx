"use client";

import { useEffect, useMemo, useState } from "react";
import history from "./history.json";
import { recentDeepReads, type DeepRead } from "./deep-reads";
import { earlyDeepReads } from "./deep-reads-early";

type HistoricPaper = {
  id: string;
  title: string;
  chineseTitle: string;
  arxiv: string;
  source: string;
  readingDate: string;
};

type ArchivePaper = {
  id: string;
  date: string;
  title: string;
  chineseTitle: string;
  arxiv: string;
  source: string;
  kind: "archive";
};

type ReadingPaper = ArchivePaper | (DeepRead & { kind: "deep" });

type ArchiveContent = Record<string, string>;

const archivedPapers: ArchivePaper[] = (history as HistoricPaper[]).map((paper) => ({
  id: paper.id,
  date: paper.readingDate,
  title: paper.title,
  chineseTitle: paper.chineseTitle,
  arxiv: paper.arxiv,
  source: paper.source,
  kind: "archive",
}));

const deepPapers: ReadingPaper[] = [...earlyDeepReads, ...recentDeepReads].map((paper) => ({ ...paper, kind: "deep" }));

const allPapers: ReadingPaper[] = [...archivedPapers, ...deepPapers];

const dateTitles: Record<string, string> = {
  "2026-07-25": "测试语义与半精度训练",
  "2026-07-26": "GPU kernel 的评测",
  "2026-07-27": "硬件结构与时序证据",
  "2026-07-28": "Tile 建模、调度与规格",
  "2026-07-29": "编译诊断与运行时状态",
  "2026-07-30": "前端缺陷、调度与规格修复",
  "2026-07-31": "行为规格、数值与推理成本",
  "2026-08-01": "稀疏执行与可执行任务",
  "2026-08-02": "双稀疏执行",
  "2026-08-03": "修复与环境反馈",
  "2026-08-04": "语义优化与融合",
  "2026-08-05": "异步数据流编译",
  "2026-08-06": "差异轨迹与修复",
  "2026-08-08": "不规则 GPU 负载",
  "2026-08-10": "通信协同与性能差分",
  "2026-08-11": "概率程序分析",
  "2026-08-12": "真实任务与硬件可用性",
  "2026-08-13": "可检查的 kernel 演化",
  "2026-08-14": "合同验证与真实状态回放",
};

function dateLabel(value: string) {
  const [, month, day] = value.split("-");
  return String(Number(month)) + " 月 " + String(Number(day)) + " 日";
}

function readArchiveCards(html: string): ArchiveContent {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const cards: ArchiveContent = {};

  parsed.querySelectorAll<HTMLElement>("article.paper-card").forEach((sourceCard) => {
    const card = sourceCard.cloneNode(true) as HTMLElement;
    card.querySelector("h2")?.remove();
    card.querySelectorAll(".review-box, textarea, label, .saved").forEach((node) => node.remove());

    Array.from(card.children).forEach((child) => {
      if (child.tagName === "H3") {
        const heading = child.textContent?.trim() ?? "";
        const rename: Record<string, string> = {
          "先给结论": "概览",
          "读懂它需要的最少背景": "背景",
          "3 分钟理解": "3 分钟理解",
          "关键机制再拆一层": "关键机制",
          "实验证据与边界": "实验与局限",
          "对研究方向的具体启发": "和你的研究的关系",
        };
        child.textContent = rename[heading] ?? heading;
      }
    });

    cards[sourceCard.id] = card.innerHTML;
  });

  return cards;
}

function DeepArticle({ paper }: { paper: DeepRead }) {
  const coreSections = paper.sections.filter((section) => section.heading !== "与相关工作的关系" && section.heading !== "和你的研究的关系");
  const relatedSections = paper.sections.filter((section) => section.heading === "与相关工作的关系");
  const projectSections = paper.sections.filter((section) => section.heading === "和你的研究的关系");
  const sections = [...coreSections, ...relatedSections, ...projectSections];

  return (
    <div className="paper-body deep-body">
      <p className="paper-meta">作者：{paper.authors}<br />版本：{paper.version}</p>
      {sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets && (
            <ul className="deep-list">
              {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function ArchiveArticle({ paper, content }: { paper: ArchivePaper; content?: string }) {
  if (content) {
    return (
      <div className="paper-body archive-body">
        <p className="archive-original-link">
          <a href={"./historical-insights.html#" + paper.id}>打开原稿中的完整精读 ↗</a>
        </p>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  }
  return (
    <div className="paper-body">
      <p>正文正在载入。</p>
      <p><a href={"./historical-insights.html#" + paper.id}>打开这篇的完整精读</a></p>
    </div>
  );
}

function PaperArticle({ paper, archive }: { paper: ReadingPaper; archive?: string }) {
  return (
    <article className="paper" id={paper.id}>
      <header className="paper-header">
        <p className="paper-count">论文</p>
        <h2>{paper.chineseTitle}</h2>
        <p className="english-title">{paper.title}</p>
        <a className="source-link" href={paper.source} target="_blank" rel="noreferrer">
          arXiv {paper.arxiv} ↗
        </a>
      </header>
      {paper.kind === "archive" ? <ArchiveArticle paper={paper} content={archive} /> : <DeepArticle paper={paper} />}
    </article>
  );
}

export default function Home() {
  const readableDates = useMemo(
    () => Object.keys(dateTitles).filter((date) => allPapers.some((paper) => paper.date === date)),
    [],
  );
  const [selectedDate, setSelectedDate] = useState(readableDates[readableDates.length - 1] ?? "2026-07-25");
  const [archiveCards, setArchiveCards] = useState<ArchiveContent>({});

  useEffect(() => {
    let active = true;
    fetch("./historical-insights.html")
      .then((response) => response.ok ? response.text() : Promise.reject(new Error("archive unavailable")))
      .then((html) => {
        if (active) setArchiveCards(readArchiveCards(html));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const papers = allPapers.filter((paper) => paper.date === selectedDate);
  const title = dateTitles[selectedDate] ?? "当日阅读";

  return (
    <main className="reading-site">
      <header className="masthead">
        <a className="wordmark" href="#top">AI 编译器论文阅读</a>
        <p>按日期阅读论文。</p>
        <a className="archive-entry" href="./historical-insights.html">7 月 25 日至 8 月 1 日原始精读</a>
      </header>

      <div className="reading-layout" id="top">
        <aside className="date-index" aria-label="阅读日期">
          <p className="index-title">日期</p>
          <div className="date-list">
            {readableDates.map((date) => {
              const count = allPapers.filter((paper) => paper.date === date).length;
              return (
                <button
                  key={date}
                  type="button"
                  className={date === selectedDate ? "date-button active" : "date-button"}
                  onClick={() => {
                    setSelectedDate(date);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  <span>{dateLabel(date)}</span>
                  <small>{count}</small>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="daily-reading" aria-live="polite">
          <header className="daily-header">
            <p className="date-kicker">{dateLabel(selectedDate)}</p>
            <h1>{title}</h1>
            <p>{papers.length} 篇论文</p>
          </header>
          {papers.map((paper) => <PaperArticle key={paper.id} paper={paper} archive={archiveCards[paper.id]} />)}
        </section>
      </div>
    </main>
  );
}
