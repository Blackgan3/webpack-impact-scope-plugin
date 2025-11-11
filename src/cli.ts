#!/usr/bin/env node
import { Command } from 'commander';
import { GitDiffCollectorImpl } from './git-diff-collector';
import { MpxDependencyGraph } from './mpx-dependency-graph';
import { CrossBundleMatcher } from './cross-bundle-matcher';
import { ImpactAnalyzer } from './impact-analyzer';
import { printTable, generateHtml } from './visualizer';
import { existsSync } from 'fs';
import { resolve } from 'path';

const program = new Command();

program
  .name('impact')
  .description('Analyze the impact scope of changed files')
  .option('-c, --commit <id>', 'analyze by commit id (default HEAD)')
  .option('-b, --branch <base>', 'analyze by branch diff')
  .option('-m, --mpx-map <path>', 'path to entryNodeModulesMap JSON')
  .option('-r, --bundle-rule <path>', 'path to cross-bundle rules JSON')
  .option('-f, --format <type>', 'output format: table | html', 'table')
  .option('-o, --output <file>', 'output file for html format', 'impact.html')
  .action(async (opts) => {
    const git = new GitDiffCollectorImpl();
    let graph;
    if (opts.mpxMap && existsSync(opts.mpxMap)) {
      const map = require(resolve(opts.mpxMap));
      graph = new MpxDependencyGraph(map);
    }
    let matcher;
    if (opts.bundleRule && existsSync(opts.bundleRule)) {
      matcher = new CrossBundleMatcher(opts.bundleRule);
    }
    const analyzer = new ImpactAnalyzer(git, graph, matcher);

    const report = opts.branch
      ? await analyzer.analyzeByBranch(opts.branch)
      : await analyzer.analyzeByCommit(opts.commit);

    if (opts.format === 'html') {
      generateHtml(report, opts.output);
      console.log(`HTML report written to ${opts.output}`);
    } else {
      printTable(report);
    }
  });

program.parse(process.argv);