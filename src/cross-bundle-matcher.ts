import { readFileSync } from 'fs';
import { resolve, relative } from 'path';

export interface BundleRule {
  name: string;
  patterns: string[]; // glob 或正则字符串
}

export class CrossBundleMatcher {
  private rules: BundleRule[] = [];

  constructor(rulesPath: string) {
    try {
      const content = readFileSync(resolve(rulesPath), 'utf-8');
      this.rules = JSON.parse(content) as BundleRule[];
    } catch {
      this.rules = [];
    }
  }

  match(changedFiles: string[]): string[] {
    const cwd = process.cwd();
    const matched = new Set<string>();
    changedFiles.forEach(abs => {
      const rel = relative(cwd, abs).replace(/\\/g, '/');
      this.rules.forEach(r => {
        if (r.patterns.some(p => new RegExp(p).test(rel))) {
          matched.add(r.name);
        }
      });
    });
    return Array.from(matched);
  }
}