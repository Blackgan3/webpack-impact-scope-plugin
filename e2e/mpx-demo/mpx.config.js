const { defineConfig } = require('@vue/cli-service')
const { ImpactScopeWebpackPlugin } = require('../../src/ImpactScopeWebpackPlugin.js')

module.exports = defineConfig({
  outputDir: `dist/${process.env.MPX_CURRENT_TARGET_MODE}`,
  pluginOptions: {
    mpx: {
      plugin: {
        srcMode: 'wx',
        hackResolveBuildDependencies: ({ files, resolveDependencies }) => {
          const path = require('path')
          const packageJSONPath = path.resolve('package.json')
          if (files.has(packageJSONPath)) files.delete(packageJSONPath)
          if (resolveDependencies.files.has(packageJSONPath)) {
            resolveDependencies.files.delete(packageJSONPath)
          }
        }
      },
      loader: {}
    }
  },
  /**
   * 如果希望node_modules下的文件时对应的缓存可以失效，
   * 可以将configureWebpack.snap.managedPaths修改为 []
   */
  configureWebpack(config) {
    config.cache = false;
    config.plugins = config.plugins || []
    config.plugins.push(new ImpactScopeWebpackPlugin({
      bundleRulePath: './bundle-rules.json',
      enablePreview: true
    }))
  }
})
