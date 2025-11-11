import simpleGit, { SimpleGit } from 'simple-git';
import { resolve } from 'path';

export interface GitDiffCollector {
  listChangedFiles(commitId?: string): Promise<string[]>;
  listChangedFilesBetweenBranches(baseBranch: string): Promise<string[]>;
}

export class GitDiffCollectorImpl implements GitDiffCollector {
  private git: SimpleGit;
  private root: string;

  constructor(repoPath: string = process.cwd()) {
    this.root = resolve(repoPath);
    this.git = simpleGit(this.root);
  }

  async listChangedFiles(commitId?: string): Promise<string[]> {
    const id = commitId || 'HEAD';
    const summary = await this.git.show(['--name-only', '--format=', id]);
    return this.parseFiles(summary);
  }

  async listChangedFilesBetweenBranches(baseBranch: string): Promise<string[]> {
    const summary = await this.git.diff(['--name-only', `${baseBranch}...HEAD`]);
    return this.parseFiles(summary);
  }

  private parseFiles(output: string): string[] {
    return output
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(f => resolve(this.root, f));
  }
}