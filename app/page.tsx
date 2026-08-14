"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  allPapers,
  dailyIssues,
  dataStatus,
  paperRelations,
  researchTracks,
  weeklyBriefs,
  type AtlasPaper,
  type DailyIssue,
  type IssueStatus,
  type ReadingDepth,
  type ResearchTrack,
} from "./atlas-data";

type View = "daily" | "library" | "compare" | "map" | "weekly" | "review";
type TagTone = "plain" | "verified" | "partial" | "pending" | "collecting";
type Scratchpad = {
  judgment: string;
  evidence: string;
  experiment: string;
};

const viewNames: Record<View, string> = {
  daily: "阅读",
  library: "检索",
  compare: "比较",
  map: "研究关联",
  weekly: "周报",
  review: "回顾",
};

const issueTone: Record<IssueStatus, TagTone> = {
  "完整已恢复": "verified",
  "部分核验": "partial",
  "待筛选": "pending",
  "采集中": "collecting",
};

const depthTone: Record<ReadingDepth, TagTone> = {
  "全文已恢复": "verified",
  "摘要已核验": "partial",
  "候选待核验": "pending",
};
const latestIssueDate = dailyIssues[dailyIssues.length - 1].date;

function shortDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)} 月 ${Number(day)} 日`;
}

function issueByDate(date: string) {
  return dailyIssues.find((issue) => issue.date === date) ?? dailyIssues[dailyIssues.length - 1];
}

function paperById(id: string) {
  return allPapers.find((paper) => paper.id === id);
}

function issueGroups() {
  return dailyIssues.reduce<Record<string, DailyIssue[]>>((groups, issue) => {
    const key = issue.date.slice(0, 7);
    groups[key] ??= [];
    groups[key].push(issue);
    return groups;
  }, {});
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${year} 年 ${Number(month)} 月`;
}

function PaperTag({ children, tone = "plain" }: { children: ReactNode; tone?: TagTone }) {
  return <span className={`paper-tag ${tone}`}>{children}</span>;
}

function TrackTags({ tracks }: { tracks: ResearchTrack[] }) {
  return (
    <div className="track-row">
      {tracks.map((track) => (
        <PaperTag key={track}>{track}</PaperTag>
      ))}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  aside,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  aside?: ReactNode;
}) {
  return (
    <header className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {aside}
    </header>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("daily");
  const [activeDate, setActiveDate] = useState(latestIssueDate);
  const [readingPaperId, setReadingPaperId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>(["harness-engineering", "debug-near-miss"]);
  const [compareNotice, setCompareNotice] = useState("");
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<ResearchTrack | "全部主线">("全部主线");
  const [comparisonNote, setComparisonNote] = useState("");
  const [scratchpad, setScratchpad] = useState<Scratchpad>({ judgment: "", evidence: "", experiment: "" });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [recallDrafts, setRecallDrafts] = useState<Record<string, string>>({});
  const [reviewPaperId, setReviewPaperId] = useState("segabench");

  const activeIssue = issueByDate(activeDate);
  const activeIssuePapers = activeIssue.paperIds
    .map(paperById)
    .filter((paper): paper is AtlasPaper => Boolean(paper));
  const readingPaper = readingPaperId ? paperById(readingPaperId) ?? null : null;
  const comparePapers = compareIds
    .map(paperById)
    .filter((paper): paper is AtlasPaper => Boolean(paper));
  const filteredPapers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return allPapers.filter((paper) => {
      const trackMatches = track === "全部主线" || paper.tracks.includes(track);
      const searchable = `${paper.title} ${paper.chineseTitle} ${paper.oneLine} ${paper.tracks.join(" ")}`.toLowerCase();
      return trackMatches && (!keyword || searchable.includes(keyword));
    });
  }, [query, track]);

  const selectDate = (date: string) => {
    const issue = issueByDate(date);
    setActiveDate(date);
    setReadingPaperId(issue.paperIds[0] ?? null);
    setView("daily");
    window.scrollTo({ top: 0 });
  };

  const openIssue = (date = activeDate) => {
    setActiveDate(date);
    setReadingPaperId(null);
    setView("daily");
    window.scrollTo({ top: 0 });
  };

  const openPaper = (paper: AtlasPaper) => {
    setActiveDate(paper.readingDate);
    setReadingPaperId(paper.id);
    setView("daily");
    window.scrollTo({ top: 0 });
  };

  const toggleCompare = (paper: AtlasPaper) => {
    setCompareIds((ids) => {
      if (ids.includes(paper.id)) {
        setCompareNotice("");
        return ids.filter((id) => id !== paper.id);
      }
      if (ids.length >= 4) {
        setCompareNotice("比较篮最多保留 4 篇。请先移除一篇，再加入新的论文。");
        return ids;
      }
      setCompareNotice("");
      return [...ids, paper.id];
    });
  };

  return (
    <main className="site-shell" id="top">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => openIssue()} aria-label="回到当前日报">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>
            <strong>AI 编译器论文地图</strong>
            <small>每日阅读档案</small>
          </span>
        </button>
        <nav className="top-nav" aria-label="主要页面">
          {(Object.keys(viewNames) as View[]).map((item) => (
            <button
              key={item}
              type="button"
              className={view === item ? "nav-item active" : "nav-item"}
              aria-current={view === item ? "page" : undefined}
              onClick={() => setView(item)}
            >
              {viewNames[item]}
            </button>
          ))}
        </nav>
        <button className="today-button" type="button" onClick={() => openIssue(latestIssueDate)}>今日状态</button>
      </header>

      <section className="data-status" aria-label="资料状态">
        <span><b>最后成功整理</b>{dataStatus.auditedOn}</span>
        <span><b>已核验范围</b>{dataStatus.verifiedThrough}</span>
        <span><b>当天状态</b>{dataStatus.todayStatus}</span>
      </section>

      {view === "daily" && (
        <DailyDesk
          issue={activeIssue}
          papers={activeIssuePapers}
          readingPaper={readingPaper}
          selectedDate={activeDate}
          onSelectDate={selectDate}
          onOpenIssue={() => openIssue()}
          onOpenPaper={openPaper}
          onToggleCompare={toggleCompare}
          compareIds={compareIds}
          scratchpad={scratchpad}
          onScratchpad={setScratchpad}
          onOpenCompare={() => setView("compare")}
        />
      )}

      {view !== "daily" && (
        <section className="page-canvas">
          {view === "library" && (
            <LibraryView
              papers={filteredPapers}
              query={query}
              track={track}
              onQuery={setQuery}
              onTrack={setTrack}
              onOpenPaper={openPaper}
              onToggleCompare={toggleCompare}
              compareIds={compareIds}
            />
          )}
          {view === "compare" && (
            <CompareView
              papers={comparePapers}
              allPapers={allPapers}
              notice={compareNotice}
              note={comparisonNote}
              onNote={setComparisonNote}
              onOpenPaper={openPaper}
              onToggleCompare={toggleCompare}
            />
          )}
          {view === "map" && (
            <RelationView
              track={track}
              onTrack={setTrack}
              onOpenPaper={openPaper}
            />
          )}
          {view === "weekly" && <WeeklyView onOpenIssue={openIssue} />}
          {view === "review" && (
            <ReviewView
              paperId={reviewPaperId}
              revealed={revealed}
              drafts={recallDrafts}
              onPaper={setReviewPaperId}
              onReveal={setRevealed}
              onDraft={setRecallDrafts}
              onOpenPaper={openPaper}
            />
          )}
        </section>
      )}

      <footer className="site-footer">
        <div>
          <p className="eyebrow">资料说明</p>
          <p>每日论文集是唯一内容单位；周报只从日报派生。完整精读、摘要核验、候选待核验会始终分开标注。</p>
          <p>{dataStatus.automationBoundary}</p>
        </div>
        <div className="footer-links">
          <a href="https://arxiv.org" target="_blank" rel="noreferrer">arXiv</a>
          <a href="https://www.science.org/doi/10.1126/science.1152408" target="_blank" rel="noreferrer">主动回忆参考</a>
          <a href="https://doi.org/10.1177/1529100612453266" target="_blank" rel="noreferrer">间隔练习参考</a>
        </div>
      </footer>

      {view !== "compare" && comparePapers.length > 0 && (
        <CompareDock
          papers={comparePapers}
          onOpen={() => setView("compare")}
          onClear={() => {
            setCompareIds([]);
            setCompareNotice("");
          }}
        />
      )}
    </main>
  );
}

function DailyDesk({
  issue,
  papers,
  readingPaper,
  selectedDate,
  onSelectDate,
  onOpenIssue,
  onOpenPaper,
  onToggleCompare,
  compareIds,
  scratchpad,
  onScratchpad,
  onOpenCompare,
}: {
  issue: DailyIssue;
  papers: AtlasPaper[];
  readingPaper: AtlasPaper | null;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenIssue: () => void;
  onOpenPaper: (paper: AtlasPaper) => void;
  onToggleCompare: (paper: AtlasPaper) => void;
  compareIds: string[];
  scratchpad: Scratchpad;
  onScratchpad: (next: Scratchpad) => void;
  onOpenCompare: () => void;
}) {
  return (
    <section className="daily-desk" aria-label="每日阅读工作台">
      <IssueIndex selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <section className="reading-canvas">
        {readingPaper ? (
          <PaperReader
            paper={readingPaper}
            issue={issue}
            onBack={onOpenIssue}
            onToggleCompare={onToggleCompare}
            compared={compareIds.includes(readingPaper.id)}
          />
        ) : (
          <IssueContents
            issue={issue}
            papers={papers}
            onOpenPaper={onOpenPaper}
            onToggleCompare={onToggleCompare}
            compareIds={compareIds}
          />
        )}
      </section>
      <ReadingScratchpad
        scratchpad={scratchpad}
        onScratchpad={onScratchpad}
        compared={compareIds}
        onOpenCompare={onOpenCompare}
      />
    </section>
  );
}

function IssueIndex({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  return (
    <aside className="issue-index" aria-label="日报目录">
      <div className="index-heading">
        <p className="eyebrow">日报目录</p>
        <p>按阅读归属日浏览；状态点说明资料到哪里，不代表论文质量。</p>
      </div>
      {Object.entries(issueGroups()).map(([month, issues]) => (
        <section className="issue-month" key={month} aria-label={monthLabel(month)}>
          <h2>{monthLabel(month)}</h2>
          {issues.map((issue) => {
            const count = issue.paperIds.length;
            return (
              <button
                key={issue.date}
                type="button"
                className={issue.date === selectedDate ? "issue-link active" : "issue-link"}
                aria-current={issue.date === selectedDate ? "date" : undefined}
                onClick={() => onSelectDate(issue.date)}
              >
                <span className={`status-dot ${issueTone[issue.status]}`} aria-hidden="true" />
                <span>
                  <b>{shortDate(issue.date)}</b>
                  <small>{count ? `${count} 篇可读` : issue.status}</small>
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </aside>
  );
}

function IssueContents({
  issue,
  papers,
  onOpenPaper,
  onToggleCompare,
  compareIds,
}: {
  issue: DailyIssue;
  papers: AtlasPaper[];
  onOpenPaper: (paper: AtlasPaper) => void;
  onToggleCompare: (paper: AtlasPaper) => void;
  compareIds: string[];
}) {
  return (
    <article className="issue-contents">
      <header className="issue-title">
        <div>
          <p className="eyebrow">{shortDate(issue.date)} 的阅读档案</p>
          <h1>{issue.status === "采集中" ? "当天资料仍在核对" : "先把当天的线索读清楚"}</h1>
        </div>
        <PaperTag tone={issueTone[issue.status]}>{issue.status}</PaperTag>
      </header>

      <section className="issue-brief" aria-label="当天研究信号">
        <div className="issue-signal">
          <p className="eyebrow">今天值得带走的一点</p>
          <h2>{issue.signal}</h2>
        </div>
        <dl className="issue-facts">
          <div>
            <dt>资料范围</dt>
            <dd>{issue.sourceCoverage}</dd>
          </div>
          <div>
            <dt>今天的分歧</dt>
            <dd>{issue.comparison}</dd>
          </div>
          {issue.screeningNote && (
            <div className="screening-note">
              <dt>仍待补齐</dt>
              <dd>{issue.screeningNote}</dd>
            </div>
          )}
        </dl>
      </section>

      {papers.length ? (
        <section className="paper-list-section" aria-label="当日论文">
          <div className="section-row">
            <h2>今天可读的论文</h2>
            <span>{papers.length} 篇</span>
          </div>
          <ol className="paper-list">
            {papers.map((paper, index) => (
              <PaperListItem
                key={paper.id}
                paper={paper}
                number={index + 1}
                onOpen={() => onOpenPaper(paper)}
                onToggleCompare={() => onToggleCompare(paper)}
                compared={compareIds.includes(paper.id)}
              />
            ))}
          </ol>
          {papers.length > 1 && (
            <section className="day-question">
              <p className="eyebrow">读完再判断</p>
              <p>{issue.comparison}</p>
            </section>
          )}
        </section>
      ) : (
        <NoPaperState issue={issue} />
      )}
    </article>
  );
}

function PaperListItem({
  paper,
  number,
  onOpen,
  onToggleCompare,
  compared,
}: {
  paper: AtlasPaper;
  number: number;
  onOpen: () => void;
  onToggleCompare: () => void;
  compared: boolean;
}) {
  return (
    <li className="paper-list-item">
      <span className="paper-number" aria-hidden="true">{String(number).padStart(2, "0")}</span>
      <div className="paper-list-copy">
        <div className="paper-meta">
          <PaperTag tone={depthTone[paper.depth]}>{paper.depth}</PaperTag>
          <PaperTag tone={paper.admission === "纳入论文" ? "plain" : "pending"}>{paper.admission}</PaperTag>
        </div>
        <h3>{paper.chineseTitle}</h3>
        <p className="english-title">{paper.title}</p>
        <p className="one-line">{paper.oneLine}</p>
        <TrackTags tracks={paper.tracks} />
      </div>
      <div className="paper-actions">
        <button className="text-button" type="button" onClick={onOpen}>阅读这篇</button>
        <button className={compared ? "compare-toggle selected" : "compare-toggle"} type="button" onClick={onToggleCompare}>
          {compared ? "移出比较" : "加入比较"}
        </button>
      </div>
    </li>
  );
}

function NoPaperState({ issue }: { issue: DailyIssue }) {
  return (
    <section className="no-paper-state">
      <span className={`status-dot ${issueTone[issue.status]}`} aria-hidden="true" />
      <div>
        <h2>{issue.status === "采集中" ? "当天原文核验仍在进行" : "当天候选清单尚待恢复与筛选"}</h2>
        <p>{issue.screeningNote ?? "当前没有可审计的纳入论文；这不表示当天没有相关论文。"}</p>
      </div>
    </section>
  );
}

function PaperReader({
  paper,
  issue,
  onBack,
  onToggleCompare,
  compared,
}: {
  paper: AtlasPaper;
  issue: DailyIssue;
  onBack: () => void;
  onToggleCompare: (paper: AtlasPaper) => void;
  compared: boolean;
}) {
  return (
    <article className="paper-reader">
      <button className="back-link" type="button" onClick={onBack}>← 回到 {shortDate(issue.date)} 的目录</button>
      <header className="reader-header">
        <div className="paper-meta">
          <PaperTag tone={depthTone[paper.depth]}>{paper.depth}</PaperTag>
          <PaperTag tone={paper.admission === "纳入论文" ? "plain" : "pending"}>{paper.admission}</PaperTag>
        </div>
        <h1>{paper.chineseTitle}</h1>
        <p className="reader-original-title">{paper.title}</p>
        <p className="reader-byline">{paper.authors}</p>
        <TrackTags tracks={paper.tracks} />
      </header>

      <section className="reading-prompt">
        <p className="eyebrow">开始前，先写下你的判断</p>
        <h2>它会改变当前项目的哪一项：假设、接口、判断依据，还是实验设计？</h2>
        <p>右侧可以留下临时笔记；再用下面的证据和边界核对它。</p>
      </section>

      <section className="reader-section first">
        <p className="eyebrow">30 秒判断</p>
        <h2>{paper.oneLine}</h2>
      </section>

      <section className="reader-section">
        <p className="eyebrow">3 分钟理解</p>
        <h2>作者要解决的问题</h2>
        <p>{paper.background}</p>
        <div className="reader-callout assumption">
          <b>它挑战的旧假设</b>
          <p>{paper.oldAssumption}</p>
        </div>
        <h2>机制如何连起来</h2>
        <ol className="mechanism-list">
          {paper.mechanism.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
        <div className="reader-callout">
          <b>具体例子或工作负载</b>
          <p>{paper.example}</p>
        </div>
      </section>

      <section className="reader-section">
        <p className="eyebrow">证据与边界</p>
        <h2>最强证据</h2>
        <p className="evidence-box">{paper.evidence}</p>
        <h2>它没有回答什么</h2>
        <p className="boundary-box">{paper.limitation}</p>
        <div className="reader-callout project-link">
          <b>带回当前项目</b>
          <p>{paper.projectLink}</p>
        </div>
        <div className="question-list">
          <b>下一轮该问什么</b>
          {paper.questions.map((question) => <p key={question}>{question}</p>)}
        </div>
      </section>

      <section className="source-record">
        <p className="eyebrow">来源记录</p>
        <dl>
          <div><dt>阅读归属日</dt><dd>{shortDate(paper.readingDate)}</dd></div>
          <div><dt>论文版本</dt><dd>{paper.sourceDate}</dd></div>
          <div><dt>arXiv</dt><dd>{paper.arxiv}</dd></div>
          <div><dt>资料状态</dt><dd>{paper.depth} · {paper.admission}</dd></div>
        </dl>
        <p>重要判断会区分论文明确陈述、基于论文证据的推断与证据不足。</p>
      </section>

      <div className="reader-actions">
        <a className="button primary" href={paper.source} target="_blank" rel="noreferrer">打开 arXiv 原文</a>
        {paper.fullReadHref && <a className="button secondary" href={paper.fullReadHref} target="_blank" rel="noreferrer">打开完整精读</a>}
        <button className="button secondary" type="button" onClick={() => onToggleCompare(paper)}>
          {compared ? "移出比较篮" : "加入比较篮"}
        </button>
      </div>
    </article>
  );
}

function ReadingScratchpad({
  scratchpad,
  onScratchpad,
  compared,
  onOpenCompare,
}: {
  scratchpad: Scratchpad;
  onScratchpad: (next: Scratchpad) => void;
  compared: string[];
  onOpenCompare: () => void;
}) {
  const update = (key: keyof Scratchpad, value: string) => onScratchpad({ ...scratchpad, [key]: value });
  return (
    <aside className="reading-scratchpad" aria-label="本次阅读笔记">
      <div>
        <p className="eyebrow">本次阅读</p>
        <h2>先写下判断，再核对证据。</h2>
        <p>这些内容只保留在当前浏览器会话，不会上传，也不宣称跨设备同步。</p>
      </div>
      <label>
        <span>我的判断</span>
        <textarea value={scratchpad.judgment} onChange={(event) => update("judgment", event.target.value)} placeholder="我认为它真正改变的是……" />
      </label>
      <label>
        <span>要核对的证据</span>
        <textarea value={scratchpad.evidence} onChange={(event) => update("evidence", event.target.value)} placeholder="需要回到原文确认……" />
      </label>
      <label>
        <span>可尝试的实验</span>
        <textarea value={scratchpad.experiment} onChange={(event) => update("experiment", event.target.value)} placeholder="在当前项目里，最小对照可以是……" />
      </label>
      <div className="scratchpad-compare">
        <span>比较篮</span>
        <b>{compared.length} / 4 篇</b>
        <button className="text-button" type="button" onClick={onOpenCompare} disabled={compared.length < 2}>打开固定字段比较</button>
      </div>
    </aside>
  );
}

function LibraryView({
  papers,
  query,
  track,
  onQuery,
  onTrack,
  onOpenPaper,
  onToggleCompare,
  compareIds,
}: {
  papers: AtlasPaper[];
  query: string;
  track: ResearchTrack | "全部主线";
  onQuery: (value: string) => void;
  onTrack: (track: ResearchTrack | "全部主线") => void;
  onOpenPaper: (paper: AtlasPaper) => void;
  onToggleCompare: (paper: AtlasPaper) => void;
  compareIds: string[];
}) {
  return (
    <>
      <SectionHeading
        eyebrow="检索"
        title="跨日检索，不改变论文的日报归属"
        copy="每一篇仍保留阅读归属日、版本信息、资料状态和回到原日报的路径。检索只是另一种阅读入口。"
        aside={<span className="count-badge">{papers.length} 篇结果</span>}
      />
      <section className="search-tools" aria-label="论文筛选">
        <label className="search-field">
          <span>搜索</span>
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="例如：语义、异步、Triton、差分" />
        </label>
        <div className="filter-row">
          <button type="button" className={track === "全部主线" ? "filter active" : "filter"} onClick={() => onTrack("全部主线")}>全部主线</button>
          {researchTracks.map((item) => (
            <button key={item} type="button" className={track === item ? "filter active" : "filter"} onClick={() => onTrack(item)}>{item}</button>
          ))}
        </div>
      </section>
      <section className="library-list" aria-label="检索结果">
        <div className="library-head" aria-hidden="true"><span>日期</span><span>论文</span><span>资料状态</span><span>操作</span></div>
        {papers.map((paper) => (
          <article className="library-row" key={paper.id}>
            <div className="library-date"><b>{shortDate(paper.readingDate)}</b><span>{paper.arxiv}</span></div>
            <div className="library-paper"><h2>{paper.chineseTitle}</h2><p>{paper.oneLine}</p><TrackTags tracks={paper.tracks} /></div>
            <div className="library-status"><PaperTag tone={depthTone[paper.depth]}>{paper.depth}</PaperTag><PaperTag tone={paper.admission === "纳入论文" ? "plain" : "pending"}>{paper.admission}</PaperTag></div>
            <div className="library-actions"><button className="text-button" type="button" onClick={() => onOpenPaper(paper)}>阅读</button><button className={compareIds.includes(paper.id) ? "compare-toggle selected" : "compare-toggle"} type="button" onClick={() => onToggleCompare(paper)}>{compareIds.includes(paper.id) ? "已加入" : "比较"}</button></div>
          </article>
        ))}
      </section>
    </>
  );
}

function CompareView({
  papers,
  allPapers: available,
  notice,
  note,
  onNote,
  onOpenPaper,
  onToggleCompare,
}: {
  papers: AtlasPaper[];
  allPapers: AtlasPaper[];
  notice: string;
  note: string;
  onNote: (value: string) => void;
  onOpenPaper: (paper: AtlasPaper) => void;
  onToggleCompare: (paper: AtlasPaper) => void;
}) {
  const rows: { label: string; render: (paper: AtlasPaper) => ReactNode }[] = [
    { label: "问题 / 输入输出", render: (paper) => <><p>{paper.oneLine}</p><small>{paper.background}</small></> },
    { label: "旧假设", render: (paper) => paper.oldAssumption },
    { label: "机制", render: (paper) => <ol className="compact-steps">{paper.mechanism.map((step) => <li key={step}>{step}</li>)}</ol> },
    { label: "判断依据 / oracle", render: (paper) => paper.evidence },
    { label: "硬件或工作负载", render: (paper) => paper.example },
    { label: "最强证据", render: (paper) => paper.evidence },
    { label: "局限", render: (paper) => paper.limitation },
    { label: "与当前项目的关系", render: (paper) => paper.projectLink },
    { label: "可区分它们的实验", render: (paper) => paper.questions[1] ?? paper.questions[0] },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="比较"
        title="把差异放在同一组字段里"
        copy="并排摘要很难帮你做决定。这里固定比较问题、假设、机制、判断依据、工作负载、证据和边界。"
        aside={<span className="count-badge">已选 {papers.length} / 4 篇</span>}
      />
      <section className="comparison-picker">
        <div>
          <b>比较篮</b>
          <p>{papers.length ? "点选标题可从比较篮移除。" : "从下方选择至少两篇论文。"}</p>
        </div>
        <div className="selection-list">
          {papers.map((paper) => <button type="button" className="selection-chip" key={paper.id} onClick={() => onToggleCompare(paper)}>{paper.chineseTitle}<span>移除</span></button>)}
        </div>
      </section>
      {notice && <p className="inline-notice" role="status">{notice}</p>}
      {papers.length >= 2 ? (
        <>
          <div className="comparison-wrap">
            <div className="comparison-table" style={{ gridTemplateColumns: `154px repeat(${papers.length}, minmax(245px, 1fr))` }}>
              <div className="compare-head label-cell">判断字段</div>
              {papers.map((paper) => (
                <div className="compare-head" key={paper.id}>
                  <PaperTag tone={depthTone[paper.depth]}>{shortDate(paper.readingDate)}</PaperTag>
                  <h2>{paper.chineseTitle}</h2>
                  <button className="text-button" type="button" onClick={() => onOpenPaper(paper)}>回到阅读稿</button>
                </div>
              ))}
              {rows.flatMap((row) => [
                <div className="label-cell compare-label" key={`${row.label}-label`}><b>{row.label}</b></div>,
                ...papers.map((paper) => <div className="compare-cell" key={`${row.label}-${paper.id}`}>{row.render(paper)}</div>),
              ])}
            </div>
          </div>
          <section className="comparison-notes">
            <p className="eyebrow">这次要区分什么</p>
            <label>
              写下共同前提、决定性差异、适用边界或仍未决定的问题。草稿只保留在当前浏览器会话。
              <textarea value={note} onChange={(event) => onNote(event.target.value)} placeholder="例如：两者都依赖外部 oracle；A 先解释语义，B 先解释端到端性能……" />
            </label>
          </section>
        </>
      ) : (
        <section className="empty-compare"><h2>选择两篇论文开始比较</h2><p>候选待核验条目会保留状态，不会与已核验论文混在一起。</p></section>
      )}
      <section className="quick-picks">
        <p>从这里加入比较</p>
        <div>{available.slice(-18).map((paper) => <button type="button" key={paper.id} onClick={() => onToggleCompare(paper)}>{paper.chineseTitle}</button>)}</div>
      </section>
    </>
  );
}

function RelationView({
  track,
  onTrack,
  onOpenPaper,
}: {
  track: ResearchTrack | "全部主线";
  onTrack: (track: ResearchTrack | "全部主线") => void;
  onOpenPaper: (paper: AtlasPaper) => void;
}) {
  const visible = allPapers.filter((paper) => track === "全部主线" || paper.tracks.includes(track));
  const visibleIds = new Set(visible.map((paper) => paper.id));
  const relations = paperRelations.filter((relation) => visibleIds.has(relation.from) && visibleIds.has(relation.to));

  return (
    <>
      <SectionHeading
        eyebrow="研究关联"
        title="关系必须能回到理由与证据"
        copy="这里不把相似性写成影响，也不给论文打总分。每条边都展示关系类型、理由、证据来源、判断依据和置信度。"
      />
      <div className="filter-row relation-filters">
        <button type="button" className={track === "全部主线" ? "filter active" : "filter"} onClick={() => onTrack("全部主线")}>全部主线</button>
        {researchTracks.map((item) => <button type="button" key={item} className={track === item ? "filter active" : "filter"} onClick={() => onTrack(item)}>{item}</button>)}
      </div>
      <section className="relation-overview">
        <div><b>{visible.length}</b><span>篇当前视野内论文</span></div>
        <div><b>{relations.length}</b><span>条可解释关系</span></div>
        <p>把下面的路径当作研究地图的可读版本：从一篇论文出发，经过明确关系，回到另一篇论文和其证据。</p>
      </section>
      <section className="relation-ledger" aria-label="关系账本">
        <div className="section-row"><h2>关系账本</h2><span>筛选后 {relations.length} 条</span></div>
        {relations.length ? relations.map((relation) => {
          const from = paperById(relation.from);
          const to = paperById(relation.to);
          if (!from || !to) return null;
          return (
            <article className="relation-path" key={`${relation.from}-${relation.to}`}>
              <div className="relation-route">
                <button type="button" onClick={() => onOpenPaper(from)}>{from.chineseTitle}</button>
                <span><PaperTag tone="partial">{relation.type}</PaperTag><i aria-hidden="true">→</i></span>
                <button type="button" onClick={() => onOpenPaper(to)}>{to.chineseTitle}</button>
              </div>
              <dl>
                <div><dt>为什么相连</dt><dd>{relation.reason}</dd></div>
                <div><dt>证据来源</dt><dd>{relation.evidence}</dd></div>
                <div><dt>判断依据</dt><dd>{relation.basis} · 置信度 {relation.confidence}</dd></div>
              </dl>
            </article>
          );
        }) : <p className="empty-relation">当前筛选没有同时覆盖一条已定义关系的两端；可改用“全部主线”查看完整账本。</p>}
      </section>
    </>
  );
}

function WeeklyView({ onOpenIssue }: { onOpenIssue: (date: string) => void }) {
  return (
    <>
      <SectionHeading
        eyebrow="周报"
        title="跨日归纳，但不替代每日阅读"
        copy="每一条周报都只从其覆盖的日报派生。点击日期即可回到当天的论文、资料状态和阅读记录。"
      />
      <section className="weekly-list">
        {weeklyBriefs.map((week) => {
          const issues = week.dates.map(issueByDate);
          return (
            <article className="week-record" key={week.label}>
              <div className="week-side"><p>{week.label}</p><div>{issues.map((issue) => <button type="button" key={issue.date} onClick={() => onOpenIssue(issue.date)}>{shortDate(issue.date)}</button>)}</div></div>
              <div className="week-copy">
                <h2>{week.evolution}</h2>
                <dl>
                  <div><dt>关键对比</dt><dd>{week.contrast}</dd></div>
                  <div><dt>新增关系</dt><dd>{week.mapAddition}</dd></div>
                  <div><dt>仍未解决</dt><dd>{week.openQuestion}</dd></div>
                  <div><dt>下一步实验</dt><dd>{week.nextTest}</dd></div>
                </dl>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

function ReviewView({
  paperId,
  revealed,
  drafts,
  onPaper,
  onReveal,
  onDraft,
  onOpenPaper,
}: {
  paperId: string;
  revealed: Record<string, boolean>;
  drafts: Record<string, string>;
  onPaper: (id: string) => void;
  onReveal: (next: Record<string, boolean>) => void;
  onDraft: (next: Record<string, string>) => void;
  onOpenPaper: (paper: AtlasPaper) => void;
}) {
  const paper = paperById(paperId) ?? allPapers[0];
  const prompts = [
    { id: "problem", label: "问题 / 贡献", question: "不看答案：它要解决的核心问题或贡献是什么？", answer: paper.oneLine },
    { id: "mechanism", label: "机制 / 假设", question: "为什么需要这一机制？它挑战了什么旧假设？", answer: `${paper.oldAssumption} → ${paper.mechanism.join("；")}` },
    { id: "evidence", label: "证据 / 边界", question: "哪项证据支持它？什么仍不能外推？", answer: `${paper.evidence} ${paper.limitation}` },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="回顾"
        title="先想，再核对"
        copy="把主动回忆和自我解释当作阅读辅助：先写下自己的答案，再回到资料核对。页面不打分，也不承诺提升科研能力。"
      />
      <label className="review-picker">
        <span>选择一篇论文</span>
        <select value={paper.id} onChange={(event) => onPaper(event.target.value)}>
          {allPapers.filter((item) => item.admission === "纳入论文").map((item) => <option key={item.id} value={item.id}>{shortDate(item.readingDate)} · {item.chineseTitle}</option>)}
        </select>
      </label>
      <section className="recall-list">
        {prompts.map((prompt, index) => {
          const key = `${paper.id}-${prompt.id}`;
          return (
            <article className="recall-card" key={key}>
              <div><span className="recall-number">0{index + 1}</span><PaperTag tone="verified">{prompt.label}</PaperTag></div>
              <h2>{prompt.question}</h2>
              <textarea value={drafts[key] ?? ""} onChange={(event) => onDraft({ ...drafts, [key]: event.target.value })} placeholder="先写下你的答案……" />
              {revealed[key] && <div className="answer-box"><b>核对要点</b><p>{prompt.answer}</p>{prompt.id === "evidence" && <button className="text-button" type="button" onClick={() => onOpenPaper(paper)}>回到来源记录</button>}</div>}
              <button className="button secondary small" type="button" onClick={() => onReveal({ ...revealed, [key]: !revealed[key] })}>{revealed[key] ? "收起核对要点" : "显示核对要点"}</button>
            </article>
          );
        })}
      </section>
      <section className="review-schedule">
        <p className="eyebrow">重读入口</p>
        <h2>把 1、7、30 天作为可调整的提醒默认值。</h2>
        <p>它们不是对所有人最优的承诺，也不会在本站自动创建任务或同步阅读进度。</p>
        <div><b>第 1 天</b><b>第 7 天</b><b>第 30 天</b></div>
      </section>
      <section className="opportunity-card">
        <p className="eyebrow">待验证的机会卡</p>
        <h2>将编译层诊断接入反馈驱动的 kernel Agent，能否减少无效重生成？</h2>
        <div>
          <p><b>支持它的线索</b>Compiler-Grounded Diagnosis 强调编译层证据；LEAP 强调环境反馈与训练效率。</p>
          <p><b>可能的反证</b>诊断可能昂贵、噪声高，或使 Agent 只擅长已见失败形态。</p>
          <p><b>最小实验</b>固定 benchmark，对照无诊断、诊断约束和重生成三种策略的成功率、成本、正确性与性能回归。</p>
        </div>
        <small>这是一张基于现有资料的待审阅假设，不是任何一篇论文已经证明的结论。</small>
      </section>
    </>
  );
}

function CompareDock({
  papers,
  onOpen,
  onClear,
}: {
  papers: AtlasPaper[];
  onOpen: () => void;
  onClear: () => void;
}) {
  return (
    <aside className="compare-dock" aria-label="比较篮">
      <div><span>比较篮</span><b>{papers.length} / 4 篇</b><p>{papers.map((paper) => paper.chineseTitle).join("、")}</p></div>
      <div><button className="text-button" type="button" onClick={onClear}>清空</button><button className="button primary" type="button" onClick={onOpen} disabled={papers.length < 2}>打开比较</button></div>
    </aside>
  );
}
