# webpack-impact-scope-plugin

在构建时自动分析代码改动影响面，支持 Mpx 组件/页面依赖反向追溯与跨端 bundle 规则匹配。

## 安装

```bash
pnpm add -D webpack-impact-scope-plugin
```

## 用法（webpack 插件）

在 `mpx.config.js` 或 `webpack.config.js` 中引入并配置：

```js
const { ImpactScopeWebpackPlugin } = require('webpack-impact-scope-plugin');

module.exports = {
  plugins: [
    new ImpactScopeWebpackPlugin({
      commit: 'HEAD',        // 可选，默认取当前分支最新 commit
      branch: 'main',        // 可选，与 branch 对比差异
      bundleRulePath: './bundle-rules.json',
      outputFormat: 'html',    // json | html | both
      outputPath: './impact-report.html'
    })
  ]
};
```

构建完成后，控制台会打印影响摘要，同时生成可视化报告文件。

## 插件选项

| 字段            | 类型     | 默认值                  | 说明 |
|-----------------|----------|-------------------------|------|
| commit          | string   | 'HEAD'                  | 对比的 Git 提交（SHA 或分支） |
| branch          | string   | -                       | 若提供，则与当前分支做 diff |
| bundleRulePath  | string   | './bundle-rules.json'   | 跨端 bundle 规则文件 |
| outputFormat    | string   | 'html'                  | 输出格式：json / html / both |
| outputPath      | string   | './impact-report.html'  | 报告文件路径（format 含 html 时） |

## 构建输出示例

控制台摘要：
```
[ImpactScopeWebpackPlugin] 3 files changed, 2 Mpx entries affected, 1 bundle matched.
  Affected entries: src/pages/index.mpx, src/pages/user.mpx
  Matched bundles: home
```

HTML 报告预览：
- 顶部展示变更文件列表与统计
- 中部为 Mpx 依赖反向追溯图（可展开）
- 底部列出命中 bundle 规则及对应文件

## 示例数据

bundle-rules.json（插件自动读取，无需手动传入）
```json
[
  { "name": "home", "patterns": ["src/home/.*"] },
  { "name": "user", "patterns": ["src/user/.*", "src/components/user-.*"] }
]
```

## 高级使用（API）

你也可以在 Node 脚本里复用底层模块：

```ts
import { GitDiffCollectorImpl, ImpactAnalyzer, MpxDependencyGraph, CrossBundleMatcher } from 'webpack-impact-scope-plugin';

const git = new GitDiffCollectorImpl();
const graph = new MpxDependencyGraph(map); // map 来自构建脚本导出的 entryNodeModulesMap
const matcher = new CrossBundleMatcher('./bundle-rules.json');
const analyzer = new ImpactAnalyzer(git, graph, matcher);

const report = await analyzer.analyzeByCommit();
console.log(report);
```

## 特性

- ✅ 基于 Git 的 diff 采集，支持 commit / branch 双模式
- ✅ 自动读取 Mpx `entryNodeModulesMap`，反向追溯组件/页面依赖链
- ✅ 支持自定义跨端 bundle 规则匹配，精准定位业务包影响范围
- ✅ 多格式输出：JSON 供下游消费，HTML 可视化报告
- ✅ 零配置接入 Mpx 官方脚手架，构建即分析

## 开发与测试

```bash
# 安装依赖
pnpm i

# 运行单元测试
pnpm test

# 编译插件
pnpm build

# 在 e2e 示例中验证
pnpm --filter e2e/mpx-app build
```