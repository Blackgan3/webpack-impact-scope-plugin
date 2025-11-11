const { GitDiffCollectorImpl } = require('./git-diff-collector')
const { generateChangedModulesHtml } = require('./visualizer')
const express = require('express');

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

  buildEntryNodeModulesMap(modules, context) {
    const entryMap = new Map();
    const moduleArray = Array.from(modules);
    
    // 过滤出 .mpx 文件
    const mpxModules = moduleArray.filter((m) => 
      m.resource && m.resource.includes('.mpx')
    );
    
    console.log('Found .mpx modules:', mpxModules.map((m) => m.resource));
    
    // 为每个 .mpx 模块创建 entry node
    mpxModules.forEach((module) => {
      const request = module.resource;
      // 使用相对于项目根目录的路径，与 git diff 收集器保持一致
       const relativePath = require('path').relative(context, request);
      
      entryMap.set(relativePath, {
        module: { request: relativePath },
        parents: new Set(),
        children: new Set()
      });
    });
    
    return entryMap;
  }

  apply(compiler) {
    const { commit, branch, bundleRulePath, outputPath, enablePreview } = this.options

    compiler.hooks.compilation.tap('ImpactScopeWebpackPlugin', (compilation) => {

      compilation.hooks.buildModule.tap('ImpactScopeWebpackPlugin', (module) => {
        if (module.request && module.resource && module.resource.includes('.mpx')) {
          this.idModuleMap.set(module.rawRequest, module);
        }
      });

      compilation.hooks.finishModules.tapAsync('ImpactScopeWebpackPlugin', async (modules, callback) => {
        try {
          // 1. 收集 git diff
          const git = new GitDiffCollectorImpl(compiler.context)
          const relativeChangedFiles = commit ? await git.listChangedFiles(commit) : await git.listChangedFiles()
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
            const mpxModule = mpx?.getEntryNode(module)
            if (mpxModule) {
              const tree = buildParentTree(mpxModule);
              changedModules.push(tree);
            }
          })

          // 将 changedModules 写入 JSON 文件
          const fs = require('fs');
          const path = require('path');
          const jsonPath = path.resolve(compiler.context, outputPath, 'changed-modules.json');
          // ensure dir exist
          fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
          fs.writeFileSync(jsonPath, JSON.stringify(changedModules, null, 2));
          console.log(`Changed modules saved to ${jsonPath}`);

          // 生成静态 HTML
          const htmlPath = path.resolve(compiler.context, outputPath, 'visualizer.html');
          generateChangedModulesHtml(changedModules, htmlPath);
          console.log(`Visualization generated at ${htmlPath}`);

          if (enablePreview) {
            this.startPreviewServer(path.dirname(htmlPath));
          }

          callback()
        } catch (err) {
          callback(err)
        }
      })
    })
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