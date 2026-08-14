import history from "./history.json";
import { currentPapers } from "./current";

export const researchTracks = [
  "TileLang-TPU",
  "Tile for DSA",
  "TileFuzz",
  "Agent kernel DSL/AI 自动化系统",
  "LLM for unsafe Rust",
] as const;

export type ResearchTrack = (typeof researchTracks)[number];
export type ReadingDepth = "全文已恢复" | "摘要已核验" | "候选待核验";
export type IssueStatus = "完整已恢复" | "部分核验" | "待筛选" | "采集中";

type HistoricSeed = {
  id: string;
  title: string;
  chineseTitle: string;
  arxiv: string;
  source: string;
  readingDate: string;
  tracks: string[];
  archiveHref: string;
  index: number;
};

export type AtlasPaper = {
  id: string;
  readingDate: string;
  sourceDate: string;
  title: string;
  chineseTitle: string;
  arxiv: string;
  source: string;
  authors: string;
  tracks: ResearchTrack[];
  depth: ReadingDepth;
  admission: "纳入论文" | "邻近候选";
  oneLine: string;
  background: string;
  oldAssumption: string;
  mechanism: string[];
  example: string;
  evidence: string;
  limitation: string;
  projectLink: string;
  questions: string[];
  fullReadHref?: string;
  map: { x: number; y: number; layer: string };
};

export type DailyIssue = {
  date: string;
  status: IssueStatus;
  sourceCoverage: string;
  signal: string;
  comparison: string;
  paperIds: string[];
  screeningNote?: string;
};

export type PaperRelation = {
  from: string;
  to: string;
  type: "解决" | "扩展" | "补充" | "对比" | "提供基准" | "提供判断依据" | "暴露限制" | "支持任务";
  reason: string;
  evidence: string;
  confidence: "高" | "中" | "低";
  basis: "论文明确陈述" | "基于论文证据的推断";
};

const trackAliases: Record<string, ResearchTrack> = {
  "TileLang-TPU": "TileLang-TPU",
  "Tile for DSA": "Tile for DSA",
  "Tile Fuzz": "TileFuzz",
  "Agent kernel DSL": "Agent kernel DSL/AI 自动化系统",
  "LLM for unsafe Rust": "LLM for unsafe Rust",
};

const historicNotes: Record<
  string,
  Pick<AtlasPaper, "oneLine" | "background" | "oldAssumption" | "mechanism" | "example" | "projectLink" | "map">
> = {
  "resource-flow-tests": {
    oneLine: "先由资源流和并发关系定义可执行测试，再让模型补全 Rust 实现。",
    background: "这篇完整精读把测试场景看作并发资源关系，而非单个函数输入。",
    oldAssumption: "只要提示模型生成测试代码，就能覆盖真实并发语义。",
    mechanism: ["抽取资源与并发关系", "确定可执行测试场景", "让模型生成并核对 Rust 实现"],
    example: "完整案例与边界已保留在原每日精读正文。",
    projectLink: "为 TileFuzz 与 unsafe Rust 的场景生成提供“先语义、后代码”的入口。",
    map: { x: 16, y: 68, layer: "测试语义" },
  },
  "riscv-fp16-odt": {
    oneLine: "资源受限设备上的训练需要指令集、数值格式与编译路径一起设计。",
    background: "完整精读聚焦 RISC-V 单核设备如何承担完整 Float16 训练。",
    oldAssumption: "端侧训练只能依赖高端向量硬件或高精度软件回退。",
    mechanism: ["选择标准 Float16 扩展", "联动软硬件实现", "以端侧训练工作负载验证"],
    example: "正文保留了其资源约束与实现取舍。",
    projectLink: "为 Tile for DSA 的最小可用指令与数据类型接口提供参考。",
    map: { x: 76, y: 31, layer: "硬件协同" },
  },
  "harness-engineering": {
    oneLine: "GPU kernel 生成的关键不是多产候选，而是让独立 harness 决定候选能否晋升。",
    background: "完整精读把评测框架当作生成系统的外部合同。",
    oldAssumption: "单次正确性或微基准足以筛出可部署 kernel。",
    mechanism: ["独立构建测试 harness", "检查正确性、编译与完整工作负载", "基于结果决定候选晋升"],
    example: "正文含 benchmark 合同与失败候选的具体分析。",
    projectLink: "可直接作为 Agent kernel DSL 的 evaluator / oracle 设计参照。",
    map: { x: 31, y: 72, layer: "评测合同" },
  },
  dgna: {
    oneLine: "先以可移植微基准暴露隐藏 GPU NUMA，再用数据分析解释访问结构。",
    background: "完整精读关注公开规格之外的硬件拓扑事实如何被测得。",
    oldAssumption: "GPU 内部访存可被均匀模型充分描述。",
    mechanism: ["设计可移植微基准", "采集延迟与带宽响应", "统计恢复隐藏非一致结构"],
    example: "完整正文提供测量设计和结论边界。",
    projectLink: "为 TileLang-TPU 的性能模型增加“先测出硬件事实”的前置步骤。",
    map: { x: 70, y: 44, layer: "硬件事实" },
  },
  waveformqa: {
    oneLine: "波形推理基准检验模型能否理解时序、触发和跨信号关系。",
    background: "完整精读将视觉或文本模型的时序理解转为可检查题目。",
    oldAssumption: "语言模型的通用推理会自然覆盖硬件时序关系。",
    mechanism: ["构造多信号波形问题", "覆盖事件顺序与时延", "用答案检查时序推理"],
    example: "题型、术语与误判模式见完整正文。",
    projectLink: "可为硬件 Agent 的波形理解与验证反馈提供小型基准。",
    map: { x: 52, y: 25, layer: "时序验证" },
  },
  tilesight: {
    oneLine: "TileSight 把 tile 提升为连接 core 与 cluster 的统一性能分析单位。",
    background: "完整精读围绕 first-principles 性能模型如何跨硬件层次展开。",
    oldAssumption: "线程块或算子级模型已足够解释 tile 程序性能。",
    mechanism: ["以 tile 表示工作量", "跨 core 与 cluster 建模", "用模型解释性能瓶颈"],
    example: "建模变量、例子与实验限制已保留在正文。",
    projectLink: "是 TileLang-TPU / Tile for DSA 共同可复用的性能坐标。",
    map: { x: 59, y: 42, layer: "性能模型" },
  },
  "agentic-cpu-gpu-scheduling": {
    oneLine: "运行时调度应基于证据选择 GPU、排队或 CPU，而不是把 Agent 当作无约束路由器。",
    background: "完整精读考察异构 AI workload 的运行时决策。",
    oldAssumption: "有 GPU 时总应立即执行，或调度只看静态负载。",
    mechanism: ["收集运行时状态", "比较 GPU 排队与 CPU 执行", "由 Agent 输出可解释选择"],
    example: "完整正文保留调度条件和可能失效的边界。",
    projectLink: "为 DSA runtime 与 Agent 自动化系统的协同接口提供问题框架。",
    map: { x: 85, y: 58, layer: "运行时协同" },
  },
  kapilot: {
    oneLine: "从文档安全要求反推 Kani 规格，让验证入口可由模型辅助建立。",
    background: "完整精读关注 unsafe Rust 中规格缺失这一验证瓶颈。",
    oldAssumption: "验证只能由开发者手写前后置条件与循环不变量。",
    mechanism: ["读取文档安全要求", "生成候选规格", "交由 Kani 核验与修正"],
    example: "正文含规格形式和人工核验边界。",
    projectLink: "对应 LLM for unsafe Rust 的规格生成与证据追溯主线。",
    map: { x: 30, y: 19, layer: "规格验证" },
  },
  "compiler-grounded-diagnosis": {
    oneLine: "从运行时症状逐层回溯 IR 和后端，再生成有证据支持的 Triton 修改。",
    background: "完整精读将 kernel 优化 Agent 的诊断链落到编译器层。",
    oldAssumption: "性能问题可以仅从源码表面或模型直觉修复。",
    mechanism: ["观察运行时症状", "定位 IR / 后端证据", "提出受证据约束的源码改动"],
    example: "完整正文保留诊断层次与实际例子。",
    projectLink: "可衔接 Agent kernel DSL 的状态表示、记忆和工具调用。",
    map: { x: 47, y: 55, layer: "编译诊断" },
  },
  "decoding-skew": {
    oneLine: "MoE 解码的 kernel 选择要看专家负载分布，而不只看 token 总数。",
    background: "完整精读将分布偏斜变成 dispatch 的输入。",
    oldAssumption: "相同 token 数对应相近的 MoE kernel 性能。",
    mechanism: ["观测专家负载分布", "按分布选择融合 kernel", "在解码阶段验证分派收益"],
    example: "完整正文含分布差异怎样影响 dispatch 的例子。",
    projectLink: "为 TileLang-TPU 的动态形状与负载感知映射提供信号。",
    map: { x: 81, y: 68, layer: "动态调度" },
  },
  harnessllm: {
    oneLine: "从已有单元测试恢复真实调用场景，再生成 Rust 验证 harness。",
    background: "完整精读把现有测试视为规格线索，而不是生成模型的附属样本。",
    oldAssumption: "可直接从函数签名生成可信的验证入口。",
    mechanism: ["挖掘已有测试", "恢复调用与状态约束", "生成并验证 Kani harness"],
    example: "正文保存了已知用例与生成 harness 的连接方式。",
    projectLink: "与 TileFuzz 的真实场景恢复、unsafe Rust 验证相交。",
    map: { x: 23, y: 47, layer: "验证 harness" },
  },
  "frontend-bugs": {
    oneLine: "前端缺陷先按根因分类，才可能得到针对性的深度学习编译器测试。",
    background: "完整精读聚焦 TorchDynamo 前端 bug 的可操作分类。",
    oldAssumption: "只增加随机输入即可覆盖深度学习编译器前端问题。",
    mechanism: ["收集真实缺陷", "按根因归类", "从分类导出定向测试策略"],
    example: "真实 bug 与分类证据保留在完整正文。",
    projectLink: "为 TileFuzz 的 seed 设计和 oracle 分类提供直接问题列表。",
    map: { x: 19, y: 58, layer: "缺陷分类" },
  },
  dops: {
    oneLine: "算子放置与持久权重分块布局应联合决定，而不是拆成两个独立策略。",
    background: "完整精读从系统级优化讨论 device placement 和参数布局。",
    oldAssumption: "先做算子放置、再做权重布局不会损失主要收益。",
    mechanism: ["建模放置选择", "建模持久布局", "联合搜索并以端到端代价判断"],
    example: "完整正文保存系统假设与实验边界。",
    projectLink: "可拓展 Tile for DSA 的内存层次和运行时布局研究。",
    map: { x: 90, y: 46, layer: "系统布局" },
  },
  vclare: {
    oneLine: "在生成 Verilog 前先修复自然语言规格的歧义与缺失。",
    background: "完整精读把硬件 Agent 的失败前移到规格质量。",
    oldAssumption: "只要生成器足够强，模糊规格也能可靠变成 RTL。",
    mechanism: ["检查规格歧义和矛盾", "提出可追溯澄清", "再进入 Verilog 生成"],
    example: "原每日精读给出规格问题与修复流程。",
    projectLink: "为 Agent kernel DSL 的任务定义和安全边界提供前置检查。",
    map: { x: 38, y: 14, layer: "任务规格" },
  },
  specfirst: {
    oneLine: "让 Agent 先探测参考程序形成行为规格，再开始实现。",
    background: "完整精读强调从零实现之前应先固化可观察行为。",
    oldAssumption: "只看自然语言需求就能开始可靠的代码生成。",
    mechanism: ["探测参考程序", "形成固定行为规格", "以规格约束后续实现"],
    example: "正文保留了探测与实现的连续例子。",
    projectLink: "支持 Agent 自动化系统的可复验任务编排。",
    map: { x: 35, y: 34, layer: "行为规格" },
  },
  nelssa: {
    oneLine: "KV 状态应随上下文增长在 GPU 和近存设备之间迁移。",
    background: "完整精读讨论请求生命周期中的存储层级调整。",
    oldAssumption: "KV cache 必须固定留在单一高性能设备上。",
    mechanism: ["观察上下文长度", "选择 GPU 或近存设备", "在阈值处迁移 KV 状态"],
    example: "具体迁移条件与边界见完整正文。",
    projectLink: "为 DSA runtime 的状态迁移和成本模型提供案例。",
    map: { x: 91, y: 72, layer: "内存层级" },
  },
  bmoa: {
    oneLine: "浮点差异必须分开看比较基线、编译机制证据和实际数值后果。",
    background: "完整精读把数值误差分析从单一 pass/fail 拆成可追查链。",
    oldAssumption: "只要结果数值不同，就可直接判定为编译错误。",
    mechanism: ["固定比较基线", "定位编译机制", "评估真实数值影响"],
    example: "正文提供误差归因和实验边界。",
    projectLink: "可补强 TileFuzz 的数值 oracle 与差异报告。",
    map: { x: 14, y: 34, layer: "数值 oracle" },
  },
  ares: {
    oneLine: "低成本推理停滞后才升级深度推理，把 RTL 质量和模型成本一起优化。",
    background: "完整精读将推理预算纳入硬件优化 Agent 的控制环。",
    oldAssumption: "每一步都应使用同等昂贵的推理，才能取得最好优化。",
    mechanism: ["先低成本推理", "检测停滞", "选择性升级深度推理并复核 RTL"],
    example: "完整正文保留成本—质量权衡和评测证据。",
    projectLink: "为 Agent kernel DSL 的预算感知调度提供设计变量。",
    map: { x: 65, y: 77, layer: "Agent 预算" },
  },
  ventaglio: {
    oneLine: "元数据驱动的稀疏累加让 RISC-V 向量处理器接近中等稀疏计算的屋顶线。",
    background: "完整精读关注处理器如何表达并利用中等稀疏的元数据。",
    oldAssumption: "稀疏加速只能靠完全专用硬件或通用密集向量路径。",
    mechanism: ["增加元数据表达", "驱动稀疏累加", "以屋顶线对照评估"],
    example: "正文含数据格式和性能解释。",
    projectLink: "为 TileLang-TPU 的稀疏 tile 表示与 DSA 指令设计提供参照。",
    map: { x: 74, y: 17, layer: "稀疏指令" },
  },
  change2task: {
    oneLine: "把历史仓库变更恢复为可在现代健康版本上执行的 Agent 任务。",
    background: "完整精读把真实软件演化转成可复现实验任务。",
    oldAssumption: "历史 patch 可以直接作为今天的 Agent benchmark。",
    mechanism: ["恢复历史变更上下文", "迁移到健康版本", "构造可执行任务与验收条件"],
    example: "完整正文包含任务恢复和有效性边界。",
    projectLink: "为 TileFuzz / Agent kernel DSL 的真实任务集构建提供流程。",
    map: { x: 43, y: 85, layer: "真实任务" },
  },
};

const historicPapers: AtlasPaper[] = (history as HistoricSeed[]).map((seed) => {
  const note = historicNotes[seed.id];
  return {
    id: seed.id,
    readingDate: seed.readingDate,
    sourceDate: "论文版本日期见原文；阅读归属日不等同于 arXiv v1 日期。",
    title: seed.title,
    chineseTitle: seed.chineseTitle,
    arxiv: seed.arxiv,
    source: seed.source,
    authors: "作者与版本信息见完整精读及 arXiv 原文",
    tracks: seed.tracks.map((track) => trackAliases[track]) as ResearchTrack[],
    depth: "全文已恢复",
    admission: "纳入论文",
    ...note,
    evidence: "【完整精读已恢复】该条目的背景、机制、实验事实、局限与原文入口在同站全文中保留；此卡不以简略摘要替代它。",
    limitation: "【阅读边界】研究关联由原每日精读给出；回到全文核对具体实验条件与论文版本。",
    questions: ["它依赖哪些可观察证据？", "如果换成当前项目的输入、硬件或 oracle，哪一环会失效？"],
    // Relative links work both at the Sites root and on a GitHub Pages project
    // site, whose public URL has a repository path prefix.
    fullReadHref: seed.archiveHref.replace(/^\//, ""),
  };
});

const currentPaperOverrides: Record<string, Partial<AtlasPaper>> = {
  celty: {
    sourceDate: "2026-08-02 · arXiv v1（UTC）",
    depth: "摘要已核验",
    admission: "纳入论文",
    background: "双稀疏推理同时改变访问模式和执行路径，不能只把稠密 tile kernel 稀疏化。",
    example: "要核对的最小例子是：同一双稀疏形状下，数据格式和 SIMT 路径是否共同改变了瓶颈。",
    projectLink: "用于界定稀疏 Tile DSL 需要显式暴露的数据格式、映射与 fallback。",
    questions: ["Tile IR 需不需要表达双稀疏元数据？", "SIMT 路径选择可由什么 profiler 证据触发？"],
    map: { x: 72, y: 26, layer: "稀疏 kernel" },
  },
  "debug-near-miss": {
    sourceDate: "2026-08-03 · arXiv v1（UTC）",
    depth: "摘要已核验",
    admission: "纳入论文",
    background: "大量生成候选并非全错；近乎正确的硬件算子包含可用于修复的局部信号。",
    example: "最小对照是固定一个 near-miss kernel，比“从零重生成”与“诊断后修复”的成功率、时延和性能回归。",
    projectLink: "对应 Agent kernel DSL 的失败归因、状态记忆和 repair oracle。",
    questions: ["near-miss 的判定由哪些测试组成？", "repair 何时比再生成更值得？"],
    map: { x: 48, y: 62, layer: "Agent 修复" },
  },
  segabench: {
    sourceDate: "2026-08-04 · arXiv v1（UTC）",
    depth: "摘要已核验",
    admission: "纳入论文",
    background: "语义优化机会可能在传统分析之外，但候选必须被验证和性能协议筛选。",
    example: "最小例子是让模型提出一个语义事实，再分别检查条件成立、代码正确和性能收益。",
    projectLink: "连接 LLM for compilers、优化 oracle 与安全性能验证。",
    questions: ["语义条件用什么 IR / 运行时证据表达？", "验证通过但无性能收益时应如何归因？"],
    map: { x: 28, y: 62, layer: "语义优化" },
  },
  wavelet: {
    sourceDate: "2026-08-05 · arXiv v1（UTC）；论文亦标注为 PLDI 2026，不能把上 arXiv 写成首次发表。",
    depth: "摘要已核验",
    admission: "纳入论文",
    background: "异步数据流的流水、依赖与内存顺序组合难以仅靠经验调度和测试覆盖。",
    example: "关注一个 DMA—计算重叠小例子：哪条依赖能被放宽，且如何保留语义？",
    projectLink: "为 Tile for DSA 的异步 IR 合法性、DMA 流水和形式验证提供锚点。",
    questions: ["正确性证明覆盖哪个语义层？", "性能模型怎样与证明义务连接？"],
    map: { x: 61, y: 27, layer: "形式验证" },
  },
  wasmmend: {
    sourceDate: "2026-08-06 · arXiv v1（UTC）",
    depth: "摘要已核验",
    admission: "纳入论文",
    background: "差分执行的轨迹可将“哪里不一致”的证据变成 repair Agent 的输入。",
    example: "对同一输入保留两端执行轨迹，先定位分歧路径，再限制补丁搜索范围。",
    projectLink: "是 TileFuzz / Agent kernel DSL 的跨领域启发；迁移到 AI 编译器仍需新实验。",
    questions: ["目标编译器的差分轨迹在哪一层最有解释力？", "局部证据会不会遮蔽全局性能问题？"],
    map: { x: 40, y: 72, layer: "差分修复" },
  },
  "irregularity-costs": {
    sourceDate: "2026-08-08 · arXiv v1（UTC）",
    depth: "摘要已核验",
    admission: "纳入论文",
    background: "数据依赖、原子操作和不规则访问会同时打破 DSL 的表达、性能与正确性假设。",
    example: "同一 hash-blocked workload 下并列检查 CUDA、Rust、Triton 的可表达性与正确性 fallback。",
    projectLink: "帮助定义 Agent 友好 DSL 的 fallback、benchmark 覆盖和不可外推边界。",
    questions: ["哪些不规则特征应该成为 Tile IR 一等输入？", "何时自动降级到显式 CUDA 路径？"],
    map: { x: 45, y: 39, layer: "DSL 边界" },
  },
  swiftqk: {
    sourceDate: "2026-08-10 · arXiv v1（UTC）",
    depth: "摘要已核验",
    admission: "纳入论文",
    background: "通信、算子重写和 persistent kernel 的价值需要作为单一端到端问题评估。",
    example: "固定集群互连和模型形状，对照常规张量并行与通信—计算重叠路径。",
    projectLink: "扩展 kernel 优化到通信和运行时协同，适合 Tile for DSA 的系统边界研究。",
    questions: ["收益受互连与并行配置怎样影响？", "通信 oracle 是否能与 kernel profiler 共用？"],
    map: { x: 86, y: 66, layer: "通信协同" },
  },
};

const convertedCurrentPapers: AtlasPaper[] = currentPapers.map((paper) => {
  const override = currentPaperOverrides[paper.id] ?? {};
  return {
    id: paper.id,
    readingDate: paper.day,
    sourceDate: "arXiv 版本日期待标注",
    title: paper.title,
    chineseTitle: paper.chineseTitle,
    arxiv: paper.arxiv,
    source: paper.source,
    authors: paper.authors,
    tracks: paper.tracks.map((track) => trackAliases[track]) as ResearchTrack[],
    depth: "摘要已核验",
    admission: "纳入论文",
    oneLine: paper.oneLine,
    background: paper.why,
    oldAssumption: paper.oldAssumption,
    mechanism: paper.steps,
    example: "完整例子、实验条件与基线仍待全文精读后补入。",
    evidence: paper.evidence,
    limitation: paper.boundary,
    projectLink: "与当前五条研究主线的连接仍需由原文证据逐项核对。",
    questions: ["最关键的输入 / 输出条件是什么？", "哪一项实验最能否定这一机制？"],
    map: { ...paper.map, layer: "待细化" },
    ...override,
  };
});

const additionalPapers: AtlasPaper[] = [
  {
    id: "leap", readingDate: "2026-08-03", sourceDate: "2026-08-03 · arXiv v1（UTC）", arxiv: "2608.01804", source: "https://arxiv.org/abs/2608.01804",
    title: "LEAP: Lean Environment-Feedback via Adaptive Pruning for Code RL in GPU Kernel Generation", chineseTitle: "LEAP：用自适应剪枝和环境反馈进行 GPU kernel 代码强化学习", authors: "Tankun Li；Zhi Chen；Yaohua Tang",
    tracks: ["Agent kernel DSL/AI 自动化系统", "TileFuzz"], depth: "摘要已核验", admission: "纳入论文",
    oneLine: "GPU kernel 代码 RL 受稀疏奖励和编译延迟限制；LEAP 用难度条件剪枝与排序奖励压缩训练浪费。",
    background: "它把 kernel 生成的反馈回路显式当作学习效率瓶颈。", oldAssumption: "所有任务都应等价进入强化学习训练，并只用二元成功信号。",
    mechanism: ["按难度剪去过易或灾难性任务", "保留环境反馈", "用排序奖励指导多轮代码改进"],
    example: "关键核对点是：剪枝是否保留了真正能教会模型改错的 near-miss 任务。",
    evidence: "【论文明确陈述】arXiv 摘要说明其针对稀疏二元奖励与编译延迟，并报告更快收敛和调试韧性。",
    limitation: "【论文没有回答】摘要不足以说明任务分布、剪枝阈值和跨硬件泛化。",
    projectLink: "为 Agent kernel DSL 的 curriculum、反馈保存和成本预算提供变量。",
    questions: ["难度能否由编译诊断信号定义？", "剪枝是否损害长尾 kernel 的覆盖？"], map: { x: 58, y: 76, layer: "Agent 学习" },
  },
  {
    id: "comfuse", readingDate: "2026-08-04", sourceDate: "2026-08-04 · arXiv v1（UTC）", arxiv: "2608.03537", source: "https://arxiv.org/abs/2608.03537",
    title: "ComFuse: An Automated GPU Compiler for Fusing Complex Memory-Intensive and Compute-Intensive Kernels", chineseTitle: "ComFuse：自动融合内存密集与计算密集 GPU kernel 的编译器", authors: "论文作者见 arXiv 原文",
    tracks: ["TileLang-TPU", "Tile for DSA"], depth: "摘要已核验", admission: "纳入论文",
    oneLine: "复杂子图融合的机会来自下游内存操作与上游计算的可重叠性，而非只做相邻算子拼接。",
    background: "融合通常受复杂数据依赖和不同资源型 kernel 的协同限制。", oldAssumption: "融合收益只依赖静态相邻关系，或者复杂子图只能交给人工 kernel。",
    mechanism: ["识别可重叠的内存与计算阶段", "将子程序降为融合 kernel", "比较端到端执行代价"],
    example: "最小验证是固定 post-norm 等图结构，对照未融合与编译生成融合 kernel 的性能和资源占用。",
    evidence: "【论文明确陈述】arXiv 摘要说明该系统自动降低复杂子程序为融合 kernel，并与 TorchInductor 对照。",
    limitation: "【论文没有回答】摘要未给出各类图模式、编译时间和失败回退的完整分布。",
    projectLink: "为 TileLang-TPU 的融合合法性、代价模型和生成 kernel 评测提供案例。",
    questions: ["什么依赖条件允许重叠？", "融合 oracle 如何兼顾编译成本与性能？"], map: { x: 77, y: 47, layer: "融合编译" },
  },
  {
    id: "unseen-delta", readingDate: "2026-08-10", sourceDate: "2026-08-10 · arXiv v1（UTC）", arxiv: "2608.09530", source: "https://arxiv.org/abs/2608.09530",
    title: "The Unseen Delta: Top-Down Differential Analysis for Compiler Performance", chineseTitle: "The Unseen Delta：面向编译器性能的自顶向下差分分析", authors: "论文作者见 arXiv 原文",
    tracks: ["TileFuzz", "TileLang-TPU"], depth: "摘要已核验", admission: "纳入论文",
    oneLine: "性能差分不止告诉你“谁更快”，还用分层微架构指标定位差异并用二进制 patch 检验因果候选。",
    background: "编译器性能回归常被端到端数字掩盖，难以定位到可行动的代码形态。", oldAssumption: "只比较最终吞吐或汇编即可解释编译器性能差异。",
    mechanism: ["采样寻找关键片段", "按微架构指标自顶向下对比", "移植优良序列并验证性能贡献"],
    example: "最小实验：对两个编译输出识别关键 snippet，再用 patch transplant 检查性能是否随之移动。",
    evidence: "【论文明确陈述】arXiv 摘要介绍分层微架构差分、关键 snippet 采样和二进制 patching。",
    limitation: "【论文没有回答】它是否能覆盖数值正确性、动态形状和非确定性工作负载需全文核验。",
    projectLink: "直接补强 TileFuzz 的性能 oracle 和“差异—原因—验证”报告链。",
    questions: ["哪些硬件计数器最适合 Tile 程序？", "patch 成功是否足以说明真实因果？"], map: { x: 27, y: 46, layer: "性能 oracle" },
  },
  {
    id: "ppprobe", readingDate: "2026-08-11", sourceDate: "2026-08-11 · arXiv v1（UTC）", arxiv: "2608.10755", source: "https://arxiv.org/abs/2608.10755",
    title: "PPProbe: Conflict Extraction in Probabilistic Datalog Analyses", chineseTitle: "PPProbe：概率 Datalog 分析中的冲突抽取", authors: "论文作者见 arXiv 原文",
    tracks: ["TileFuzz"], depth: "候选待核验", admission: "邻近候选",
    oneLine: "这是静态 / 程序分析相邻候选；与主线的具体连接尚未完成全文核验。",
    background: "概率 Datalog 分析可能为测试与分析 oracle 提供邻近思路。", oldAssumption: "—",
    mechanism: ["待从原文核验", "待确认与编译器测试的直接关系"], example: "尚未建立可复查案例。",
    evidence: "【待核验】仅恢复到 arXiv 条目，不把关联性或机制写成既成事实。",
    limitation: "尚未完成筛选；可被排除，也可作为相邻分析方法保留。",
    projectLink: "候选：若能导出可执行冲突解释，可能补充 TileFuzz 的分析框架。",
    questions: ["它的冲突输出能否成为编译器测试信号？", "是否存在直接硬件 / kernel 例子？"], map: { x: 17, y: 41, layer: "待核验分析" },
  },
];

export const allPapers: AtlasPaper[] = [...historicPapers, ...convertedCurrentPapers, ...additionalPapers];

const days = (start: string, end: string) => {
  const value: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`);
  while (cursor <= stop) {
    value.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return value;
};

const issueNotes: Record<string, Omit<DailyIssue, "date" | "paperIds">> = {
  "2026-07-25": { status: "完整已恢复", sourceCoverage: "原每日论文集全文已恢复；当日 2 / 2 条目可回到完整精读。", signal: "测试语义与资源受限训练都提醒我们：接口约束先于代码或微优化。", comparison: "一个从并发资源关系构造测试，一个以指令集—训练协同处理硬件约束；共同点是先显化约束。" },
  "2026-07-26": { status: "完整已恢复", sourceCoverage: "原每日论文集全文已恢复；当日 1 / 1 条目可回到完整精读。", signal: "kernel Agent 的关键中间产物是可信 harness，而不是单次生成文本。", comparison: "当天仅一篇纳入论文；不能伪造同日横向结论。" },
  "2026-07-27": { status: "完整已恢复", sourceCoverage: "原每日论文集全文已恢复；当日 2 / 2 条目可回到完整精读。", signal: "硬件事实和模型时序理解都需要可重复的测量题目。", comparison: "DGNA 测量真实硬件结构；WaveformQA 测量模型对时序结构的理解。两者都把不可见状态变成可检查证据。" },
  "2026-07-28": { status: "完整已恢复", sourceCoverage: "原每日论文集全文已恢复；当日 3 / 3 条目可回到完整精读。", signal: "tile 模型、运行时调度和形式规格构成从硬件到 Agent 的三种“可解释接口”。", comparison: "TileSight 给出性能坐标，调度工作给出运行时选择，KaPilot 给出安全规格；三者的 oracle 不同。" },
  "2026-07-29": { status: "完整已恢复", sourceCoverage: "原每日论文集全文已恢复；当日 3 / 3 条目可回到完整精读。", signal: "诊断、负载分布和验证 harness 都把粗粒度结果拆成能行动的状态。", comparison: "三篇分别使用编译诊断、专家负载和已有测试作为判断依据；可比较其状态表示与反馈成本。" },
  "2026-07-30": { status: "完整已恢复", sourceCoverage: "原每日论文集全文已恢复；当日 3 / 3 条目可回到完整精读。", signal: "测试根因、系统布局和规格质量都表明：错误或收益需要追到发生层。", comparison: "前端 bug、设备—布局协同和规格澄清的输入输出不同，但都反对只看最终现象。" },
  "2026-07-31": { status: "完整已恢复", sourceCoverage: "原每日论文集全文已恢复；当日 4 / 4 条目可回到完整精读。", signal: "可靠 Agent 要把行为规格、内存迁移、数值 oracle 和推理预算一并显化。", comparison: "四篇共同关注决策何时升级、如何验证；最可区分它们的是 oracle 是否直接针对语义、数值、成本或状态迁移。" },
  "2026-08-01": { status: "完整已恢复", sourceCoverage: "原每日论文集全文已恢复；当日 2 / 2 条目可回到完整精读。", signal: "稀疏执行与真实任务恢复都要求保留结构化上下文，不能只保存最终产物。", comparison: "Ventaglio 保存稀疏元数据，Change2Task 保存历史变更上下文；二者都依赖可恢复的结构证据。" },
  "2026-08-02": { status: "部分核验", sourceCoverage: "已核验 1 条纳入论文；当日原始会话完整清单尚未恢复，不能称完整。", signal: "双稀疏把数据格式、kernel 和执行模型绑成同一设计问题。", comparison: "当天目前只有一条经核验纳入论文；不能伪造同日比较。", screeningNote: "待补：当天完整候选列表、排除理由和全文精读。" },
  "2026-08-03": { status: "部分核验", sourceCoverage: "已核验 2 条纳入论文；原始会话完整清单尚未恢复。", signal: "一个从 near-miss 修复，另一个从 RL 反馈与课程学习减少无效生成。", comparison: "两者都不把失败候选直接丢弃；Debug 的判断依据是诊断，LEAP 的判断依据是训练反馈与难度。", screeningNote: "待补：当天完整候选与全文精读。" },
  "2026-08-04": { status: "部分核验", sourceCoverage: "已核验 2 条纳入论文；原始会话完整清单尚未恢复。", signal: "语义机会与复杂融合都需要明确的合法性与收益协议。", comparison: "SeGaBench 由模型提出语义事实，ComFuse 由编译器发现重叠机会；二者都需要正确性和性能双重判断。", screeningNote: "待补：当天完整候选与全文精读。" },
  "2026-08-05": { status: "部分核验", sourceCoverage: "已核验 1 条纳入论文；原始会话完整清单尚未恢复。", signal: "异步流水优化不能把正确性留给经验调度。", comparison: "当天目前只有一条经核验纳入论文；不能伪造同日比较。", screeningNote: "Wavelet 的 arXiv v1 与 PLDI 2026 首发信息已分开显示。" },
  "2026-08-06": { status: "部分核验", sourceCoverage: "已核验 1 条纳入论文；原始会话完整清单尚未恢复。", signal: "差分轨迹可以先压缩问题，再调度修复 Agent。", comparison: "当天目前只有一条经核验纳入论文；不能伪造同日比较。", screeningNote: "WasmMend 是跨领域启发，不能直接写成 AI 编译器已验证结论。" },
  "2026-08-07": { status: "待筛选", sourceCoverage: "尚未恢复当天候选、纳入与排除清单。", signal: "没有可审计来源时，页面只保留采集状态。", comparison: "无可比较的已核验论文。", screeningNote: "待完成来源恢复与筛选；这不等于当天没有相关论文。" },
  "2026-08-08": { status: "部分核验", sourceCoverage: "已核验 1 条纳入论文；原始会话完整清单尚未恢复。", signal: "不规则 workload 是检验 DSL 表达、性能和正确性边界的压力测试。", comparison: "当天目前只有一条经核验纳入论文；不能伪造同日比较。", screeningNote: "待补：当天完整候选与全文精读。" },
  "2026-08-09": { status: "待筛选", sourceCoverage: "尚未恢复当天候选、纳入与排除清单。", signal: "来源不足时不以泛 Agent 论文填充日历。", comparison: "无可比较的已核验论文。", screeningNote: "待完成来源恢复与筛选；这不等于当天没有相关论文。" },
  "2026-08-10": { status: "部分核验", sourceCoverage: "已核验 2 条纳入论文；原始会话完整清单尚未恢复。", signal: "端到端性能既可能由通信—kernel 协同决定，也可能由编译输出的微架构差分决定。", comparison: "SwiftQK 优化通信与执行重叠；Unseen Delta 解释编译性能差异。最小区分实验是固定 workload 后分别改变互连与代码序列。", screeningNote: "待补：当天完整候选与全文精读。" },
  "2026-08-11": { status: "部分核验", sourceCoverage: "恢复到 1 条邻近候选；尚未完成纳入判断或当天完整清单。", signal: "静态分析候选可能补充测试 oracle，但其主线关联仍待原文核验。", comparison: "当天没有两篇已核验纳入论文可作横向判断。", screeningNote: "PPProbe 仅作为邻近候选展示，可能被后续排除。" },
  "2026-08-12": { status: "待筛选", sourceCoverage: "当天原始论文集尚未恢复。", signal: "不把旧的“归档中”状态当作已完成日报。", comparison: "无可比较的已核验论文。", screeningNote: "待恢复当天候选、筛选依据与纳入论文。" },
  "2026-08-13": { status: "采集中", sourceCoverage: "截至 2026-08-13 的当天原始论文集尚未完成原文核验。", signal: "日更任务的运行不等于网页已自动导入或发布。", comparison: "无可比较的已核验论文。", screeningNote: "当日状态为采集中；不声称已覆盖到最新。" },
  "2026-08-14": { status: "采集中", sourceCoverage: "截至 2026-08-14 的当天原始论文集尚未完成原文核验。", signal: "资料采集开始前，不把尚未核对的候选或旧日结论写成今天的论文集。", comparison: "无可比较的已核验论文。", screeningNote: "当日状态为采集中；不声称已覆盖到最新。" },
};

export const dailyIssues: DailyIssue[] = days("2026-07-25", "2026-08-14").map((date) => ({
  date,
  ...issueNotes[date],
  paperIds: allPapers.filter((paper) => paper.readingDate === date).map((paper) => paper.id),
}));

export const paperRelations: PaperRelation[] = [
  { from: "resource-flow-tests", to: "harnessllm", type: "补充", reason: "两者都把真实调用或资源语义转为可执行验证入口。", evidence: "原每日精读中的资源流测试与 HarnessLLM 调用场景恢复。", confidence: "中", basis: "基于论文证据的推断" },
  { from: "harness-engineering", to: "debug-near-miss", type: "提供判断依据", reason: "前者的独立 harness 可作为后者 near-miss 与 repair 是否晋升的外部合同。", evidence: "Harness Engineering 的评测框架；Debug 的诊断修复摘要。", confidence: "中", basis: "基于论文证据的推断" },
  { from: "tilesight", to: "comfuse", type: "提供判断依据", reason: "一个给出 tile 性能坐标，一个要决定复杂融合是否值得；可在同一性能模型下验证。", evidence: "TileSight 完整精读；ComFuse 摘要中的融合收益判断。", confidence: "中", basis: "基于论文证据的推断" },
  { from: "frontend-bugs", to: "unseen-delta", type: "补充", reason: "前者按根因组织正确性缺陷，后者按微架构指标组织性能差异；共同补齐编译器测试的双 oracle。", evidence: "Frontend Bugs 完整精读；Unseen Delta 摘要。", confidence: "中", basis: "基于论文证据的推断" },
  { from: "bmoa", to: "unseen-delta", type: "提供判断依据", reason: "数值差异与性能差异都需要从最终结果回溯到可检验的机制证据。", evidence: "BMOA 完整精读；Unseen Delta 摘要中的关键 snippet 与 patch。", confidence: "中", basis: "基于论文证据的推断" },
  { from: "compiler-grounded-diagnosis", to: "leap", type: "补充", reason: "一个用编译层证据诊断，另一个用环境反馈和难度组织学习；可形成带证据的 curriculum。", evidence: "Compiler-Grounded Diagnosis 完整精读；LEAP 摘要。", confidence: "低", basis: "基于论文证据的推断" },
  { from: "segabench", to: "wavelet", type: "对比", reason: "一个恢复优化语义机会，一个形式化异步数据流语义；二者的验证义务和可用范围不同。", evidence: "两篇 arXiv 摘要与站内摘要核验。", confidence: "中", basis: "基于论文证据的推断" },
  { from: "irregularity-costs", to: "celty", type: "暴露限制", reason: "前者的非规则 workload 可用于检验后者双稀疏协同设计的外推边界。", evidence: "两篇摘要对不规则性、稀疏性和 GPU kernel 的描述。", confidence: "低", basis: "基于论文证据的推断" },
];

export const weeklyBriefs = [
  {
    label: "W30 · 7 月 25–26 日",
    dates: ["2026-07-25", "2026-07-26"],
    evolution: "从资源语义、端侧约束到 GPU kernel harness，主题先建立“什么算可执行、可检验”的合同。",
    contrast: "资源流测试关心场景构造；Harness Engineering 关心候选晋升。两者共同反对只相信生成结果。",
    mapAddition: "新增测试语义、硬件协同、评测合同三个可解释节点。",
    openQuestion: "如何让 kernel Agent 同时获得真实工作负载和足够小的诊断反馈？",
    nextTest: "固定一个 kernel 任务，分别以微基准和完整 harness 作为 oracle，比较错误筛除与性能回归。",
  },
  {
    label: "W31 · 7 月 27 日–8 月 2 日",
    dates: ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"],
    evolution: "硬件测量、tile 性能模型、诊断、数值 oracle、任务规格和稀疏元数据逐步连成“状态—证据—行动”链。",
    contrast: "TileSight 与 DGNA 偏性能事实；KaPilot、HarnessLLM 与 SpecFirst 偏规格事实；BMOA 偏数值事实。",
    mapAddition: "新增性能模型、规格验证、数值 oracle、真实任务和稀疏 kernel 节点。",
    openQuestion: "同一个 Tile IR 能否同时承载性能、数值和验证所需的证据？",
    nextTest: "为一个 tile kernel 记录 IR、profiler、数值对照和 harness 结果，检查是否足以复现一次诊断。",
  },
  {
    label: "W32 · 8 月 3–9 日",
    dates: ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"],
    evolution: "已核验条目转向 Agent 修复、RL 反馈、语义优化、融合与异步正确性；8 月 7、9 日仍是待筛选状态。",
    contrast: "Debug / LEAP 优化 Agent 反馈；SeGaBench / ComFuse 优化编译机会；Wavelet 固化正确性边界。",
    mapAddition: "新增 Agent 修复、Agent 学习、语义优化、融合编译和形式验证节点。",
    openQuestion: "能否把语义验证与形式证明转为 Agent 的低成本即时反馈？",
    nextTest: "固定一组 kernel，比较“只看测试反馈”与“附带语义 / 依赖证据”的修复成功率和成本。",
  },
  {
    label: "W33 · 8 月 10–14 日",
    dates: ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"],
    evolution: "已核验内容将通信协同与编译性能差分放入同一系统视角；后续几天尚未完成来源恢复。",
    contrast: "SwiftQK 修改通信与执行路径；Unseen Delta 修改对性能差异的解释路径。",
    mapAddition: "新增通信协同与性能 oracle 节点，并保留 PPProbe 为未纳入的邻近候选。",
    openQuestion: "性能 oracle 是否能同时解释 kernel、通信和编译输出序列？",
    nextTest: "在固定模型与互连上，联合记录通信 timeline、编译序列和硬件计数器，检查因果候选是否可复现。",
  },
] as const;

export const dataStatus = {
  auditedOn: "2026-08-13",
  verifiedThrough: "2026-08-11（仅部分论文集）",
  todayStatus: "2026-08-14 · 采集中，尚未完成原文核验",
  automationBoundary: "每日论文洞察任务可运行；本网站尚未接入自动导入与自动发布流程。",
};
