"use client";

import { useMemo, useState } from "react";
import { recentDeepReads, type DeepSection } from "./deep-reads";
import earlyArchive from "./insights-0801-0809.json";
import laterPlan from "./daily-plan.json";
import day26Archive from "./insights-0826.json";

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

type CompactDay = {
  date: string;
  title: string;
  signal: string;
  artifact: string;
  papers: CompactPaper[];
};

type PlanPaper = {
  arxiv: string;
  title: string;
  zhTitle: string;
  track: string;
  secondary?: string;
};

type PlanDay = {
  date: string;
  title: string;
  signal: string;
  artifact: string;
  papers: PlanPaper[];
};

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

type RenderDay = Omit<PlanDay, "papers"> & { papers: RenderPaper[] };

const trackDescriptions: Record<string, string> = {
  "TileLang-TPU": "关注动态 shape、LMEM、DMA、软件流水、张量指令映射和后端性能模型。",
  "Tile for DSA": "关注 Tile 抽象怎样连接新硬件的指令、存储、通信、同步和目标描述。",
  "Tile Fuzz": "关注测试输入、差分与变形关系、Oracle、覆盖、错误缩减和版本回归。",
  "Agent 友好的 kernel DSL": "关注受约束的生成空间、显式 IR、诊断证据、搜索策略和自动评测。",
};

const relationCards = [
  {
    title: "新硬件支持",
    chain: "Triton for MTIA → Zomboss → LACE → HINT / CAKE → InSPECtor → Spec-Driven Evolution → Tensor Seeks Layout",
    text: "这条线从后端移植推进到机器语义、指令扩展、可执行意图、规格验证和版本演化。稳定的硬件事实越来越多地进入编译器，而不是反复塞进 Agent 提示词。",
  },
  {
    title: "编译器测试",
    chain: "SciCode-Verified → DCAware → PDFuzzer / Xamt → Contract Verifier / Volta → SpecTrum → Feedback Audit → BreakGuard",
    text: "测试研究从修正评分器，逐步走向验证等价关系、拆分正确性合同、覆盖规格前提，并审计反馈收益是否由错误 Oracle 或额外候选预算制造。",
  },
  {
    title: "Agent 搜索",
    chain: "SparseDitto → PACE → PTXBench / KernelArc → Loreley → Constrained Search",
    text: "搜索对象从完整代码转向结构、原语和硬件能力。多 Agent、归档和长期记忆只有在固定昂贵评估预算下真正改善最终结果，才能算搜索贡献。",
  },
  {
    title: "性能诊断",
    chain: "AdaptCore → TDiff → HyperCut → Tensor Seeks Layout → AsmEvo",
    text: "性能问题被分成候选生成、早期筛选、成本模型误差、下游 DMA 与 tiling，以及最终机器码。搜索更强并不保证硬件更快。",
  },
];

function cleanArxiv(value: string) {
  return value.replace(/v\d+$/i, "");
}

function sectionMatches(section: DeepSection, words: string[]) {
  return words.some((word) => section.heading.includes(word));
}

function SectionBody({ section }: { section: DeepSection }) {
  return (
    <>
      {section.paragraphs?.map((paragraph, index) => (
        <p key={`${section.heading}-p-${index}`}>{paragraph}</p>
      ))}
      {section.bullets && section.bullets.length > 0 ? (
        <ul>
          {section.bullets.map((bullet, index) => (
            <li key={`${section.heading}-b-${index}`}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function CompactPaperArticle({ paper }: { paper: Extract<RenderPaper, { kind: "compact" }> }) {
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
        {paper.flow.map((paragraph, index) => <p key={`${paper.id}-flow-${index}`}><strong>{index + 1}.</strong> {paragraph}</p>)}
      </section>
      <section className="paper-section evidence-grid"><div><h4>实验证据</h4><p>{paper.evidence}</p></div><div><h4>局限</h4><p>{paper.limits}</p></div></section>
      <section className="paper-section relation-section"><h4>和研究主线的关系</h4><p>{paper.relation}</p></section>
    </article>
  );
}

function DeepPaperArticle({ paper }: { paper: Extract<RenderPaper, { kind: "deep" }> }) {
  const intro = paper.sections.filter((section) => sectionMatches(section, ["它在处理什么", "先给结论"]));
  const background = paper.sections.filter((section) => sectionMatches(section, ["读懂它需要的最少背景", "最少背景"]));
  const understanding = paper.sections.filter((section) => sectionMatches(section, ["3 分钟理解", "关键机制再拆一层", "一个具体例子", "完整例子"]));
  const evidence = paper.sections.filter((section) => sectionMatches(section, ["实验与证据", "实验证据"]));
  const limits = paper.sections.filter((section) => sectionMatches(section, ["边界", "局限"]));
  const relation = paper.sections.filter((section) => sectionMatches(section, ["关系", "和你的研究", "对研究方向"]));
  const used = new Set([...intro, ...background, ...understanding, ...evidence, ...limits, ...relation]);
  const remaining = paper.sections.filter((section) => !used.has(section));

  return (
    <article className="paper-article" id={paper.id}>
      <header className="paper-header">
        <div className="paper-labels"><span className="track-tag">{paper.track}</span>{paper.secondary ? <span className="secondary-tag">{paper.secondary}</span> : null}</div>
        <h3>{paper.title}</h3>
        <p className="chinese-title">{paper.zhTitle}</p>
        <div className="paper-source"><span>{paper.version}</span>{paper.authors ? <span>{paper.authors}</span> : null}<a href={paper.source} target="_blank" rel="noreferrer">论文原文</a></div>
      </header>
      {intro.length > 0 ? <section className="paper-section conclusion-section"><h4>先给结论</h4>{intro.map((section) => <SectionBody key={`${paper.id}-${section.heading}`} section={section} />)}</section> : null}
      {background.length > 0 ? <section className="paper-section"><h4>读懂它需要的最少背景</h4>{background.map((section) => <SectionBody key={`${paper.id}-${section.heading}`} section={section} />)}</section> : null}
      {understanding.length > 0 ? <section className="paper-section three-minute"><h4>3 分钟理解</h4>{understanding.map((section) => <div className="understanding-block" key={`${paper.id}-${section.heading}`}>{section.heading !== "3 分钟理解" ? <h5>{section.heading}</h5> : null}<SectionBody section={section} /></div>)}</section> : null}
      {evidence.length > 0 || limits.length > 0 ? <section className="paper-section evidence-grid"><div><h4>实验证据</h4>{evidence.map((section) => <SectionBody key={`${paper.id}-${section.heading}`} section={section} />)}</div><div><h4>局限</h4>{limits.map((section) => <SectionBody key={`${paper.id}-${section.heading}`} section={section} />)}</div></section> : null}
      {relation.length > 0 ? <section className="paper-section relation-section"><h4>和研究主线的关系</h4>{relation.map((section) => <SectionBody key={`${paper.id}-${section.heading}`} section={section} />)}</section> : null}
      {remaining.map((section) => <section className="paper-section" key={`${paper.id}-${section.heading}`}><h4>{section.heading}</h4><SectionBody section={section} /></section>)}
    </article>
  );
}

function PaperArticle({ paper }: { paper: RenderPaper }) {
  return paper.kind === "compact" ? <CompactPaperArticle paper={paper} /> : <DeepPaperArticle paper={paper} />;
}

function paperSearchText(paper: RenderPaper) {
  if (paper.kind === "compact") return [paper.title, paper.zhTitle, paper.arxiv, paper.track, paper.secondary, paper.conclusion, paper.background, paper.flow.join(" "), paper.evidence, paper.relation].filter(Boolean).join(" ");
  return [paper.title, paper.zhTitle, paper.arxiv, paper.track, paper.secondary, paper.authors, ...paper.sections.flatMap((section) => [section.heading, ...(section.paragraphs ?? []), ...(section.bullets ?? [])])].filter(Boolean).join(" ");
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState("全部");

  const days = useMemo<RenderDay[]>(() => {
    const earlySource = Array.isArray(earlyArchive) ? (earlyArchive as CompactDay[]) : (earlyArchive as { days: CompactDay[] }).days;
    const early = earlySource.map<RenderDay>((day) => ({ ...day, papers: day.papers.map((paper) => ({ ...paper, kind: "compact" as const })) }));
    const deepByArxiv = new Map(recentDeepReads.map((paper) => [cleanArxiv(paper.arxiv), paper] as const));
    const later = (laterPlan as { days: PlanDay[] }).days.map<RenderDay>((day) => ({
      ...day,
      papers: day.papers.map((planned) => {
        const deep = deepByArxiv.get(cleanArxiv(planned.arxiv));
        if (deep) return { kind: "deep" as const, id: deep.id, title: deep.title, zhTitle: deep.chineseTitle, arxiv: cleanArxiv(deep.arxiv), track: planned.track, secondary: planned.secondary, source: deep.source, authors: deep.authors, version: deep.version, sections: deep.sections };
        return { kind: "compact" as const, id: `fallback-${planned.arxiv.replace(".", "-")}`, ...planned, conclusion: "这篇论文属于当天历史简报的主线。旧网站数据源没有正确恢复其完整正文，因此当前页面保留经过核对的论文、日期和研究方向，并以当日研究信号说明其位置。", background: "该条目用于防止旧网站因按论文提交日期归档而漏掉当天实际阅读的论文。后续内容仍以原论文和历史精读为依据。", flow: ["论文身份和 arXiv 编号已经按当天历史记录恢复。", "当前页面不再根据论文提交日期自动决定阅读日期。", "研究方向和当天横向关系已经恢复。"], evidence: "论文链接和当天选择已经核对；详细段落未在旧数据文件中找到时，不补造实验数字。", limits: "这一回退卡片表示旧站正文源缺失，不代表论文缺少内容。", relation: "它保留在正确的每日位置，便于继续与同日论文和整月研究线索比较。" };
      }),
    }));
    const finalDay = day26Archive as CompactDay;
    const day26: RenderDay = { ...finalDay, papers: finalDay.papers.map((paper) => ({ ...paper, kind: "compact" as const })) };
    return [...early, ...later, day26].sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const allPapers = useMemo(() => days.flatMap((day) => day.papers), [days]);
  const trackStats = useMemo(() => {
    const counts = new Map<string, number>();
    allPapers.forEach((paper) => counts.set(paper.track, (counts.get(paper.track) ?? 0) + 1));
    return Object.entries(trackDescriptions).map(([name, description]) => ({ name, description, count: counts.get(name) ?? 0 }));
  }, [allPapers]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleDays = useMemo(() => days.map((day) => {
    const papers = day.papers.filter((paper) => {
      const matchesTrack = track === "全部" || paper.track === track || paper.secondary === track;
      const matchesQuery = !normalizedQuery || `${day.date} ${day.title} ${day.signal} ${paperSearchText(paper)}`.toLowerCase().includes(normalizedQuery);
      return matchesTrack && matchesQuery;
    });
    const dayOnlyMatch = !normalizedQuery || `${day.date} ${day.title} ${day.signal} ${day.artifact}`.toLowerCase().includes(normalizedQuery);
    return { ...day, papers, visible: (papers.length > 0 || (day.papers.length === 0 && dayOnlyMatch)) && (track === "全部" || papers.length > 0) };
  }).filter((day) => day.visible), [days, normalizedQuery, track]);
  const missingCount = useMemo(() => allPapers.filter((paper) => paper.id.startsWith("fallback-")).length, [allPapers]);

  return (
    <div className="reading-site">
      <header className="masthead"><div><div className="eyebrow">Daily AI Compiler · 统一修订版</div><h1>AI 编译器论文阅读</h1><p>2026 年 8 月 1 日至 8 月 26 日，每天按当日历史简报独立组织。</p></div><div className="masthead-meta"><span>26 个阅读日</span><span>{allPapers.length} 篇主线论文</span><span>更新至 2026-08-26</span></div></header>
      <section className="intro-panel"><div><h2>这次修订解决什么</h2><p>旧页面混用了论文提交日期、网页添加日期和实际阅读日期，导致多篇论文被放到错误的日子，一些真正的每日主线反而没有显示。现在页面以历史简报中的<strong>阅读日期</strong>为唯一组织依据。</p><p>每个日期使用同一结构。论文的核心机制、具体例子、实验证据和边界优先展示；不再按制作批次区分内容，也不使用外部图片。</p></div><div className="intro-facts"><div><strong>8 月 1—9 日</strong><span>根据早期网页、研究记录和周内关系恢复</span></div><div><strong>8 月 10—26 日</strong><span>按 Daily AI Compiler 历史日更重新映射</span></div><div><strong>横向分析</strong><span>统一连接新硬件、测试、Agent 搜索与性能诊断</span></div>{missingCount > 0 ? <div className="warning-fact"><strong>{missingCount} 篇旧正文待继续恢复</strong><span>论文身份和日期已修正，页面未补造缺失实验数字</span></div> : null}</div></section>
      <div className="toolbar"><label><span>检索论文、术语或机制</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：layout、DMA、Oracle、动态 shape" /></label><div className="track-filters" aria-label="研究方向筛选">{["全部", ...Object.keys(trackDescriptions)].map((name) => <button key={name} className={track === name ? "active" : ""} onClick={() => setTrack(name)} type="button">{name}</button>)}</div></div>
      <div className="reading-layout">
        <aside className="date-index"><h2>每日索引</h2><nav>{days.map((day) => <a href={`#day-${day.date}`} key={day.date}><time>{day.date.slice(5)}</time><span>{day.title}</span><em>{day.papers.length === 0 ? "周度收束" : `${day.papers.length} 篇`}</em></a>)}</nav><a className="map-link" href="#monthly-map">查看 8 月横向分析</a></aside>
        <main className="reading-main">
          {visibleDays.map((day) => <section className="daily-reading" id={`day-${day.date}`} key={day.date}><header className="day-header"><div><time>{day.date}</time><h2>{day.title}</h2></div><span className="paper-count">{day.papers.length === 0 ? "当日无新增主线论文" : `${day.papers.length} 篇主线论文`}</span></header><div className="daily-signal"><strong>今日研究信号</strong><p>{day.signal}</p></div>{day.papers.length > 0 ? day.papers.map((paper) => <PaperArticle key={`${day.date}-${paper.id}`} paper={paper} />) : <div className="empty-day"><h3>当天没有为了凑数量加入低相关论文</h3><p>本日用于收束第一周的关系：机器语义进入编译器，生成空间由语法和合同约束，benchmark 与 Oracle 自身也需要审计。</p></div>}<div className="daily-comparison"><h3>当日横向判断</h3><p>{day.papers.length > 1 ? `${day.papers[0].zhTitle} 与 ${day.papers[1].zhTitle} 处理的是同一研究链条中的不同环节。` : day.papers.length === 1 ? `${day.papers[0].zhTitle} 是当天最值得保留的主线。` : "当天没有新增主线论文，重点是整理本周已经出现的方法关系。"} 当日已形成可继续使用的研究产物：<strong>{day.artifact}</strong>。</p></div></section>)}
          {visibleDays.length === 0 ? <div className="no-results">没有匹配的内容。可以清空检索词或切换研究方向。</div> : null}
          <section className="monthly-map" id="monthly-map"><header><div className="eyebrow">2026 年 8 月横向分析</div><h2>从“让 Agent 写代码”走向“让编译器管理约束、证据和搜索”</h2><p>8 月 1 日至 26 日的论文可以归纳为四条相互连接的线。它们不是独立热门词，而是逐步构成一套可靠的自动编译系统。</p></header><div className="track-overview">{trackStats.map((item) => <article key={item.name}><strong>{item.count}</strong><h3>{item.name}</h3><p>{item.description}</p></article>)}</div><div className="relation-list">{relationCards.map((card) => <article key={card.title}><h3>{card.title}</h3><p className="relation-chain">{card.chain}</p><p>{card.text}</p></article>)}</div><div className="month-judgments"><h3>本月最重要的四个判断</h3><ol><li><strong>新硬件支持的稳定知识应该进入编译器。</strong>机器语义、合法性、同步和资源规则不应由每个 Agent 在每个任务中重新推理。</li><li><strong>正确性需要多层证据。</strong>语法通过、随机测试、数学等价、浮点数值合同、真实框架行为和硬件资源检查分别回答不同问题。</li><li><strong>搜索机制必须接受固定预算对照。</strong>多 Agent、归档、反馈和长期记忆真正有价值的前提，是在相同编译与硬件测量预算下提高最终结果。</li><li><strong>性能差距必须先定位层级。</strong>当 heuristic 已经接近形式目标最优时，继续强化搜索可能无效；问题可能位于成本模型、下游 DMA、tiling 或最终机器码。</li></ol></div></section>
        </main>
      </div>
      <footer><p>Daily AI Compiler · 统一更新至 2026 年 8 月 26 日 · 页面按阅读日期组织，论文原始提交时间在正文中单独保留。</p></footer>
    </div>
  );
}
