import { Compiler, WebpackPluginInstance } from 'webpack'
import { GitDiffCollectorImpl } from './git-diff-collector'
import { MpxDependencyGraph } from './mpx-dependency-graph'
import { CrossBundleMatcher } from './cross-bundle-matcher'
import { ImpactAnalyzer } from './impact-analyzer'
import { generateHtml } from './visualizer'
import { resolve } from 'path'

export interface ImpactScopeWebpackPluginOptions {
  commit?: string
  branch?: string
  bundleRulePath?: string
  outputFormat?: 'json' | 'html'
  outputPath?: string
}

export class ImpactScopeWebpackPlugin implements WebpackPluginInstance {
  constructor(private options: ImpactScopeWebpackPluginOptions = {}) {}

  apply(compiler: Compiler) {
    const { commit, branch, bundleRulePath, outputFormat = 'json', outputPath = 'impact-report.json' } = this.options

    compiler.hooks.compilation.tap('ImpactScopeWebpackPlugin', (compilation) => {
      compilation.hooks.finishModules.tapAsync('ImpactScopeWebpackPlugin', async (modules, callback) => {
        try {
          // 1. 收集 git diff
          const git = new GitDiffCollectorImpl(compiler.context)
          const changedFiles = commit ? await git.listChangedFiles(commit) : await git.listChangedFiles()

          // 2. 构建依赖图（从 mpx.entryNodeModulesMap 读取）
          const entryMap = (compilation as any).entryNodeModulesMap || new Map()
          const graph = new MpxDependencyGraph(entryMap)

          // 3. 匹配 bundle 规则
          const matcher = bundleRulePath ? new CrossBundleMatcher(resolve(bundleRulePath)) : undefined

          // 4. 分析影响面
          const analyzer = new ImpactAnalyzer(git, graph, matcher)
          const report = await analyzer.analyzeByCommit()

          // 5. 可视化输出
          if (outputFormat === 'html') {
            generateHtml(report, resolve(outputPath))
          } else {
            require('fs').writeFileSync(resolve(outputPath), JSON.stringify(report, null, 2))
          }

          callback()
        } catch (err) {
          callback(err as Error)
        }
      })
    })
  }
}