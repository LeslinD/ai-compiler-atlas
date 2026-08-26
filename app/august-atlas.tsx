"use client";

import { useMemo, useState } from "react";
import { recentDeepReads, type DeepSection } from "./deep-reads";
import earlyArchive from "./insights-0801-0809.json";
import laterPlan from "./daily-plan.json";
import day26Archive from "./insights-0826.json";
import supplementA from "./supplement-0810-0817.json";
import supplementB from "./supplement-0818-0821.json";
import supplementC from "./supplement-0822-0825.json";

type CompactPaper = {
  id: string;
  title: string;
  zhTitle: string;
  arxiv: string;
  track: string;
  secondary?: string;
  conclusion: string;
  background: string;
  flow: string[];
  evidence: string;
  limits: string;
  relation: string;
};

type DayBase = {
  date: string;
  title: string;
  signal: string;
  artifact: string;
};

type PlanPaper = Pick<CompactPaper, "title" | "zhTitle" | "arxiv" | "track" | "secondary">;
type PlanDay = DayBase & { papers: PlanPaper[] };
type CompactDay = DayBase & { papers: CompactPaper[] };

type RenderPaper =
  | ({ kind: "compact" } & CompactPaper)
  | {
      kind: "deep";
      id: string;
      title: string;
      zhTitle: string;
      arxiv: string;
      track: string;
      secondary?: string;
      source: string;
      authors: string;
      version: string;
      sections: DeepSection[];
    };

type RenderDay = DayBase & { papers: RenderPaper[] };

const tracks: Record<string, string> = {
  "TileLang-TPU": "动态 shape、LMEM、DMA、软件流水、张量指令映射和后端性能模型。",
  "Tile for DSA": "Tile 抽象、新硬件 ISA、存储通信、同步、目标描述和自动后端。",
  "Tile Fuzz": "差分与变形测试、Oracle、覆盖、错误缩减、性能异常和版本回归。",
  "Agent 友好的 kernel DSL": "受约束生成、显式 IR、编译诊断、搜索策略和自动评测。",
};

const relationCards = [
  {
    title: "新硬件支持",
    chain: "Triton for MTIA → Zomboss → LACE → HINT / CAKE → InSPECtor → Spec-Driven Evolution → Tensor Seeks Layout",
    text: "研究从后端移植推进到机器语义、指令扩展、可执行意图、规格验证和版本演化。稳定硬件事实越来越多地进入编译器。",
  },
  {
    title: "编译器测试",
    chain: "SciCode-Verified → DCAware → PDFuzzer / Xamt → Contract Verifier / Volta → SpecTrum → Feedback Audit → BreakGuard",
    text: "测试从修正评分器，推进到验证等价关系、拆分正确性合同、覆盖规格前提，并审计反馈收益是否由错误 Oracle 制造。",
  },
  {
    title: "Agent 搜索",
    chain: "SparseDitto → PACE → PTXBench / KernelArc → Loreley → Constrained Search",
    text: "搜索对象从完整代码转向结构、原语和硬件能力。多 Agent、归档和长期记忆需要在固定昂贵评估预算下证明最终收益。",
  },
  {
    title: "性能诊断",
    chain: "AdaptCore → TDiff → HyperCut → Tensor Seeks Layout → AsmEvo",
    text: "性能问题被拆成候选生成、早筛、成本模型、下游 DMA 与 tiling，以及最终机器码。搜索更强并不保证硬件更快。",
  },
];

function cleanArxiv(value: string) {
  return value.replace(/v\d+$/i, "");
}

function SectionBody({ section }: { section: DeepSection }) {
  return (
    <>
      {section.paragraphs?.map((paragraph, index) => (
        <p key={`${section.heading}-p-${index}`}>{paragraph}</p>
      ))}
      {section.bullets?.length ? (
        <ul>
          {section.bullets.map((bullet, index) => (
            <li key={`${section.heading}-b-${index}`}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function CompactPaperView({ paper }: { paper: Extract<RenderPaper, { kind: "compact" }> }) {
  return (
    <article className="paper-article" id={paper.id}>
      <header className="paper-header">
        <div className="paper-labels">
          <span className="track-tag">{paper.track}</span>
          {paper.secondary ? <span className="secondary-tag">{paper.secondary}</span> : null}
        </div>
        <h3>{paper.title}</h3>
        <p className="chinese-title">{paper.zhTitle}</p>
        <div className="paper-source">
          <span>arXiv:{paper.arxiv}</span>
          <a href={`https://arxiv.org/abs/${paper.arxiv}`} target="_blank" rel="noreferrer">论文原文</a>
        </div>
      </header>
      <section className="paper-section conclusion-section"><h4>先给结论</h4><p>{paper.conclusion}</p></section>
      <section className="paper-section"><h4>读懂它需要的最少背景</h4><p>{paper.background}</p></section>
      <section className="paper-section three-minute">
        <h4>3 分钟理解</h4>
        {paper.flow.map((paragraph, index) => (
          <p key={`${paper.id}-flow-${index}`}><strong>{index + 1}.</strong> {paragraph}</p>
        ))}
      </section>
      <section className="paper-section evidence-grid">
        <div><h4>实验证据</h4><p>{paper.evidence}</p></div>
        <div><h4>局限</h4><p>{paper.limits}</p></div>
      </section>
      <section className="paper-section relation-section"><h4>和研究主线的关系</h4><p>{paper.relation}</p></section>
    </article>
  );
}

function DeepPaperView({ paper }: { paper: Extract<RenderPaper, { kind: "deep" }> }) {
  return (
    <article className="paper-article" id={paper.id}>
      <header className="paper-header">
        <div className="paper-labels">
          <span className="track-tag">{paper.track}</span>
          {paper.secondary ? <span className="secondary-tag">{paper.secondary}</span> : null}
        </div>
        <h3>{paper.title}</h3>
        <p className="chinese-title">{paper.zhTitle}</p>
        <div className="paper-source">
          <span>{paper.version}</span>
          {paper.authors ? <span>{paper.authors}</span> : null}
          <a href={paper.source} target="_blank" rel="noreferrer">论文原文</a>
        </div>
      </header>
      {paper.sections.map((section) => {
        const isThreeMinute =
          section.heading.includes("3 分钟理解") ||
          section.heading.includes("关键机制") ||
          section.heading.includes("具体例子") ||
          section.heading.includes("完整例子");
        const isRelation =
          section.heading.includes("关系") ||
          section.heading.includes("启发") ||
          section.heading.includes("研究");
        const isConclusion = section.heading.includes("它在处理什么") || section.heading.includes("先给结论");
        return (
          <section
            className={`paper-section ${isThreeMinute ? "three-minute" : ""} ${isRelation ? "relation-section" : ""} ${isConclusion ? "conclusion-section" : ""}`}
            key={`${paper.id}-${section.heading}`}
          >
            <h4>{section.heading}</h4>
            <SectionBody section={section} />
          </section>
        );
      })}
    </article>
  );
}

function PaperView({ paper }: { paper: RenderPaper }) {
  return paper.kind === "compact" ? <CompactPaperView paper={paper} /> : <DeepPaperView paper={paper} />;
}

function searchText(paper: RenderPaper) {
  if (paper.kind === "compact") {
    return [
      paper.title,
      paper.zhTitle,
      paper.arxiv,
      paper.track,
      paper.secondary,
      paper.conclusion,
      paper.background,
      paper.flow.join(" "),
      paper.evidence,
      paper.relation,
    ].filter(Boolean).join(" ");
  }
  return [
    paper.title,
    paper.zhTitle,
    paper.arxiv,
    paper.track,
    paper.secondary,
    paper.authors,
    ...paper.sections.flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
    ]),
  ].filter(Boolean).join(" ");
}

export default function AugustAtlas() {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState("全部");

  const days = useMemo<RenderDay[]>(() => {
    const earlySource = Array.isArray(earlyArchive)
      ? (earlyArchive as CompactDay[])
      : (earlyArchive as { days: CompactDay[] }).days;
    const early: RenderDay[] = earlySource.map((day) => ({
      ...day,
      papers: day.papers.map((paper) => ({ ...paper, kind: "compact" as const })),
    }));

    const deepByArxiv = new Map(
      recentDeepReads.map((paper) => [cleanArxiv(paper.arxiv), paper] as const),
    );
    const supplementByArxiv = new Map(
      [
        ...(supplementA as CompactPaper[]),
        ...(supplementB as CompactPaper[]),
        ...(supplementC as CompactPaper[]),
      ].map((paper) => [cleanArxiv(paper.arxiv), paper] as const),
    );

    const later: RenderDay[] = (laterPlan as { days: PlanDay[] }).days.map((day) => ({
      ...day,
      papers: day.papers.map((planned) => {
        const key = cleanArxiv(planned.arxiv);
        const deep = deepByArxiv.get(key);
        if (deep) {
          return {
            kind: "deep" as const,
            id: deep.id,
            title: deep.title,
            zhTitle: deep.chineseTitle,
            arxiv: key,
            track: planned.track,
            secondary: planned.secondary,
            source: deep.source,
            authors: deep.authors,
            version: deep.version,
            sections: deep.sections,
          };
        }
        const supplement = supplementByArxiv.get(key);
        if (supplement) {
          return {
            ...supplement,
            track: planned.track,
            secondary: planned.secondary,
            kind: "compact" as const,
          };
        }
        return {
          kind: "compact" as const,
          id: `unrestored-${key.replace(".", "-")}`,
          ...planned,
          conclusion: "论文身份和当日阅读日期已经恢复，但对应历史精读正文没有出现在当前可读取数据中。",
          background: "本条只用于暴露仍待恢复的资料，不补造论文方法和实验数字。",
          flow: ["核对论文标题与 arXiv 编号。", "保留正确的当日研究方向。", "等待从历史精读恢复正文。"],
          evidence: "未恢复。",
          limits: "这是资料恢复状态，不是论文局限。",
          relation: "保留在正确日期，避免旧网站继续按提交日期错排。",
        };
      }),
    }));

    const finalDay = day26Archive as CompactDay;
    const day26: RenderDay = {
      ...finalDay,
      papers: finalDay.papers.map((paper) => ({ ...paper, kind: "compact" as const })),
    };

    return [...early, ...later, day26].sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const allPapers = useMemo(() => days.flatMap((day) => day.papers), [days]);
  const missingCount = useMemo(
    () => allPapers.filter((paper) => paper.id.startsWith("unrestored-")).length,
    [allPapers],
  );
  const stats = useMemo(() => {
    const counts = new Map<string, number>();
    allPapers.forEach((paper) => counts.set(paper.track, (counts.get(paper.track) ?? 0) + 1));
    return Object.entries(tracks).map(([name, description]) => ({
      name,
      description,
      count: counts.get(name) ?? 0,
    }));
  }, [allPapers]);

  const normalized = query.trim().toLowerCase();
  const visibleDays = useMemo(
    () =>
      days
        .map((day) => ({
          ...day,
          papers: day.papers.filter((paper) => {
            const trackMatch = track === "全部" || paper.track === track || paper.secondary === track;
            const textMatch =
              !normalized ||
              `${day.date} ${day.title} ${day.signal} ${day.artifact} ${searchText(paper)}`
                .toLowerCase()
                .includes(normalized);
            return trackMatch && textMatch;
          }),
        }))
        .filter(
          (day) =>
            day.papers.length > 0 ||
            (day.date === "2026-08-09" &&
              track === "全部" &&
              (!normalized || `${day.date} ${day.title} ${day.signal}`.toLowerCase().includes(normalized))),
        ),
    [days, normalized, track],
  );

  return (
    <div className="reading-site">
      <header className="masthead">
        <div>
          <div className="eyebrow">Daily AI Compiler · 统一修订版</div>
          <h1>AI 编译器论文阅读</h1>
          <p>2026 年 8 月 1 日至 8 月 26 日，每天按历史简报中的实际阅读日期独立组织。</p>
        </div>
        <div className="masthead-meta">
          <span>26 个阅读日</span>
          <span>{allPapers.length} 篇主线论文</span>
          <span>更新至 2026-08-26</span>
        </div>
      </header>

      <section className="intro-panel">
        <div>
          <h2>这次修订解决什么</h2>
          <p>旧页面混用了论文提交日期、网页添加日期和实际阅读日期，导致论文错日、漏日和正文不一致。现在以历史简报中的<strong>阅读日期</strong>为唯一组织依据。</p>
          <p>所有日期使用同一版式。3 分钟理解、关键机制、实验证据和局限优先展示，不再按照添加批次区分内容，也不使用容易失效的外部图片。</p>
        </div>
        <div className="intro-facts">
          <div><strong>8 月 1—9 日</strong><span>依据早期逐日网页和项目历史恢复</span></div>
          <div><strong>8 月 10—26 日</strong><span>按 Daily AI Compiler 日更逐日重排</span></div>
          <div><strong>横向分析</strong><span>连接新硬件、测试、Agent 搜索和性能诊断</span></div>
          {missingCount ? <div className="warning-fact"><strong>{missingCount} 篇正文仍待恢复</strong><span>页面不会补造缺失实验数字</span></div> : null}
        </div>
      </section>

      <div className="toolbar">
        <label>
          <span>检索论文、术语或机制</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：layout、DMA、Oracle、动态 shape"
          />
        </label>
        <div className="track-filters" aria-label="研究方向筛选">
          {["全部", ...Object.keys(tracks)].map((name) => (
            <button
              key={name}
              className={track === name ? "active" : ""}
              onClick={() => setTrack(name)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="reading-layout">
        <aside className="date-index">
          <h2>每日索引</h2>
          <nav>
            {days.map((day) => (
              <a href={`#day-${day.date}`} key={day.date}>
                <time>{day.date.slice(5)}</time>
                <span>{day.title}</span>
                <em>{day.papers.length ? `${day.papers.length} 篇` : "周度收束"}</em>
              </a>
            ))}
          </nav>
          <a className="map-link" href="#monthly-map">查看 8 月横向分析</a>
        </aside>

        <main className="reading-main">
          {visibleDays.map((day) => (
            <section className="daily-reading" id={`day-${day.date}`} key={day.date}>
              <header className="day-header">
                <div><time>{day.date}</time><h2>{day.title}</h2></div>
                <span className="paper-count">{day.papers.length ? `${day.papers.length} 篇主线论文` : "当日无新增主线论文"}</span>
              </header>
              <div className="daily-signal"><strong>今日研究信号</strong><p>{day.signal}</p></div>
              {day.papers.length ? (
                day.papers.map((paper) => <PaperView key={`${day.date}-${paper.id}`} paper={paper} />)
              ) : (
                <div className="empty-day">
                  <h3>当天没有为了凑数量加入低相关论文</h3>
                  <p>本日用于收束第一周已经形成的机器语义、受约束生成和评测审计关系。</p>
                </div>
              )}
              <div className="daily-comparison">
                <h3>当日横向判断</h3>
                <p>
                  {day.papers.length > 1
                    ? `${day.papers[0].zhTitle} 与 ${day.papers[1].zhTitle} 处理同一研究链条中的不同环节。`
                    : day.papers.length === 1
                      ? `${day.papers[0].zhTitle} 是当天最值得保留的主线。`
                      : "当天重点是整理本周方法关系。"}{" "}
                  当日已形成可继续使用的研究产物：<strong>{day.artifact}</strong>。
                </p>
              </div>
            </section>
          ))}
          {visibleDays.length === 0 ? <div className="no-results">没有匹配内容。可以清空检索词或切换研究方向。</div> : null}

          <section className="monthly-map" id="monthly-map">
            <header>
              <div className="eyebrow">2026 年 8 月横向分析</div>
              <h2>从让 Agent 写代码，走向让编译器管理约束、证据和搜索</h2>
              <p>8 月 1 日至 26 日的论文构成四条相互连接的研究线，而不是彼此独立的热门词。</p>
            </header>
            <div className="track-overview">
              {stats.map((item) => (
                <article key={item.name}>
                  <strong>{item.count}</strong>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
            <div className="relation-list">
              {relationCards.map((card) => (
                <article key={card.title}>
                  <h3>{card.title}</h3>
                  <p className="relation-chain">{card.chain}</p>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
            <div className="month-judgments">
              <h3>本月最重要的四个判断</h3>
              <ol>
                <li><strong>稳定硬件知识应进入编译器。</strong>机器语义、同步和资源规则不应由每个 Agent 重新推理。</li>
                <li><strong>正确性需要多层证据。</strong>随机测试、数学等价、数值合同、框架行为和资源检查回答不同问题。</li>
                <li><strong>搜索机制必须接受固定预算对照。</strong>多 Agent、归档和反馈只有在相同编译与硬件预算下改善最终结果，才能算贡献。</li>
                <li><strong>性能差距必须先定位层级。</strong>问题可能位于成本模型、下游 DMA、tiling 或最终机器码，继续强化搜索并不总有效。</li>
              </ol>
            </div>
          </section>
        </main>
      </div>

      <footer>
        <p>Daily AI Compiler · 统一更新至 2026 年 8 月 26 日 · 页面按阅读日期组织，论文原始提交日期在各论文来源中保留。</p>
      </footer>
    </div>
  );
}
