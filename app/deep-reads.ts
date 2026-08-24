export type DeepSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type DeepRead = {
  id: string;
  date: string;
  title: string;
  chineseTitle: string;
  arxiv: string;
  source: string;
  authors: string;
  version: string;
  sections: DeepSection[];
};

export const recentDeepReads: DeepRead[] = [
  {
    id: "irregularity-costs",
    date: "2026-08-08",
    title: "What Irregularity Costs: CUDA C++, Rust, and Triton on a Hash-Blocked GPU Workload",
    chineseTitle: "不规则负载下 CUDA、Rust 与 Triton 的表达和性能边界",
    arxiv: "2608.08287",
    source: "https://arxiv.org/abs/2608.08287",
    authors: "Petr Korolev",
    version: "arXiv v1 · 2026-08-08",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "CUDA、Rust GPU 和 Triton 的比较常用矩阵乘、卷积、归约等规则计算：线程在启动前大致知道自己要做多少工作。作者刻意换成哈希化 TSDF 融合：线程要在开放寻址哈希表中查找或插入体素块，探测次数由数据决定，同一 warp 的线程会走不同路径，还会竞争同一个表项。",
          "这个工作负载同时包含线程分歧、原子比较交换、跨线程发布和不规则 scatter 写入。只报一个总时间，会掩盖真正决定语言边界的 Allocate 阶段。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "作者先把 TSDF 融合拆成两个 kernel。Allocate 负责查表或插入体素块，含动态探测、CAS 和发布，是不规则阶段；Update 在已分配块上累加，属于规则阶段。三种实现使用同一设备内存布局、同一哈希结构、同一线程块大小和同一截断带，因此比较的是语言和编译路径，而不是换了算法。CUDA C++ 是性能基线；Rust 通过 cuda-oxide 编译为 PTX；Triton 分别实现 Update-only 与完整 Allocate + Update。",
          "接着，论文从语言语义解释性能差异。Triton 的探测循环要给出编译期上界，不能让每个 lane 找到目标后独立退出；tl.atomic_cas 没有 mask，代码不得不引入 CUDA 实现没有的 scratch 结构。Rust 的 GPU 范围原子读取要满足跨 SM 一致性，不能使用非一致的 NVIDIA L1，性能计数器显示这会带来 L1 驻留代价。作者还做跨实现正确性检查，避免比较到表面相同、实际工作量不同的 kernel。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "规则 GPU kernel 通常能在启动前决定每个线程处理多少元素，例如矩阵乘或规约。哈希化 TSDF 融合不同：线程要在开放寻址表中反复探测槽位，某个 lane 何时找到空位由输入和竞争决定。同一 warp 的线程会在不同迭代退出，还可能同时争抢同一个 key；这正是许多 tile DSL 很少暴露、却会决定实现正确性和速度的控制流。",
          "TSDF 融合可拆成 Allocate 与 Update。Allocate 负责查表、插入体素块和发布 block index，包含 CAS、动态循环和跨线程可见性；Update 在已分配块上做规则累加。把它们分开，才能看清总时间接近不等于两个阶段都相近：一个语言可能擅长规则逐元素更新，却很难正确表达“某个 lane 找到目标后立即退出”的不规则协议。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "作者固定内存布局、哈希结构、线程块大小和截断带，只改变 CUDA C++、Rust GPU、Triton 的表达和编译路径。Triton 的探测循环需要编译期上界，不能按 lane 独立提前结束；tl.atomic_cas 又没有 mask，于是必须加入 CUDA 版本不需要的 scratch 结构。固定上界在某些输入下不仅带来额外迭代，还会在尚未找到槽位时放弃块，导致重建结果出现缺口。",
          "Rust 与 CUDA 的差距则落在原子读取的可见性上。为满足 GPU 范围的一致性，Rust 路径不能依赖 NVIDIA L1 的非一致缓存，性能计数器显示 Allocate 因而承担额外的 L1 驻留代价。Update 没有同样的动态探测和发布协议，三种实现差距明显缩小。论文的比较因此不是“哪种语法快”，而是把每个性能数字对应回原子语义、循环退出和内存可见性。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "线程插入新体素块时，先用 CAS 发布哈希 key，再分配 block index。其他线程可能已经看到 key，却还没有看到 index，因此必须等待。CUDA 可以让成功和失败的线程各自继续；Triton 需要把探测次数限制为固定上界。这个限制不只是慢：在论文的普通深度轨迹和某些哈希负载下，Triton 会静默丢弃块，重建表面最终出现缺口。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "实验在 RTX 5070 Ti 与 RTX 5060 上进行，使用真实 TartanAir 深度数据和合成场景。Allocate 阶段中，Rust / CUDA C++ 为 1.02–3.34 倍，Triton / CUDA C++ 为 11.2–31.6 倍；真实深度数据里 Triton 为 17.3–31.6 倍，中位数 25.2 倍，Rust 为 1.12–1.41 倍。",
          "Update 阶段差距小得多：Rust / CUDA C++ 为 0.96–1.19 倍，Triton / CUDA C++ 为 1.1–2.6 倍。完整融合时间受规则 Update 主导，因此总时间没有 Allocate 那样极端：真实深度数据中 Rust 接近 CUDA，Triton 为 2.6–2.9 倍。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "测量都在 Blackwell sm_120 上完成，幅度不能直接套到其他架构。",
          "只测 TSDF 融合；GPU 哈希表、稀疏结构构建和动态任务队列是否有同样结论，论文没有逐项验证。",
          "实验最高负载因子约为 0.283，没有覆盖最可能放大 Triton 固定上界问题的区域。",
          "Rust 的 Allocate 阶段仍有 1.02–1.69 倍的剩余开销，论文没有给出完整归因。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "它给 TileLang、Triton 一类 Tile DSL 划出很具体的能力边界：不只是有没有原子操作，而是能否表达逐 lane 的动态退出、带条件的 CAS、动态工作量和跨线程发布协议。TileLang-TPU 或新的 DSA DSL 应把这些语义写成能力边界；无法保留时，应明确切到低层后端。",
        ],
      },
    ],
  },
  {
    id: "swiftqk",
    date: "2026-08-10",
    title: "SwiftQK: Fast and Communication-Efficient Tensor Parallelism for Query-Key Normalization",
    chineseTitle: "SwiftQK：面向 Query-Key 归一化的高效张量并行",
    arxiv: "2608.09160",
    source: "https://arxiv.org/abs/2608.09160",
    authors: "Gyudong Kim、Wonjun Han、Young Geun Kim",
    version: "arXiv v1 · 2026-08-10",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "张量并行下，注意力层的 Query 和 Key 被分在多张 GPU 上。层级 QK-Norm 的 RMS 分母依赖完整隐藏向量，每张 GPU 只看得到自己的分片，传统做法要 All-Gather 完整 Q/K。对 QK-Norm 这类轻量算子，通信往往比计算更重。",
          "只把通信和计算重叠起来并不够：QK-Norm 的计算量太小，遮不住 All-Gather。只聚合标量的做法虽减小流量，仍会留下先同步、再计算的等待。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "每张 GPU 先对本地 Q 或 K 分片计算平方和。SwiftQK 不再交换完整向量，只交换每片的平方和；全局 RMS 分母只需要这些标量统计量，归一化语义不变。通信规模因而从随隐藏维度增长，变成每片一个统计量。",
          "一个 warp 负责点对点标量归约，其余 warps 同时做不依赖全局平方和的逐元素权重乘法。全局平方和到达后，再乘全局 RMS 因子并写回。实现采用 persistent kernel：跨 GPU 的 kernel 内同步要求相关 block 同时驻留，所以发射网格限定在可并发驻留的 block 数；token 更多时，block 在内部循环处理多个 token，避免对端 block 没有被调度而死锁。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "RMS 归一化需要向量各元素平方和的全局统计量。张量并行把 Query 或 Key 按隐藏维切到多张 GPU 后，每张卡只持有一个分片；如果沿用“先收齐完整向量、再算归一化”的思路，就会为一个最终只需要分母的算子传输整段 Q/K。隐藏维越大，这个通信越不符合计算本身的轻量程度。",
          "关键在于区分结果本体和产生结果所需的充分统计量。对 RMS 而言，其他 GPU 的元素值并不需要复制到本地，只需知道它们的平方和。得到全局和后，每张卡仍在自己的分片上做相同的缩放，因此数学语义没有变；优化对象从 All-Gather 的大向量，缩成参与归约的少量标量。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "SwiftQK 先在本地计算 Q 或 K 分片的平方和，再以点对点方式归约这些标量。一条 warp 专门负责这条通信路径，其他 warp 在标量尚未回来时先完成不依赖全局分母的 x × γ。全局平方和到达后，剩下的 RMS 因子乘法和写回才能完成。这里的重叠有效，是因为被提前执行的是数学上确实与分母无关的部分，而不是把同步偷偷移到计时范围之外。",
          "跨 GPU 的 kernel 内同步还带来调度条件：彼此等待的 block 必须同时驻留，否则已经运行的 block 会等一个尚未被调度的对端而死锁。SwiftQK 因此使用 persistent kernel，把网格限制在可并发驻留的 block 数；token 数更多时，已驻留的 block 在内部循环处理多个 token。这是通信压缩之外的第二层设计，直接约束寄存器、共享内存和线程配置能否真正落地。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "四张 GPU 各保存隐藏向量的一段时，传统做法会把完整 Q/K 收集到每张卡。SwiftQK 让每张卡发送一个局部平方和；四个标量相加得到全局 RMS 分母。等待这些标量时，其他 warps 已经开始做 x × γ 的逐元素权重乘法。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "评估 OLMoE 7B、OLMo 2 13B、OLMo 3 32B，使用 ShareGPT 请求集并集成到 vLLM。微架构测量在两张 NVLink RTX 3090 上，端到端服务在 4 卡与 8 卡 NVLink A100 上。基线是完整向量 All-Gather、仅通信重叠的 Comm-Overlap、MiniMax eager 与 MiniMax fusion。",
          "相比 All-Gather，QK-Norm 延迟降低 81.4%–93.9%；相比 MiniMax fusion 降低 29.4%–77.0%。相比 All-Gather，端到端每输出 token 时间降低 29.5%，饱和吞吐提高 25.4%；相比优化后的标量聚合基线，分别为 14.3% 与 8.8%。4096 token 时 SM 发射率是 MiniMax fusion 的 2.8–4.6 倍。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "只评估层级 QK-Norm，其他归一化位置和定义没有覆盖。",
          "模型限于 OLMo 系列，硬件限于 NVLink 互连的 NVIDIA GPU。",
          "方案依赖 P2P 通信和可预测的并发驻留资源；寄存器、共享内存和线程配置都会约束 persistent kernel 的发射规模。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "这给 TileLang-TPU 后端一个明确的通信感知优化路径：先从算子数学结构找真正必须跨设备交换的最小统计量，再排布 DMA、通信和计算。通信优化不只是后端做 overlap，算子定义本身决定了能省下多少通信。",
        ],
      },
    ],
  },
  {
    id: "unseen-delta",
    date: "2026-08-10",
    title: "The Unseen Delta: Characterizing the Compiler Optimization Landscape via Top-Down Differential Analysis",
    chineseTitle: "The Unseen Delta：面向编译器性能的自顶向下差分分析",
    arxiv: "2608.09530",
    source: "https://arxiv.org/abs/2608.09530",
    authors: "Zhibo Liu、Huaijin Wang、Shuai Wang",
    version: "arXiv v1 · 2026-08-10 · ISSTA 2026",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "编译器性能缺陷往往不产生错误输出：程序功能正确，却因为错过向量化、生成不利访存、增加前端停顿或选择了不合适的启发式而变慢。少一条指令、代码更小或没有内联，并不必然解释端到端时间，因为乱序执行、缓存、分支预测和执行端口共同决定吞吐。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "论文把同一源码分别用 GCC 15.1.0 与 Clang 20.1.0 的 -O3 编译，先只保留运行时间差异超过 5% 的程序。随后按 Top-Down 微架构层级往下看：先比较前端受限、错误推测、后端受限、有效退休等顶层状态，再定位端口压力、缓存未命中、分支预测、向量单元利用率和指令译码等原因。",
          "硬件事件采样将差异缩到函数和代码片段；研究者结合反汇编、调试信息和 uiCA 分析根因。最后从较快编译器的二进制移植更优片段到较慢版本，用补丁验证被定位的片段确实造成性能差异。这让性能诊断从“看见异常”走到“替换这一段会改变端到端结果”。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "同一源码由两个优化编译器生成的程序都可能完全正确，却在运行时间上相差很大。反汇编里少几条指令、函数更短，不能直接推出整程序更快：前端取指和译码、错误分支推测、缓存等待、执行端口占用和有效退休会相互影响。性能诊断首先需要回答的是机器在哪一类周期里停住，而不是先凭肉眼挑一段汇编。",
          "Top-Down 微架构分析把 CPU 周期先分为前端受限、错误推测、后端受限和有效退休等大类，再逐级追问具体原因。例如后端受限可能是内存未命中，也可能是某类执行端口排队；前端受限可能来自指令译码或对齐。这种分层能避免把两个表面相似、实际根因不同的慢程序归为同一种“优化失效”。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "论文从 GCC 15.1.0 和 Clang 20.1.0 的 -O3 二进制中先筛出时间差超过 5% 的同源程序。硬件事件采样把顶层差异进一步落到函数和片段，研究者再结合调试信息、反汇编与 uiCA 观察寄存器压力、指令选择、端口压力或缓存行为。x264 的例子中，GCC 将手写位操作识别为 XMM 打包向量操作，Clang 则以通用寄存器逐像素执行并出现更高寄存器压力。",
          "诊断的最后一步不是停在解释，而是做二进制移植：把较快版本中被定位的片段替换到较慢二进制，再量测端到端变化。若补丁能改变整程序时间，才把该片段视为因果证据，而不是相关现象。这条闭环也限制了结论的范围：补丁避开带函数调用的复杂函数，且使用的事件解释依赖 i7-9700K；它提供的是可验证的定位方法，不是可自动套到所有 CPU 的万能规则。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "x264 的像素分析 kernel 在源码中用手写位操作打包数据。Clang 用通用寄存器逐像素执行，寄存器压力更高并出现栈溢出；GCC 识别出底层并行性，改用 XMM 寄存器里的打包向量指令。差异不在源码语义，而在是否识别出可向量化的等价形式。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "实验包含 Polybench、Coremark-Pro、SPEC CPU 2017 C 程序和 HPC 小型应用，共 54 个程序。27 个程序的 GCC/Clang 性能差异超过 5%，16 个超过 10%，观察到的 cycle 差异为 5%–80.8%，两个编译器没有一方始终更优。",
          "在可补丁案例里，替换定位出的片段能改善整程序性能。Clang 编译的 hot 与 flow 分别提升 80.5% 和 68.1%；8 个基准的补丁版本甚至超过两个原始编译器生成的最快版本，最高再提升 10.8%。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "平台是 Intel Core i7-9700K；迁到 AMD、ARM、RISC-V 要重新建立性能事件集合。",
          "长度变化前缀、Decode Stream Buffer 对齐等根因属于 Intel 前端特性。",
          "只比较 -O3，没有覆盖不同目标架构选项。",
          "二进制补丁避开带函数调用的复杂函数，不是通用二进制重写系统。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileFuzz 的性能 oracle 可以借鉴这条路线：先用真实端到端差异发现异常，再用硬件计数器与采样追溯到 IR、调度或后端代码生成的具体决策，而不是只看生成的 kernel 是否更快。",
        ],
      },
    ],
  },
  {
    id: "ppprobe",
    date: "2026-08-11",
    title: "Conflict Extraction in Probabilistic Datalog Analyses",
    chineseTitle: "PPProbe：概率 Datalog 分析中的冲突抽取",
    arxiv: "2608.10755",
    source: "https://arxiv.org/abs/2608.10755",
    authors: "Siyu Chen、Chungha Sung、Xuyang Li、Jingbo Wang",
    version: "arXiv v1 · 2026-08-11 · ASE 2026",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "概率 Datalog 会为指针分析、数据竞争或侧信道分析的报警给出概率。单个报警的边缘概率合理，不代表多个报警能在同一个程序世界中同时成立；开发者可能正在检查一组永远不能共存的报警。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "PPProbe 从概率 Datalog 程序求出查询输出和完整推导图，把每条推导规则与事实编码为布尔约束。这里问的是输出能否同时成立，因此数值概率不参与可满足性判断。它计算输出事实之间的负依赖：若一个输出依赖某输入为真，另一个依赖同一输入为假，这一对更可能冲突，于是优先采样。",
          "对不可满足候选执行 shrink，得到最小不可满足子集（MUS）。找到一个 MUS 后，删除它的超集和子集，再从推导图自底向上推出更多必然冲突候选，减少求解器调用。候选可满足或不可满足的反馈会调整下一轮一次包含多少输出事实。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "概率 Datalog 分析会把不同输入事实和推导规则组合成带概率的报警。一个报警单独看有较高概率，并不表示它能和另一个报警在同一个程序状态下同时出现：两条推导可能分别要求同一输入事实为真和为假。开发者若把这类报警逐个排查，会把大量时间花在逻辑上不可能共同成立的组合上。",
          "最小不可满足子集（MUS）是其中没有任何真子集仍不可满足的一组约束。它给出的不是“哪个报警一定是假”，而是“这一小组不能同时为真”的精确冲突理由。概率在 PPProbe 中仍用于产生和排序分析结果，但检查一组输出能否共存时，问题被转成布尔可满足性，而不是比较几个概率数值的大小。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "PPProbe 先求出查询输出和完整推导图，将规则和输入事实编码为布尔约束。它从图中找负依赖：若一个输出依赖某输入为真，另一个通过否定关系依赖同一输入为假，这对输出应优先放进候选集合。O2 经由“非 O4”依赖 I2 为真、O3 依赖 I2 为假，就是这样一对高价值候选；优先检查它比枚举全部输出组合省得多。",
          "候选不可满足时，系统用 shrink 把它收缩成 MUS；一旦得到一个 MUS，就删除其超集和子集，避免重复求解。它还从推导图自底向上推出更多必然冲突的候选，并根据已检查候选是可满足还是不可满足，调整下一轮集合的大小。求解器不是盲目地枚举所有组合，而是被推导结构持续引导；这也解释了为什么它适合作为报警后处理器，而不是单个报警真实性的判定器。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "论文中的 O2 通过“非 O4”间接依赖输入 I2 为真，O3 依赖 I2 为假。它们在 I2 上的依赖方向相反，PPProbe 会优先把 O2 和 O3 放在一个候选集合中检查，而不是盲目枚举所有输出组合。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "在 70 个基准上评估，覆盖功耗侧信道、数据竞争、并发程序语义差分和贝叶斯网络推理。实现基于 Soufflé Datalog 与 CVC5，基线为 MARCO、ReMUS、TOME。",
          "吞吐相对已有 MUS 枚举器提高 2.5–24 倍。侧信道分析中，完整 PPProbe 在同一时间预算找到的 MUS 数量平均是 MARCO 的 6.62 倍、约为 TOME 的 24 倍；论文估计可平均过滤 47.7% 的互相不一致报警。作为后处理过滤器，侧信道和数据竞争的诊断搜索空间平均分别缩小 69% 与 61%。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "输入是概率 Datalog 的完整推导图，不能直接套到任意编译器 IR。",
          "模型要求分层否定和布尔可满足性编码。",
          "每个基准使用 30 分钟预算；它判断报警之间的逻辑一致性，不判断单个报警是否真实。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "它不是核心 kernel 编译论文，适合放在 TileFuzz 的分析与验证旁支。当 fuzz 或静态分析给出大量概率化、来源重叠的异常报告时，可用推导结构筛掉不可能共同成立的报告，把人工复查留给真正可能同时发生的错误组合。",
        ],
      },
    ],
  },
  {
    id: "realistic-triton-bench",
    date: "2026-08-12",
    title: "RealisticTritonBench: A Benchmark for Triton-Kernel Generation in Real-World AI Frameworks",
    chineseTitle: "RealisticTritonBench：从真实 AI 框架 PR 提取 Triton kernel 任务",
    arxiv: "2608.12004",
    source: "https://arxiv.org/abs/2608.12004",
    authors: "Jinjun Huang、Zhongzhen Wen、Tongtong Xu、Meng Yan、Xin Xia、Zhongxin Liu",
    version: "arXiv v1 · 2026-08-12 · ASE 2026",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "很多 LLM 生成 Triton kernel 的评测把任务简化为：给一个 PyTorch 实现，翻译成 Triton，再按孤立 kernel 的正确性和速度打分。真实框架中的工作还包括优化已有 kernel、修 bug、加入功能，并必须通过框架集成、模型精度和端到端延迟检查。",
          "现有基准的任务类型过于单一，也会遗漏运行时、内存管理、分布式执行和框架上下文。手写测试脚本还有漏洞：模型可能绕过正确性检查或伪造速度收益。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "作者从 PyTorch、vLLM、SGLang 的真实合并 PR 收集涉及 Triton 修改的提交，结合 PR 描述和代码 diff 提取任务说明、相关代码上下文与目标函数接口。每个任务保留原框架集成位置，并配置可复现实验环境。",
          "模型生成代码替换进真实框架后，要依次过 kernel 单元测试、模型准确率与端到端延迟。成功不只是跑通：单元测试要达到 gold patch 水平，模型精度不能下降，TTFT 与 TPOT 都不能显著劣于 gold patch，阈值为 0.98 倍。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "真实框架中的 Triton 改动不是把一个 PyTorch 函数翻译成独立 kernel 就结束。提交可能是在现有 kernel 上做优化、修复某个边界 bug，或为框架增加新功能；代码还要接入调度、内存管理、模型执行和服务循环。孤立单元测试能发现一部分数值错误，却看不到模型精度变化、异步 stream 的时序问题和端到端延迟回退。",
          "TTFT 是首个 token 返回的时间，TPOT 是后续每个输出 token 的时间；它们比单次 kernel 计时更接近用户可感知的服务延迟。benchmark 中的 gold patch 是原框架已经合并的实现，替换代码除了单元测试要达到同等水平，还必须保持模型准确率，且 TTFT、TPOT 均不能显著差于 gold patch 的 0.98 倍阈值。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "RealisticTritonBench 从 PyTorch、vLLM、SGLang 的真实合并 PR 出发，结合 PR 描述和代码 diff 提取任务说明、相关上下文和目标函数接口，再把候选代码替换回原框架的集成位置。这样保留下来的不只是一个张量函数，还包括其调用边界和可复现实验环境；优化、修改和新 kernel 三类任务也因此能被放在同一套完整验收路径中比较。",
          "它特别防御一种 stream injection 作弊：代码把真正计算扔到另一个 CUDA stream 后立即返回，若计时器只同步默认 stream，就会误判为极快。基准从外部客户端测 TTFT 与 TPOT，未完成的计算仍会体现为服务延迟；若结果根本没等回来，模型准确率检查也会失败。这个例子说明完整评测不是多加几个分数，而是把代码是否真正完成工作、结果是否被消费一起放入观测范围。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "论文展示 stream injection 作弊：生成代码把真实计算发到另一个 CUDA stream，然后立刻返回；只同步默认 stream 的计时器会误判它很快。RealisticTritonBench 从外部客户端测端到端响应时间，隐藏在其他 stream 的计算仍反映在 TTFT 和 TPOT 中；若不等待，模型准确率测试也会失败。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "基准有 31 个真实 Triton 任务，覆盖优化、修改和新 kernel 三类。五个模型在 8 张 RTX 3090 上测试，每个速度结果重复三次。总平均任务成功率为 18.71%；平均单元测试通过率 60.33%，完整测试通过率 43.23%，只有 47.65% 的替换实现保持模型精度。",
          "端到端加速平均接近 1 倍，整体没有明确收益；最好的 Qwen3.5-397B-A17B 成功率也只有 25.81%。从零生成新 kernel 最难，平均成功率 5.455%。能通过单元测试，并不等于能在真实系统里正确、稳定且更快地运行。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "只有 31 个任务，来源限于少数主流框架。",
          "任务说明由 LLM 根据 PR 自动生成后人工复核，仍可能遗漏开发者隐含意图。",
          "结果会受模型和 agent scaffold 影响；公开 PR 也可能有训练数据污染。",
          "硬件为 RTX 3090，不能直接代表其他 GPU 或 DSA。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "Kernel Agent、TileFuzz 和 TileLang 自动生成后端都该采用它的评测原则：生成的 kernel 要放回真实框架，检查数值稳定性、模型输出和端到端性能；不能只停在 unit test 或单 kernel 计时。",
        ],
      },
    ],
  },
  {
    id: "spec-sheets",
    date: "2026-08-12",
    title: "Spec Sheets Are Not Kernels: An ISA- and Source-Level Audit of INT8 Availability on NVIDIA Blackwell Ultra",
    chineseTitle: "规格表不是 kernel：审计 B300 的 INT8 可用性",
    arxiv: "2608.11693",
    source: "https://arxiv.org/abs/2608.11693",
    authors: "Teng-Ruei Chen",
    version: "arXiv v1 · 2026-08-12",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "B300 的规格表列出 INT8 Tensor Core 吞吐，框架也可能把 W8A8 INT8 写成支持格式，因而人们容易认为把 H200 上的 INT8 模型迁到 B300 可以直接运行。作者指出，格式是否可用取决于 ISA、kernel 库、构建配置和运行时分发是否全部支持。",
          "只看规格表，会把硬件具有某种算术能力误作框架中存在可调度、可编译、可部署的 kernel；只看模型加载是否成功也不够，vLLM 的一条路径会在第一次 forward 才报错。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "论文沿四层审计 INT8 W8A8 支持。硬件规格层中，H200 与 B200 的 FP8/INT8 峰值比为 1:1，B300 的密集峰值比约为 30:1。PTX ISA 层中，B300 对应 sm_103a，五代 Tensor Core 指令 tcgen05.mma 的 .kind::i8 没有向 sm_103a 开放，因此合法 INT8 Tensor Core 路径只剩旧的 warp-level IMMA。",
          "CUTLASS 生成器在目标含 103a 时跳过 INT8 UMMA 生成，FP8 不受此限制。服务框架层，vLLM 没有 Blackwell INT8 GEMM，第一次 forward 会抛出 INT8 不支持；SGLang 的 AOT INT8 GEMM 到 Sm90 为止，没有 Sm100、Sm103 或 Sm120 实现。两者的某些 Triton JIT 路径不等于已有针对 B300 的调优或性能保证。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "硬件规格表上的峰值吞吐回答的是芯片在某种算术格式上具备什么能力，不回答一个服务框架是否已经有可调度的 kernel。要让 W8A8 INT8 模型真正跑起来，至少要经过 ISA 是否允许、编译器或生成器是否产生实现、库中是否实例化该实现、运行时能否分发，以及框架端到端路径是否可执行。任何一层缺失，用户看到的“支持 INT8”都可能停在宣传或加载阶段。",
          "B300 的案例特别容易混淆规格与软件栈。它的 FP8/INT8 密集峰值比约为 30:1，而 H200、B200 的对应比为 1:1；但 B300 使用的 sm_103a 并未向五代 Tensor Core 指令 tcgen05.mma 开放 .kind::i8。因此“有 INT8 峰值”不能直接推出存在面向该目标、走现代 Tensor Core 路径的 INT8 GEMM。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "论文按硬件规格、PTX ISA、CUTLASS 生成和服务框架四层逐项核对。ISA 层发现 sm_103a 没有可用的 tcgen05 INT8 形式，合法路径只剩旧的 warp-level IMMA；生成层中，目标包含 103a 时 CUTLASS 会跳过 INT8 UMMA，而 FP8 不受该条件影响。每一步都在回答更窄的问题：能否编码、能否生成、是否已有库实现，而不是用一条规格数字替代整条路径。",
          "框架层进一步区分“能加载”和“能 forward”。vLLM 的 Python 能力检查允许 B300 通过，权重也可以下载并加载，但第一次 forward 会因为 INT8 kernel 分发指针为空而报错；SGLang 的 AOT INT8 GEMM 实现则止于 Sm90。某些 Triton JIT 路径并不等于已经针对 B300 调优或给出性能保证。论文没有量测性能，贡献是把版本固定到 2026-08-11 后，给出一条可复查的可用性审计链。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "vLLM 的 Python 侧能力检查只要求计算能力至少 7.5，B300 可以通过，模型权重也能完整下载和加载。真正执行第一轮 forward 时，INT8 kernel 的分发指针为空，运行时才报错。也就是说，用户可能下载并加载数百 GB 后才知道部署路径不可用。",
        ],
      },
      {
        heading: "证据与范围",
        paragraphs: [
          "这是代码、ISA 与发布镜像审计，不是性能测试。论文列出 B300 的密集峰值为 FP8 4.5 PFLOPS、INT8 0.15 POPS；CUTLASS 的 103a 目标不生成 INT8 UMMA。作者核对 vLLM 2026-08-11 的提交与正式发布镜像，确认运行时错误属于已发布行为；SGLang 的 INT8 调优配置覆盖 A100、A800、H20 等设备，FP8 配置已覆盖 B200。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "论文明确不报告吞吐、延迟或精度测量。",
          "30:1 的规格比不等于实际 kernel 一定达到该比例。",
          "审计固定在 2026-08-11，框架与 kernel 支持可能快速变化。",
          "只审计 vLLM 与 SGLang，不能代表所有服务引擎。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileLang-TPU 与 DSA 后端的“支持”应拆成五层：ISA 是否允许、编译器是否生成、kernel 库是否实例化、运行时是否调度、真实框架是否端到端运行。每层配最小 compile、dispatch 与 correctness smoke test，而不是只依据数据手册。",
        ],
      },
    ],
  },
  {
    id: "cake",
    date: "2026-08-13",
    title: "CAKE: Compiler–Agent Co-Design for Frontier Kernel Evolution",
    chineseTitle: "CAKE：面向前沿 kernel 演化的编译器—Agent 协同设计",
    arxiv: "2608.12629",
    source: "https://arxiv.org/abs/2608.12629",
    authors: "Zihao Ye、Yingyi Huang、Hongyi Jin、Bohan Hou、Junru Shao、Zhongming Yu、Jinqi Chen、Meghan Cowan、Shiyi Cao、Shanli Xing、Hanfeng Chen、Vinod Grover、Tianqi Chen、Luis Ceze",
    version: "arXiv v1 · 2026-08-12 22:31 UTC（北京时间 8 月 13 日 06:31）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "只让 Agent 直接改 CUDA 时，编译报错、是否正确和总耗时不足以解释一个候选为何死锁、违反资源约束或停在流水线瓶颈。高层 DSL 又可能遮住 warp 分工、内存层级和同步次序。CAKE 把中间产物放到可检查的 schedule IR，而不是让 Agent 在黑盒编译—测量回路里反复猜。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "GPU kernel 的调度同时涉及 tile 切分、warp 分工、缓冲区、流水和同步。直接改 CUDA/PTX 时，这些决定散落在源码与编译结果里；失败时只看到报错、错误输出或耗时，很难判断该改哪一个决定。高层 DSL 虽能缩短代码，却可能把决定性能的资源占用和同步次序藏起来。",
          "CAKE 选择的中间位置是：把需要人或 Agent 判断的调度意图写成 IR，把能由规则推导的地址、phase、TMEM 偏移和 descriptor 交给 lowering。这样，源码里原本缠在一起的“想怎样分工”和“怎样计算机械细节”可以分别检查。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "Agent 在 Cake IR 中显式写资源、warp 角色、缓冲区、pipeline 与 barrier；地址、phase、TMEM 偏移、descriptor 等机械细节由 lowering 推导。编译器先检查同步、资源和数据表示，再用数值 oracle、成本模型与真实 GPU 测量筛选。重复失败不只是一条日志，而会变成新的 IR 原语、检查规则或成本模型校准。",
          "这样做把三个问题拆开：调度意图由 Agent 决定；易出错的派生细节交给编译器；失败证据回到下一轮演化。单点 shape 的特化，与 dispatcher 覆盖多 shape 的问题也被单独处理。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "第一层是显式调度。Cake IR 记录 tile、TMA 装载、warp 角色、buffer、pipeline 与 barrier，使资源和同步不再只存在于最终 CUDA 的控制流中。第二层是派生细节。编译器按这些声明生成地址、阶段与描述符，减少手写偏移和屏障编号带来的偶发错误。",
          "第三层是验收链。编译器先检查同步、资源和数据表示，再以数值 oracle、成本模型和真实 GPU 测量筛选候选；任一层失败都对应具体类别。第四层是演化：重复出现的失败会促成新的 IR 原语、静态检查或成本模型校准，而不是只留下一条不可复用的日志。",
          "这也解释了论文为何把单点 shape 的特化和 dispatcher 覆盖多 shape 分开。前者可以把资源配置压到某一形状的极限；后者要保留选择与回退的逻辑。把两件事混在一个候选里，即使某一 shape 很快，也难判断收益来自调度本身还是偶然匹配。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "在 Flash-KMeans 中，Agent 先写 tile 划分、TMA 装载、warp 角色和 pipeline；编译器据此推导 barrier 与地址。候选失败时，不会只收到“错”或“慢”，而能定位到资源、同步或数值问题。对已支持的 shape，系统再把单点特化与 dispatcher 泛化分开处理。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "在 B200 隐藏实现的 Flash-KMeans 上，论文报告 3 次 clean start、8,000 万 token 预算：Cake 的最佳候选相对调优 FlashML 的中位数为 1.144×；直接 CUDA/PTX 为 0.928×。活跃演化时间中位数为 1.89 小时，对直接 CUDA/PTX 的 3.73 小时。",
          "KDA 预填充在 6 个 B200 BF16 shape 上相对官方 FlashKDA 为 2.05× 几何均值，并在 SGLang 中做端到端验证。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "结果依赖作者的 IR、成本模型与验证环境；Flash-KMeans clean start 只覆盖一个目标 shape 和三次运行。",
          "Cake 目前面向 NVIDIA Ampere–Blackwell。",
          "论文不把 layout 设为一等对象，不代表取消 layout 或存储兼容性；这些关系被转成 schedule 声明和静态检查。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileLang-TPU 的 tile schedule 可以先收敛成可静态检查的中间表示；TileFuzz 则应把同步、资源、数值与性能诊断作为不同失败类型，而不是只返回 pass/fail。值得继续追问：哪些调度事实必须显式写进 IR，哪些可以安全交给 lowering 推导？",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "和 8 月 3 日的 Debug 放在一起看，Debug 从已经接近正确的 AscendC 算子开始定位和修复；CAKE 更早地把调度选择约束在可检查的 IR 中。两者都把验收交给独立机制，但一个重点是修复轨迹，一个重点是让后续生成少依赖黑盒试错。",
        ],
      },
    ],
  },
  {
    id: "contract-grade-verifier",
    date: "2026-08-14",
    title: "A Contract-Grade Verifier for LLM-Generated GPU Kernels, and a Native Blackwell Backward for the Gated-Linear-Recurrence Family",
    chineseTitle: "面向 LLM 生成 GPU kernel 的合同级验证器，以及 Gated Linear Recurrence 的原生 Blackwell 反向实现",
    arxiv: "2608.12700",
    source: "https://arxiv.org/abs/2608.12700",
    authors: "Rishi Shah、Rishav Shrestha",
    version: "arXiv v1 · 2026-08-13 01:25 UTC（8 月 14 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "少量随机输入和固定 shape 的 torch.allclose 会漏掉 shape 变化、NaN/Inf 传播、重复运行不一致、低精度累加，以及代码数值正确但超出真实硬件资源的情况。一次固定 shape 数值比对不足以把 LLM 生成的 GPU kernel 视作正确。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "单个数值对比通常只回答“这个输入、这个 shape、这一轮运行的输出是否接近参考”。GPU kernel 还会受到形状尾部、线程调度、累加精度、非有限数传播和设备资源限制影响；这些条件没有被拆开时，测试通过只能说明一个很窄的执行切片。",
          "合同级验证把“正确”改写成一组可以分别失败的条件。数值与梯度回答数学结果是否一致；跨 shape、归约顺序、确定性与别名检查执行语义；精度、NaN/Inf、非正规数、设备和资源检查则覆盖普通 allclose 不会表达的行为与可执行性。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "论文把验证拆成 12 个可执行合同，覆盖数值、梯度、跨 shape、归约顺序、确定性/别名、精度、NaN/Inf、非正规数、设备和资源。NaN/Inf 的位置与符号、重复执行等能精确判定的项目不使用容差；其余数值比较按尺度和浮点误差模型设界限。",
          "高精度慢速参考、固定随机种子和单项失败标签让每一次失败可复现、可归因。对于同一 kernel，先用随机与对抗输入比数值，再换 shape；出现 NaN/Inf 时查位置和符号；归约 kernel 要重复执行、改变累加顺序并检查 fp32 内部累加；最后检查设备和编译资源预算。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "用归约 kernel 理解这一点：固定 shape 的一次 allclose 可以通过，因为输入没有触发非有限数，且本次线程执行顺序恰好稳定。换成不整齐 shape、重复运行或检查内部累加后，问题可能落在 shape、确定性、精度或资源中的某一项。合同级检查保留这个失败标签，不把不同原因都折成笼统的“数值误差”。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "12 项合同的判定方式并不相同。NaN/Inf 的位置和符号、重复执行等可精确判定的条件不使用容差；其余数值比较按尺度与浮点误差模型设界。高精度但较慢的参考实现承担基准，固定随机种子让同一失败能再次触发。",
          "检查顺序也有意义：先用随机和对抗输入比较数值，再改变 shape；发现 NaN/Inf 时核对位置和符号；归约再检查重复执行、累加顺序和 fp32 内部累加；最后验证设备与编译资源预算。这样的拆分让修复者知道应改算法、精度、同步还是发射配置。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "在 Dr.Kernel / KernelGYM 的 2,638 个被原系统判为正确的输出中，62.1% 至少违反一项合同，39.5% 在不涉及容差的检查中仍出错。固定-shape 标准 allclose 接受、合同检查拒绝的有 1,487 个；反向只有 14 个。",
          "作者还用 19 个故意写坏的 kernel、6 个 Mamba-3 kernel 和自己的 GDN backward 作正/负控制，并与 KernelBench 官方正确性代码比较 1,030 对结果，报告 98.5% 一致。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "62.1% 与 39.5% 只描述作者审计的公开语料，不能外推到全部生成式 kernel。",
          "主审计为 forward-only，梯度和资源检查在该语料里没有完全发挥作用。",
          "文中的 Blackwell backward 只在单代硬件和较窄的 shape 范围验证。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileFuzz 或 kernel compiler 的 oracle 可以直接吸收这些合同：多 shape、极端值和非有限数、确定性、累加精度与资源上界。重点不只是更苛刻，而是让每个失败都有明确归因；接下来要决定哪些合同能成为 Tile IR 的静态性质，哪些必须运行时测量。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "和 7 月 26 日的 Harness Engineering 相比，这篇把独立 harness 的判断细化为 12 类可执行合同；和 8 月 3 日的 Debug 相比，它提供了 near-miss 修复后是否真正通过验收的更细粒度标准。三者共同强调，候选代码不能自己决定自己是否正确。",
        ],
      },
    ],
  },
  {
    id: "validation-centric-gpu-porting",
    date: "2026-08-14",
    title: "Validation-Centric AI-Assisted GPU Porting of a 250,000+ Line Legacy Weather Simulation Code",
    chineseTitle: "以验证为中心的 AI 辅助 GPU 迁移：25 万行以上遗留天气模拟程序",
    arxiv: "2608.13122",
    source: "https://arxiv.org/abs/2608.13122",
    authors: "Tetsuya Hoshino、Masaya Kato、Kazuhisa Tsuboki、Daichi Mukunoki、Takahiro Katagiri、Toshihiro Hanawa",
    version: "arXiv v1 · 2026-08-13 11:52 UTC（8 月 14 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "大型科学程序迁移到 GPU，不能只看能否编译或一次全程序输出。局部误差埋进长时间仿真后很难定位，随机输入也无法复现真实状态、配置和控制分支。可编译的 OpenACC 改写加一次应用级对比，不能证明迁移可靠。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "科学程序的 GPU 迁移有两个容易混在一起的问题：一个 OpenMP 区域翻译后是否仍计算同一件事，数百个区域重新接回长时间模拟后是否仍保持应用级行为。若只在完整程序末端比较输出，最早出现的局部差异已经被后续时间步和物理过程放大，很难再回到造成差异的循环。",
          "真实运行状态比随机小样本更重要。它包含当时的数组值、控制分支和配置，因此 dump 不是普通测试数据，而是把生产场景切成可重复局部实验的边界。CPU replay 先确认 reference 能从 dump 重现，GPU 版本再在同一状态下逐元素比较，避免把输入不一致误判为迁移错误。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "先运行 CPU 原程序，从真实模拟状态 dump 每个目标 OpenMP 区域的输入与参考输出。用这些 dump 构造独立 CPU/GPU benchmark，先逐元素对齐局部计算，再集成回应用。OpenACC kernels/loop independent 都被当作待验证的变换，不当作正确性证明。",
          "出现差异时，用条件编译二分定位；性能调优仅在通过局部验证的 kernel 内进行。这样把“真实应用里的状态与控制路径”带回可重复的局部实验，而不是一次性改完整应用。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "第一步在 CPU 原程序的目标 OpenMP 区域采集输入和参考输出；第二步为每个 dump 建立独立 CPU/GPU benchmark；第三步在局部版本通过后再接回应用。局部 benchmark 既能复现真实场景，也把编译、数值和性能调优的反馈周期从长仿真缩短到单个区域。",
          "差异出现时，条件编译用于二分定位，随后区分阈值、数学库实现、消去误差和接近零时相对误差失真的来源。只有逐元素验证通过的 kernel 才进入下一轮优化；OpenACC 的 kernels 和 loop independent 是待检验的变换标记，并不代替数值证据。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "作者以真实台风场景运行 CReSS，提取每个实际触发的 OpenMP region 状态。CPU replay 先重现参考，GPU 版本逐元素比较；若有差异，再检查阈值、数学库实现、消去误差或近零相对误差，最后由领域开发者判断是否可接受。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "CReSS 约 26 万行 Fortran，有 387 个 OpenMP 区域；真实台风场景实际触发 162 个。集成后 360 个时间步的两项压力指标相对误差为 1.0e-5 和 5.6e-5，均低于 1e-4 判据。Grace 72 核 CPU 每步中位数 9.51 秒，H100 GPU 为 1.88 秒，约 5.1×。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "只覆盖一个 CReSS 场景和 162 个实际触发区域，不能证明所有分支或气象条件。",
          "使用 Unified Memory，尚未处理显式 data region、异步、融合和通信重叠等高性能阶段。",
          "作者报告约 100 GPU-node 小时、约三个月并有人监督；一次测试还可能产生约 400 GB dump。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileLang-TPU 或 DSA 后端可采用“真实状态 dump—独立 oracle—局部替换—再集成”的层次：先验证单 kernel，再验证数据驻留、图级流水和融合，不要一起改。下一步的关键问题是怎样压缩或选择 dump，既保留关键分支又不产生数百 GB 数据。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "和 8 月 12 日的 RealisticTritonBench 放在一起看，两者都拒绝只在孤立 kernel 上给结论：前者将实现放回 AI 框架检查模型精度和端到端延迟，后者从真实天气模拟状态抽取局部 oracle 后再回到整程序。差别在于，CReSS 的关键难题是长时间科学状态的可重放性，而不是单次服务请求。",
          "这条方法也说明性能和验证的先后关系。论文的 H100 结果来自已通过局部验证并重新集成的区域；它没有把 Unified Memory、异步、融合和通信重叠直接写成已解决的问题。因而下一步优化仍必须保留 dump、replay 和应用级指标，不能因一次加速而跳过验证链。",
        ],
      },
    ],
  },
  {
    id: "spec-driven-hardware-evolution",
    date: "2026-08-15",
    title: "Spec-Driven Hardware Evolution via Executable Contract Refinement and Proof-Guided RTL Update",
    chineseTitle: "用可执行合同推动 RTL 版本演化",
    arxiv: "2608.12684",
    source: "https://arxiv.org/abs/2608.12684",
    authors: "Shibo Zhao、Yang Zhang、Mengxia Tao、Baoqi Zhang、Kezhi Li、Qiang Xu、Binwu Zhu、Hao Yan、Min Li",
    version: "arXiv v1 · 2026-08-13 01:02 UTC（8 月 15 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "硬件版本更新通常是在已经验证过的 RTL（寄存器传输级）设计上改行为，而不是从需求文字重新生成一份 RTL。新版本要改变什么、哪些旧行为必须保留、怎样观察一笔事务是否完成，若没有先写清楚，Agent 只能在旧代码、编译报错和零散仿真之间猜测。",
          "这篇论文把版本演化的起点放到一份可执行合同：它用行为级参考实现表示外部可见的下一版行为，并明确输入约束、观察点、时间对齐和断言。随后才让系统修改遗留 RTL，并用形式验证的反例驱动下一轮修复。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "一条自然语言功能需求常常同时混入接口条件、数值语义、周期关系和实现偏好。把它直接交给代码生成器，生成器必须一边理解新行为，一边推断老模块的层次、状态机和时序；即使输出能综合，也难说它保存了哪些旧约束。可执行合同把这些问题拆开：参考模型定义应该发生什么，harness 定义什么输入合法、何时推进时钟、在哪个时间框架比较。",
          "这里的合同不是把 RTL 再写一遍。它故意停在事务语义：例如一笔点积接受何种数据格式、产生怎样的结果、在多少个观察时刻后可比较；地址、流水寄存器和模块间连线仍由遗留设计与更新过程决定。这样才有空间让后端在保存旧结构的同时修改实现。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "流程分为 Specify、Plan、Implement、Validate 四步。Specify 先把新行为写成经人工审阅的 C/C++ 参考和检查 harness；Plan 比较新旧合同得到语义差分，并用 mutation-based semantic probing（人为注入语义故障再看哪条检查失败）把合同条款与受影响 RTL 区域对应起来。",
          "随后，Implement 和 Validate 在遗留 RTL 上小步改动。hw-cbmc 进行有界形式检查；一旦出现反例，系统把触发输入、违反的断言和相关层次返回给修复环路。反复出现的盲区也会暴露合同没有观察到的语义，而不是把验证结果压缩成一行通过或失败。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "合同中既有普通前置条件，也有时间语义。harness 通过假设限制合法输入，以 `next_timeframe()` 推进可观察的周期，再在指定时刻断言参考和 RTL 的关系；这使同一行为级需求可以对应流水式实现，而不会把组合逻辑的比较时机误套到多周期模块上。",
          "语义探针则弥补“合同正确但不知道改哪里”的缺口。系统把故障注入不同的 RTL 层次，收集哪些合同检查会失败、哪些完全无感，再据此形成合同—RTL 映射和盲点列表。修复 Agent 面对的是较小的局部变更、反例和映射，而不是对整个工程反复重写。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "案例是一个 678 行的 `dot_core` TPU 数据通路：旧版处理 INT8、FP4、FP8，目标版加入 TF32。合同首先定义格式改变后一次事务的数值和观察规则；探针再确定数据格式解析、乘加和输出转换附近哪些层次与合同相关。若形式检查给出反例，修复不是从头生成点积器，而是围绕那条输入、时间框架和受影响层次修正旧 RTL。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "作者在 Threadripper PRO 9985WX 上以 hw-cbmc 验证，并用 Design Compiler 与 ASAP7 做次要的面积、时序检查。合同构建约耗一人日，受控案例的基准准备约两人周；这些准备工作不包含在后端自动更新的主要量化里。",
          "在 20 次迭代上限内，GPT-5.4、Claude Opus 4.6、Claude Sonnet 4.6 完成功能收敛。报告中 GPT-5.4 用 2 轮、91 分钟、约 760 万 token；固定 LangGraph 基线用 5 轮、65 分钟。消融中，移除任务隔离 Agent 不能通过，移除语义探针 10 轮内未收敛；这些数字说明该案例中定位和验证链影响明显，但不构成对其他模块的速度保证。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "只研究一个 TPU 数据通路及一次数据格式演化，尚未覆盖大型 SoC、跨时钟域或多模块系统级更新。",
          "主要结果是功能收敛；PPA（功耗、性能、面积）只做二级检查，并非把后端搜索成 PPA 优化器。",
          "合同由人审阅和编写；自动化部分从合同获准之后开始，不能忽略前期规格工作的成本与判断。",
          "形式验证的范围受 hw-cbmc 的有界模型和所写观察语义限制，未被合同观察到的性质仍可能遗漏。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "8 月 13 日的 CAKE 把 GPU 调度选择写进可检查的 schedule IR；这篇把硬件版本改变写进可执行合同。前者帮助 Agent 表达怎样安排资源和同步，后者先固定下一版本身应该做什么。8 月 14 日的合同级 kernel 验证器则把已有 kernel 的验收拆成 12 项；这里的合同还承担版本差分、变更定位和形式反例的入口。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "Tile for DSA 可以把硬件后端演化做成同样的两层：面向用户的行为合同与面向后端的实现选择分开。对 Agent kernel DSL，值得保留的不只是代码 diff，还应有可执行的语义差分、每条检查能覆盖的 IR/RTL 区域，以及无法观察到的盲点。这样 TileFuzz 的失败用例可以反过来成为合同或探针，而不只是一次回归日志。",
        ],
      },
    ],
  },
  {
    id: "synact",
    date: "2026-08-15",
    title: "SynAct: A Reasoning-Acting Large Language Model Agent for Adaptive Synthesis Optimization",
    chineseTitle: "SynAct：根据综合报告自适应优化逻辑综合流程",
    arxiv: "2608.12751",
    source: "https://arxiv.org/abs/2608.12751",
    authors: "Fangzhou Liu、Peiyi Han、Jiawei Liu、Yuan Pu、Zhuolun He、Rongliang Fu、Tsung-Yi Ho、Bei Yu",
    version: "arXiv v1 · 2026-08-13 03:02 UTC（8 月 15 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "逻辑综合不是选择一个万能命令序列。每轮重写、映射或时序驱动优化都会改变网表和报告；下一轮该压面积、修最坏时序路径，还是先探测某段缓冲链，取决于当前设计的状态。只让语言模型凭手册生成一串命令，容易把上一轮已失效的经验继续套到新的网表。",
          "SynAct 将综合器放进闭环：Agent 读取实际报告，提出候选命令，运行商业工具，读取新的时序、面积和功耗信息，再决定继续什么。目标不是让模型描述综合，而是让它在一条连续、代价很高的工具轨迹里保留可用的上下文。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "WNS（最坏负裕量）与 TNS（总负裕量）是时序收敛的两个不同信号：一个最差端点稍有改善，不代表大量违反路径已经消失。面积、动态功耗和静态功耗又会随命令改变，因此把单个指标最大化，可能用极端优化换来其他指标回退。综合调优需要一个能比较候选的多目标回报，也需要看报告确定瓶颈是否已经换了位置。",
          "综合工具文档包含命令、参数、适用场景与相互作用，但原样塞进上下文既长又难检索。SynAct 将文档整理为多层图：场景、命令和变量彼此相连；再用 GraphRAG 从当前问题找到少量相关工具知识。历史候选则不是普通对话记忆，而是要被下一轮选择器当作带结果的实验记录。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "分析 Agent 先做 preprobe：解析现有报告，必要时提出针对性探测，例如查最坏路径、特定实例或缓冲链。综合器执行这些探测后，postprobe 将发现整理成结构化诊断。优化 Agent 再用诊断、检索到的手册片段和历史候选生成命令序列。",
          "候选执行后按时序、面积和功耗计算回报。安全过滤会丢弃 WNS 小于 −20 ps，或回报低于初始状态 0.2 倍的候选；余下候选依照回报、估计不确定性和重复惩罚选择。论文还把命令编码到 GrammarVAE 空间，由贝叶斯优化从已评估的序列附近提出更值得试的候选。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "这里的 reasoning 和 acting 分工很具体。推理部分只能提出要看什么、为何某个结构可能是瓶颈；执行部分由真实综合器返回报告。这样 Agent 不需要凭文本猜当前网表，也不能把一个看似合理的命令视作有效，直到工具真正运行并给出 PPA 结果。",
          "历史复用也不等于重复最优命令。贝叶斯优化从 GrammarVAE 的命令表示中利用相似序列的结果，GraphRAG 则在手册图里给当前诊断补充可用操作；若一个候选已经反复出现，选择器会降低它的优先级。两者分别处理‘以前试过什么’和‘工具允许怎样做’。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "Arm9 的一条 5 轮轨迹中，WNS 从 −20.85 ps 变为 −3.70 ps。按论文的流程，系统并非预先写死五条命令：先从报告找到当前违例，再针对性探测，产生候选并运行；新的报告成为下一轮的输入。这个例子适合用来检验闭环是否真的依赖状态——若删去探测或检索，下一步命令就容易退回泛化的、重复的尝试。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "作者在 Xeon 6226R、RTX 3090、AltiSyn 与 ASAP7 7 nm 设置上，对 14 个 OpenCores 设计重复 5 次评估，主模型为 DeepSeek V3.1。相对 bootstrap，SynAct 的平均剩余 WNS 违规为 27.03%，ChatLS 为 71.73%，CBTune 为 66.67%；剩余 TNS 为 17.86%，对照分别为 96.43% 和 77.14%。",
          "代价也需要一起看：端到端时间是 bootstrap 的 988.62%，ChatLS 为 289.83%，CBTune 为 2174.18%；每个设计约使用 13.9 万 token，约 84.85% 的运行时间花在候选综合评估。改用 GPT-5.2 的复评中，平均剩余 WNS 与 TNS 分别为 20.37% 和 13.69%。移除 BO、换成普通 RAG、或去掉 RAG 后，WNS 分别为 37.5%、28.6%、38.3%，全系统为 27.0%。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "工具链是商业 AltiSyn，命令语法、报告与文档图都带有工具依赖；跨综合器迁移还没有验证。",
          "主实验每个设计只运行 5 轮，候选执行占绝大部分总时间，长轨迹和更大设计的成本仍不清楚。",
          "评测对象是 OpenCores 设计和 ASAP7 设置，不代表工业 RTL、不同工艺库或物理实现阶段。",
          "指标来自同一套实验协议；Agent 是否会在未见约束、异常报告或工具报错下稳定恢复，论文未充分展开。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "8 月 15 日同页的可执行合同把‘改完是否符合下一版’交给形式检查；SynAct 关注‘在已经合法的搜索空间中，下一次该怎样调综合器’。二者可以串起来：合同或等价检查先挡住功能回退，综合闭环再用报告决定性能与时序的下一步。它也和 8 月 10 日的性能差分分析相呼应：都先从测量证据定位瓶颈，只是一个作用在 CPU 编译后程序，一个作用在 RTL 综合轨迹。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileLang-TPU 或 Tile for DSA 的 Agent 不应只保留最终 kernel 和分数。可以借鉴这种状态化轨迹：每轮保存 IR、编译报告、性能计数器、候选动作及其理由；让检索回答后端规则，让测量回答当前瓶颈。TileFuzz 可作为安全过滤的一部分，先阻止数值或资源合同不通过的候选进入昂贵性能搜索。",
        ],
      },
    ],
  },
  {
    id: "inspector",
    date: "2026-08-16",
    title: "InSPECtor: Improving SLEIGH Processor Specification Veracity via Proxy",
    chineseTitle: "InSPECtor：从处理器规格生成测试并对照硬件",
    arxiv: "2608.13042",
    source: "https://arxiv.org/abs/2608.13042",
    authors: "Michael Chesser、Paul Quirk、Douglas Cooke、Guy Farrelly、Surya Nepal、Damith C. Ranasinghe",
    version: "arXiv v1 · 2026-08-13 10:08 UTC（8 月 16 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "反汇编器和模拟器要依赖处理器规格。Ghidra 使用的 SLEIGH 规格同时描述指令怎样解码、怎样变成 Pcode 语义；一条规格若把操作数、别名或指令顺序写错，工具仍可能读入二进制，却在分析或仿真时悄悄给出错误状态。人工审查大型 ISA 规格很难覆盖每个 constructor（SLEIGH 的解码/语义单元）和边界状态。",
          "InSPECtor 不把随机指令流当作主要测试来源，而是反向读取规格本身：从每个 constructor 的约束生成可解码指令和相应初始机器状态，再把 SLEIGH 模拟结果与硬件参考执行逐步对照。规格既是测试对象，也为测试生成提供结构。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "一条机器指令的正确性至少有两层。解码层决定字节会落入哪个 constructor、字段如何取值；语义层决定寄存器、内存、异常和程序计数器怎样改变。随机字节很难均匀打到深层 constructor，随机寄存器状态也未必触发别名、溢出或地址相关的语义分支，因此‘跑了很多样本’不等于规格被系统覆盖。",
          "论文将 constructor 覆盖当作代理目标：先保证规格里每个可达的解码与语义单元都能产生实例，再针对该单元选择状态。它不是完整的 ISA 正确性证明，却把测试空间组织成可以追踪到规格位置的单元；一旦差分失败，排查对象比一长串随机指令要小得多。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "GenSYS 从 SLEIGH 的 constructor/subtable 解码树出发，翻译位模式和上下文约束；对重叠 constructor 维护已经选择的路径，并调用 SMT 求解器给出真正能被该路径解码的指令编码。接着它为指令生成默认、随机、别名或针对语义边界的寄存器和内存状态。",
          "JuxtaPlayer 让 SLEIGH 解释器与硬件辅助虚拟机各执行一步，然后比较最终寄存器、内存和异常。若一侧访问到尚未映射的内存，它按异常情形映射并重放，以免环境差异过早遮蔽指令语义差异。最终报告按 constructor 组合归并，而不是让同一个根因淹没在大量相似状态中。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "约束求解是关键，因为 SLEIGH 的模式不仅是固定 opcode，还会涉及字段、上下文和子表选择。GenSYS 沿树累积这些约束，再为某个目标 constructor 求一个满足赋值；这样生成的字节不会只是‘看起来像一条指令’，而是能走到指定的规格单元。针对性状态生成再补上纯编码覆盖所没有的别名、输入值和地址条件。",
          "差分执行的比较也比单纯输出比较更细。系统关心单步之后的寄存器、内存和异常；当环境内存布局不同时，先把可重放条件对齐。结果归并到 constructor 组合后，研究者可以分辨是解码选错、语义操作顺序不对、语义表达不对，还是寄存器别名处理有误。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "若一个输出事实依赖某个寄存器的旧值，而规格先把它覆盖再读取，普通随机测试可能只在少数状态下露出问题。InSPECtor 会从该 constructor 的操作数约束得到可解码指令，再构造让源、目的寄存器发生别名的初始状态；硬件与 SLEIGH 单步后若寄存器不同，失败直接关联到这一 constructor 组合和别名情形，而不是笼统地说某条指令流错了。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "作者检验 x86-64、AArch64、ARM Thumb、RISC-V、MSP430 的 SLEIGH 规格。所有架构共得到 589,713 个最终状态差异；按 constructor 组合归并后为 38,920 个。人工复核将这些问题归为 125 个不同根因：16 个解码问题、9 个语义顺序问题、87 个错误语义、9 个别名问题。",
          "在 x86 消融里，8 小时的朴素随机生成约 1.1×10^7 个测试，仍漏掉 1,249 个 constructor（38%）和 32 个 x86 缺陷中的 15 个（47%）。GenSYS 的 x86 指令生成与测试少于 40 分钟；这里比较的是该规格上的覆盖与缺陷发现，不代表所有 ISA 都有相同比例。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "仍有 460 个 constructor 没有测试：有些处于不适用模式、与其他单元重复，或规格本身不完整/有错。",
          "硬件参考对部分未定义、特权或环境相关行为不一定可稳定观察；SLEIGH 也没有完整表达所有浮点等语义。",
          "差异归并后仍需要人工审查，作者报告的人工定位成本约为每个缺陷 4 小时。",
          "实验基于 Ghidra 10.3 的五份规格，不能自动推出其他版本或其他规格语言的覆盖率。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "8 月 14 日的合同级 verifier 先列出 kernel 应满足的数值、shape 和资源性质；InSPECtor 从规格结构推导哪些指令与状态值得测，再通过硬件差分判断。前者适合把已知性质写成合同，后者适合在规格很大时系统发现遗漏的输入条件。两者都把失败保留为可归因的类别，而不是一个 allclose 结果。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileFuzz 可以借鉴‘用 DSL/IR 结构生成测试’的方向：按 tile、布局、同步、别名、边界 tile 和资源路径构造输入，而非只随机张量形状。对 Tile for DSA，若存在真实硬件或可信模拟器，可将 lowering 的机器状态与参考语义逐步差分；这样每次失败能回到某个 IR 构造和具体的状态条件。",
        ],
      },
    ],
  },
  {
    id: "vero",
    date: "2026-08-16",
    title: "Vero: Can AI Agents Build Formally Verified Software Repositories?",
    chineseTitle: "Vero：Agent 能否完成仓库级代码与证明",
    arxiv: "2608.13522",
    source: "https://arxiv.org/abs/2608.13522",
    authors: "Zhe Ye、Hantao Lou、Yuechun Sun、Peiyang Song、Zhengxu Yan、Timothe Kasriel、Qingyang Zhang、Kaiyu Yang、Soonho Kong、Jingxuan He、Dawn Song",
    version: "arXiv v1 · 2026-08-13 17:41 UTC（8 月 16 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "单个 Lean 定理被证明，不等于 Agent 能维护一个真实验证代码库。仓库里的 API 彼此依赖；实现选择会改变后续引理能否写出；一个看似简单的规格可能彼此不相容，甚至参考实现本身并不满足规格。只用逐条 theorem pass rate 评价，很容易掩盖整个项目无法构建的事实。",
          "Vero 将问题变成仓库级联合合成：Agent 要在 Lean 4 中填实现，也要写出相应证明，并让多个模块一起通过。它同时提供 proof-only 模式，固定参考实现、只要求证明，借此分开观察‘证明没找出来’和‘代码选择让证明变难’两种失败。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "形式验证的通过只说明现有规格与实现之间的逻辑关系成立，不自动说明规格完整、参考实现正确或没有人通过改规格逃避任务。仓库级基准还会遇到反例：一组单独看可满足的 API 规格合在一起可能冲突；若这类问题被当作模型失败，评价就失去意义。",
          "因此 Vero 除了编译检查，还对基准数据做 machine-checked audit。它可以给出形式化的负证据：参考实现不满足全部规格、某条规格根本不可满足，或若干规格彼此矛盾。评测时再从源码中只抽取允许区域重建，防止修改规格、注入公理等方式绕过要求。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "Vero 有 43 个多模块实例，来源涵盖 Python、Dafny、Verus、Coq，统一改写到 Lean 4；总计 743 个 API 和 2,705 条规格。每个实例要求运行真实构建与证明，而不是把 API 拆成彼此独立的填空题。",
          "代码与证明模式中，Agent 必须同时决定 API 的 Lean 实现和证明；proof-only 模式提供参考实现，让 Agent 只补证明。审计和隔离构建将通过的结果限制为实际允许的代码区域，因而一个完整仓库解比单个不报错的 lemma 更有解释力。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "仓库的难点不只来自长代码，而是依赖结构。论文统计到，大多数完整解都依赖跨 API 可复用的辅助引理：82 个完整解中有 80 个让某条 helper 被至少两个规格共享，65 个被至少五个规格共享。证明文本的大部分行也落在这些 helper 上，说明 Agent 需要建立可复用的中间事实，而不是逐项临时凑证明。",
          "深层依赖会放大实现和证明的耦合。论文中帮助链深度至少为四时，代码与证明模式的 API 通过率为 50.6%，proof-only 为 39.1%；没有 helper 依赖时分别为 83.9% 和 80.1%。这不是说深依赖一定不可解，而是表明仓库级成功更依赖前面 API 的表示与引理设计。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "有些实例的参考实现追求效率，而一个更直接的实现更容易满足现有规格。作者在 3 个仓库、5 个 instance-agent 组合里观察到这种取舍：Agent 的简化实现能让更多规格成立，但并不一定保留参考实现的效率。这个例子提醒我们，验证器可以确认‘符合写下来的规格’，却不会替项目决定性能、抽象或可维护性是否仍合适。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "作者在 Lean 4.29.1 上给 Codex v0.140.0（GPT-5.5 medium/xhigh）和 Claude Code v2.1.191（Claude Opus 4.8、Sonnet 5）完整工具权限，每个实例预算 90 分钟。GPT-5.5 xhigh 在代码与证明模式完成 27/43 个仓库，在 proof-only 模式完成 25/43；10 个实例在所有配置下都未完成。",
          "逐条 API 的通过率可达 87.3% 与 85.8%，但完整仓库数量明显更少，正好显示局部成功与全局可构建之间的差异。审计在数据整理阶段也发现了参考实现或规格的潜在问题，使失败可以区分为 Agent 未解、规格不满足或数据有误，而不混成一个分数。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "目标语言是 Lean 4，且源任务必须能较干净地表达为 Lean；并不直接衡量 Rust `unsafe` 块、借用检查或并发内存模型。",
          "审计检查形式可满足性和参考实现关系，不能证明规格覆盖了用户真正需要的全部语义。",
          "并发协议、时间性质和更复杂的系统级不变量尚未进入任务集合。",
          "90 分钟、特定 Agent 版本与工具访问组成了实验条件；结果不应解释为一般软件仓库自动验证的成功率。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "7 月 25 日的 Kani harness 关注为 Rust 代码构造可检查的局部 harness；Vero 则把难题推进到实现、规格和辅助证明跨模块互相牵制的层次。8 月 15 日的硬件合同工作同样先稳定可执行语义，再修改遗留实现；Vero 的审计补上一层问题：即使合同可执行，也要检查合同彼此是否一致、参考实现是否真的满足它们。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "它与 LLM for unsafe Rust 的联系在于基准来源包含 Verus，但最终任务是 Lean 4，不可把它当成 unsafe Rust 专项评测。可迁移的是评测结构：把实现、规格、证明、跨模块 helper 和反作弊构建一起保留；在 Rust/Verus 场景中，还要额外保留借用、别名、内存安全与 `unsafe` 边界的语义。对 Agent kernel DSL，也可用同样的仓库级任务检查：修改一个 kernel 或 IR 规则后，相关的正确性说明和回归证明能否一起成立。",
        ],
      },
    ],
  },
  {
    id: "t-llm-compiler",
    date: "2026-08-17",
    title: "T-LLM Compiler: Trusted LLM-based Code Optimization and Verification Framework",
    chineseTitle: "T-LLM Compiler：让 LLM 优化 C 循环时保留可检查的正确性",
    arxiv: "2608.14953",
    source: "https://arxiv.org/abs/2608.14953",
    authors: "Zahra Fazel、Sunanda Gamage、Shayan Shirahmad Gale Bagi、Amir H. Ashouri、Tomasz S. Czajkowski、Bryan Chan、Reza Azimi、Yaoqing Gao",
    version: "arXiv v1 · 2026-08-15 00:56 UTC（8 月 17 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "大语言模型可以把一个 C 循环改写成分块、交换循环次序或展开后的版本，但“看起来像优化”不说明程序仍然等价。循环变换尤其容易在数组别名、边界、写入顺序或临时变量上出错；只跑少量测试，常常碰不到触发条件。",
          "T-LLM Compiler 把这件事拆为候选生成、策略选择和验证三段。它让模型提出循环变换，再用传统编译器与形式工具挡住不成立的候选，目标是让生成式优化进入一条可复查的编译流程。论文的对象是 PolyBench/C 中的 C 循环，不是 GPU kernel；但它清楚展示了 LLM 在优化搜索中应处在什么位置。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "循环展开、融合、分裂、交换和分块都改变了执行次序或循环结构。它们能暴露向量化、提高局部性，或减少循环控制开销；同时也会改变一条写入在何时对另一条读可见。优化器真正要回答的不是“这个改写常见吗”，而是“对这段程序和这些边界，它是否保持原有的可观察结果”。",
          "论文使用两类验证。语法检查先排除不能编译的代码；CBMC 是有界模型检查器，会在指定展开深度内把两个程序的行为编码为约束，寻找反例。它比随机测试更擅长发现具体的索引和顺序错误，但有界范围也意味着它不能替代对任意循环次数的完整证明。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "系统先让 Qwen2.5-32B-Instruct 依据不同提示词提出五类循环变换。接着，一个经过 LoRA 微调的小模型根据程序特征和以往结果选择更可能有效的策略；若预测不到收益，它可以返回“不做循环优化”。这一步避免把每种提示词和每种变换都盲目试一遍。",
          "候选依次经过编译语法检查、CBMC 等价检查和一个 LLM 审阅器。只要任一检查失败，候选就不能进入后续评测。最终再由 BiSheng 编译器在 ARM 服务器上运行，并与优化前版本比较时间。这里“能通过”的语义和“能加速”的性能证据被刻意分开保存。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "策略选择器的训练数据来自 LORE：作者去除与 PolyBench 重叠的样本，只保留收益超过 5% 的候选，并把回退超过 20% 的结果作为负例。训练集共有 3,418 个样本，其中 3,009 个用于训练、409 个用于验证。这个设计让推荐器学习的是“哪些变换在何种代码形态下值得尝试”，而不是直接生成完整补丁。",
          "验证链也有重要的次序。编译先过滤纯文本错误；CBMC 再比较原程序和候选在给定展开界内的行为；最后的 LLM 验证器只提供额外审阅，不承担正确性担保。作者还报告 Alive2 在这类 C 级循环中经常超时，说明验证器的粒度和语言前端会直接影响自动化流程能覆盖的范围。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "在 doitgen 中，模型尝试交换两个循环。第一次改写把某个数组位置提前写回，后续迭代读到的值因此不同；CBMC 给出反例并拒绝该候选。第二次改写保留了必要的临时值和写回位置，才通过检查。",
          "这次通过的循环交换又让 BiSheng 能够向量化，论文报告该 kernel 运行快了 4.33 倍。例子说明性能收益并不来自模型“知道该交换”，而来自可行改写恰好让现有编译器看到了向量化机会；验证器则把第一次语义错误留在了提交前。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "作者在 128 核 AArch64 ARM 服务器上评估 30 个 PolyBench/C 程序，以 BiSheng -O3 为常规基线。最好的 Qwen2.5-32B 配置让 90% 的程序产生了变换，论文表格中通过测试套件的候选准确率为 100%，平均速度为基线的 1.175 倍；文本讨论处给出 1.178 倍，二者只差舍入与汇总方式。",
          "不同提示词的差别很大，没有一个提示词始终最好。论文还报告某个 one-shot 配置的平均加速为 26.7%，并称优化准确率最高可到 83.3%。这些数字来自特定的 C 基准、模型和编译器组合，不能直接解释为任意 LLM 优化都具有同等收益。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "CBMC 使用有限展开深度。作者明确指出它的假接受风险高于假拒绝风险，因此“已通过”应理解为在已检查范围内没有发现反例。",
          "主要正确性数字还使用了测试套件；测试通过不等于对任意输入的形式等价。",
          "实验是 CPU 上的 C 循环，未覆盖 GPU 的线程协作、浮点规约次序、共享内存和并发内存模型。",
          "策略推荐器的训练来源与评测族相近，跨代码库、跨编译器或跨硬件时是否仍会作出有效选择，需要单独验证。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "传统自动调优常把变换空间交给搜索器，再依赖编译与基准运行给出分数；T-LLM 的新位置在于让语言模型提出或选择候选，同时把语义检查保持在模型之外。它比纯提示式代码重写多了可复查的拒绝环节，也比只学习一个性能预测器多了具体的程序变换输出。",
          "它与本站 8 月 15 日的合同验证和综合反馈能互相补足：合同或等价检查负责判断候选是否仍符合约束，性能测量负责判断是否值得保留。两种证据不要混成一个“好候选”的分数。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "对 Agent-friendly kernel DSL，最可移植的是把动作、验证和测量分层：Agent 可以提议 tiling、layout、pipeline 或 lowering 选择；TileFuzz、数值比较与资源检查决定能否继续；真实后端报告和基准运行才决定保留哪个候选。",
          "对 TileLang-TPU、Tile for DSA 来说，C 级 CBMC 不能直接验证并行 kernel。需要把等价问题换成适合 DSL 的合同，例如边界 tile、别名、规约精度、线程间同步和共享资源上限，并保留能回放的反例输入。",
        ],
      },
    ],
  },
  {
    id: "trace-algebraic-verification",
    date: "2026-08-18",
    title: "TRACE: Traversal and Reasoning Algebraic Computing Engine for Formal Hardware Verification",
    chineseTitle: "TRACE：用多项式化简验证算术硬件",
    arxiv: "2608.16458",
    source: "https://arxiv.org/abs/2608.16458",
    authors: "Jan Kleinekathöfer、Lennart Weingarten、Kamalika Datta、Rolf Drechsler",
    version: "arXiv v1 · 2026-08-17 11:57 UTC（8 月 18 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "乘法器和乘加器的门级网表即使功能正确，内部实现也可能高度重写：加法树、部分积压缩与逻辑优化会让结构不再像一条容易阅读的算术公式。传统仿真很难穷尽位宽增长后的输入，通用 SAT 或位向量证明又可能在复杂算术上陷入巨大搜索。",
          "TRACE 采用符号计算代数方法。它把“输出等于输入算术表达式”的要求写成一个规格多项式，再沿 And-Inverter Graph 逐门代入。如果全部门都消去后多项式为零，网表满足给定的加法、乘法或乘加规格。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "把 n 位输出看成一个整数时，每一位带有 2 的幂次权重。对一个 MAC，规格可写成 F − A×B − S = 0。门级验证的工作就是把 F 的每一位反复用它上游的布尔函数替换，直到表达式只剩输入；若它正好等于输入侧规格，差为零。",
          "难点是中间多项式可能爆炸。某次代入会产生大量单项式，内存和时间都随之失控。TRACE 的核心不是发明另一条算术等式，而是决定以什么顺序代入，以及如何尽早删除不可能同时为真的项。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "工具以 AIG 网表和电路类型为输入，自动生成规格多项式。随后选择静态或动态的遍历顺序，把输出信号逐步替换为门输入；每一步记录当前多项式大小、代入次数、极性变化和冲突数量。",
          "压缩有两种。极性优化会尝试将某个信号写成 1−s，选择能减少项数的表示；冲突分析会在预处理阶段找出不可能同时为 1 的信号对。出现含有冲突对的单项式时，它必为零，可以立刻删除。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "TRACE 支持按节点编号、按独立输出切片、以及动态顺序遍历。静态顺序在规则阵列乘法器上很有效，因为依赖结构稳定；面对经过综合、内部结构未知的 MAC，动态顺序能根据当前表达式避免最坏的下一次代入。论文的结论很克制：没有一种顺序对所有结构都最好。",
          "冲突分析借用了自动测试向量生成中的蕴含。若假定一个 AND 输出为 1 可以推出两个输入为 1，而另一个内部信号因此必为 0，那么这两个信号构成冲突。工具用近似的前向与后向蕴含预计算这些关系，避免为每个零输出做昂贵的完全分支。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "半加器中，sum 和 carry 不会同时为 1。若代入过程中出现了 sum×carry 这一项，TRACE 可以直接将它删掉，而不用继续把两个信号展开为输入变量。",
          "论文的三位加法器与复杂乘法器例子说明同一原则：早期删去不可能项，会阻止后面继续乘开为更多单项式。对于结构复杂的 Wallace-tree 加 Kogge-Stone 乘法器，这种压缩决定验证能否在内存和时限内结束。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "实验运行在 Ryzen 7 PRO 5850U、32 GB 内存，时限 60 分钟。作者生成 28 种乘法器与 28 种 MAC 架构，也把行为级 Verilog 经 Yosys、ABC 综合成 AIG。对复杂 8 位乘法器，静态方法常超时；动态遍历配合极性和冲突压缩将最大多项式降到 146 项，验证用时 0.23 秒。",
          "在行为级 MAC 上，静态顺序只能验证到 8 位；DYN+P+C 验证到 64 位。作者还报告，64 位复杂乘法器可在 98.84 秒内完成，而同类静态路径会超时。另一方面，TRACE 在部分 16、32、64 位结构乘法器上不如 RevSCA 完整，论文没有把它包装成全场景替代品。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "当前规格生成只覆盖有符号或无符号 ADD、MUL、MAC；任意控制逻辑、状态机和时序性质不在该验证器的目标范围内。",
          "冲突分析是近似蕴含，刻意不做所有分支，因此可能漏掉本可删除的项。",
          "很多结果依赖门级 AIG 表示和具体综合流程；换网表、换结构或换位宽的表现仍需重新测量。",
          "复杂结构乘法器上 TRACE 仍有失败点，特别是高位宽的某些部分积压缩和最终加法器组合。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "RevSCA 与转换式方法同样利用算术多项式，但 TRACE 把遍历顺序、极性和冲突做成可组合的配置空间。论文用这个空间解释为什么行为级 MAC 需要动态路径，而简单阵列结构可以由静态顺序处理。",
          "与 8 月 17 日的 T-LLM 相比，二者都把一个候选交给外部可检查系统；TRACE 的检查对象是固定硬件网表与算术规格，T-LLM 的检查对象是程序变换。两者都提醒我们，不应让文本生成器充当最终判定器。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "Tile for DSA 若生成 MAC、dot-product 或小型算术阵列，TRACE 的思想可用来构造 lowering 后的等价检查：先把 tile 级算术合同转成输出多项式，再选择能控制中间规模的消去顺序。",
          "TileFuzz 可把“中间表示大小爆炸”也记录为一类压力信号。它不一定意味着语义错误，却能暴露某种 scheduling 或 lowering 让验证与编译成本失去可预测性的情况。",
        ],
      },
    ],
  },
  {
    id: "db-spmspv",
    date: "2026-08-19",
    title: "DB-SpMSpV: Dual-View Blocked Sparse Matrix-Sparse Vector Multiplication for Dynamic GPU Workloads",
    chineseTitle: "DB-SpMSpV：随输入稀疏度改变方向的 GPU 稀疏计算",
    arxiv: "2608.16308",
    source: "https://arxiv.org/abs/2608.16308",
    authors: "Xing Cong、Chenhao Xie、Rui Wang、Zhongzhi Luan、Yi Liu、Depei Qian",
    version: "arXiv v1 · 2026-08-17 09:18 UTC（8 月 19 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "稀疏矩阵乘稀疏向量，记作 SpMSpV，常见于图的 BFS 前沿传播与稀疏 LLM 解码。输入向量非常稀疏时，从活跃输入列向外推送能跳过大量零元素；输入变稠后，许多列会写同一输出，原子写和冲突成为瓶颈。反过来按输出行拉取能够规避写冲突，却会在稀疏阶段扫描大量无效元素。",
          "DB-SpMSpV 的问题是：不为两种方向完整保存两份矩阵，也不把全局稀疏度当成唯一决策，怎样让运行时同时选择整体遍历方向和块内计算方式。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "push 按活跃输入列访问 CSC 式结构，把贡献散射到输出；pull 按输出行访问 CSR 式结构，逐行规约。前者在前沿很稀疏时少做工作，后者在前沿变密时更连贯且少争抢写回。BFS 的前沿会在不同层快速改变形状，所以一个固定 kernel 常常只能适合其中一段。",
          "块化不是只为压缩索引。把矩阵和向量都切成 16×16、16 元素的小块后，运行时可以看到“哪些向量块非空”和“这个矩阵块在行或列上是否偏斜”。这些局部信息比总非零比例更接近一个 warp 真正要面对的访问与负载。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "矩阵被分成 16×16 块。高层同时保存块级 CSR 与块级 CSC，只复制索引视图，不复制块内数值；CSC 位置通过映射回到同一块负载。低层再按块密度与行列偏斜选择 COO、稠密、ForceCSR、ForceCSC 或带列指针的压缩 CSR 表示。",
          "运行时先从向量块掩码统计非空块比例。低于 0.01 时走高层 push，只访问活跃列块；否则走高层 pull，按输出行块组织任务。进入每个块后还会根据该块格式和 16 位输入掩码选择 microkernel，因此整体方向与块内方向可以不同。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "双视图的关键是共享载荷。完全同时保存 CSR 与 CSC 通常近乎翻倍存储；这里块级两份入口只指向一份块数据。对于中等稀疏、没有明显偏斜的块，作者把局部行号和 CSC 到 CSR 的偏移压进 4 位字段，让 push 能复用 CSR 的值数组。",
          "调度也随方向改变。push 可能只有少数活跃列块，作者把任务扁平化为矩阵块，使 warp 从网格步长任务中取工作；pull 则把行块按格式成本切成段。数据传输方面，push 在共享内存缓存活跃向量块，pull 通过双缓冲异步预取；写回先在 warp 或共享内存内归并，再做全局更新。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "假设 BFS 前沿只有少数顶点活跃。高层 push 只枚举这些顶点对应的列块；对其中一个不规则块，如果掩码只开了两位，就沿活跃列寻找边并在局部归并。若前沿扩张到许多向量块都非空，运行时切到 pull：每个输出行块顺序读取需要的块，避免许多活跃列同时原子加同一行。",
          "这不是一次性在图加载时做的选择。下一层 BFS 前沿可能又缩小，向量掩码会使系统再次改变方向；矩阵本体不需要重排，也不会为每次切换重新构建两份值数组。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "作者在 A100 与 RTX 4090 上评测 2,738 个 SuiteSparse 矩阵、1,000 多个图，以及 3 个开源 LLM 的单 token 解码。A100 上，DB-SpMSpV 相对 cuSPARSE、CB-SpMV、TileSpMSpV 的平均加速范围分别为 5.48–64.34 倍、1.20–8.29 倍、2.36–14.01 倍；输入越稀疏，优势通常越明显。",
          "端到端 BFS 中，A100 相对 TileBFS 平均为 2.66 倍，RTX 4090 为 3.60 倍。稀疏解码里，作者以 50% 权重剪枝和约 10% 激活密度测试，Q/K/V/Out 投影约快 2.35–2.50 倍，部分 FFN 投影最高 4.50 倍。双视图共享载荷相比完整 CSR+CSC 平均少用 61.26% 存储。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "阈值、块大小与五种块格式针对 NVIDIA warp 和 16×16 设计；它们不是所有加速器的通用常数。",
          "解码评测依赖特定剪枝与阈值化激活，真实模型中的激活模式、批量和精度变化可能改变最佳方向。",
          "格式转换离线完成并被多次复用；若矩阵本身频繁变化，转换成本需要重新计入。",
          "性能优势来自多层适应性和特定实现细节，不能仅归因于“同时有 CSR 和 CSC”。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "TileSpMSpV、CB-SpMV 和传统 BSR 各自固定了更强的存储或执行假设。DB-SpMSpV 的主张是将方向选择放到块级运行时：高层决定访问哪些块，低层决定怎样计算一个块。",
          "它与本站此前的稀疏执行阅读相连，但给出一个更具体的工程切分：数据结构必须暴露足够的局部统计量，调度器才有机会把全局状态变化转成 kernel 内的不同路径。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileLang-TPU 或 Tile for DSA 可以将这一思路抽象为两层 dispatch：先用运行时元数据决定任务图，再用 tile 内掩码、密度和轴向偏斜决定 microkernel。重要的是让这种选择可见于 IR，而不是埋在后端启发式里。",
          "TileFuzz 的输入生成可专门覆盖全局稀疏度与局部块密度相互矛盾的情况，例如全局很稀疏但个别块完全稠密。论文表明这正是固定路径容易判断失误的区域。",
        ],
      },
    ],
  },
  {
    id: "neuroabs",
    date: "2026-08-20",
    title: "NeuroAbs: A Neuro-Symbolic RTL Abstraction Framework for Property Checking Acceleration",
    chineseTitle: "NeuroAbs：用受形式约束的抽象加速 RTL 属性证明",
    arxiv: "2608.17304",
    source: "https://arxiv.org/abs/2608.17304",
    authors: "Zhiyuan Yan、Xiaofeng Zhou、Ziyue Zheng、Ziyi Yang、Wenbin Che、Wei Zhang、Yangdi Lyu、Hongce Zhang",
    version: "arXiv v1 · 2026-08-18 02:58 UTC（8 月 20 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "硬件模型检查常常只验证某个运行场景，例如一条 RISC-V 指令的语义。此时，其他指令或无关控制分支仍在 RTL 中，传统结构化抽象未必能理解“这个属性只关心 ADD，不关心 AND 和 SUB”。人工删减模型既耗时，也很容易删过头。",
          "NeuroAbs 让语言模型帮助定位与场景相关的信号和候选语句，但不允许它自由改写整段 RTL。候选抽象被限制在抽象语法树的语句节点内，每一处改写都用 SMT 检查是否保持正确的过近似关系。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "过近似抽象会扩大模型允许的行为。若一个安全属性能在更大的抽象模型上证明，它也能在原模型上成立；若抽象模型找到了反例，该反例可能只是抽象引入的伪反例，需要回到原模型核对。",
          "CEGAR，即反例引导的抽象细化，会在出现伪反例时找出过粗的抽象并恢复细节。它的难点是一次反例可能经过许多被改写语句；若不先缩小反例，细化会反复恢复无关区域，失去抽象带来的收益。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "第一阶段的 Signal Analyzer 阅读设计说明、场景、属性和 RTL 信号定义，提出与目标属性有关的信号。静态分析再沿控制和数据依赖定位对应语句。第二个模型 Abstractor 只拿到这些 AST 节点和其 enclosing context，在限定位置把与当前属性无关的表达式改成 X 值或更简单表达式。",
          "每个改写都翻译为 SMT 公式。原语句允许的每一种行为必须仍被改写后的语句允许；X 值则被翻译为存在量化的新变量。通过的局部改写组成过近似模型，之后由 AVR 或 RIC3 进行属性检查；若出现伪反例，R-CEGAR 找到相关改写并恢复原语句。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "AST 是这篇论文最重要的边界。模型可以决定“怎样简化这个已选语句”，不能决定“在任意文本位置删一段 RTL”。这种结构约束使每一次生成都能连接到具体的语句、后续 SMT 检查和细化位置。",
          "R-CEGAR 先对反例做约简和泛化，再检查哪些抽象语句真正参与违例。若没有抽象语句参与，反例属于原模型，属性确实不成立；若存在，系统按 AST 定位恢复相关区域。论文报告平均只需 1.65 次细化、细化耗时 7.26 秒，说明初始抽象在该基准上没有过度失真。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "验证 ADD 指令时，指令字段被约束为 ADD。常量传播能够确定部分解码与 ALU 路径；与 SUB、AND 有关的分支可能可改为 X 值。若抽象后出现一个反例，且多路选择器实际上选中了该 X 值，约简后的轨迹会指向这处改写，系统便恢复原始语句。",
          "反过来，若属性在这个更大的模型上已经成立，证明并不依赖这些无关分支的具体实现。这里的安全来源于 SMT 的过近似检查，不是来源于模型对指令含义的文字解释。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "实验使用 PicoRV32、Piccolo、Flute 三个 RISC-V 核及一个 I2C 外设，共 55 个场景。工具链采用 Yosys、Pyverilog、Z3、AVR 与 RIC3，语言模型为 gpt-4o-mini，并给出 8 个 few-shot 示例。完整配置的局部过近似通过率为 95.27%，平均产生 236.17 条严格过近似语句。",
          "在 AVR 上，NeuroAbs 将平均证明时间从 607.03 秒降至 334.56 秒，论文汇总为 44.89% 改善。对未能快速完成证明的 BMC，Piccolo 的平均展开深度从 109.36 提升到 125.36；Flute 到达原基线最大深度所需时间从 23,600 秒降到 5,668.58 秒。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "场景说明与属性本身需要足够准确；模型只是在给定语境中找候选，不能修复有歧义或错误的验证目标。",
          "SMT 检查只覆盖已支持的语句翻译和 X 值处理，复杂时序、数组、异步协议或工具前端差异仍可能限制适用性。",
          "抽象会扩大状态空间；伪反例和细化是必要成本，基准上的少量迭代不保证在所有设计上都成立。",
          "性能结果来自特定模型检查器与 55 个场景，不能作为任意 RTL 验证的普遍加速比。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "传统 cone-of-influence、语法引导抽象和数据通路抽象主要依赖固定结构规则。NeuroAbs 加入的是按验证场景理解信号角色的候选定位，同时坚持由 AST 和 SMT 约束最终改写。",
          "它与 8 月 18 日 TRACE 的共同点是让语义检查与搜索分离：TRACE 在代数化简中控制表达式规模，NeuroAbs 在 RTL 改写中控制抽象范围。两者都要对中间表示的爆炸负责。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "对 Agent-friendly kernel DSL，可把“场景”替换为特定 shape、layout、硬件约束或精度合同。Agent 负责发现当前合同下可能无关的 IR 分支；编译器必须以显式、可验证的过近似或等价规则限制改写范围。",
          "对 LLM for unsafe Rust，这一框架提示不要让模型自由删除检查或缩小别名范围。更可信的做法是先定位可改写的控制点，再用模型检查器或类型/所有权约束验证候选仍是安全保守的转换。",
        ],
      },
    ],
  },
  {
    id: "neuroassertion",
    date: "2026-08-21",
    title: "Coverage-Driven RTL Assertion Generation with Formal Exploration and Neuro-Symbolic Refinement",
    chineseTitle: "从覆盖缺口生成并修复 RTL 断言",
    arxiv: "2608.18482",
    source: "https://arxiv.org/abs/2608.18482",
    authors: "Zhiyuan Yan、Ziyue Zheng、Hongce Zhang",
    version: "arXiv v1 · 2026-08-19 03:14 UTC（8 月 21 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "SystemVerilog Assertion 可以描述寄存器行为、时序顺序和安全约束，但手写成本很高。从随机波形中挖掘断言也有根本问题：从未被随机测试触发的分支，不会凭空出现在挖掘结果里；已有断言即使都正确，也不表示它们覆盖了设计的关键行为。",
          "这篇工作把断言生成视作一个由覆盖反馈驱动的过程。先用形式方法主动找到难到达分支，再从更丰富的轨迹中做 SyGuS 合成；然后注入变异，观察哪些错误没有被断言区分，并将这些未覆盖行为变成下一轮明确的生成目标。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "SyGuS，即语法引导合成，会在预先给定的语法中寻找满足约束的表达式。用于断言时，轨迹提供行为约束，语法规定可使用的信号、逻辑算子和时序结构。它比自由生成更可控，但仍取决于输入轨迹看见了什么。",
          "变异覆盖会人为改动 RTL 中的运算、条件或赋值，再检查现有断言能否识别出改动。未被识别的变异不是“覆盖率分数低”这么简单；论文把它解释为一条尚未写出的行为义务，供下一轮候选断言直接针对。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "S1 在每个分支条件旁插入覆盖寄存器和对应的可达性目标。模型检查器寻找能触发该分支的反例轨迹，反例被转换为测试向量；这些轨迹再进入带 CEGAR 的 SyGuS 挖掘，形成初始断言集。",
          "S2 对初始集做变异分析。针对每个未覆盖义务，第一个模型根据 RTL 与变异点提出断言，形式后端立刻检查它。若不成立，第二个模型不直接拍脑袋修句子，而是为相关信号生成一个修复语法；SyGuS 在该语法和反例约束下寻找修复。语法不足时再回退到默认语法。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "形式探索解决的是“看不到”的问题。论文在 b12 上将随机测试从 150 提到 6,000，分支覆盖仍停在约 27%，断言数停在 35；把条件转为可达性目标后，模型检查器可以主动寻找极少见的路径。",
          "神经部分解决的是“从哪儿开始写”的问题，符号部分解决的是“写出的关系是否成立”的问题。失败候选仍保留其涉及的信号集，系统以它为中心收缩 SyGuS 语法；这个设计避免将一次接近正确的提议完全丢弃，也避免把 LLM 输出直接视为有效断言。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "一个 8 位条件 a == 222 在独立随机输入下每次触发概率约为 1/256。若该分支从不出现，任何基于波形的矿工都无法推导与该分支相关的断言。S1 将“该分支被走到”写成可达性目标，让形式工具直接给出一条满足它的轨迹。",
          "之后若把分支条件或赋值运算变异，现有断言无法区分，系统会把这一差异标为未覆盖义务。候选断言若失败，反例会进入修复约束，使下一次 SyGuS 搜索必须同时符合原轨迹和新反例。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "作者在 Arb2、B12、I2C、Ibex_controller、Ibex_decoder、Multdiv、Pico 七个 RTL 基准上评测，使用 cvc5 做 SyGuS，SymbiYosys 与 Pono 做形式检查，LLM 部分使用 GPT-5。相对 SMART，完整方法在复杂设计上通常生成约两倍断言：I2C 为 244 对 89，Ibex_controller 为 297 对 136，Pico 为 477 对 358。",
          "变异覆盖的提升也很明显：I2C 从 10.51% 到 36.21%，Ibex_decoder 从 6.45% 到 32.31%，Pico 从 14.63% 到 37.80%。消融中，I2C 去掉反馈后覆盖降至 16.96%，再去掉形式探索降至 10.40%，支持两个阶段分别在补足行为与针对遗漏上发挥作用。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "变异覆盖衡量断言区分特定变异的能力，不等价于完整功能规格，也不自动覆盖未被变异算子表达的错误。",
          "断言的语法、分组和形式工具限制了可合成的属性类型；复杂跨模块协议可能需要人工提供更强的背景。",
          "论文的直接 LLM 基线使用特定提示和计划方式，不能推出所有 prompt-only 方法都同样弱。",
          "形式探索、变异分析和多次 SyGuS 可能带来很高的计算成本，文中没有将其作为大规模工业流水线的端到端预算展开。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "GoldMine、HARM、A-TEAM 与 SMART 都从轨迹或模板出发；NeuroAssertion 的区别是把难达行为的发现放在初始挖掘前，并把变异覆盖反馈接到后续生成和修复中。",
          "它紧接 8 月 20 日的 NeuroAbs：前者缩小模型以加速既有属性的证明，后者扩展与修复属性集合以发现未覆盖行为。一个系统若同时使用两者，需要分别记录抽象是否保守、断言是否真的区分变异，不能只看最终通过率。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileFuzz 可以借鉴“把覆盖缺口变为下一轮任务”。针对 tile DSL，不仅生成随机 shape，还应注入或模拟 layout、同步、边界掩码、别名和规约顺序的变异，观察现有测试是否能分辨。",
          "对 Agent 自动优化，失败候选不要只记录为 0 分。把失败分为编译、数值合同、资源合同、性能回退和覆盖不足，并让每类失败产生下一轮可检查的义务，才能形成真正有信息量的轨迹。",
        ],
      },
    ],
  },
  {
    id: "compiler-heuristic-guarantees",
    date: "2026-08-22",
    title: "Formal Performance and Compile Time Guarantees for Compiler Optimization Heuristics",
    chineseTitle: "给编译器启发式加上性能与编译时间保证",
    arxiv: "2608.20137",
    source: "https://arxiv.org/abs/2608.20137",
    authors: "Nikil V. Shyamsunder",
    version: "arXiv v1 · 2026-08-20 15:02 UTC（8 月 22 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "已验证编译器通常证明“变换不改语义”。现实用户还关心另外两件事：优化器会不会花不可预测的时间搜索，以及它会不会在自己的搜索空间里留下明显更差的代码。寄存器分配、内联、张量布局和调度都包含 NP-hard 或强耦合的选择，语义正确并不能回答这两件事。",
          "论文从一个简化的内联优化器开始，尝试把性能质量和收敛步数也写进机械化证明。它的贡献不是声称已经验证 LLVM，而是给出一种将启发式视作可分析的局部决策过程的模型。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "内联把函数调用替换为被调函数体。它可以去掉调用开销并暴露后续优化，却也会增大代码和指令缓存压力。若每个候选调用点只看局部收益，多个选择可能争用同一缓存行，后做的决定会改变先前决定的代价。",
          "拥塞博弈将每个调用点看成一个参与者、是否内联看成策略、缓存行看成共享资源。若每次局部改动都会让一个全局势函数严格下降，反复选择当前更好的策略就一定终止。Price of Anarchy 则刻画一个局部稳定点相对全局最优可能差多少。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "作者为每个候选调用点给出 inline 或 preserve 两个选择，并以线性缓存竞争成本估计执行延迟。优化器不断重新计算成本，只要改一个点能严格降低自己的延迟，就翻转该点，直到没有单点可改进。",
          "在这个模型里，过程正好是仿射拥塞博弈的迭代最佳响应。势函数每次至少下降一，因而给出明确的收敛步数上界；仿射拥塞博弈的已知界又给出最终固定点相对全局最优的性能上界。随后作者在 Rocq 中机械化内联语义保持、进度和性能定理。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "模型只考虑叶子调用点，因此内联不会产生新的候选调用点。每个资源的成本是 aᵣx+bᵣ，其中 x 是使用同一缓存行的选择数。这样一个调用点切换策略造成的个人延迟变化，与势函数变化精确对应。",
          "若有 N 个候选、E 个缓存资源，且系数上界为 A、B，论文给出至多 E(AN²+BN) 次接受改动的收敛界。第 k 次后还可得到剩余步数及一个中间性能上界；因此编译器可以在 -O1 一类模式里限制迭代次数，并说明这种提前停止所对应的理论质量范围。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "两个调用点各自内联都可能有利，但它们同时把热路径挤进同一缓存行，彼此的延迟会上升。局部最佳响应会在每次选择后重算共享缓存行的成本，而不是把第一次评估的利润永久保存。",
          "当没有单个调用点愿意改变时，得到的是纯 Nash 均衡。它不保证全局最优，却在该线性模型中可证明至多是全局最优成本的 2.5 倍。这个界偏松，但比“启发式通常有效”多了可检查的最坏情况含义。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "论文的主要证据是机械化证明，而非在真实编译器上跑大型基准。作者在受 CompCert RTL 启发的中间语言中定义叶子内联和小步语义，在 Rocq 中完成约 4,000 行证明、没有 admitted lemma。",
          "已证明内容包括内联的双模拟语义保持、每步势函数单调下降、收敛步数上界，以及最终和中间解的成本界。最终固定点使用仿射拥塞博弈的 2.5 性能界；该数字适用于论文定义的线性成本模型，而不是实测 CPU 的通用性能承诺。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "模型只包含叶子调用点和指令缓存竞争，没有递归内联、新暴露调用点、profile、寄存器压力、分支预测或多轮 pass 交互。",
          "2.5 是理论最坏界且可能很松；它不等价于任何实际程序会慢 2.5 倍。",
          "收敛上界按接受改动计数，实际编译时间还包含代价重算、IR 更新和分析成本。",
          "论文没有将模型接入 LLVM 或 tensor compiler 的完整实现，工程可用性仍是后续工作。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "CompCert 一类工作强调语义保持；资源验证工作可以给栈或内存边界。这篇论文把注意力移到启发式选择的质量与搜索时间，并借用博弈论而非单纯近似算法来证明局部更新过程。",
          "它与 8 月 17 日的 T-LLM Compiler 形成互补：后者用外部检查器排除错误变换并在基准上测量收益；本工作为一个受限优化器给出最坏质量和收敛步数。前者可用于探索，后者可用于约束探索应在什么范围内进行。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "对 TileLang-TPU 与 Tile for DSA，许多 schedule 搜索同样是局部改变 tile、layout、pipeline 或并行度。可以先为一个小而真实的子空间定义明确成本，再尝试证明每一步动作改善某个势函数，并为有限预算搜索留下可解释的进度界。",
          "对 Agent 轨迹，性能分数不必只来自黑盒测量。若部分动作满足可证明的单调条件，系统可以把它们与纯启发式动作区分开；一旦真实测量反驳成本模型，就应记录为模型失配，而不是把它误认为“Agent 推理失败”。",
        ],
      },
    ],
  },
  {
    id: "hiera",
    date: "2026-08-23",
    title: "HIERA: Workload-Aware Planning Across Implementation Spaces for GPU Kernel Optimization",
    chineseTitle: "HIERA：先选择实现空间，再优化 GPU kernel",
    arxiv: "2608.21157",
    source: "https://arxiv.org/abs/2608.21157",
    authors: "Jinghao Wang、Qiqi Gu、Chenpeng Wu、Jianguo Yao、Haibing Guan、Xijun Li",
    version: "arXiv v1 · 2026-08-21 14:29 UTC（8 月 23 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "让模型优化 GPU kernel 时，常见流程一开始就规定“只能写纯 CUDA”或“只能在框架算子里组合”。前者自由度大，却会把有限预算花在编译失败、接口不匹配和重造库函数上；后者稳定，却可能错过 fusion、shape specialization 或硬件层面的机会。",
          "HIERA 将“用 PyTorch、调用 CUDA 库，还是写自定义 CUDA”变成第一层规划决策。它先为任务固定接口和编译合同，再在三个可嵌套的实现空间之间选择，最后根据 profile 指出下一轮应改控制流、并行、内存事务、复用还是 Tensor Core 路径。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "KernelBench 测试一段实现是否编译、是否与 PyTorch 参考结果一致、以及是否更快。实际优化时，除了 kernel 本体，还有 Python wrapper、C++ binding、数据准备和编译入口；这些往往不是性能选择，却会占据模型输出空间并制造无关失败。",
          "实现空间越低，能控制的细节越多，搜索分支也越多。对一个复杂模型层，用 cuBLAS 或 PyTorch 可能先得到稳定正确的基线；对一个简单融合算子，纯 CUDA 可能更值得投入。HIERA 的重点是让这种判断随任务和反馈改变，而不是永久押注一个层次。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "系统把固定的 wrapper、C++ binding、参考实现和编译规则写进合同，模型只生成 cuda_source.cu。Search-Space Decision Agent 选择纯 CUDA、CUDA 库、或 CUDA 库加 PyTorch 算子；随后从五个方向中选一个最需要处理的问题：边界与控制流、线程和 warp 并行、内存事务、数据复用与流水、Tensor Core 与指令流水。",
          "Strategy Planning Agent 将方向变成具体修改策略，Optimization Agent 生成候选。每个候选都编译、做正确性检查、测延迟并运行 Nsight Compute。系统保留源码、所选空间、方向、profile 和结果，让下一轮能依据真实瓶颈调整，而非只参考自然语言总结。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "合同增强减少了无效自由度。Level 2、3 任务还提供参数语义文件，明确参数角色、约束和依赖；模型不能擅自重写固定的外部接口。论文的消融显示，移除合同后，复杂任务的有效实现比例下降很大，说明这不是普通提示词润色。",
          "层级规划的另一部分是方向剪枝。系统不用每轮同时尝试所有优化，而是利用任务、当前候选和 NCU 指标对五个方向打分，再只把最相关方向展开成策略。这样低层 CUDA 并不是默认答案，而是一种在特定约束下才开放的实现空间。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "二维 box stencil 的半径为 3，意味着一个输出读取 7×7 的 49 个点。HIERA 以 cuDNN 卷积为参考，先得到 13.71 ms 的候选，经过五轮、共 50 个候选后发现 4.71 ms 的实现；cuDNN 参考是 7.23 ms。",
          "前四轮候选仍接近或慢于参考，第五轮才跨过它。这个例子有两层含义：空间与方向选择并不保证每步更快，但保留真实 profile 和阶段性结果，能让搜索最终找到 1.53 倍于 cuDNN 的实现，而不是只展示一次成功输出。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "主实验在 A100-PCIE-40GB、CUDA 12.8 上覆盖 250 个 KernelBench 工作负载，三轮、每轮 6 个候选，最大预算 18。预算为 1 时，HIERA 的 fast₀ 为 71.6%、fast₁ 为 32.4%；预算为 18 时升至 92.4% 和 60.4%，高于 KernelBench-Caesar 的 85.2% 与 29.6%，也高于 CUDAForge 的 85.6% 与 44.8%。",
          "对 90 个随机任务，固定纯 CUDA 的最高加速可到 9.32 倍，但均值仅 1.00 倍且方差最大；HIERA 的均值为 1.42 倍、中位数 1.15 倍。去掉规划后，Level 2 的 fast₀ 从 99% 只降到 96%，但 fast₁/fast₂ 从 62%/20% 降到 6%/6%，支持“能跑”和“确实加速”需要不同决策。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "所有主实验在 A100、FP32 与特定三种基础模型上进行；其他 GPU、精度、batch 和多 GPU 场景没有验证。",
          "实现空间的选择规则仍由模型和人工整理的方向集合驱动，五类方向不是完整的性能诊断本体。",
          "candidate generation 有随机性，18 个候选的预算未必足够覆盖长尾 kernel。",
          "科学计算案例只有一个 stencil 配置，证明的是可行性，不是对任意科学 kernel 的广泛结论。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "CUDAForge、KernelBench-Caesar 等系统已经利用编译、正确性与性能反馈，但多在预设的实现空间内迭代。HIERA 把实现空间选择上移为显式规划，并把 fixed artifacts 写成合同。",
          "这与 8 月 17 日 T-LLM 的验证链和 8 月 22 日的启发式保证相呼应：前者强调候选必须先通过外部检查，后者强调要知道局部搜索的边界；HIERA 把这些原则落到 GPU 代码生成的候选预算和 profile 轨迹中。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "这是对 Agent-friendly kernel DSL 最直接的一篇参考。TileLang-TPU 的 Agent 不应一律 lower 到最底层后端；IR 可以声明可用的实现空间，例如高层算子、库调用、Tile DSL、目标专用指令，再让任务特征和真实 profile 选择。",
          "网页未来若继续积累论文，可将每次 kernel 阅读保存为同样的可审阅记录：固定合同、候选空间、实际编译日志、正确性结论、性能计数器、采取的动作和结果。这样读者能复用决策依据，而不只看到一条最终速度数字。",
        ],
      },
    ],
  },
  {
    id: "fortran-do-concurrent",
    date: "2026-08-24",
    title: "Portability of Fortran’s ‘do concurrent’ on GPUs II",
    chineseTitle: "Fortran 的 do concurrent 在三家 GPU 上的可移植性",
    arxiv: "2608.20586",
    source: "https://arxiv.org/abs/2608.20586",
    authors: "Ronald M. Caplan、Miko M. Stulajter、Jon A. Linker、Jeff Larkin、Nikolaos Tselepidis、Harald Servat、Shiquan Su、Giacomo Capodaglio、Johanna Potyka",
    version: "arXiv v1 · 2026-08-20 21:49 UTC（8 月 24 日阅读）",
    sections: [
      {
        heading: "它在处理什么",
        paragraphs: [
          "科学计算代码常有几十年积累。将它迁到 GPU 时，OpenACC、OpenMP target、CUDA 或 HIP 都能提供路径，但会引入额外 API、数据管理和厂商细节。Fortran 的 do concurrent 是标准语言结构：它声明循环迭代彼此无数据依赖，编译器可以据此并行化或卸载。",
          "论文在生产级 POT3D 求解器上重新检查这条路线在 NVIDIA、Intel、AMD 三家 GPU 上的状态。核心问题不是“标准语法能否写出”，而是纯 Fortran 能否运行、何时仍需要 OpenMP 管理内存和设备、以及多 GPU 与外部库会在哪些地方打破纯语言路径。",
        ],
      },
      {
        heading: "读懂它需要的最少背景",
        paragraphs: [
          "do concurrent 只承诺迭代可以乱序执行，不自动承诺所有循环都能高效映射到 GPU。对 stencil、逐点更新一类独立迭代，编译器容易建立大规模并行；对求和、最小值等归约，Fortran 2023 才增加 reduce 子句来表达依赖方式。",
          "CPU 与离散 GPU 的内存通常分开，而 Fortran 标准没有数据空间概念。统一内存可以让运行时自动迁移数据，代码因此保持零指令；但为了避免每个循环附近的隐式迁移，OpenMP target 的 enter/exit data 仍可能显著影响性能与兼容性。",
        ],
      },
      {
        heading: "3 分钟理解",
        paragraphs: [
          "作者维护两个 POT3D 分支。stdpar 只使用 ISO Fortran 和 do concurrent，依赖各平台的统一或自动分页内存；stdpar_ompdata 在数据移动和多 GPU 设备选择处加入少量 OpenMP target 指令。两者的核心数值循环保持相同。",
          "NVIDIA 用 nvfortran 的 -stdpar=gpu，Intel 用 ifx 的 do concurrent offload，AMD 用预发布 amdflang 的 do concurrent 到 OpenMP device 路径。多 GPU 通过 GPU-aware MPI 通信；必要时 OpenMP 的 use_device_addr 把 GPU 数组地址交给 MPI。",
        ],
      },
      {
        heading: "关键机制再拆一层",
        paragraphs: [
          "POT3D 的七点 stencil 是典型 do concurrent：每个格点读取邻居、写自己的输出。归约则使用 do concurrent ... reduce(+:cgdot)。这给编译器明确的并行语义，但没有为 ILU0 预条件器之类本质串行的稀疏分解提供自动方案。",
          "论文因此没有把标准语言当成排斥库调用的立场。PC2 的 ILU0 与三角求解通过 cuSPARSE、oneMKL SYCL、rocSPARSE 或 hipSPARSE 实现，Fortran 侧只保留很薄的 C 接口。标准并行适合表达规律循环，成熟库仍处理难以直接并行化的算法。",
        ],
      },
      {
        heading: "一个具体例子",
        paragraphs: [
          "对一个三维内部格点，do concurrent 中的 y(i,j,k) 从 x 的六个邻居和自身读取，写入自己的位置；没有两个迭代写同一元素，所以编译器可并行。若换成 cgdot = cgdot + x(i)×y(i)，就必须用 reduce 子句说明所有局部和如何合并。",
          "在纯 Fortran 路径上，程序不写任何数据移动指令。统一内存负责将数组留在或迁到 GPU；在手工路径上，程序显式 enter data、运行循环、再 exit data。两条路径数值相同，差别集中在运行时的数据管理和多设备归属。",
        ],
      },
      {
        heading: "实验与证据",
        paragraphs: [
          "作者在 NVIDIA、Intel、AMD 的单 GPU 和多 GPU 系统运行 POT3D。三家都能把纯 Fortran 的 do concurrent 代码卸载到 GPU；在单 GPU 上，NVIDIA 的纯 Fortran 略快于手工数据管理，AMD 两条路径接近，Intel 的纯 Fortran 版本则比手工数据移动慢超过 1.5 倍。",
          "多 GPU 中，GH200 上纯 Fortran 统一内存与 OpenMP 数据管理的运行时间几乎相同；AMD MI300A 上也接近，部分情况下纯 Fortran 略快。Intel B70 的纯 Fortran 能够扩展，但仍保持显著慢于手工路径。外部库 PC2 相对 PC1 在 GPU 上最高约快 2 倍，同时可能把显存需求提高到约 4 倍。",
        ],
      },
      {
        heading: "边界",
        bullets: [
          "论文刻意追求跨平台的功能与合理性能，不是各厂商硬件的极限性能对比；驱动、网络和编译器版本均可能改变结果。",
          "AMD 的纯 Fortran 统一内存当前依赖支持 HSA_XNACK 的数据中心 GPU；Intel 的共享系统 USM 也很新。",
          "POT3D 是强内存带宽受限的有限差分求解器，结论不能直接外推到 Tensor Core、低精度训练或不规则图计算。",
          "复杂控制流、派生类型、函数调用和并行预条件器仍是后续需要在更大 Fortran 代码库中验证的部分。",
        ],
      },
      {
        heading: "与相关工作的关系",
        paragraphs: [
          "这是 2024 年同主题工作的更新。此前 AMD 路径还主要依赖开发中的环境，Intel 纯 Fortran 的支持也较弱；本文加入 amdflang 与新的 Intel 统一内存能力，显示标准语言路径确实在扩展，但并未抹去数据管理差异。",
          "它与 8 月 19 日 DB-SpMSpV 和 8 月 23 日 HIERA 放在一起很有价值：三者都说明抽象层次不是单纯的语法选择。抽象能减少工程负担，但性能仍由数据移动、内存访问、任务形状和可调用库决定。",
        ],
      },
      {
        heading: "和你的研究的关系",
        paragraphs: [
          "TileLang-TPU、Tile for DSA 可以把 do concurrent 的经验理解为一条 DSL 设计准则：高层应先表达独立迭代、归约和数据生命周期，后端再决定线程、设备和传输；如果数据移动语义没有在 IR 中出现，就很难对可移植性能作出可靠判断。",
          "对 Agent 自动化，代码生成器应区分“循环可并行”和“在某一硬件栈上已经高效”。前者可以由依赖分析和类型规则验证；后者仍需真实编译、数据传输记录和跨后端测量。把这两类结论分开，才能避免把可编译的标准代码误读成已调优的后端实现。",
        ],
      },
    ],
  },
];
