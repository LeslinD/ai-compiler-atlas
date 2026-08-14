export type CurrentPaper = {
  id: string;
  day: string;
  title: string;
  chineseTitle: string;
  arxiv: string;
  source: string;
  authors: string;
  tracks: string[];
  decision: "重点精读" | "建议阅读";
  oneLine: string;
  why: string;
  oldAssumption: string;
  steps: string[];
  evidence: string;
  boundary: string;
  map: { x: number; y: number };
};

export const currentPapers: CurrentPaper[] = [
  {
    id: "celty", day: "2026-08-02", arxiv: "2608.01536", source: "https://arxiv.org/abs/2608.01536",
    title: "Celty: SpMspV GPU Kernel and SIMT Co-Design for Efficient Dual-Sparse LLM Inference",
    chineseTitle: "双稀疏 LLM 推理的 GPU 内核与 SIMT 协同设计", authors: "Ruokai Yin；Priyadarshini Panda",
    tracks: ["Tile for DSA", "TileLang-TPU"], decision: "建议阅读",
    oneLine: "双稀疏负载需要同时改变数据格式、内核路径和执行模型。",
    why: "它是密集 tiled kernel 如何失效的清晰反例，可用于界定稀疏 Tile DSL 需要暴露的约束。",
    oldAssumption: "密集 tile 的分块与映射可以直接复用于双稀疏推理。",
    steps: ["识别双稀疏的访问与计算形状", "协同选择内核和 SIMT 执行路径", "在推理场景中评价效率"],
    evidence: "【论文明确陈述】已核对官方 arXiv 元数据、作者与 v1 提交日期。",
    boundary: "【论文没有回答】当前站内只完成摘要级核验，不能外推具体性能数字。", map: { x: 71, y: 24 },
  },
  {
    id: "debug-near-miss", day: "2026-08-03", arxiv: "2608.02712", source: "https://arxiv.org/abs/2608.02712",
    title: "Don't Regenerate, Debug: A Domain-Specific Agent for Repairing Near-Miss Hardware Operators",
    chineseTitle: "不要重写，从近乎正确的硬件算子中诊断并修复", authors: "Yansong Sun 等",
    tracks: ["Agent kernel DSL", "Tile Fuzz"], decision: "重点精读",
    oneLine: "接近正确的候选不应被丢弃，诊断和修复可以成为新的搜索入口。",
    why: "直接关联 kernel agent 的失败归因、检索记忆和评测反馈。",
    oldAssumption: "生成失败的硬件算子应被丢弃并从零开始。",
    steps: ["保留接近正确的候选", "用领域诊断缩小故障位置", "结合检索与反馈做定向修复"],
    evidence: "【论文明确陈述】已核对官方 arXiv 条目；详细成功率与基线留待全文精读。",
    boundary: "【论文没有回答】摘要无法说明 near-miss 的定义和 repair oracle 是否充分。", map: { x: 52, y: 61 },
  },
  {
    id: "segabench", day: "2026-08-04", arxiv: "2608.03983", source: "https://arxiv.org/abs/2608.03983",
    title: "Can Large Language Models Recover Semantic Optimization Opportunities That Compilers Miss?",
    chineseTitle: "SeGaBench：让模型恢复编译器遗漏的语义优化机会", authors: "Hailong Jiang 等",
    tracks: ["Agent kernel DSL", "Tile Fuzz"], decision: "重点精读",
    oneLine: "模型可以提出隐藏的语义事实，但验证器和性能协议必须决定能否采用。",
    why: "把 LLM for Compilers、优化 oracle 与安全性能验证放到同一条判断线上。",
    oldAssumption: "编译器看不见的语义信息只能由人工编码。",
    steps: ["模型提出候选语义机会", "验证器检查可用条件", "性能协议确认优化是否真正成立"],
    evidence: "【论文明确陈述】官方来源已核验；当前仅呈现题目与摘要能直接支持的机制。",
    boundary: "【论文没有回答】未经全文精读前，不把语义恢复能力写成普适结论。", map: { x: 27, y: 62 },
  },
  {
    id: "wavelet", day: "2026-08-05", arxiv: "2608.05451", source: "https://arxiv.org/abs/2608.05451",
    title: "Let it Flow: A Formally Verified Compilation Framework for Asynchronous Dataflow",
    chineseTitle: "Wavelet：形式验证的异步数据流编译框架", authors: "Zhengyao Lin；Yi Cai；Milijana Surbatovich",
    tracks: ["Tile for DSA", "TileLang-TPU"], decision: "重点精读",
    oneLine: "异步数据流编译应把流水、内存顺序和正确性放进同一模型。",
    why: "为 DSA 的 DMA—计算流水、IR 合法性和形式验证提供了贴近的问题锚点。",
    oldAssumption: "异步流水可以只靠经验调度和测试保证正确。",
    steps: ["表达异步数据流依赖", "执行面向目标的编译转换", "用形式化方法验证行为保持"],
    evidence: "【论文明确陈述】官方 arXiv 条目和发布时间已核对。",
    boundary: "【论文没有回答】形式正确性不自动证明特定硬件上的最优性能。", map: { x: 61, y: 29 },
  },
  {
    id: "wasmmend", day: "2026-08-06", arxiv: "2608.05521", source: "https://arxiv.org/abs/2608.05521",
    title: "Reasoning from Traces: Divergence-Guided Agentic Repair of WebAssembly Discrepancies",
    chineseTitle: "用差异执行轨迹引导 Agent 修复 WebAssembly 不一致", authors: "Liyan Huang；Kaicheng Wang；Weihang Wang",
    tracks: ["Tile Fuzz", "Agent kernel DSL"], decision: "建议阅读",
    oneLine: "先用差异轨迹定位，再让 Agent 修复，能够压缩候选搜索空间。",
    why: "它是跨领域启发，但修复前先做差分归因的结构可迁移到编译器测试。",
    oldAssumption: "不一致修复可以直接从错误输出生成补丁。",
    steps: ["执行差分测试", "从分歧轨迹定位可疑路径", "把局部证据交给修复 Agent"],
    evidence: "【论文明确陈述】官方 arXiv 条目已核验。",
    boundary: "【基于论文证据的推断】从 WebAssembly 到 AI 编译器需要新的实验，不应直接等同。", map: { x: 40, y: 72 },
  },
  {
    id: "irregularity-costs", day: "2026-08-08", arxiv: "2608.08287", source: "https://arxiv.org/abs/2608.08287",
    title: "What Irregularity Costs: CUDA C++, Rust, and Triton on a Hash-Blocked GPU Workload",
    chineseTitle: "不规则负载下 CUDA、Rust 与 Triton 的表达和性能边界", authors: "Petr Korolev",
    tracks: ["TileLang-TPU", "Agent kernel DSL"], decision: "重点精读",
    oneLine: "不规则、数据依赖且带原子操作的 workload 会同时暴露 DSL 的表达、性能和正确性边界。",
    why: "它可以定义 Agent 友好 DSL 需要保留 fallback 与 benchmark 覆盖的场景。",
    oldAssumption: "规则 tile 成功的 DSL 也会自然适用于不规则 GPU 工作负载。",
    steps: ["构造 hash-blocked 不规则任务", "并列比较 CUDA、Rust 与 Triton", "观察表达、性能与正确性限制"],
    evidence: "【论文明确陈述】官方 arXiv 索引元数据已核验。",
    boundary: "【论文没有回答】单一 workload 不能代表所有不规则计算。", map: { x: 46, y: 38 },
  },
  {
    id: "swiftqk", day: "2026-08-10", arxiv: "2608.09160", source: "https://arxiv.org/abs/2608.09160",
    title: "SwiftQK: Fast and Communication-Efficient Tensor Parallelism for Query-Key Normalization",
    chineseTitle: "SwiftQK：面向 Query-Key 归一化的高效张量并行", authors: "Gyudong Kim；Wonjun Han；Young Geun Kim",
    tracks: ["Tile for DSA", "TileLang-TPU"], decision: "建议阅读",
    oneLine: "算子重写、通信缩减和 persistent kernel 需要被作为同一个优化问题处理。",
    why: "它展示 kernel 优化已经延伸到通信与运行时协同的边界。",
    oldAssumption: "Query-Key 归一化只能按常规张量并行方式通信。",
    steps: ["重写归一化以减少交换内容", "安排 persistent kernel 与规约", "利用 P2P 通信与计算重叠"],
    evidence: "【论文明确陈述】官方 arXiv HTML 元数据已核验。",
    boundary: "【论文没有回答】收益会受集群互连、模型形状和并行配置影响。", map: { x: 87, y: 65 },
  },
];

export const dailyStatus = [
  ["2026-08-02", "已完成", "Celty：稀疏格式、内核与执行模型必须协同设计。"],
  ["2026-08-03", "已完成", "Don't Regenerate, Debug：从近乎正确的候选开始修复。"],
  ["2026-08-04", "已完成", "SeGaBench：模型提出语义机会，验证器决定是否采用。"],
  ["2026-08-05", "已完成", "Wavelet：异步数据流需要形式化正确性边界。"],
  ["2026-08-06", "已完成", "WasmMend：用差异轨迹把修复限制在局部证据。"],
  ["2026-08-07", "留空", "没有通过 AI 编译器高相关性阈值的新增论文。"],
  ["2026-08-08", "已完成", "不规则 workload 暴露 DSL 的表达和正确性边界。"],
  ["2026-08-09", "留空", "不以泛 SWE Agent 论文替代核心主线。"],
  ["2026-08-10", "已完成", "SwiftQK：算子、通信与运行时重叠共同决定收益。"],
  ["2026-08-11", "留空", "可见新增工作与项目主线关联不足。"],
  ["2026-08-12", "归档中", "当天公开论文仍可能更新，等待来源稳定后再写入。"],
] as const;
