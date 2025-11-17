#!/usr/bin/env node
/**
 * scripts/replace_market_terms.js
 * Safe search/replace tool for updating market terminology
 * Replaces stocks/equities/commodities with Forex/Crypto
 */

const fs = require('fs');
const path = require('path');

// File extensions to process
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.md'];

// Directories to process
const DIRECTORIES = ['src/components', 'src/lib', 'app'];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.git', '.next', 'build', 'dist'];

// Replacement patterns
const REPLACEMENTS = [
  // Case-sensitive replacements
  { from: /\bstocks and commodities\b/g, to: 'Forex and Crypto' },
  { from: /\bstocks, commodities\b/g, to: 'Forex, Crypto' },
  { from: /\bequities and commodities\b/g, to: 'Forex and Crypto' },
  { from: /\bequities, commodities\b/g, to: 'Forex, Crypto' },
  { from: /\bstock market\b/g, to: 'Forex and Crypto markets' },
  { from: /\bequity trading\b/g, to: 'Forex and Crypto trading' },
  { from: /\bcommodity trading\b/g, to: 'Forex and Crypto trading' },
  
  // Case-insensitive for standalone mentions
  { from: /\bstocks\b/gi, to: (match) => match[0].toUpperCase() === match[0] ? 'Forex' : 'forex' },
  { from: /\bequities\b/gi, to: (match) => match[0].toUpperCase() === match[0] ? 'Forex pairs' : 'forex pairs' },
  { from: /\bcommodities\b/gi, to: (match) => match[0].toUpperCase() === match[0] ? 'Crypto' : 'crypto' },
  
  // Trading specific terms
  { from: /\bshares\b/g, to: 'lots' }, // For Forex
  { from: /\bstock symbols\b/g, to: 'currency pairs and crypto tickers' },
  { from: /\bequity symbols\b/g, to: 'currency pairs and crypto tickers' },
];

// Files that should NOT be modified
const PROTECTED_FILES = [
  'replace_market_terms.js',
  'package.json',
  'package-lock.json',
];

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath);
  
  // Skip protected files
  if (PROTECTED_FILES.includes(filename)) {
    return false;
  }
  
  // Only process specific extensions
  if (!EXTENSIONS.includes(ext)) {
    return false;
  }
  
  return true;
}

/**
 * Check if directory should be processed
 */
function shouldProcessDir(dirPath) {
  const dirname = path.basename(dirPath);
  return !SKIP_DIRS.includes(dirname);
}

/**
 * Apply replacements to content
 */
function applyReplacements(content) {
  let modified = content;
  let changeCount = 0;
  
  for (const { from, to } of REPLACEMENTS) {
    const before = modified;
    if (typeof to === 'function') {
      modified = modified.replace(from, (match) => {
        changeCount++;
        return to(match);
      });
    } else {
      modified = modified.replace(from, (match) => {
        changeCount++;
        return to;
      });
    }
  }
  
  return { content: modified, changed: changeCount > 0, changeCount };
}

/**
 * Process a single file
 */
function processFile(filePath, dryRun = false) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, changed, changeCount } = applyReplacements(content);
    
    if (changed) {
      if (!dryRun) {
        fs.writeFileSync(filePath, newContent, 'utf8');
      }
      console.log(`  ${dryRun ? '[DRY RUN]' : '[MODIFIED]'} ${filePath} (${changeCount} replacements)`);
      return { modified: true, changes: changeCount };
    }
    
    return { modified: false, changes: 0 };
  } catch (error) {
    console.error(`  [ERROR] Failed to process ${filePath}:`, error.message);
    return { modified: false, changes: 0, error: true };
  }
}

/**
 * Process directory recursively
 */
function processDirectory(dirPath, dryRun = false, stats = { files: 0, modified: 0, changes: 0, errors: 0 }) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (shouldProcessDir(fullPath)) {
          processDirectory(fullPath, dryRun, stats);
        }
      } else if (entry.isFile()) {
        if (shouldProcessFile(fullPath)) {
          stats.files++;
          const result = processFile(fullPath, dryRun);
          if (result.modified) {
            stats.modified++;
            stats.changes += result.changes;
          }
          if (result.error) {
            stats.errors++;
          }
        }
      }
    }
    
    return stats;
  } catch (error) {
    console.error(`[ERROR] Failed to process directory ${dirPath}:`, error.message);
    stats.errors++;
    return stats;
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log(`
Market Terms Replacement Script
================================

Usage: node scripts/replace_market_terms.js [options]

Options:
  --dry-run, -n    Show what would be changed without modifying files
  --help, -h       Show this help message

This script replaces stock/equity/commodity terminology with Forex/Crypto
in TypeScript, JavaScript, and Markdown files.

Directories processed: ${DIRECTORIES.join(', ')}
File extensions: ${EXTENSIONS.join(', ')}
    `);
    return;
  }
  
  console.log('Market Terms Replacement Script');
  console.log('================================\n');
  
  if (dryRun) {
    console.log('[DRY RUN MODE] No files will be modified\n');
  }
  
  const totalStats = { files: 0, modified: 0, changes: 0, errors: 0 };
  
  for (const dir of DIRECTORIES) {
    const fullPath = path.join(process.cwd(), dir);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`[SKIP] Directory not found: ${dir}\n`);
      continue;
    }
    
    console.log(`Processing ${dir}...`);
    const stats = processDirectory(fullPath, dryRun);
    
    totalStats.files += stats.files;
    totalStats.modified += stats.modified;
    totalStats.changes += stats.changes;
    totalStats.errors += stats.errors;
    
    console.log(`  Files processed: ${stats.files}`);
    console.log(`  Files modified: ${stats.modified}`);
    console.log(`  Total changes: ${stats.changes}`);
    if (stats.errors > 0) {
      console.log(`  Errors: ${stats.errors}`);
    }
    console.log('');
  }
  
  console.log('Summary');
  console.log('-------');
  console.log(`Total files processed: ${totalStats.files}`);
  console.log(`Total files modified: ${totalStats.modified}`);
  console.log(`Total replacements: ${totalStats.changes}`);
  if (totalStats.errors > 0) {
    console.log(`Total errors: ${totalStats.errors}`);
  }
  
  if (dryRun) {
    console.log('\n[DRY RUN COMPLETE] Run without --dry-run to apply changes');
  } else {
    console.log('\n[COMPLETE] All changes applied');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { applyReplacements, processFile, processDirectory };
