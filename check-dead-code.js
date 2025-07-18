#!/usr/bin/env node

/**
 * CI Script to check for dead code and fail builds if found
 * 
 * Usage:
 *   node check-dead-code.js
 * 
 * Environment variables:
 *   - CODEMAP_PATH: Path to the codemap JSON file (default: code-map.json)
 *   - FAIL_ON_UNUSED_FILES: Set to 'false' to not fail on unused files (default: true)
 *   - FAIL_ON_UNUSED_EXPORTS: Set to 'false' to not fail on unused exports (default: true)
 *   - MAX_UNUSED_FILES: Maximum number of unused files allowed (default: 0)
 *   - MAX_UNUSED_EXPORTS: Maximum number of unused exports allowed (default: 0)
 */

const fs = require('fs');
const path = require('path');

// Configuration from environment variables
const CODEMAP_PATH = process.env.CODEMAP_PATH || 'code-map.json';
const FAIL_ON_UNUSED_FILES = process.env.FAIL_ON_UNUSED_FILES !== 'false';
const FAIL_ON_UNUSED_EXPORTS = process.env.FAIL_ON_UNUSED_EXPORTS !== 'false';
const MAX_UNUSED_FILES = parseInt(process.env.MAX_UNUSED_FILES || '0', 10);
const MAX_UNUSED_EXPORTS = parseInt(process.env.MAX_UNUSED_EXPORTS || '0', 10);

function main() {
  console.log('🔍 Checking for dead code...');
  
  // Check if codemap file exists
  if (!fs.existsSync(CODEMAP_PATH)) {
    console.error(`❌ Code map file not found: ${CODEMAP_PATH}`);
    console.error('   Run: npx codemap-gen -o code-map.json');
    process.exit(1);
  }

  // Read and parse the codemap
  let codemap;
  try {
    const content = fs.readFileSync(CODEMAP_PATH, 'utf8');
    codemap = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to read/parse codemap: ${error.message}`);
    process.exit(1);
  }

  // Check if dead code analysis was performed
  if (!codemap.dead) {
    console.error('❌ No dead code analysis found in codemap');
    console.error('   Make sure you\'re using the latest version of codemap-gen');
    process.exit(1);
  }

  const { unusedFiles, unusedExports } = codemap.dead;
  
  console.log(`📊 Dead Code Analysis Results:`);
  console.log(`   🗑️  Unused files: ${unusedFiles.length}`);
  console.log(`   🗑️  Unused exports: ${unusedExports.length}`);

  let hasErrors = false;

  // Check unused files
  if (FAIL_ON_UNUSED_FILES && unusedFiles.length > MAX_UNUSED_FILES) {
    console.error(`\n❌ Too many unused files found: ${unusedFiles.length} (max: ${MAX_UNUSED_FILES})`);
    if (unusedFiles.length > 0) {
      console.error('   Unused files:');
      unusedFiles.slice(0, 10).forEach(file => {
        console.error(`     • ${path.relative(process.cwd(), file)}`);
      });
      if (unusedFiles.length > 10) {
        console.error(`     ... and ${unusedFiles.length - 10} more`);
      }
    }
    hasErrors = true;
  }

  // Check unused exports
  if (FAIL_ON_UNUSED_EXPORTS && unusedExports.length > MAX_UNUSED_EXPORTS) {
    console.error(`\n❌ Too many unused exports found: ${unusedExports.length} (max: ${MAX_UNUSED_EXPORTS})`);
    if (unusedExports.length > 0) {
      console.error('   Unused exports:');
      unusedExports.slice(0, 10).forEach(exp => {
        console.error(`     • ${exp.exportName} in ${path.relative(process.cwd(), exp.file)}`);
      });
      if (unusedExports.length > 10) {
        console.error(`     ... and ${unusedExports.length - 10} more`);
      }
    }
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('\n🚨 Dead code detected! Please clean up unused code before merging.');
    console.error('\n💡 Tips:');
    console.error('   • Remove unused files completely');
    console.error('   • Remove unused exports from files');
    console.error('   • Check if code is actually used but not detected (dynamic imports, etc.)');
    process.exit(1);
  } else {
    console.log('\n✅ No problematic dead code found!');
    if (unusedFiles.length > 0 || unusedExports.length > 0) {
      console.log('   (Some dead code exists but is within acceptable limits)');
    }
  }
}

if (require.main === module) {
  main();
} 