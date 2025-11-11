import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { ImpactReport } from './impact-analyzer';

export function printTable(report: ImpactReport): void {
  console.log('\n📦 Changed Files');
  report.changedFiles.forEach(f => console.log(`  • ${f}`));
  console.log('\n🎯 Affected Mpx Entries');
  report.affectedMpxEntries.forEach(f => console.log(`  • ${f}`));
  console.log('\n📱 Affected Cross-Bundles');
  report.affectedBundles.forEach(b => console.log(`  • ${b}`));
}

export function generateHtml(report: ImpactReport, outPath: string): void {
  const nodes = [
    ...report.changedFiles.map(f => `"${f}"`),
    ...report.affectedMpxEntries.map(f => `"${f}"`),
    ...report.affectedBundles.map(b => `"bundle:${b}"`)
  ].join(',');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Impact Analysis</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
</head>
<body>
  <h2>Impact Graph</h2>
  <div class="mermaid">
    graph TD;
      ${nodes}
  </div>
  <script>mermaid.initialize({startOnLoad:true});</script>
</body>
</html>`;
  writeFileSync(resolve(outPath), html, 'utf-8');
}