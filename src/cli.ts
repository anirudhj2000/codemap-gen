#!/usr/bin/env node
import { Command } from "commander";
import { Project } from "ts-morph";
import { scanRepo } from "./scan/fileScanner";
import { parseComponents } from "./scan/componentParser";
import { buildGraph } from "./graph/buildGraph";
import { writeMap } from "./output/writeOutput";
import { findDeadCode } from "./deadCodeDetector";
import path from "node:path";

const program = new Command();
program
  .name("codemap-gen")
  .description("Generate a code map for React/Next.js repos")
  .option("-p, --path <repo>", "path to repo", ".")
  .option("-o, --output <file>", "output json", "code-map.json")
  .parse(process.argv);

(async () => {
  const opts = program.opts();
  const repoRoot = path.resolve(process.cwd(), opts.path);
  console.log("🔍 scanning", repoRoot);

  const files = await scanRepo(repoRoot);
  
  // Parse all relevant files that might contain components or imports
  const allComponentFiles = [
    ...files.components,
    ...files.pages,
    ...files.hooks,
    ...files.contexts
  ];
  
  const comps = await parseComponents(allComponentFiles);
  const { map, graph } = buildGraph(comps, files, repoRoot);
  
  // ---------- NEW: dead-code analysis ----------
  console.log("🔍 Starting dead code analysis...");
  const project = new Project({ tsConfigFilePath: undefined });
  
  // Add all analyzed files to the project
  allComponentFiles.forEach((f) => project.addSourceFileAtPath(f));
  files.utils.forEach((f: string) => project.addSourceFileAtPath(f));
  files.types.forEach((f: string) => project.addSourceFileAtPath(f));
  files.apis.forEach((f: string) => project.addSourceFileAtPath(f));
  
  const deadReport = findDeadCode({
    project,
    graph,
    pages: files.pages,
    apis: files.apis,
    repoRoot,
  });

  // Attach dead code report to the map
  map.dead = deadReport;

  await writeMap(path.resolve(opts.output), map);
  
  // Pretty-print dead code summary to console
  console.log(`\n📊 Dead Code Summary:`);
  console.log(`🗑️  Unused files: ${deadReport.unusedFiles.length}`);
  console.log(`🗑️  Unused exports: ${deadReport.unusedExports.length}`);
  
  if (deadReport.unusedFiles.length > 0) {
    console.log(`\n📁 Unused files:`);
    deadReport.unusedFiles.forEach(f => {
      console.log(`  • ${path.relative(repoRoot, f)}`);
    });
  }
  
  if (deadReport.unusedExports.length > 0) {
    console.log(`\n📤 Unused exports:`);
    deadReport.unusedExports.forEach(exp => {
      console.log(`  • ${exp.exportName} in ${path.relative(repoRoot, exp.file)}`);
    });
  }
})();
