import { GitDiffCollector } from './git-diff-collector';
import { MpxDependencyGraph, EntryNodeModulesMap } from './mpx-dependency-graph';
import { CrossBundleMatcher } from './cross-bundle-matcher';

export interface ImpactReport {
  changedFiles: string[];
  affectedMpxEntries: string[];
  affectedBundles: string[];
}

export class ImpactAnalyzer {
  constructor(
    private gitCollector: GitDiffCollector,
    private graph?: MpxDependencyGraph,
    private bundleMatcher?: CrossBundleMatcher
  ) {}

  async analyzeByCommit(commitId?: string): Promise<ImpactReport> {
    const changed = await this.gitCollector.listChangedFiles(commitId);
    return this.buildReport(changed);
  }

  async analyzeByBranch(baseBranch: string): Promise<ImpactReport> {
    const changed = await this.gitCollector.listChangedFilesBetweenBranches(baseBranch);
    return this.buildReport(changed);
  }

  private buildReport(changed: string[]): ImpactReport {
    const mpx = this.graph ? this.graph.findAffectedBy(changed) : [];
    const bundles = this.bundleMatcher ? this.bundleMatcher.match(changed) : [];
    return { changedFiles: changed, affectedMpxEntries: mpx, affectedBundles: bundles };
  }
}