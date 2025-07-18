# CodeMap Generator

A powerful tool for analyzing React/Next.js codebases, generating comprehensive code maps, and detecting dead code.

## Features

### 🔍 **Exploratory Code Analysis**
- **Smart Discovery**: Automatically discovers all relevant files in your codebase
- **Multi-Category Classification**: Organizes files into components, pages, APIs, utils, hooks, contexts, and types
- **Path + Content Analysis**: Uses both folder patterns and file content to accurately categorize files
- **Framework Support**: Works with Next.js (Pages Router & App Router), React, and various project structures

### 📊 **Comprehensive Code Mapping**
- **Dependency Graphs**: Builds who-imports-whom relationships
- **File Categories**: 
  - 🧩 Components (React components with JSX)
  - 📄 Pages (Route pages)
  - 🔌 APIs (Backend handlers)
  - 🛠️ Utils (Utility functions)
  - 🪝 Hooks (React hooks)
  - 🔄 Contexts (React contexts)
  - 📝 Types (TypeScript definitions)

### 🗑️ **Dead Code Detection**
- **Unused Files**: Identifies files that are never imported or used
- **Unused Exports**: Finds exports that are never imported elsewhere
- **Entry Point Analysis**: Uses pages and API routes as entry points for reachability analysis
- **CI/CD Integration**: Fail builds when dead code is detected

## Installation

```bash
npm install -g codemap-gen
```

Or use directly with npx:
```bash
npx codemap-gen -p ./my-project -o code-map.json
```

## Usage

### Basic Usage

```bash
# Generate code map for current directory
codemap-gen

# Specify project path and output file
codemap-gen -p ./my-project -o code-map.json

# Show help
codemap-gen --help
```

### CLI Options

```
Usage: codemap-gen [options]

Generate a code map for React/Next.js repos

Options:
  -p, --path <repo>    path to repo (default: ".")
  -o, --output <file>  output json (default: "code-map.json")
  -h, --help           display help for command
```

## Output Format

The tool generates a comprehensive JSON file with the following structure:

```json
{
  "pages": [
    {
      "route": "/about",
      "file": "/path/to/pages/about.tsx",
      "name": "about",
      "uses": ["dependency1.tsx"],
      "usedBy": []
    }
  ],
  "components": [
    {
      "name": "Button",
      "file": "/path/to/components/Button.tsx",
      "category": "component",
      "uses": ["./utils/helpers.ts"],
      "usedBy": ["../pages/index.tsx"]
    }
  ],
  "apis": [...],
  "utils": [...],
  "hooks": [...],
  "contexts": [...],
  "types": [...],
  "dead": {
    "unusedFiles": [
      "/path/to/unused/component.tsx"
    ],
    "unusedExports": [
      {
        "file": "/path/to/utils.ts",
        "exportName": "unusedFunction"
      }
    ]
  }
}
```

## Dead Code Detection

The tool performs sophisticated dead code analysis:

1. **File-level Analysis**: Identifies files that are never imported
2. **Export-level Analysis**: Finds exported functions/components that are never used
3. **Entry Point Awareness**: Uses pages and API routes as starting points
4. **Graph Traversal**: Performs depth-first search to find reachable code

### Example Output

```
📊 Dead Code Summary:
🗑️  Unused files: 12
🗑️  Unused exports: 8

📁 Unused files:
  • components/OldChart.tsx
  • hooks/useDeprecatedFeature.ts
  • utils/legacyHelpers.ts

📤 Unused exports:
  • roundTo in utils/math.ts
  • CartContext in store/cart.ts
```

## CI/CD Integration

### Using the CI Script

The package includes a ready-to-use CI script for automated dead code checking:

```bash
# Generate code map
npx codemap-gen -p . -o code-map.json

# Check for dead code (fails build if found)
node check-dead-code.js
```

### Configuration Options

Set environment variables to customize the behavior:

```bash
# Configure thresholds
export MAX_UNUSED_FILES=5
export MAX_UNUSED_EXPORTS=10
export FAIL_ON_UNUSED_FILES=true
export FAIL_ON_UNUSED_EXPORTS=true

# Run check
node check-dead-code.js
```

### GitHub Actions Integration

Add this workflow to `.github/workflows/dead-code-check.yml`:

```yaml
name: Dead Code Check

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  dead-code-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - run: npm ci
    - run: npx codemap-gen -p . -o code-map.json
    - run: node check-dead-code.js
      env:
        MAX_UNUSED_FILES: '0'
        MAX_UNUSED_EXPORTS: '5'
```

## Advanced Features

### Exploratory Scanning

The tool intelligently discovers and categorizes files:

```bash
🔍 Exploring repository structure...
📁 Found 113 files to analyze
  🧩 components: 72 files
  📄 pages: 2 files
  🔌 apis: 12 files
  🛠️ utils: 15 files
  🪝 hooks: 4 files
  📝 types: 8 files
```

### Smart Classification

Files are classified using:
- **Path patterns**: `components/`, `pages/`, `hooks/`, `utils/`, etc.
- **Content analysis**: JSX detection, hook patterns, context usage
- **Naming conventions**: `use*` for hooks, `*Context` for contexts

### Dependency Mapping

The tool builds accurate dependency graphs by:
- Parsing imports/exports with TypeScript AST
- Resolving relative import paths
- Tracking component relationships
- Building bidirectional dependency maps

## Project Structure Support

Works with various project structures:

### Next.js (App Router)
```
app/
├── layout.tsx
├── page.tsx
├── about/
│   └── page.tsx
└── api/
    └── users/
        └── route.ts
```

### Next.js (Pages Router)
```
pages/
├── _app.tsx
├── index.tsx
├── about.tsx
└── api/
    └── users.ts
```

### React Projects
```
src/
├── components/
├── hooks/
├── utils/
└── pages/
```

## Limitations & Considerations

### Dynamic Imports
Static analysis cannot trace dynamic imports with variable paths:
```javascript
// This won't be detected
const moduleName = getModuleName();
import(moduleName);
```

### False Positives
Some patterns might cause false positives:
- Type-only imports
- CSS-in-JS dependencies
- Runtime-only references

### Performance
- Large codebases (>1000 files) may take longer to analyze
- AST parsing is CPU-intensive for very large files

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## License

MIT License - see LICENSE file for details.
