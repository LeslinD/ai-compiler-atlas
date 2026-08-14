import type { DeepRead } from "./deep-reads";

export const earlyDeepReads: DeepRead[] = [
  {
    id: "celty",
    date: "2026-08-02",
    title: "Celty: SpMspV GPU Kernel and SIMT Co-Design for Efficient Dual-Sparse LLM Inference",
    chineseTitle: "双稀疏 LLM 推理的 GPU 内核与 SIMT 协同设计",
    arxiv: "2608.01536",
    source: "https://arxiv.org/abs/2608.01536",
    authors: "Ruokai Yin、Priyadarshini Panda",
    version: "arXiv v1 · 2026-08-02",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "单用户自回归解码时，矩阵右侧只有一个激活向量，问题更像稀疏矩阵乘稀疏向量（spMspV），而不是批量推理常见的稀疏矩阵乘稠密矩阵。已有稀疏 kernel 多只利用权重稀疏，或为接近 99% 稀疏的图计算设计；中等稀疏度的 LLM 权重与运行时激活稀疏同时出现时，索引、访存和部分和累加都变成瓶颈。",
          "Celty 试图把“压缩后省下的数据量”变成真实解码时间：既改变稀疏格式和 kernel，又提出相应的 SIMT 微结构。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "Celty 使用 Run-Length Compressed CSC（RLC-CSC）。它把压缩权重列中的连续零信息编码为运行长度，使线程能向量化读取非零权重及其位置；若对应激活为零，整列权重无需读取。部分积写入共享内存，做 scatter 累加。它的关键不是单独跳过权重或激活，而是两种稀疏同时减少要取回的权重。",
          "仅靠软件仍有两个问题：RLC-CSC 的行索引重建最多占到执行时间的 40%，共享内存的 scatter 累加还有 bank conflict。Celty Sparse SIMT Core 因而把三阶段 RLC decoder 放入硬件，消掉软件索引重建；再复用本地寄存器文件做无冲突的部分和缓冲。数据从存储到执行一直使用同一 RLC-CSC 格式，不需要中途重排。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "在一个解码 token 上，某激活位置为零时，对应稀疏权重列整个跳过；非零位置则按 RLC 编码向量化取出。多个线程产生的部分积原本会散写到共享内存中的同一输出位置，造成冲突。软件 kernel 以共享内存协调，微结构版本则通过寄存器文件保存这些部分和，并由 RLC decoder 直接给出位置。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "软件 kernel 在单张 NVIDIA A5000（Ampere，24 GB）上评估，层形状来自 LLaMA-2-7B、LLaMA-2-13B 与 OPT-30B；基线为 Coruscant、Flash-LLM、DASP 和稠密 cuBLAS。50% 与 70% 双稀疏时，软件 Celty 相对 cuBLAS 的平均加速分别为 1.49× 与 2.19×，最高为 2.8×，相对 Flash-LLM 最高为 2.4×。",
          "端到端 LLaMA-2-13B 解码使用 161 个 prefill token：40% 双稀疏时为 1.97×，WikiText-2 perplexity 为 5.6，对应 FP16 稠密模型为 4.9；更高稀疏度时最高 2.63×，论文同时报告 perplexity 增大。Sparse SIMT Core 的 5.3× 是基于 A5000 上修改 kernel 的性能估计加 RTL 综合，不是实物新芯片的直接测量；其面积估计在各代 GPU 上最高约 0.009%。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "软件实测限于单张 A5000 与单用户解码，不能说明批量 prefill 或其他 GPU 的结果。",
          "双稀疏带来速度，也改变模型质量；论文展示的是速度—perplexity 取舍，不是无损压缩。",
          "Sparse SIMT Core 的性能来自修改后的 kernel 估计和 32nm RTL 综合后缩放，仍需要真实硬件验证。",
          "低稀疏、小层时，RLC 重建和共享内存开销会使软件 Celty 慢于稠密 cuBLAS。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "对 TileLang-TPU 或 Tile for DSA，关键启发是把双稀疏表示、tile 访问规则和累加位置一起作为编译对象。若 DSL 只表达规则 tile 而不表达压缩索引、scatter 累加和冲突模型，后端只能得到表面稀疏、没有真实加速。",
        ],
      },
    ],
  },
  {
    id: "debug-near-miss",
    date: "2026-08-03",
    title: "Don't Regenerate, Debug: A Domain-Specific Agent for Repairing Near-Miss Hardware Operators",
    chineseTitle: "不要重写：从近乎正确的硬件算子中诊断并修复",
    arxiv: "2608.02712",
    source: "https://arxiv.org/abs/2608.02712",
    authors: "Yansong Sun、Shenxiu Wu、Siyuan Chen、Runlin Hou、Junhao Qiu、Junming Cao、Shudi Shao、Zhichao Lu、Qingfu Zhang",
    version: "arXiv v1 · 2026-08-03",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "低层 kernel 的候选常常能编译、能运行，却在数值验证失败。传统生成管线会丢弃它、重新从零生成，但这个 near-miss 已经包含 API 调用、tiling、队列和大部分计算结构；从零搜索反而丢掉了最有价值的局部证据。",
          "论文以 Ascend NPU 的 AscendC 为例：语料少、内存与队列同步约束严格，模型即使在生成阶段通过，也可能因精度、边界或执行覆盖不足而失败。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "系统把证据生成和修复执行分开。确定性的 orchestration engine 依次执行 forensics（编译、运行、剖析）、diagnose-and-fix（调用 agent）和 validation（重新运行并认证）；是否接受候选由 engine 决定，agent 没有接受权。",
          "五个机制分别解决三类问题。知识库按失败类型和算子类别检索硬件调试模式；第一次修复失败后才打开多层 tensor 统计的诊断插桩。反作弊检查 Python wrapper 是否偷偷调用参考实现或绕过自定义 kernel；轻量测试通过后必须跑完整 shape/dtype/batch 矩阵。硬上限、最优 checkpoint 回滚和停滞检测限制无限循环。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "论文给出一个 AscendC cumsum：原候选用纯 FP32 累加，和 CANN 参考的逐步半精度舍入不一致。修复只是在每次累加后把 sum 转为 half 再写回 float。这个例子说明“更高精度”不必然匹配目标算子的语义；诊断需要知道哪一层的数值格式才是合同的一部分。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "实验冻结 NPUKernelBench 的 27 个 near-miss AscendC 算子，使用 Qwen3.8-Max-Preview；它们都通过 CANNBot 的生成流程、却未通过数值验证。Debug Pass@1 为 18/27（66.7%），三次重新生成的 Regenerate Pass@3 为 11/27（40.7%），单次平均为 25.9%；Debug 独自修复了 11 个三次重生成都无法解决的算子。",
          "按成功归一化，Debug 的 all-token 成本比三次重生成低 92.8%。与 CANNBot precision-debug 的同模型配对比较中，Debug 为 66.7%，CANNBot 为 44.4%。去掉知识库使 Pass@1 从 18/27 降到 13/27；去掉 anti-cheat 或 full-eval 时，流程自己接受的修复中分别有 12.5% 和 33.3% 不能被外部验证支持。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "只有 27 个 AscendC near-miss，不能直接推出 CUDA、Triton 或其他 NPU 的成功率。",
          "论文的自适应调度消融在这组任务上没有测到明显收益；硬上限是工程前提，不等于已证明最优。",
          "完整评测覆盖取决于 NPUKernelBench 提供的 case 集，覆盖缺口仍可能存在。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "这可以成为 Agent kernel DSL 与 TileFuzz 的评测骨架：保留接近正确的候选，失败时给出数值、资源或同步的定位证据；验收由独立 harness 做，并把 anti-cheat 与全覆盖测试放在同一条路径上。",
        ],
      },
    ],
  },
  {
    id: "leap",
    date: "2026-08-03",
    title: "LEAP: Lean Environment-Feedback via Adaptive Pruning for Code RL in GPU Kernel Generation",
    chineseTitle: "LEAP：用环境反馈和自适应剪枝训练 GPU kernel 生成",
    arxiv: "2608.01804",
    source: "https://arxiv.org/abs/2608.01804",
    authors: "Tankun Li、Zhi Chen、Yaohua Tang",
    version: "arXiv v1 · 2026-08-03",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "GPU kernel 的强化学习很依赖编译和硬件 sandbox。二元 pass/fail 奖励稀疏，多轮调试又把一次样本扩成长轨迹：简单任务本不需要多轮，极难任务的多轮大多浪费编译时间，真正有训练价值的是中间难度的任务。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "LEAP 先在一个 GRPO rollout group 中看初轮失败数。通过率很高的简单组不进入多轮调试；失败几乎全部的灾难性组也不进入；只有失败数落在阈值区间的组才扩展为多轮环境反馈。这样把编译和真实硬件探索留给有希望从失败中学到东西的任务。",
          "奖励不再手工规定“第二轮成功值多少”。同一组内按首轮成功、第二轮成功、直到失败排序，再做两两竞赛的相对优势：简单任务里第二轮成功比首轮慢，自动得到较低甚至负的相对奖励；困难任务里第二轮修复罕见，得到更强正信号。正优势在较晚轮次折扣回传，负优势对全轨迹施加惩罚。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "若一个八条 rollout 的题目已有大多数首轮通过，LEAP 不值得再为所有失败条目启动编译—反馈循环；若八条几乎都无法编译，继续尝试也难产生可靠梯度。只有首轮有少量成功、也有可恢复失败的组，会进入多轮调试。此时，一条第二轮修复的轨迹相对同组首轮成功和持续失败的数量自动决定它的奖励。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "CUDA 任务以 KernelBench 评估，基线为标准 GRPO、MURPHY 与 Dr.Kernel；训练在 8 张 B200，验证 sandbox 在两组各 8 张 A100。三轮累计准确率上，LEAP 为 80.8%，Dr.Kernel 为 80.4%，MURPHY 为 77.2%，标准基线为 75.2%；首轮总体准确率为 70%，高于 68.4%、67.6% 与 66%。",
          "平均一步训练时间约 700 秒，基线约 600 秒，MURPHY 与 Dr.Kernel 均约 950 秒；每个成功样本的平均 turn 为 1.77，对应 1.90、1.93、1.84。以首轮准确率到达同等水平计，论文报告 LEAP 约快 1.93×。在 KodCode 和 LiveCodeBench 上，LEAP 也报告最高或并列的总体结果。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "阈值决定哪些样本被视为值得多轮探索，迁移到不同模型、硬件成本或任务分布时需要重新校准。",
          "KernelBench 的三轮准确率提升不等同于真实框架中端到端 kernel 成功率。",
          "更快收敛依赖昂贵的 GPU sandbox；没有可复现实验环境时，方法的主要信号来源会变弱。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "Agent kernel DSL 的训练或搜索不必把每个候选都送进长回路。TileFuzz 可以先按失败类型和可恢复性分层，再把真实设备预算投给能产出定位信息的样本；但每个阈值要和实际编译时间、测试覆盖和模型代价一起记录。",
        ],
      },
    ],
  },
  {
    id: "segabench",
    date: "2026-08-04",
    title: "Can Large Language Models Recover Semantic Optimization Opportunities That Compilers Miss?",
    chineseTitle: "SeGaBench：让模型恢复编译器遗漏的语义优化机会",
    arxiv: "2608.03983",
    source: "https://arxiv.org/abs/2608.03983",
    authors: "Hailong Jiang、Feng Yu、Emran Hossain、Jianfeng Zhu、Mengfei Ren、Qiang Guan、Chunwei Xia",
    version: "arXiv v1 · 2026-08-04",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "优化编译器只能依据当前 IR 和静态分析能看见的事实。若真正的前提藏在跨文件 C/C++ 上下文、数据结构不变量或调用约定中，编译器会保守地错过优化。论文问的不是“模型会不会凭空写更快代码”，而是模型能否从异构上下文恢复这种缺失语义，并把它交给可验证的编译器工件。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "SeGaBench 把每个案例设计成一个被隐藏的 enabling semantic：例如低层假设、数据结构不变量或高层语义提升。模型要从给定上下文产生一个工件；独立的正确性和语义验证器检查它是否真的保留合同，性能协议再检查是否带来实际收益。",
          "这把三件容易混淆的事拆开：模型提出的语义是否正确、该语义能否合法地变成优化、优化是否跑得更快。模型只充当 speculative proposer，验收仍来自 case 自带的 oracle 和可复现实验。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "编译器看到一个指针或容器操作时，若不知道别名关系、范围不变量或值域，它必须保守。模型若从 surrounding C/C++ 代码恢复这个前提，可以生成带有合同的优化工件；验证器检查前提是否与 case 的隐藏语义一致，再检查转换后的程序是否仍正确。单纯给出一段“看起来合理”的解释不会通过。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "基准有 100 个合成案例和 20 个来源案例，后者来自 HPCG、LAMMPS、LULESH、miniFE、RAJAPerf、XSBench；每例有隐藏语义、oracle 工件、正确性/语义验证器和可复现性能协议。论文对五个 LLM、每例五次独立回答进行评估，并将性能同 -O3、LTO、PGO 下的最强原始结果比较。",
          "GPT-5.6 Sol 的语义恢复率为 95.0%，正确工件率 94.8%；单次端到端达到 1.05× 的比例为 83.3%，五次尝试成功率为 93.3%。来源案例的性能成功率从合成案例的 86.6% 降至 67.0%，说明现实代码更难；正确工件也常只弥合一部分 oracle 性能差距。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "范围限于 C/C++、三类语义、六个 HPC 项目和 Apple Clang 17/M4 环境。",
          "合成案例有明确隐藏语义与 oracle，真实工程中如何发现没有预先标注的前提仍是难点。",
          "性能成功以 1.05× 为门槛，且 oracle 是已验证的见证，不是全局最优上界。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileFuzz 与 Agent kernel DSL 可以把“模型提出的前提”作为独立对象保存：它来自哪些上下文、由什么验证器检查、性能测试在哪个 shape 上成立。这样不会把一段自然语言解释直接当作优化许可。",
        ],
      },
    ],
  },
  {
    id: "comfuse",
    date: "2026-08-04",
    title: "ComFuse: Fusing Complex Memory-Intensive Subgraphs with Compute-Intensive Kernels For Modern GPU Architectures",
    chineseTitle: "ComFuse：融合复杂内存密集子图与计算密集 kernel 的 GPU 编译器",
    arxiv: "2608.03537",
    source: "https://arxiv.org/abs/2608.03537",
    authors: "Di Mu、Tengyuan Jin、Zhenkun Wang、Jialin Yang、Yusen Li、Mian Huo、Shusong Guo、Gang Wang、Xiaoguang Liu",
    version: "arXiv v1 · 2026-08-04",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "现代图中，MatMul 等计算密集算子与 ElementWise、Reduction 等内存密集子图相邻。常规编译器各自优化后，在两者之间把中间张量写到全局内存、再读回来。这既丢掉了刚产生数据的片上局部性，也把可在 CUDA core 上执行的轻量后处理与 Tensor Core 主计算人为串行化。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "ComFuse 把 reduction 作为 stage 边界，把复杂 memory subgraph 拆成连续 DAG。stage 内，ElementWise 以 fragment 粒度流动；遇到 reduction，先在线程内聚合，再做 warp 寄存器 shuffle、warp-group 共享内存、CTA 间聚合的三级规约。CTA 数少时用 peer-to-peer DSMEM cross-broadcast，多时用 leader-follower，避免 DSMEM 拥堵。",
          "MatMul MainLoop 与 epilogue 采用 PingPong pipeline：一个 tile 还在 Tensor Core 计算时，另一 tile 的 memory-heavy 后处理在 CUDA core 上执行。对 B2BGEMM，第一层 MatMul 的后处理结果留在寄存器和 cluster 内片上通路，作为第二层 MatMul 输入，避免中间矩阵落到 GMEM。前端把高层 tensor subprogram 翻成 Fusion Spec IR，后端生成 CUTLASS 模板和参数组织。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "MatMul + LayerNorm 中，square 可以随着每个输出 tile 立即计算，但 mean 要等多个 tile 的数据。传统路径会把全部 MatMul 输出写回 GMEM，等 mean 后再读。ComFuse 只在同一非规约维度的一组 tile 内同步：局部片段先流动，规约结果在 cluster 中合并后广播，后续 stage 获得 mean，同时把仍需使用的中间值通过 bypass 送下去。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "Stage-Stream 评估包含 MatMul-BiasAdd-RMSNorm、MatMul-BiasAdd-LayerNorm-ReLU、MatMul-Scale-TanhSoftcap-Softmax。相对 TorchInductor，端到端最高 1.24×，三类平均分别为 1.08×、1.09×、1.07×；为了单独看后处理，论文定义 residual time = total − MatMul，工作量平衡时残余部分最高 9.93×。",
          "B2BGEMM 覆盖 Self-Attention、Target-Attention 与 DLRM Bottom MLP。Target-Attention 相对 TorchInductor 最高 1.97×，DLRM 最高 1.23×，多数组合接近或优于 TensorRT。Self-Attention 中 TorchInductor 匹配到 FlashAttention 后反而最好，ComFuse 的 MatMul/Softmax 工作不平衡使 pipeline 受限。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "小规模或小 batch 下，tile 太少，pipeline 无法进入稳态，协调开销会压过收益。",
          "依赖现代 NVIDIA 的 Thread Block Cluster 与 DSMEM；不能直接搬到缺少相应片上通信机制的目标。",
          "最适合的子图是计算与后处理能互相遮蔽；阶段极不平衡时，融合可能更慢。",
          "实现建立在 CUTLASS 上，前端支持的图语义和模板覆盖范围决定可融合的实际边界。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "Tile for DSA 的调度不应把“MatMul”与“后处理”作为永远分开的编译单元。可以先在 IR 中显式表示 stage 边界、片上数据寿命、规约范围与跨 tile 同步，再决定是否将融合降到具体 cluster 或片上互连。",
        ],
      },
    ],
  },
  {
    id: "wavelet",
    date: "2026-08-05",
    title: "Let It Flow: A Formally Verified Compilation Framework for Asynchronous Dataflow",
    chineseTitle: "Wavelet：形式验证的异步数据流编译框架",
    arxiv: "2608.05451",
    source: "https://arxiv.org/abs/2608.05451",
    authors: "Zhengyao Lin、Yi Cai、Milijana Surbatovich",
    version: "arXiv v1 · 2026-08-05",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "空间数据流硬件把程序编译成通过异步 channel 通信的分布式算子网络。它能让不同循环迭代流水，但一旦删掉了必要的内存依赖，就会产生数据竞争或死锁。目标是同时保持 determinacy：无论算子调度顺序如何，结果相同；并保留能安全删除的依赖。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "Wavelet 的前端是一种嵌入 Rust 的顺序 DSL。程序员为数组区域写 capability type：uniq 表示独占写，shrd 表示共享读；当可能冲突时插入 fence。类型系统利用精确的数组区间判断哪些访问可并行，哪些必须顺序。随后 elaboration 将抽象 fence 降成 affine 的 ghost permission token 和显式同步依赖。",
          "后端把带这些 token 的顺序语言编到数据流 calculus。control-flow conversion 将 branch、tail recursion 等变为 steer、carry 等数据流算子；linking 将单函数图组装为全程序。两条核心 pass 在 Lean 4 中验证 forward simulation 与 determinacy。最后的指令选择和优化仍未验证，但前面的图已证明无数据竞争、无死锁，并保持输入顺序程序的语义。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "循环把 A[i] 加一写入 B[i] 时，若 A 和 B 确实不别名，i+1 的 load 可与 i 的 add/store 流水；若它们可能别名，下一次 load 必须等前一次 store 的 Done 信号，否则不同调度会读到不同值。Wavelet 用 capability 和 fence 把这种“能否删回边”的判断写成类型与权限条件，而不是靠后端猜测。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "在 10 个 RipTide benchmark 上，Wavelet 图的几何平均执行时间为 RipTide 的 2.62×、图规模为 3.04×；和未做 streamification 的 RipTide 比，分别为 1.69×、2.26×。经未验证的 Lflow-to-CIRCT lowering 做 HLS，Wavelet 平均执行慢 1.2×，但 LUT / FF 分别为 CIRCT 的 0.69× / 0.67×。Lean 部分含 14,819 行证明。",
          "验证范围包括从 elaborated 程序到数据流图的 control-flow conversion 与 linking；前端类型/permission lowering 有 Rust translation validation。核心证据是两个形式性质：输出图能 forward-simulate 输入顺序程序，且在类型系统条件满足时是 confluent 并强归一化，因此终止程序的结果独立于异步调度。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "54 个优化图重写和到 CIRCT 的 lowering 没有形式化验证。",
          "静态 FIFO 拓扑限制每个函数最多一个非递归调用点，不支持相互递归。",
          "前端仍要求程序员表达 capability 与 fence；复杂别名、动态数据结构和控制流的可用性受语言限制。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "Tile for DSA 可以把 DMA—计算—写回的依赖写成可检查的权限与 token 流，再做 pipeline。对 TileLang-TPU，这提供了一条把“调度合法性”从经验测试前移到 IR/类型层的路径；性能优化仍应和正确性证明分开标记。",
        ],
      },
    ],
  },
  {
    id: "wasmmend",
    date: "2026-08-06",
    title: "Reasoning from Traces: Divergence-Guided Agentic Repair of WebAssembly Discrepancies",
    chineseTitle: "WasmMend：用差异执行轨迹引导 Agent 修复 WebAssembly 不一致",
    arxiv: "2608.05521",
    source: "https://arxiv.org/abs/2608.05521",
    authors: "Liyan Huang、Kaicheng Wang、Weihang Wang",
    version: "arXiv v1 · 2026-08-06",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "同一 C/C++ 源码交叉编译为 native 与 WebAssembly 后，可能因库实现差异或编译器 bug 得到不同运行结果。根因藏在平台运行时之下，源代码表面往往没有明显错误；直接让 LLM agent 从最终错误输出猜补丁，搜索空间很大。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "WasmMend 从失败位置和调用图找可达函数，用 AST/libclang 序列化涉及类型，并在函数入口/出口插入状态记录。它分别运行 GCC/Linux 的 native 版本与 Emscripten/Node 的 Wasm 版本，以函数 ID 和等价输入/输出状态匹配事件，而非死板按顺序匹配，从而容忍未指定求值顺序。",
          "首次不匹配处形成共享调用栈和嫌疑函数集合。ANALYZE agent 围绕状态、栈、源码和类型诊断，PATCH agent 写补丁；两端重建后只有分歧消失且 native 语义保留时才接受。这样将无向的仓库探索变成“先定位最初分歧，再局部修复”。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "论文中的一个问题是零长度文件：GCC/Linux 一侧能完成 mmap，而 Emscripten/Node 的胶水代码会因长度处理异常崩溃。差异轨迹将根因缩到这条路径，补丁在文件大小为零时跳过 mmap 并返回 NULL。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "在 WasmChecker 的 34 个差异案例上，默认 WasmMend 的平均修复率为 66.7%，直接 agent baseline 为 50.2%，修复阶段加入 LLM instrumentation 为 54.5%；成功修复平均成本为 0.41 美元。论文摘要中的 70.0% 对应采用 Gemini 辅助轨迹的 WasmMendG 变体，不应写成默认结果。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "只支持经 Emscripten 编译的 C/C++；不覆盖 Rust、Go 等语言或其他 Wasm 工具链。",
          "假设差异已经被测试发现，不处理上游测试或输入生成；样本为 34 例。",
          "轨迹能定位最先可见的分歧，仍可能需要人工区分真正根因与较早暴露的后果。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileFuzz 可将同一 kernel 的参考实现、不同编译器或不同后端运行轨迹对齐，先找最早分歧的 IR 阶段、内存事件或数值块，再启动修复 agent。这样能把“给 agent 一个失败样本”变成“给 agent 一个可解释的故障位置”。",
        ],
      },
    ],
  },
];
