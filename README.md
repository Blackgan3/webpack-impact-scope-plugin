# webpack-impact-scope-plugin

在构建时自动分析代码改动影响面，支持 Mpx 组件/页面依赖反向追溯。

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
      branch: 'main',        // 可选，与指定 branch 对比差异
      outputPath: './impact-report',  // 输出目录
      enablePreview: true     // 是否启用预览服务器
    })
  ]
};
```

构建完成后，控制台会打印变更模块信息，同时生成 JSON 报告和 HTML 可视化文件。

## 插件选项

| 字段            | 类型     | 默认值                  | 说明 |
|-----------------|----------|-------------------------|------|
| commit          | string   | -                       | 对比的 Git 提交（SHA 或分支） |
| branch          | string   | -                       | 若提供，则与当前分支做 diff |
| outputPath      | string   | 'impact-report'         | 报告输出目录 |
| enablePreview   | boolean  | false                   | 是否启动预览服务器并自动打开浏览器 |

## 构建输出示例

控制台摘要：
```
Changed modules saved to .../changed-modules.json
Visualization generated at .../visualizer.html
Visualization server started at http://localhost:8088/visualizer.html
```

HTML 报告预览：
- 树状可视化展示变更模块及其父级依赖
- 支持展开/收起、全部展开/收起

## 高级使用（API）

你也可以在 Node 脚本里复用底层模块：

```js
const { GitDiffCollectorImpl } = require('webpack-impact-scope-plugin/src/git-diff-collector');
const { generateChangedModulesHtml } = require('webpack-impact-scope-plugin/src/visualizer');

// 示例：生成 HTML
generateChangedModulesHtml(changedModulesData, 'output.html');
```

## 特性

- ✅ 基于 Git 的 diff 采集，支持 commit / branch 双模式
- ✅ 自动追溯 Mpx 依赖树
- ✅ 生成 JSON 数据和 HTML 可视化报告
- ✅ 可选预览服务器，自动打开浏览器
- ✅ 零配置接入 Mpx 官方脚手架，构建即分析

## 开发与测试

```bash
# 安装依赖
pnpm i

# 运行单元测试
pnpm test

# 在 e2e 示例中验证
cd e2e/mpx-demo
npm run build
```