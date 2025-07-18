import fg from "fast-glob";
import path from "node:path";
import fs from "node:fs/promises";

export interface RepoFiles {
  components: string[];
  pages: string[];
  apis: string[];
  utils: string[];
  hooks: string[];
  contexts: string[];
  types: string[];
}

export async function scanRepo(root: string): Promise<RepoFiles> {
  console.log(`🔍 Exploring repository structure...`);
  
  // First, discover all relevant files
  const allFiles = await fg([
    "**/*.{ts,tsx,js,jsx}",
    "!node_modules/**",
    "!dist/**",
    "!build/**",
    "!.next/**",
    "!coverage/**",
    "!**/*.d.ts",
    "!**/*.test.*",
    "!**/*.spec.*",
    "!**/*.stories.*"
  ], { 
    cwd: root, 
    absolute: true,
    onlyFiles: true
  });

  console.log(`📁 Found ${allFiles.length} files to analyze`);

  // Categorize files based on patterns and content
  const categorized = await categorizeFiles(allFiles, root);
  
  // Log discovered patterns
  Object.entries(categorized).forEach(([category, files]) => {
    if (files.length > 0) {
      console.log(`  ${getCategoryEmoji(category)} ${category}: ${files.length} files`);
    }
  });

  return categorized;
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    components: "🧩",
    pages: "📄",
    apis: "🔌",
    utils: "🛠️",
    hooks: "🪝",
    contexts: "🔄",
    types: "📝"
  };
  return emojis[category] || "📁";
}

async function categorizeFiles(files: string[], root: string): Promise<RepoFiles> {
  const result: RepoFiles = {
    components: [],
    pages: [],
    apis: [],
    utils: [],
    hooks: [],
    contexts: [],
    types: []
  };

  for (const file of files) {
    const relativePath = path.relative(root, file);
    const fileName = path.basename(file);
    const dirName = path.dirname(relativePath);
    
    // Quick content preview to help categorize
    const category = await categorizeFile(file, relativePath, fileName, dirName);
    if (category && result[category as keyof RepoFiles]) {
      (result[category as keyof RepoFiles] as string[]).push(file);
    }
  }

  return result;
}

async function categorizeFile(
  filePath: string, 
  relativePath: string, 
  fileName: string, 
  dirName: string
): Promise<string | null> {
  try {
    // First, categorize by path patterns
    const pathCategory = categorizeByPath(relativePath, fileName, dirName);
    if (pathCategory) return pathCategory;

    // If path doesn't give us a clear category, peek at content
    const content = await fs.readFile(filePath, 'utf8');
    return categorizeByContent(content, fileName, relativePath);
    
  } catch (error) {
    console.warn(`⚠️  Could not analyze ${relativePath}: ${error}`);
    return null;
  }
}

function categorizeByPath(relativePath: string, fileName: string, dirName: string): string | null {
  const lowercasePath = relativePath.toLowerCase();
  const lowercaseDir = dirName.toLowerCase();
  const lowercaseFile = fileName.toLowerCase();

  // API routes
  if (lowercasePath.includes('api/') || lowercasePath.includes('pages/api/') || lowercasePath.includes('app/api/')) {
    return 'apis';
  }

  // Pages (Next.js patterns)
  if (lowercaseDir.includes('pages') && !lowercaseDir.includes('api')) {
    return 'pages';
  }
  if (lowercaseDir.includes('app') && (lowercaseFile === 'page.tsx' || lowercaseFile === 'page.ts' || lowercaseFile === 'page.jsx' || lowercaseFile === 'page.js')) {
    return 'pages';
  }

  // Components
  if (lowercaseDir.includes('component') || lowercaseDir.includes('ui') || lowercaseDir.includes('widget')) {
    return 'components';
  }

  // Hooks
  if (lowercaseFile.startsWith('use') || lowercaseDir.includes('hook')) {
    return 'hooks';
  }

  // Contexts
  if (lowercaseFile.includes('context') || lowercaseFile.includes('provider') || lowercaseDir.includes('context')) {
    return 'contexts';
  }

  // Utils
  if (lowercaseDir.includes('util') || lowercaseDir.includes('helper') || lowercaseDir.includes('lib')) {
    return 'utils';
  }

  // Types
  if (lowercaseFile.includes('type') || lowercaseFile.includes('interface') || lowercaseDir.includes('type')) {
    return 'types';
  }

  return null;
}

function categorizeByContent(content: string, fileName: string, relativePath: string): string | null {
  const lines = content.split('\n').slice(0, 50); // Only check first 50 lines for performance
  const contentStr = lines.join('\n').toLowerCase();

  // Check for React components (JSX/TSX)
  if (content.includes('return (') && (content.includes('<') || content.includes('jsx') || content.includes('tsx'))) {
    if (contentStr.includes('export default') || contentStr.includes('export const') || contentStr.includes('export function')) {
      return 'components';
    }
  }

  // Check for custom hooks
  if (fileName.startsWith('use') && (content.includes('useState') || content.includes('useEffect') || content.includes('useCallback'))) {
    return 'hooks';
  }

  // Check for contexts
  if (content.includes('createContext') || content.includes('Provider') || content.includes('useContext')) {
    return 'contexts';
  }

  // Check for API handlers
  if (content.includes('req:') || content.includes('res:') || content.includes('NextApiRequest') || content.includes('Response')) {
    return 'apis';
  }

  // Check for utility functions
  if (content.includes('export const') || content.includes('export function')) {
    // If it's not JSX and has exports, likely a utility
    if (!content.includes('return (') && !content.includes('<')) {
      return 'utils';
    }
  }

  // Check for type definitions
  if (content.includes('interface ') || content.includes('type ') || content.includes('enum ')) {
    return 'types';
  }

  // Default to components for .tsx/.jsx files, utils for .ts/.js files
  if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
    return 'components';
  }
  if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
    return 'utils';
  }

  return null;
} 