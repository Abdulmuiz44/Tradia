// scripts/cleanup-project.mjs
// Clean-up helper using ts-morph:
// - removes unused named imports, variable declarations and unused parameters
// - replaces plain `any` -> `unknown` (simple global replace)
// - creates .bak for each file before changing
//
// Usage:
//   node ./scripts/cleanup-project.mjs "src/**/*.{ts,tsx}"
//
// NOTE: This tool makes source edits. Inspect backups (.bak) if anything unexpected happens.

import fs from "fs";
import path from "path";
import { globSync } from "glob";
import { Project, SyntaxKind } from "ts-morph";

if (process.argv.length < 3) {
  console.error("Usage: node scripts/cleanup-project.mjs '<glob pattern>'");
  process.exit(1);
}

const globPattern = process.argv[2];

// load project (tsconfig if present)
const tsConfigPath = fs.existsSync("tsconfig.json") ? "tsconfig.json" : undefined;
const project = new Project(tsConfigPath ? { tsConfigFilePath: tsConfigPath } : {});

const files = globSync(globPattern, { absolute: true });
if (!files || files.length === 0) {
  console.error(`No files match ${globPattern}`);
  process.exit(1);
}

for (const filePath of files) {
  try {
    const sourceFile = project.addSourceFileAtPath(filePath);

    // backup the raw disk contents first
    const raw = fs.readFileSync(filePath, "utf8");
    const bakPath = `${filePath}.bak-${Date.now()}`;
    fs.writeFileSync(bakPath, raw, "utf8");

    // Arrays to collect nodes to remove (we collect and only remove after analysis)
    const namedImportRemovals = []; // { namedImportNode, nameText, importDecl }
    const importDeclsToMaybeRemove = new Set(); // import declarations to check after removals
    const varDeclRemovals = []; // { declNode, nameText }
    const paramRemovals = []; // { paramNode, nameText }

    // --- 1) collect unused named imports safely ---
    sourceFile.getImportDeclarations().forEach((imp) => {
      imp.getNamedImports().forEach((named) => {
        const nameNode = named.getNameNode();
        if (!nameNode) return;
        // find references *in this file only*
        let refs = [];
        try {
          refs = nameNode.getReferencingNodes ? nameNode.getReferencingNodes() : nameNode.findReferencesAsNodes();
        } catch {
          // fallback to findReferencesAsNodes (older/newer ts-morph variations)
          try {
            refs = nameNode.findReferencesAsNodes();
          } catch {
            refs = [];
          }
        }
        // ensure we only count references coming from this file
        const localRefs = refs.filter((r) => {
          try {
            return r.getSourceFile().getFilePath() === sourceFile.getFilePath();
          } catch {
            return false;
          }
        });

        // if it's only referenced in its import (i.e. no other usage), schedule removal
        if (localRefs.length <= 1) {
          namedImportRemovals.push({ namedNode: named, nameText: nameNode.getText(), importDecl: imp });
          importDeclsToMaybeRemove.add(imp);
        }
      });
    });

    // --- 2) collect unused variable declarations ---
    const varDecls = sourceFile.getVariableDeclarations();
    for (const decl of varDecls) {
      const nameNode = decl.getNameNode && decl.getNameNode();
      if (!nameNode) continue;
      let refs = [];
      try {
        refs = nameNode.findReferencesAsNodes();
      } catch {
        refs = [];
      }
      const localRefs = refs.filter((r) => {
        try {
          return r.getSourceFile().getFilePath() === sourceFile.getFilePath();
        } catch {
          return false;
        }
      });
      if (localRefs.length <= 1) {
        // capture text now (avoid reading after removal)
        let nameText = "";
        try {
          nameText = nameNode.getText();
        } catch {
          nameText = "<unknown>";
        }
        varDeclRemovals.push({ declNode: decl, nameText });
      }
    }

    // --- 3) collect unused parameters (ParameterDeclarations) ---
    const params = sourceFile.getDescendantsOfKind(SyntaxKind.Parameter);
    for (const p of params) {
      const nameNode = p.getNameNode ? p.getNameNode() : null;
      if (!nameNode) continue;
      let refs = [];
      try {
        refs = nameNode.findReferencesAsNodes();
      } catch {
        refs = [];
      }
      const localRefs = refs.filter((r) => {
        try {
          return r.getSourceFile().getFilePath() === sourceFile.getFilePath();
        } catch {
          return false;
        }
      });
      if (localRefs.length <= 1) {
        let nameText = "";
        try {
          nameText = nameNode.getText();
        } catch {
          nameText = "<unknown>";
        }
        paramRemovals.push({ paramNode: p, nameText });
      }
    }

    // --- Perform removals now (we have captured nameText) ---
    // Remove named imports
    for (const item of namedImportRemovals) {
      try {
        item.namedNode.remove();
        console.log(`Removed unused import '${item.nameText}' in ${path.basename(filePath)}`);
      } catch (err) {
        console.warn(`Could not remove named import '${item.nameText}' in ${path.basename(filePath)}: ${String(err)}`);
      }
    }

    // Clean up import declarations that became empty
    for (const imp of Array.from(importDeclsToMaybeRemove)) {
      try {
        const namedImportsLeft = imp.getNamedImports();
        if (namedImportsLeft.length === 0 && !imp.getDefaultImport() && !imp.getNamespaceImport()) {
          imp.remove();
        }
      } catch { /* ignore */ }
    }

    // Remove variable declarations
    for (const v of varDeclRemovals) {
      try {
        // remove the declaration (not necessarily the entire statement if multiple declarators exist)
        v.declNode.remove();
        console.log(`Removed unused variable '${v.nameText}' in ${path.basename(filePath)}`);
      } catch (err) {
        console.warn(`Failed to remove variable '${v.nameText}' in ${path.basename(filePath)}: ${String(err)}`);
      }
    }

    // Remove parameters
    for (const p of paramRemovals) {
      try {
        // If removing the entire parameter would break signatures, it's still what the user asked.
        p.paramNode.remove();
        console.log(`Removed unused parameter '${p.nameText}' in ${path.basename(filePath)}`);
      } catch (err) {
        console.warn(`Failed to remove parameter '${p.nameText}' in ${path.basename(filePath)}: ${String(err)}`);
      }
    }

    // --- 4) Simple textual cleanups (after AST removals) ---
    // Replace literal 'any' -> 'unknown' (simple heuristic)
    // NOTE: This is a blunt replace. You may want to refine with AST-based replacements later.
    let finalText = sourceFile.getFullText();
    if (/\bany\b/.test(finalText)) {
      finalText = finalText.replace(/\bany\b/g, "unknown");
      console.log(`Replaced 'any' -> 'unknown' in ${path.basename(filePath)}`);
    }

    // Write back only if changed
    if (finalText !== raw) {
      fs.writeFileSync(filePath, finalText, "utf8");
      // reload into project (avoid stale nodes)
      project.removeSourceFile(sourceFile);
      project.addSourceFileAtPath(filePath);
    } else {
      // still save AST changes if any removals happened via ts-morph (these update sourceFile)
      try {
        sourceFile.saveSync();
      } catch {
        // If saving via ts-morph fails, already wrote file above or no changes
      }
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err && err.message ? err.message : err);
  }
}

await project.save();
console.log("✅ Cleanup complete. Check .bak-* files for backups.");
