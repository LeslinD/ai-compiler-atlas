"use client";

import { useEffect, useMemo, useState } from "react";
import { earlyDeepReads } from "./deep-reads-early";
import { recentDeepReads, type DeepRead, type DeepSection } from "./deep-reads";
import day26Archive from "./insights-0826.json";
import supplementA from "./supplement-0810-0817.json";
import supplementB from "./supplement-0818-0821.json";
import supplementC from "./supplement-0822-0825.json";

type Track =
  | "TileLang-TPU"
  | "Tile for DSA"
  | "Tile Fuzz"
  | "Agent 友好的 kernel DSL"
  | "LLM for unsafe Rust";

type CompactPaper = {
  id: string;
  title: string;
  zhTitle: string;
  arxiv: string;
  source?: string;
  track: Track;
  secondary?: Track;
  conclusion: string;
  background: string;
  flow: string[];
  evidence: string;
  limits: string;
  relation: string;
};

type RenderPaper =
  | ({ kind: "compact" } & CompactPaper)
  | {
      kind: "deep";
      id: string;
      title: string;
      zhTitle: string;
      arxiv: string;
      source: string;
      authors: string;
      version: string;
      track: Track;
      secondary?: Track;
      sections: DeepSection[];
    };

type RenderDay = {
  date: string;
  title: string;
  signal: string;
  papers: RenderPaper[];
};

type WeekDefinition = {
  id: string;
  start: string;
  end: string;
  range: string;
  title: string;
  overview: string;
  conclusions: string[];
  relations: string[];
  outputs: string[];
  nextQuestions: string[];
};

const trackDescriptions: Record<Track, string> = {
  "TileLang-TPU": "动态 shape、LMEM、DMA、软件流水、张量指令映射和后端性能模型。",
  "Tile for DSA": "Tile 抽象、新硬件 ISA、存储通信、同步、目标描述和自动后端。",
  "Tile Fuzz": "差分与变形测试、Oracle、覆盖、错误缩减、性能异常和版本回归。",
  "Agent 友好的 kernel DSL": "受约束生成、显式 IR、编译诊断、搜索策略和自动评测。",
  "LLM for unsafe Rust": "unsafe Rust 分析、验证入口、自动修复、Oracle 和 benchmark 构造。",
};

const dayMeta: Record<string, { title: string; signal: string }> = {
  "2026-08-02": {
    title: "双稀疏 kernel 与执行模型协同",
    signal: "Celty 说明稀疏率本身不能直接转化为速度。压缩格式、索引恢复、部分和保存和执行单元必须一起设计，编译器也要能够表达这些不规则关系。",
  },
  "2026-08-03": {
    title: "保留接近正确的候选，并选择值得调试的轨迹",
    signal: "当天两篇工作都在减少无效重试。Debug 从 near-miss kernel 中定位局部错误，LEAP 只把多轮环境反馈留给真正有修复价值的任务。",
  },
  "2026-08-04": {
    title: "语义优化机会与片上融合",
    signal: "SeGaBench 将模型提出的隐藏语义、正确性验证和真实性能分开；ComFuse 则把规约、跨 tile 通信和后处理流水放进同一个融合问题。",
  },
  "2026-08-05": {
    title: "异步数据流编译的合法性边界",
    signal: "Wavelet 用权限、fence 和 ghost token 表达异步执行中的内存顺序，再证明核心 lowering 保持语义。性能优化和正确性证明被明确分开。",
  },
  "2026-08-06": {
    title: "用最早分歧轨迹缩小修复范围",
    signal: "WasmMend 不从最终错误直接猜补丁，而是比较 native 与 WebAssembly 的函数状态，找到最早不一致的位置，再把局部证据交给修复 Agent。",
  },
  "2026-08-07": {
    title: "当天没有高相关主线论文",
    signal: "当天没有为了补齐数量加入普通 Agent 或低相关系统工作。周内关系在本周总结中统一整理。",
  },
  "2026-08-08": {
    title: "不规则 GPU 负载暴露 DSL 的真实边界",
    signal: "哈希探测、逐 lane 退出、条件原子操作和跨线程发布会同时影响性能与正确性。一个 DSL 能高效表达规则 tile，并不代表它能可靠覆盖不规则 kernel。",
  },
  "2026-08-09": {
    title: "当天没有高相关主线论文",
    signal: "当天没有新增达到精读门槛的论文。本周总结集中回答诊断、异步合法性和 DSL 表达边界之间的关系。",
  },
  "2026-08-10": {
    title: "通信充分统计量与编译器性能差分",
    signal: "SwiftQK 通过只交换归一化所需的统计量减少通信；The Unseen Delta 从整程序性能变化追到硬件事件和具体优化决定。一个负责改变执行结构，一个负责解释结构为何有效。",
  },
  "2026-08-11": {
    title: "概率程序分析中的冲突报告",
    signal: "PPProbe 提醒我们，多个高概率报警不一定能在同一个程序状态中同时成立。分析结果需要保留推导关系，才能筛掉逻辑上互斥的报告组合。",
  },
  "2026-08-12": {
    title: "真实框架任务与硬件能力审计",
    signal: "RealisticTritonBench 将 kernel patch 放回真实 AI 框架检查；Spec Sheets Are Not Kernels 则区分规格声明、编译器生成、kernel 实例化和运行时调用。",
  },
  "2026-08-13": {
    title: "编译器—Agent 协同的 kernel 演化",
    signal: "CAKE 让 Agent 修改可分析的调度 IR，编译器负责合法性、lowering 和反馈。重复出现的失败还可以被固化成新的编译规则。",
  },
  "2026-08-14": {
    title: "合同级验证与真实程序状态回放",
    signal: "当天两篇论文都拒绝用少量样例代替完整证据。合同级 verifier 拆分数值、特殊值和资源要求，遗留程序迁移则保存真实状态并局部回放。",
  },
  "2026-08-15": {
    title: "可执行合同与综合反馈",
    signal: "硬件版本演化需要先固定新旧合同和可观察事务；综合优化 Agent 也需要从报告中获得结构化反馈。自然语言目标只有进入可执行接口后才适合长期迭代。",
  },
  "2026-08-16": {
    title: "机器规格差分与仓库级形式证明",
    signal: "InSPECtor 用真实硬件核对机器可读处理器规格，Vero 则把实现、规格、跨模块引理和证明一起放进仓库级任务。两篇都把验证对象扩展到完整工程。",
  },
};

const currentConversationDays: Array<{
  date: string;
  title: string;
  signal: string;
  arxiv: string[];
}> = [
  {
    date: "2026-08-17",
    title: "可执行规格与规格恢复",
    signal: "规格既可以约束已有 RTL 的版本演化，也可以从测试和执行状态中恢复。共同前提是，候选合同必须进入本地 checker，并保留反例、适用范围和版本关系。",
    arxiv: ["2608.12684", "2608.13240"],
  },
  {
    date: "2026-08-18",
    title: "动态循环同步与低精度数值归因",
    signal: "无全局屏障同步把循环距离变成运行时等待阈值；Integer Alibi 把整数累加、scale 和输出舍入拆成不同 Oracle。两篇都在把隐含执行条件变成可检查合同。",
    arxiv: ["2608.13757", "2608.13756"],
  },
  {
    date: "2026-08-19",
    title: "可信源码优化与 GPU kernel 形式等价",
    signal: "T-LLM Compiler 让模型提出高层循环变换，再按程序结构选择验证路径；Volta 在受限 structured-CTA 范围内证明 PTX kernel 数学等价。验证器的适用范围本身必须成为数据。",
    arxiv: ["2608.14953", "2511.12638"],
  },
  {
    date: "2026-08-20",
    title: "架构专用 PTX 与多路线 kernel 搜索",
    signal: "PTXBench 将功能正确、目标指令真实执行和性能价值分开；KernelArc 让多个 Agent 从不同实现路线搜索，只共享真实 benchmark 支持的成功与失败。",
    arxiv: ["2608.17379", "2608.17071"],
  },
  {
    date: "2026-08-21",
    title: "覆盖缺口驱动断言与规格前提 Fuzzing",
    signal: "NeuroAssertion 从难以到达的 RTL 行为和 mutation coverage 找断言缺口；SpecTrum 将规格中的隐含合法条件变成 premise，并生成跨越边界的定向测试。",
    arxiv: ["2608.18482", "2608.17738"],
  },
  {
    date: "2026-08-22",
    title: "执行者—寄存器解耦与反馈收益审计",
    signal: "FIBER 将执行实例和片上寄存器所有权分开，使不同阶段改变并行度；反馈审计论文则说明，多轮演化收益可能来自非法测试或额外候选预算。",
    arxiv: ["2608.19628", "2608.19626"],
  },
  {
    date: "2026-08-23",
    title: "跨层调度早筛与结构化变异",
    signal: "HyperCut 说明昂贵层内搜索前可以用较粗成本模型淘汰差方案；Hype Meets Reality 则用负面结果说明，自由 LLM 变异未必胜过领域结构化算子。",
    arxiv: ["2608.19296", "2608.19347"],
  },
  {
    date: "2026-08-24",
    title: "多分支搜索与依赖升级测试",
    signal: "Loreley 区分 archive 确实被使用和最终结果确实改善；BreakGuard 区分测试生成成功、真正到达变化位置和拥有有效行为 Oracle。",
    arxiv: ["2608.19703", "2608.20167"],
  },
  {
    date: "2026-08-25",
    title: "显式 Agent 产物与分段信任边界",
    signal: "Artic 将自然语言流程编译成显式产物和控制流，并用活跃性管理上下文；AI with Authority 要求每项实现结论绑定规格、checker 和清楚的信任边界。",
    arxiv: ["2608.21341", "2608.21356"],
  },
  {
    date: "2026-08-26",
    title: "布局成本模型与最终机器码优化",
    signal: "Tensor Seeks Layout 用精确求解器分开搜索误差和成本模型误差；AsmEvo 说明高层编译结束以后，最终 AMDGPU 二进制仍可能存在指令调度与等待优化空间。",
    arxiv: ["2608.21555", "2608.20711"],
  },
];

const weekDefinitions: WeekDefinition[] = [
  {
    id: "2026-W30",
    start: "2026-07-25",
    end: "2026-07-26",
    range: "7 月 25 日—7 月 26 日",
    title: "先固定测试语义、数据类型合同和评测边界",
    overview: "这一周从三个基础问题开始。测试场景怎样保持并发语义，标准半精度怎样贯穿训练软件栈，以及 Kernel Agent 的候选由谁验收。三篇论文共同把模型放在结构化合同之后。",
    conclusions: [
      "测试语义应先由资源状态和因果关系确定，再让大模型完成代码实现。",
      "一种新数据类型只有贯穿前向、反向、优化器和 ISA 路径，才算真正被后端支持。",
      "编译、正确性、计时和完整工作负载必须由独立 harness 管理，Agent 只负责提出候选。",
    ],
    relations: [
      "From Resource Flow 负责定义测试要表达什么，Harness Engineering 负责判断生成结果能否晋升。",
      "RISC-V Float16 工作说明，稳定 ISA 语义也是一种硬件—软件合同。",
    ],
    outputs: ["并发资源状态测试模型", "训练 dtype 能力清单", "Kernel evaluator 分层合同"],
    nextQuestions: ["怎样把 DMA、计算和 buffer 复用表示成资源状态？", "训练与推理的 Tile dtype 合同应怎样区分？", "真实框架评测需要哪些最小工作负载？"],
  },
  {
    id: "2026-W31",
    start: "2026-07-27",
    end: "2026-08-02",
    range: "7 月 27 日—8 月 2 日",
    title: "从隐藏硬件事实走向可执行规格和动态映射",
    overview: "本周论文覆盖硬件拓扑测量、Tile 性能模型、运行时调度、规格修复、真实调用场景、动态设备放置、稀疏 ISA 和生产级 Triton 后端。共同主线是先恢复事实和约束，再做自动映射。",
    conclusions: [
      "性能模型必须建立在可重复测得的硬件事实上，不能只依赖公开规格。",
      "规格、已有测试和真实调用记录能够显著缩小 Agent 的猜测空间。",
      "设备放置、权重布局、请求状态和稀疏元数据会共同决定运行时最优方案。",
    ],
    relations: [
      "DGNA 恢复隐藏 NUMA，TileSight 将这些事实组织成 Tile 级性能坐标。",
      "VClare、SpecFirst、HarnessLLM 和 Change2Task 分别处理生成前规格、行为探测、调用场景和可执行任务。",
      "Ventaglio、Celty 与 Triton for MTIA 展示了新 DSA 支持必须同时处理表示、指令、执行和后端接入。",
    ],
    outputs: ["Tile 性能事实表", "动态放置与布局决策表", "规格—任务—验证工件关系"],
    nextQuestions: ["哪些硬件事实应进入 target description？", "动态图和动态 shape 的布局决策怎样复用？", "稀疏格式与专用累加资源如何进入 Tile IR？"],
  },
  {
    id: "2026-W32",
    start: "2026-08-03",
    end: "2026-08-09",
    range: "8 月 3 日—8 月 9 日",
    title: "Agent 从自由重写转向诊断、语义证据和异步合法性",
    overview: "本周重点不再是增加生成数量。near-miss 修复、环境反馈筛选、语义优化验证、片上融合、异步数据流证明和差异轨迹都在提高单次候选的证据密度。",
    conclusions: [
      "接近正确的 kernel 应保留并局部修复，不应默认从零重写。",
      "模型提出的语义优化必须经过独立正确性和性能协议，不能把解释直接当作许可。",
      "异步流水与不规则控制需要明确的权限、同步和 DSL 能力边界。",
    ],
    relations: [
      "Debug 与 LEAP 分别优化修复对象和反馈预算。",
      "SeGaBench 与 ComFuse 说明语义前提和硬件片上通信共同决定融合是否合法。",
      "Wavelet 与不规则 GPU 负载论文分别从形式证明和现实反例界定 DSL 边界。",
    ],
    outputs: ["Near-miss 修复分类", "异步权限与 token IR", "Kernel DSL 降级与 fallback 规则"],
    nextQuestions: ["哪些失败适合修复，哪些应直接重新生成？", "异步 DMA 依赖能否在 Tile IR 中静态证明？", "逐 lane 动态退出应由 DSL 还是低层后端表达？"],
  },
  {
    id: "2026-W33",
    start: "2026-08-10",
    end: "2026-08-16",
    range: "8 月 10 日—8 月 16 日",
    title: "真实框架、合同级验证和仓库级证据开始汇合",
    overview: "本周从通信优化和性能差分进入真实框架任务、硬件能力审计、编译器—Agent 协同、合同级验证、遗留程序迁移、规格驱动硬件演化和仓库级证明。评价对象逐步从单个 kernel 扩展到完整工程。",
    conclusions: [
      "轻量算子的通信优化应寻找充分统计量，而不是机械复制完整张量。",
      "硬件能力要区分规格存在、编译器生成、机器码执行和框架真正调用。",
      "正确性证据必须覆盖 shape、特殊值、资源和真实程序状态，单一 allclose 不足以验收。",
    ],
    relations: [
      "The Unseen Delta 为 CAKE 一类 Agent 提供从性能症状追到编译器决策的诊断方法。",
      "RealisticTritonBench 与 Validation-Centric Porting 都要求候选回到真实框架或程序状态中验证。",
      "Spec-Driven Evolution、InSPECtor 与 Vero 把规格和证明扩展到版本演化、机器定义和完整仓库。",
    ],
    outputs: ["硬件能力四层证据表", "合同级 Kernel verifier 清单", "仓库级实现—规格—证明任务结构"],
    nextQuestions: ["怎样将 profiler 证据回传到调度 IR？", "真实框架中哪些状态必须捕获和重放？", "后端规格变化怎样自动生成回归任务？"],
  },
  {
    id: "2026-W34",
    start: "2026-08-17",
    end: "2026-08-23",
    range: "8 月 17 日—8 月 23 日",
    title: "规格、验证和结构化搜索连成一套编译方法",
    overview: "本周从规格恢复与硬件演化开始，依次处理动态循环同步、低精度数值归因、源码与 PTX 验证、架构专用指令、覆盖前提、执行模型和搜索审计，最后落到早期筛选与结构化变异。",
    conclusions: [
      "规格可以从测试与 trace 中恢复，但必须限制在本地 verifier 真正支持的语言内。",
      "同步和低精度正确性都需要阶段化合同，不能只看最终输出是否接近。",
      "Agent 搜索应使用结构化动作和便宜早筛，并在固定昂贵评估预算下证明收益。",
    ],
    relations: [
      "Barrier-Free Synchronization 与 FIBER 都将执行者、数据所有权和生命周期从固定线程模型中拆开。",
      "Integer Alibi、Volta、PTXBench 与 SpecTrum 形成从数学等价、数值合同、指令执行到规格前提覆盖的验证层次。",
      "Feedback Audit、HyperCut 与 Hype Meets Reality 共同说明，候选数量和自由度增加不等于搜索质量提高。",
    ],
    outputs: ["Trace2TileContract", "DynamicLoopSyncContract", "KernelVerifierRouter", "ArchitectureFeatureContract", "TilePremiseFuzz", "ConstrainedKernelSearch"],
    nextQuestions: ["Tile contract 能否直接生成合法 schedule action？", "便宜 evaluator 怎样控制误删最优候选？", "不同 verifier 的适用范围怎样自动路由？"],
  },
  {
    id: "2026-W35",
    start: "2026-08-24",
    end: "2026-08-26",
    range: "8 月 24 日—8 月 26 日",
    title: "搜索复杂度、Agent 状态和性能模型成为新的核心问题",
    overview: "本周三天分别审视多分支搜索、版本迁移测试、显式 Agent 产物、形式信任边界、布局成本模型和最终机器码优化。重点从是否能生成，转向为什么保留某条路线、证据是否仍然有效，以及性能差距到底位于哪一层。",
    conclusions: [
      "搜索机制被实际使用和最终结果得到改善必须分别证明。",
      "测试生成成功、真正到达变化位置和拥有行为 Oracle 是三个独立门槛。",
      "当 heuristic 已接近形式目标最优而硬件仍很慢时，应优先修正成本模型或下游 lowering。",
    ],
    relations: [
      "Loreley 与 HyperCut 分别处理分支保留和早期筛选，二者都需要固定候选预算评估。",
      "BreakGuard 与 Artic 共同强调产物身份、版本和真实执行位置，防止使用失效证据。",
      "Tensor Seeks Layout 与 AsmEvo 位于编译流程两端，一个诊断高层模型误差，一个处理机器码最后一公里。",
    ],
    outputs: ["BackendMigrationGuard", "ArtifactKernelIR", "LayoutSearchDiagnosis"],
    nextQuestions: ["执行特征能否比源码 embedding 更好地描述搜索分支？", "如何自动判定 profile 和 correctness evidence 是否已经失效？", "布局、tiling、LMEM 与机器码优化怎样分层归因？"],
  },
];

const trackById: Record<string, [Track, Track?]> = {
  celty: ["Tile for DSA", "TileLang-TPU"],
  "debug-near-miss": ["Agent 友好的 kernel DSL", "Tile Fuzz"],
  leap: ["Agent 友好的 kernel DSL", "Tile Fuzz"],
  segabench: ["Agent 友好的 kernel DSL", "Tile Fuzz"],
  comfuse: ["Tile for DSA", "TileLang-TPU"],
  wavelet: ["Tile for DSA", "TileLang-TPU"],
  wasmmend: ["Tile Fuzz", "Agent 友好的 kernel DSL"],
  "irregularity-costs": ["Agent 友好的 kernel DSL", "Tile Fuzz"],
  swiftqk: ["Tile for DSA", "TileLang-TPU"],
  "unseen-delta": ["Tile Fuzz", "Agent 友好的 kernel DSL"],
  ppprobe: ["Tile Fuzz"],
  "realistic-triton-bench": ["Agent 友好的 kernel DSL", "Tile Fuzz"],
  "spec-sheets": ["Tile for DSA", "Tile Fuzz"],
  cake: ["Agent 友好的 kernel DSL", "Tile for DSA"],
  "contract-grade-verifier": ["Tile Fuzz", "Agent 友好的 kernel DSL"],
  "validation-centric-gpu-porting": ["Agent 友好的 kernel DSL", "Tile Fuzz"],
  "spec-driven-hardware-evolution": ["Tile for DSA", "Agent 友好的 kernel DSL"],
  synact: ["Agent 友好的 kernel DSL", "Tile for DSA"],
  inspector: ["Tile for DSA", "Tile Fuzz"],
  vero: ["Agent 友好的 kernel DSL", "Tile Fuzz"],
  "t-llm-compiler": ["Agent 友好的 kernel DSL", "Tile Fuzz"],
  neuroassertion: ["Tile for DSA", "Tile Fuzz"],
};

const trackAliases: Record<string, Track> = {
  "TileLang-TPU": "TileLang-TPU",
  "Tile for DSA": "Tile for DSA",
  "Tile Fuzz": "Tile Fuzz",
  TileFuzz: "Tile Fuzz",
  "Agent kernel DSL": "Agent 友好的 kernel DSL",
  "Agent 友好的 kernel DSL": "Agent 友好的 kernel DSL",
  "LLM for unsafe Rust": "LLM for unsafe Rust",
};

function normalizeTrack(value: string | undefined): Track {
  return trackAliases[value ?? ""] ?? "Agent 友好的 kernel DSL";
}

function cleanArxiv(value: string) {
  return value.replace(/v\d+$/i, "");
}

function dateFromHeading(value: string) {
  const match = value.match(/(\d+)\s*月\s*(\d+)\s*日/);
  if (!match) return "";
  return `2026-${String(Number(match[1])).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
}

function parseHistoricalDays(html: string): RenderDay[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll<HTMLElement>("section.day-section")).map((section) => {
    const heading = section.querySelector(":scope > h2")?.textContent?.trim() ?? "";
    const date = dateFromHeading(heading);
    const title = heading.includes("｜") ? heading.split("｜").slice(1).join("｜").trim() : heading;
    const signalText = section.querySelector<HTMLElement>(":scope > .callout.key")?.textContent?.trim() ?? "";
    const signal = signalText.replace(/^当日研究信号\s*/, "");

    const papers = Array.from(section.querySelectorAll<HTMLElement>(":scope > article.paper-card")).map<RenderPaper>((article) => {
      const sourceRow = article.querySelector<HTMLElement>(".source-row");
      const sourceText = sourceRow?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const arxiv = sourceText.match(/arXiv:([0-9.]+)/i)?.[1] ?? "";
      const zhTitle = sourceText.match(/中文理解：\s*(.*?)\s*论文版本：/)?.[1]?.trim() ?? article.querySelector("h2")?.textContent?.trim() ?? "";
      const version = sourceText.match(/论文版本：\s*(.*?)\s*来源：/)?.[1]?.trim() ?? `arXiv ${arxiv}`;
      const tags = Array.from(article.querySelectorAll<HTMLElement>(".paper-meta .tag")).map((tag) => tag.textContent?.trim() ?? "");
      const primary = normalizeTrack(article.querySelector<HTMLElement>(".paper-meta .tag.primary")?.textContent?.trim());
      const secondary = tags.map(normalizeTrack).find((item) => item !== primary);
      const sections: DeepSection[] = [];
      let current: DeepSection | undefined;

      Array.from(article.children).forEach((child) => {
        if (child.tagName === "H3") {
          current = { heading: child.textContent?.trim() ?? "" };
          sections.push(current);
          return;
        }
        if (!current) return;
        if (child.tagName === "P") {
          const text = child.textContent?.replace(/\s+/g, " ").trim();
          if (text) current.paragraphs = [...(current.paragraphs ?? []), text];
          return;
        }
        if (child.classList.contains("steps")) {
          const steps = Array.from(child.querySelectorAll<HTMLElement>(".step"))
            .map((step) => step.textContent?.replace(/\s+/g, " ").trim() ?? "")
            .filter(Boolean);
          if (steps.length) current.paragraphs = [...(current.paragraphs ?? []), ...steps];
          return;
        }
        if (child.tagName === "UL" || child.tagName === "OL") {
          const bullets = Array.from(child.querySelectorAll<HTMLElement>(":scope > li"))
            .map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? "")
            .filter(Boolean);
          if (bullets.length) current.bullets = [...(current.bullets ?? []), ...bullets];
        }
      });

      return {
        kind: "deep",
        id: article.id,
        title: article.querySelector("h2")?.textContent?.trim() ?? zhTitle,
        zhTitle,
        arxiv,
        source: sourceRow?.querySelector<HTMLAnchorElement>("a")?.href ?? `https://arxiv.org/abs/${arxiv}`,
        authors: "",
        version,
        track: primary,
        secondary,
        sections,
      };
    });

    return { date, title, signal, papers };
  });
}

function deepToRender(paper: DeepRead): RenderPaper {
  const [track, secondary] = trackById[paper.id] ?? ["Agent 友好的 kernel DSL"];
  return {
    kind: "deep",
    id: paper.id,
    title: paper.title,
    zhTitle: paper.chineseTitle,
    arxiv: cleanArxiv(paper.arxiv),
    source: paper.source,
    authors: paper.authors,
    version: paper.version,
    track,
    secondary,
    sections: paper.sections,
  };
}

function SectionBody({ section }: { section: DeepSection }) {
  return (
    <>
      {section.paragraphs?.map((paragraph, index) => <p key={`${section.heading}-p-${index}`}>{paragraph}</p>)}
      {section.bullets?.length ? <ul>{section.bullets.map((bullet, index) => <li key={`${section.heading}-b-${index}`}>{bullet}</li>)}</ul> : null}
    </>
  );
}

function CompactPaperView({ paper }: { paper: Extract<RenderPaper, { kind: "compact" }> }) {
  return (
    <article className="paper-article" id={paper.id}>
      <header className="paper-header">
        <div className="paper-labels"><span className="track-tag">{paper.track}</span>{paper.secondary ? <span className="secondary-tag">{paper.secondary}</span> : null}</div>
        <h3>{paper.title}</h3>
        <p className="chinese-title">{paper.zhTitle}</p>
        <div className="paper-source"><span>arXiv:{paper.arxiv}</span><a href={paper.source ?? `https://arxiv.org/abs/${paper.arxiv}`} target="_blank" rel="noreferrer">论文原文</a></div>
      </header>
      <section className="paper-section conclusion-section"><h4>先给结论</h4><p>{paper.conclusion}</p></section>
      <section className="paper-section"><h4>读懂它需要的最少背景</h4><p>{paper.background}</p></section>
      <section className="paper-section three-minute"><h4>3 分钟理解</h4>{paper.flow.map((paragraph, index) => <p key={`${paper.id}-flow-${index}`}><strong>{index + 1}.</strong> {paragraph}</p>)}</section>
      <section className="paper-section evidence-grid"><div><h4>实验证据</h4><p>{paper.evidence}</p></div><div><h4>局限</h4><p>{paper.limits}</p></div></section>
      <section className="paper-section relation-section"><h4>和研究主线的关系</h4><p>{paper.relation}</p></section>
    </article>
  );
}

function DeepPaperView({ paper }: { paper: Extract<RenderPaper, { kind: "deep" }> }) {
  return (
    <article className="paper-article" id={paper.id}>
      <header className="paper-header">
        <div className="paper-labels"><span className="track-tag">{paper.track}</span>{paper.secondary ? <span className="secondary-tag">{paper.secondary}</span> : null}</div>
        <h3>{paper.title}</h3>
        <p className="chinese-title">{paper.zhTitle}</p>
        <div className="paper-source"><span>{paper.version}</span>{paper.authors ? <span>{paper.authors}</span> : null}<a href={paper.source} target="_blank" rel="noreferrer">论文原文</a></div>
      </header>
      {paper.sections.map((section) => {
        const emphasis = section.heading.includes("3 分钟理解") || section.heading.includes("关键机制") || section.heading.includes("具体例子") || section.heading.includes("完整例子");
        const relation = section.heading.includes("关系") || section.heading.includes("启发") || section.heading.includes("研究方向");
        const conclusion = section.heading.includes("先给结论") || section.heading.includes("它在处理什么") || section.heading.includes("它解决的问题");
        return <section className={`paper-section ${emphasis ? "three-minute" : ""} ${relation ? "relation-section" : ""} ${conclusion ? "conclusion-section" : ""}`} key={`${paper.id}-${section.heading}`}><h4>{section.heading}</h4><SectionBody section={section} /></section>;
      })}
    </article>
  );
}

function PaperView({ paper }: { paper: RenderPaper }) {
  return paper.kind === "compact" ? <CompactPaperView paper={paper} /> : <DeepPaperView paper={paper} />;
}

function paperSearchText(paper: RenderPaper) {
  if (paper.kind === "compact") return [paper.title, paper.zhTitle, paper.arxiv, paper.track, paper.secondary, paper.conclusion, paper.background, paper.flow.join(" "), paper.evidence, paper.relation].filter(Boolean).join(" ");
  return [paper.title, paper.zhTitle, paper.arxiv, paper.track, paper.secondary, paper.authors, ...paper.sections.flatMap((section) => [section.heading, ...(section.paragraphs ?? []), ...(section.bullets ?? [])])].filter(Boolean).join(" ");
}

function WeekSummary({ definition, days }: { definition: WeekDefinition; days: RenderDay[] }) {
  const counts = new Map<Track, number>();
  days.flatMap((day) => day.papers).forEach((paper) => counts.set(paper.track, (counts.get(paper.track) ?? 0) + 1));
  return (
    <section className="week-summary" id={`summary-${definition.id}`}>
      <header className="week-summary-header"><div><span>本周总结｜{definition.id}</span><h2>{definition.title}</h2></div><time>{definition.range}</time></header>
      <p className="week-overview">{definition.overview}</p>
      <div className="week-coverage">{Array.from(counts.entries()).map(([name, count]) => <span key={name}>{name}<strong>{count}</strong></span>)}</div>
      <div className="week-summary-grid">
        <div><h3>方法结论</h3><ol>{definition.conclusions.map((item) => <li key={item}>{item}</li>)}</ol></div>
        <div><h3>论文关系</h3><ul>{definition.relations.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h3>已形成的研究材料</h3><ul>{definition.outputs.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h3>继续追踪</h3><ul>{definition.nextQuestions.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
    </section>
  );
}

export default function AugustAtlas() {
  const [historicalDays, setHistoricalDays] = useState<RenderDay[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<"全部" | Track>("全部");

  useEffect(() => {
    let active = true;
    fetch("./historical-insights.html")
      .then((response) => response.ok ? response.text() : Promise.reject(new Error("historical readings unavailable")))
      .then((html) => { if (active) setHistoricalDays(parseHistoricalDays(html)); })
      .finally(() => { if (active) setHistoryLoaded(true); });
    return () => { active = false; };
  }, []);

  const days = useMemo<RenderDay[]>(() => {
    const generated = new Map<string, RenderDay>();
    [...earlyDeepReads, ...recentDeepReads.filter((paper) => paper.date <= "2026-08-16")].forEach((paper) => {
      const meta = dayMeta[paper.date] ?? { title: "当日论文精读", signal: "当天围绕 AI 编译器、硬件感知编译和可靠自动优化进行精读。" };
      const day = generated.get(paper.date) ?? { date: paper.date, title: meta.title, signal: meta.signal, papers: [] };
      day.papers.push(deepToRender(paper));
      generated.set(paper.date, day);
    });
    ["2026-08-07", "2026-08-09"].forEach((date) => {
      const meta = dayMeta[date];
      generated.set(date, { date, title: meta.title, signal: meta.signal, papers: [] });
    });

    const compactSources = [
      ...(supplementA as CompactPaper[]),
      ...(supplementB as CompactPaper[]),
      ...(supplementC as CompactPaper[]),
      ...((day26Archive as { papers: CompactPaper[] }).papers),
    ];
    const compactByArxiv = new Map(compactSources.map((paper) => [cleanArxiv(paper.arxiv), paper] as const));
    const deepByArxiv = new Map(recentDeepReads.map((paper) => [cleanArxiv(paper.arxiv), paper] as const));

    currentConversationDays.forEach((entry) => {
      const papers = entry.arxiv.map<RenderPaper>((arxiv) => {
        const deep = deepByArxiv.get(cleanArxiv(arxiv));
        if (deep && ["2608.12684", "2608.14953", "2608.18482"].includes(cleanArxiv(arxiv))) {
          const rendered = deepToRender(deep);
          const currentTracks: Record<string, [Track, Track?]> = {
            "2608.12684": ["Tile for DSA", "Agent 友好的 kernel DSL"],
            "2608.14953": ["Agent 友好的 kernel DSL", "Tile Fuzz"],
            "2608.18482": ["Tile for DSA", "Tile Fuzz"],
          };
          const [primary, secondary] = currentTracks[cleanArxiv(arxiv)];
          return { ...rendered, track: primary, secondary };
        }
        const compact = compactByArxiv.get(cleanArxiv(arxiv));
        if (compact) return { ...compact, kind: "compact" as const };
        return {
          kind: "compact" as const,
          id: `missing-${cleanArxiv(arxiv).replace(".", "-")}`,
          title: `arXiv ${arxiv}`,
          zhTitle: "正文仍待从当前会话记录恢复",
          arxiv: cleanArxiv(arxiv),
          track: "Agent 友好的 kernel DSL",
          conclusion: "论文日期和身份已经按当前会话恢复，正文暂不补造。",
          background: "当前可读取数据中缺少这篇论文的完整精读文本。",
          flow: ["保留正确日期。", "保留论文身份。", "等待恢复原精读。"],
          evidence: "未恢复。",
          limits: "这是资料状态。",
          relation: "保留在正确日期，避免与其他日期混排。",
        };
      });
      generated.set(entry.date, { date: entry.date, title: entry.title, signal: entry.signal, papers });
    });

    return [...historicalDays, ...Array.from(generated.values())].sort((a, b) => a.date.localeCompare(b.date));
  }, [historicalDays]);

  const weeks = useMemo(() => weekDefinitions.map((definition) => ({ definition, days: days.filter((day) => day.date >= definition.start && day.date <= definition.end) })), [days]);
  const allPapers = useMemo(() => days.flatMap((day) => day.papers), [days]);
  const normalized = query.trim().toLowerCase();
  const filteredWeeks = useMemo(() => weeks.map((week) => ({ ...week, days: week.days.map((day) => ({ ...day, papers: day.papers.filter((paper) => {
    const trackMatch = track === "全部" || paper.track === track || paper.secondary === track;
    const queryMatch = !normalized || `${day.date} ${day.title} ${day.signal} ${paperSearchText(paper)}`.toLowerCase().includes(normalized);
    return trackMatch && queryMatch;
  }) })).filter((day) => day.papers.length > 0 || (day.papers.length === 0 && track === "全部" && (!normalized || `${day.date} ${day.title} ${day.signal}`.toLowerCase().includes(normalized)))) })).filter((week) => week.days.length > 0), [weeks, track, normalized]);

  return (
    <div className="reading-site">
      <header className="masthead">
        <div><div className="eyebrow">Daily AI Compiler</div><h1>AI 编译器论文洞察</h1><p>从 2026 年 7 月 25 日起，按每日精读记录整理。每篇以核心机制和证据为主体，每周附研究关系总结。</p></div>
        <div className="masthead-meta"><span>2026-07-25—2026-08-26</span><span>{allPapers.length} 篇主线论文</span><span>{weekDefinitions.length} 份周总结</span></div>
      </header>

      <section className="overview-strip">
        <div><strong>每日阅读</strong><span>论文按实际阅读日期排列，不以 arXiv 提交日期重新分组。</span></div>
        <div><strong>核心讲解</strong><span>背景、旧方法、完整流程、实验与局限使用同一结构。</span></div>
        <div><strong>每周分析</strong><span>总结论文之间的延伸、互补、冲突和下一步研究问题。</span></div>
      </section>

      <div className="toolbar">
        <label><span>检索论文、术语或机制</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：layout、DMA、Oracle、动态 shape" /></label>
        <div className="track-filters">{(["全部", ...Object.keys(trackDescriptions)] as Array<"全部" | Track>).map((name) => <button key={name} className={track === name ? "active" : ""} onClick={() => setTrack(name)} type="button">{name}</button>)}</div>
      </div>

      <div className="reading-layout">
        <aside className="date-index">
          <h2>阅读索引</h2>
          {!historyLoaded ? <p className="index-loading">正在载入 7 月精读…</p> : null}
          {weeks.map(({ definition, days: weekDays }) => <div className="week-index" key={definition.id}><a className="week-index-title" href={`#summary-${definition.id}`}>{definition.id}<span>{definition.range}</span></a><nav>{weekDays.map((day) => <a href={`#day-${day.date}`} key={day.date}><time>{day.date.slice(5)}</time><span>{day.title}</span><em>{day.papers.length ? `${day.papers.length} 篇` : "无新增"}</em></a>)}</nav></div>)}
        </aside>

        <main className="reading-main">
          {filteredWeeks.map(({ definition, days: weekDays }) => <section className="week-block" key={definition.id}>{weekDays.map((day) => <section className="daily-reading" id={`day-${day.date}`} key={day.date}><header className="day-header"><div><time>{day.date}</time><h2>{day.title}</h2></div><span className="paper-count">{day.papers.length ? `${day.papers.length} 篇主线论文` : "没有新增主线论文"}</span></header><div className="daily-signal"><strong>今日研究信号</strong><p>{day.signal}</p></div>{day.papers.length ? day.papers.map((paper) => <PaperView key={`${day.date}-${paper.id}`} paper={paper} />) : <div className="empty-day"><p>当天没有为了补齐数量加入低相关内容。</p></div>}</section>)}<WeekSummary definition={definition} days={weeks.find((item) => item.definition.id === definition.id)?.days ?? weekDays} /></section>)}
          {filteredWeeks.length === 0 ? <div className="no-results">没有匹配内容。可以清空检索词或切换研究方向。</div> : null}
        </main>
      </div>

      <footer><p>Daily AI Compiler · 内容按每日精读记录组织 · 更新至 2026 年 8 月 26 日</p></footer>
    </div>
  );
}
