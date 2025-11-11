import { resolve, relative } from 'path';

export interface EntryNode {
  module: { request: string };
  parents: Set<EntryNode>;
  children: Set<EntryNode>;
}

export type EntryNodeModulesMap = Map<string, EntryNode>;

export class MpxDependencyGraph {
  constructor(private map: EntryNodeModulesMap) {}

  findAffectedBy(changedFiles: string[]): string[] {
    const affected = new Set<string>();
    for (const [req, entry] of this.map) {
      if (changedFiles.some(f => f.endsWith(req))) {
        this.collectDownstream(entry, affected);
      }
    }
    return Array.from(affected);
  }

  private collectDownstream(node: EntryNode, affected: Set<string>) {
    affected.add(resolve(node.module.request));
    node.children.forEach(child => this.collectDownstream(child, affected));
  }
}