import { Project, SyntaxKind, SourceFile } from "ts-morph";

export interface ComponentInfo {
  name: string;
  file: string;
  imports: string[];   // relative import specifiers
}

export async function parseComponents(files: string[]): Promise<ComponentInfo[]> {
  const project = new Project({ tsConfigFilePath: undefined });
  const infos: ComponentInfo[] = [];

  console.log(`🔍 Parsing ${files.length} files for components and imports...`);

  files.forEach((file) => project.addSourceFileAtPath(file));

  project.getSourceFiles().forEach((sf) => {
    const exportDecl = sf.getExportedDeclarations();
    const filePath = sf.getFilePath();
    const imports = getImports(sf);
    
    // Check if this is a component file (JSX/TSX with exports)
    const hasJSX = sf.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 || 
                   sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;
    
    // Check if it's a hook (starts with 'use')
    const fileName = sf.getBaseName();
    const isHook = fileName.startsWith('use') && fileName.includes('.');
    
    // Check if it's a context file
    const isContext = fileName.toLowerCase().includes('context') || 
                     sf.getText().includes('createContext');
    
    // Process exports
    exportDecl.forEach((nodes, name) => {
      const node = nodes[0];
      const nodeHasJSX = node.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
                        node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;
      
      // Include if it's a component, hook, context, or has important exports
      if (nodeHasJSX || hasJSX || isHook || isContext || imports.length > 0) {
        infos.push({
          name,
          file: filePath,
          imports,
        });
      }
    });
    
    // Even if no exports, include files with imports (they might be important)
    if (exportDecl.size === 0 && imports.length > 0) {
      const fileName = sf.getBaseName().replace(/\.[^/.]+$/, '');
      infos.push({
        name: fileName,
        file: filePath,
        imports,
      });
    }
  });

  console.log(`✅ Found ${infos.length} components/files with imports`);
  return infos;
}

function getImports(sf: SourceFile) {
  return sf
    .getImportDeclarations()
    .map((d) => d.getModuleSpecifierValue())
    .filter((m) => m.startsWith(".")); // local only
} 