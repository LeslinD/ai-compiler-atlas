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
];
