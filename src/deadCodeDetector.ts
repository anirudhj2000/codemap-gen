import { Project, Symbol, Node } from "ts-morph";
import { Graph } from "graphlib";
import path from "node:path";
import { ComponentInfo } from "./scan/componentParser";
import { pageFileToRoute } from "./scan/pageRouteResolver";

export interface DeadReport {
  unusedFiles: string[];
  unusedExports: { file: string; exportName: string }[];
}

interface Options {
  project: Project;
  graph: Graph;
  pages: string[];      // entry roots
  apis: string[];       // entry roots
  repoRoot: string;
}

export function findDeadCode(opts: Options): DeadReport {
  const { project, graph, pages, apis, repoRoot } = opts;

  console.log("🔍 Analyzing dead code...");

  /* ---------- 1) Dead FILES ---------- */
  // roots = pages + api routes + special _app/_document
  const roots = new Set<string>([
    ...pages,
    ...apis,
    ...project
      .getSourceFiles()
      .filter((sf) =>
        /pages[\/\\]_(app|document)\.[tj]sx?$/.test(
          path.relative(repoRoot, sf.getFilePath())
        )
      )
      .map((sf) => sf.getFilePath()),
  ]);

  console.log(`📍 Found ${roots.size} entry points (pages + APIs)`);

  // mark reachable via DFS
  const reachable = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    (graph.successors(cur) ?? []).forEach((n) => stack.push(n));
  }

  const allNodes = graph.nodes() as string[];
  const unusedFiles = allNodes.filter((n) => !reachable.has(n));

  console.log(`📊 Reachable files: ${reachable.size}, Total files: ${allNodes.length}`);

  /* ---------- 2) Dead EXPORTS ---------- */
  const unusedExports: { file: string; exportName: string }[] = [];

  console.log("🔍 Analyzing unused exports...");

  project.getSourceFiles().forEach((sf) => {
    // skip whole-file dead → already in unusedFiles
    if (unusedFiles.includes(sf.getFilePath())) return;

    try {
      sf.getExportSymbols().forEach((sym) => {
        const exportName = sym.getName();
        const filePath = sf.getFilePath();
        
        // Check if this export is referenced by any other file
        // We'll use a simple heuristic: if the file has no incoming edges in our graph,
        // then its exports are likely unused
        const hasIncomingEdges = (graph.predecessors(filePath) ?? []).length > 0;
        
        // For now, we'll be conservative and only flag exports from files with no incoming edges
        // This is a simplified approach that avoids complex symbol analysis
        if (!hasIncomingEdges) {
          // Skip default exports from entry points (pages, APIs)
          if (exportName === 'default' && (pages.includes(filePath) || apis.includes(filePath))) {
            return;
          }
          
          unusedExports.push({
            file: filePath,
            exportName: exportName,
          });
        }
      });
    } catch (error) {
      console.warn(`⚠️  Could not analyze exports for ${path.relative(repoRoot, sf.getFilePath())}`);
    }
  });

  console.log(`🗑️  Found ${unusedFiles.length} unused files, ${unusedExports.length} unused exports`);

  return { unusedFiles, unusedExports };
} 