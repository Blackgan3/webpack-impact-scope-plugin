const { GitDiffCollectorImpl } = require('./git-diff-collector')
const { generateChangedModulesHtml } = require('./visualizer')
const express = require('express')
const fs = require('fs')
const path = require('path')
class ImpactScopeWebpackPlugin {
  constructor(options = {}) {
    this.options = {
      enablePreview: false,
      outputPath: 'impact-report',
      ...options
    }
    this.idModuleMap = new Map()
    this.server = null
  }

  apply(compiler) {
    const { commit, branch, outputPath, enablePreview } = this.options

    compiler.hooks.compilation.tap('ImpactScopeWebpackPlugin', (compilation) => {
      compilation.hooks.finishModules.tapAsync('ImpactScopeWebpackPlugin', async (modules, callback) => {
        try {
          for (const module of modules) {
            if (module.request && module.resource && module.resource.includes('.mpx')) {
              const normalizedRequest = module.rawRequest.split('?')[0];
              this.idModuleMap.set(normalizedRequest, module);
            }
          }
          // 1. 收集 git diff
          const git = new GitDiffCollectorImpl(compiler.context)
          let relativeChangedFiles;
          if (branch) {
            relativeChangedFiles = await git.listChangedFilesBetweenBranches(branch);
          } else if (commit) {
            relativeChangedFiles = await git.listChangedFiles(commit);
          } else {
            relativeChangedFiles = await git.listChangedFiles();
          }
          const changedFiles = relativeChangedFiles.map(file => require('path').resolve(git.root, file));
          const mpx = compilation.__mpx__ || {}
          
          // 2. 获取changedModules，从this.idModuleMap中获取
          const changedModules = []

          const buildParentTree = (node) => {
            if (!node) return null;
            return {
              id: node.module.rawRequest || node.module.request,
              parent: Array.from(node.parents).map(parent => buildParentTree(parent))
            };
          };

          changedFiles.map(file => {
            const module = this.idModuleMap.get(file)
            if (module) {
              const mpxModule = mpx?.getEntryNode(module)
              if (mpxModule) {
                const tree = buildParentTree(mpxModule);
                changedModules.push(tree);
              }
            }
          })

          // 将 changedModules 写入 JSON 文件
          const jsonPath = path.resolve(compiler.context, outputPath, 'changed-modules.json');
          // ensure dir exist
          fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
          fs.writeFileSync(jsonPath, JSON.stringify(changedModules, null, 2));

          // 生成静态 HTML
          const htmlPath = path.resolve(compiler.context, outputPath, 'visualizer.html');
          generateChangedModulesHtml(changedModules, htmlPath);

          callback()
        } catch (err) {
          callback(err)
        }
      })
    })

    compiler.hooks.done.tap('ImpactScopeWebpackPlugin', (stats) => {
      if (enablePreview) {
        const outputDir = path.resolve(compiler.context, outputPath);
        this.startPreviewServer(outputDir);
      }
    });
  }

  startPreviewServer(outputDir) {
    if (this.server) {
      console.log('Closing existing server...');
      this.server.close(() => {
        console.log('Restarting server...');
        this.runServer(outputDir);
      });
    } else {
      this.runServer(outputDir);
    }
  }

  runServer(outputDir) {
    const app = express();
    const port = 8088;

    app.use(express.static(outputDir));

    this.server = app.listen(port, () => {
      console.log(`Visualization server started at http://localhost:${port}/visualizer.html`);
      // 自动打开浏览器
      const { exec } = require('child_process');
      exec(`open http://localhost:${port}/visualizer.html`);
    });

    this.server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use. Please close the process and try again.`);
      } else {
        console.error(err);
      }
    });
  }
}

module.exports = { ImpactScopeWebpackPlugin }