"use client";

import { useEffect, useMemo, useState } from "react";
import history from "./history.json";
import { currentPapers } from "./current";

type HistoricPaper = {
  id: string;
  title: string;
  chineseTitle: string;
  arxiv: string;
  source: string;
  readingDate: string;
};

type ReadingPaper = {
  id: string;
  date: string;
  title: string;
  chineseTitle: string;
  arxiv: string;
  source: string;
  kind: "archive" | "note";
  problem?: string;
  method?: string[];
  evidence?: string;
  limitation?: string;
};

type ArchiveContent = Record<string, string>;

const archivedPapers: ReadingPaper[] = (history as HistoricPaper[]).map((paper) => ({
  id: paper.id,
  date: paper.readingDate,
  title: paper.title,
  chineseTitle: paper.chineseTitle,
  arxiv: paper.arxiv,
  source: paper.source,
  kind: "archive",
}));

function cleanEditorialPrefix(value: string) {
  return value
    .replace(/^【[^】]+】\s*/, "")
    .replace(/不应直接等同。?$/, "仍需在对应场景中验证。")
    .replace(/不自动证明/g, "还不能证明");
}

const recentPapers: ReadingPaper[] = currentPapers.map((paper) => ({
  id: paper.id,
  date: paper.day,
  title: paper.title,
  chineseTitle: paper.chineseTitle,
  arxiv: paper.arxiv,
  source: paper.source,
  kind: "note",
  problem: paper.why,
  method: paper.steps,
  evidence: cleanEditorialPrefix(paper.evidence),
  limitation: cleanEditorialPrefix(paper.boundary),
}));

const addedPapers: ReadingPaper[] = [
  {
    id: "leap",
    date: "2026-08-03",
    title: "LEAP: Lean Environment-Feedback via Adaptive Pruning for Code RL in GPU Kernel Generation",
    chineseTitle: "LEAP：用环境反馈和自适应剪枝训练 GPU kernel 生成",
    arxiv: "2608.01804",
    source: "https://arxiv.org/abs/2608.01804",
    kind: "note",
    problem: "GPU kernel 的强化学习常被编译开销和稀疏的成败反馈拖慢。LEAP 讨论怎样保留最有训练价值的任务。",
    method: ["按难度移除过易或明显无效的任务", "保留编译与执行带回的环境反馈", "用排序式奖励指导后续代码改进"],
    evidence: "论文摘要将稀疏二元奖励和编译延迟列为训练瓶颈，并报告了更快的收敛与更稳定的调试过程。",
    limitation: "摘要没有给出剪枝阈值、任务分布和跨硬件泛化的完整细节。",
  },
  {
    id: "comfuse",
    date: "2026-08-04",
    title: "ComFuse: An Automated GPU Compiler for Fusing Complex Memory-Intensive and Compute-Intensive Kernels",
    chineseTitle: "ComFuse：自动融合内存密集与计算密集 GPU kernel 的编译器",
    arxiv: "2608.03537",
    source: "https://arxiv.org/abs/2608.03537",
    kind: "note",
    problem: "复杂子图中的融合机会不只取决于算子是否相邻，还取决于内存访问和计算阶段能否重叠。",
    method: ["识别可重叠的内存与计算阶段", "把子程序降为单个融合 kernel", "以端到端代价比较融合与未融合方案"],
    evidence: "论文摘要说明系统会自动把复杂子程序降为融合 kernel，并与 TorchInductor 对照。",
    limitation: "摘要没有展示各类图模式、编译时间和失败回退的完整分布。",
  },
  {
    id: "unseen-delta",
    date: "2026-08-10",
    title: "The Unseen Delta: Top-Down Differential Analysis for Compiler Performance",
    chineseTitle: "The Unseen Delta：面向编译器性能的自顶向下差分分析",
    arxiv: "2608.09530",
    source: "https://arxiv.org/abs/2608.09530",
    kind: "note",
    problem: "端到端吞吐差异往往不足以解释编译器究竟改变了哪段代码、为什么变快或变慢。",
    method: ["采样找出决定性能的关键片段", "按微架构指标逐层比较两个编译结果", "移植关键二进制序列并检查性能是否随之改变"],
    evidence: "论文摘要描述了分层微架构差分、关键片段采样和二进制 patching 的验证过程。",
    limitation: "摘要不足以判断它对数值正确性、动态形状和非确定性负载的覆盖范围。",
  },
  {
    id: "ppprobe",
    date: "2026-08-11",
    title: "Conflict Extraction in Probabilistic Datalog Analyses",
    chineseTitle: "PPProbe：概率 Datalog 分析中的冲突抽取",
    arxiv: "2608.10755",
    source: "https://arxiv.org/abs/2608.10755",
    kind: "note",
    problem: "概率程序分析需要从大量可能推导中找出互相冲突的解释。",
    method: ["把冲突形式化为极小不可满足集合", "用 Datalog 推导图引导搜索", "用自底向上的不可满足推断剪去冲突告警"],
    evidence: "论文摘要在 70 个基准上报告，吞吐量比 MUS enumerator 高 2.5–24×，平均过滤 47.7% 的互相冲突告警。",
    limitation: "它与 AI 编译器测试的直接联系尚未在论文摘要中展开；这里保留为相邻的程序分析阅读。",
  },
  {
    id: "realistic-triton-bench",
    date: "2026-08-12",
    title: "RealisticTritonBench",
    chineseTitle: "RealisticTritonBench：从真实 AI 框架 PR 提取 Triton kernel 任务",
    arxiv: "2608.12004",
    source: "https://arxiv.org/abs/2608.12004",
    kind: "note",
    problem: "合成 kernel 题目很难覆盖框架里的完整上下文、接口约束和端到端影响。",
    method: ["从真实 AI 框架 PR 提取 Triton kernel 任务", "保留可复现实验环境", "在原框架中做端到端评测"],
    evidence: "论文摘要指出，主流大模型在这些真实任务上仍然困难，并把框架内端到端评测作为任务的一部分。",
    limitation: "基准的覆盖范围受所选框架和 PR 类型影响。",
  },
  {
    id: "spec-sheets",
    date: "2026-08-12",
    title: "Spec Sheets Are Not Kernels",
    chineseTitle: "规格表不是 kernel：审计 B300 的 INT8 可用性",
    arxiv: "2608.11693",
    source: "https://arxiv.org/abs/2608.11693",
    kind: "note",
    problem: "硬件规格中写有某种 INT8 能力，不代表软件栈已经能以可用的 kernel 形式调用它。",
    method: ["沿规格表、PTX、CUTLASS、vLLM 与 SGLang 检查能力路径", "记录能力在哪一层缺失或不可达", "区分规格存在与软件可用"],
    evidence: "论文摘要明确说明它没有做性能测量，重点是能力从规格到软件实现的可达性审计。",
    limitation: "它回答可用性，不回答某条 kernel 路径的实际性能。",
  },
];

const allPapers = [...archivedPapers, ...recentPapers, ...addedPapers];

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

    const children = Array.from(card.children);
    let removeUntilNextHeading = false;
    children.forEach((child) => {
      if (child.tagName === "H3") {
        const heading = child.textContent?.trim() ?? "";
        removeUntilNextHeading = heading === "与相关工作的关系" || heading === "对研究方向的具体启发";
        if (removeUntilNextHeading) {
          child.remove();
          return;
        }
        const rename: Record<string, string> = {
          "先给结论": "概览",
          "读懂它需要的最少背景": "背景",
          "3 分钟理解": "方法",
          "关键机制再拆一层": "关键机制",
          "实验证据与边界": "实验与局限",
        };
        child.textContent = rename[heading] ?? heading;
      }
      if (removeUntilNextHeading) child.remove();
    });

    cards[sourceCard.id] = card.innerHTML;
  });

  return cards;
}

function NoteArticle({ paper }: { paper: ReadingPaper }) {
  return (
    <div className="paper-body">
      <section>
        <h3>问题</h3>
        <p>{paper.problem}</p>
      </section>
      <section>
        <h3>方法</h3>
        <ol className="method-list">
          {paper.method?.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>
      <section>
        <h3>实验说明了什么</h3>
        <p>{paper.evidence}</p>
      </section>
      <section>
        <h3>局限</h3>
        <p>{paper.limitation}</p>
      </section>
    </div>
  );
}

function ArchiveArticle({ paper, content }: { paper: ReadingPaper; content?: string }) {
  if (content) {
    return <div className="paper-body archive-body" dangerouslySetInnerHTML={{ __html: content }} />;
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
    <article className="paper">
      <header className="paper-header">
        <p className="paper-count">论文</p>
        <h2>{paper.chineseTitle}</h2>
        <p className="english-title">{paper.title}</p>
        <a className="source-link" href={paper.source} target="_blank" rel="noreferrer">
          arXiv {paper.arxiv} ↗
        </a>
      </header>
      {paper.kind === "archive" ? <ArchiveArticle paper={paper} content={archive} /> : <NoteArticle paper={paper} />}
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
        <p>按日整理，直接读论文。</p>
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
