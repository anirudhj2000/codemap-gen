import { Graph } from "graphlib";
import { ComponentInfo } from "../scan/componentParser";
import { pageFileToRoute } from "../scan/pageRouteResolver";

export interface MapJSON {
  pages: any[];
  components: any[];
  apis: any[];
  utils: any[];
  hooks: any[];
  contexts: any[];
  types: any[];
  dead?: {
    unusedFiles: string[];
    unusedExports: { file: string; exportName: string }[];
  };
}

export function buildGraph(
  comps: ComponentInfo[],
  repoFiles: any,
  repoRoot: string
): { map: MapJSON; graph: Graph } {
  const g = new Graph({ directed: true });

  // Add all files as nodes
  const allFiles = [
    ...comps,
    ...repoFiles.utils.map((f: string) => ({ name: getFileBaseName(f), file: f, imports: [] })),
    ...repoFiles.hooks.map((f: string) => ({ name: getFileBaseName(f), file: f, imports: [] })),
    ...repoFiles.contexts.map((f: string) => ({ name: getFileBaseName(f), file: f, imports: [] })),
    ...repoFiles.types.map((f: string) => ({ name: getFileBaseName(f), file: f, imports: [] })),
  ];

  allFiles.forEach((f) => g.setNode(f.file, f));

  // Build edges from component imports
  comps.forEach((c) => {
    c.imports.forEach((imp) => {
      // Try to resolve relative imports to actual files
      const target = allFiles.find((x) => 
        x.file.endsWith(`${imp}.tsx`) || 
        x.file.endsWith(`${imp}.ts`) || 
        x.file.endsWith(`${imp}.jsx`) || 
        x.file.endsWith(`${imp}.js`) ||
        x.file.includes(`${imp}/index.`)
      );
      if (target) g.setEdge(c.file, target.file);
    });
  });

  // Helper function to create file info with relationships
  const createFileInfo = (file: string, category: string) => {
    const name = getFileBaseName(file);
    return {
      name,
      file,
      category,
      uses: g.successors(file) ?? [],
      usedBy: g.predecessors(file) ?? [],
    };
  };

  // Produce JSON with all categories
  const map: MapJSON = {
    pages: repoFiles.pages.map((f: string) => ({ 
      route: pageFileToRoute(f, repoRoot), 
      file: f,
      name: getFileBaseName(f),
      uses: g.successors(f) ?? [],
      usedBy: g.predecessors(f) ?? [],
    })),
    components: comps.map((c) => ({
      name: c.name,
      file: c.file,
      category: 'component',
      uses: g.successors(c.file) ?? [],
      usedBy: g.predecessors(c.file) ?? [],
    })),
    apis: repoFiles.apis.map((f: string) => createFileInfo(f, 'api')),
    utils: repoFiles.utils.map((f: string) => createFileInfo(f, 'util')),
    hooks: repoFiles.hooks.map((f: string) => createFileInfo(f, 'hook')),
    contexts: repoFiles.contexts.map((f: string) => createFileInfo(f, 'context')),
    types: repoFiles.types.map((f: string) => createFileInfo(f, 'type')),
  };

  return { map, graph: g };
}

function getFileBaseName(filePath: string): string {
  const fileName = filePath.split('/').pop() || '';
  return fileName.replace(/\.[^/.]+$/, ''); // Remove extension
} 