const simpleGit = require('simple-git');
const { resolve } = require('path');

class GitDiffCollectorImpl {
  constructor(repoPath = process.cwd()) {
    this.git = simpleGit(repoPath);
    this.root = null; // Will be set lazily
  }

  async init() {
    if (!this.root) {
      this.root = (await this.git.revparse(['--show-toplevel'])).trim();
    }
  }

  async listChangedFiles(commitId) {
    await this.init();
    const id = commitId || 'HEAD';
    const summary = await this.git.show(['--name-only', '--format=', id]);
    return this.parseFiles(summary); 
  }

  async listChangedFilesBetweenBranches(baseBranch) {
    await this.init();
    const summary = await this.git.diff(['--name-only', `${baseBranch}...HEAD`]);
    return this.parseFiles(summary);
  }

  parseFiles(output) {
    return output
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(f => {
        const resolved = resolve(this.root, f);
        // Convert absolute path to relative path to avoid duplication
        return require('path').relative(this.root, resolved);
      });
  }
}

module.exports = { GitDiffCollectorImpl }