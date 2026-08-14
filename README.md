# AI 编译器论文地图

这是一个面向 AI 编译器、Kernel DSL、专用加速器、测试与 Agent 系统的论文阅读工作台。它按自然日组织论文，保留来源、版本、证据、阅读问题和跨论文比较，方便回到原文核对。

## 本地运行

需要 Node.js 22。

```bash
npm ci
PAGES_DEPLOY=1 npm run build:pages
```

静态页面会生成在 `dist/client`。

## 内容边界

- 阅读归属日与论文的 arXiv 版本日期分开记录。
- 当日尚未完成原文核验时，页面会标为采集中。
- 站内的研究关联需要回到具体论文和证据核对，不把相关性写成因果关系。

历史全文精读保存在 `public/historical-insights.html`；每日条目和研究地图数据在 `app/` 目录中。
