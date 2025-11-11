const { ImpactAnalyzer } = require('../impact-analyzer');
const { GitDiffCollectorImpl } = require('../git-diff-collector');
const { MpxDependencyGraph } = require('../mpx-dependency-graph');
const { CrossBundleMatcher } = require('../cross-bundle-matcher');
const { writeFileSync, mkdirSync, rmSync } = require('fs');
const { resolve } = require('path');

const tmp = resolve(__dirname, '../../tmp-test');
beforeAll(() => mkdirSync(tmp, { recursive: true }));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('ImpactAnalyzer', () => {
  it('should return changed files only when no graph/matcher', async () => {
    // mock git
    const git = new GitDiffCollectorImpl(tmp);
    git.git = { show: async () => 'src/a.ts\nsrc/b.ts\n' };

    const analyzer = new ImpactAnalyzer(git);
    const report = await analyzer.analyzeByCommit();
    expect(report.changedFiles).toHaveLength(2);
    expect(report.affectedMpxEntries).toEqual([]);
    expect(report.affectedBundles).toEqual([]);
  });

  it('should find affected mpx entries', async () => {
    const map = new Map();
    const rootNode = {
      module: { request: './app.mpx' },
      parents: new Set(),
      children: new Set()
    };
    const childNode = {
      module: { request: './src/pages/index.mpx' },
      parents: new Set([rootNode]),
      children: new Set()
    };
    rootNode.children.add(childNode);
    map.set('./app.mpx', rootNode);
    map.set('./src/pages/index.mpx', childNode);

    const graph = new MpxDependencyGraph(map);
    const git = new GitDiffCollectorImpl(tmp);
    git.git = { show: async () => 'src/pages/index.mpx' };
    git.listChangedFiles = jest.fn().mockResolvedValue(['src/pages/index.mpx']);

    const analyzer = new ImpactAnalyzer(git, graph);
    const report = await analyzer.analyzeByCommit();
    expect(report.affectedMpxEntries).toContain(resolve('src/pages/index.mpx'));
  });

  it('should match bundle rules', async () => {
    const rulesPath = resolve(tmp, 'rules.json');
    writeFileSync(rulesPath, JSON.stringify([{ name: 'home', patterns: ['src/home/.*'] }]));
    const matcher = new CrossBundleMatcher(rulesPath);
    const git = new GitDiffCollectorImpl(tmp);
    git.git = { show: async () => 'src/home/main.ts\n' };

    const analyzer = new ImpactAnalyzer(git, undefined, matcher);
    const report = await analyzer.analyzeByCommit();
    expect(report.affectedBundles).toEqual(['home']);
  });
});