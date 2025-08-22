// scripts/remove-unused-vars.mjs
// Auto-removes unused imports, variables, and function parameters from TS/TSX files.
// Usage example:
//   node ./scripts/remove-unused-vars.mjs "src/**/*.tsx"

import fs from "fs";
import path from "path";
import { globSync } from "glob"; // ✅ FIXED: correct import for glob v10+
import { Project, SyntaxKind } from "ts-morph";

if (process.argv.length < 3) {
  console.error("Usage: node scripts/remove-unused-vars.mjs '<glob pattern>'");
  process.exit(1);
}

const globPattern = process.argv[2];

// load project (with tsconfig if present)
const tsConfigPath = fs.existsSync("tsconfig.json") ? "tsconfig.json" : undefined;
const project = new Project(tsConfigPath ? { tsConfigFilePath: tsConfigPath } : {});

// collect files using glob
const files = globSync(globPattern, { absolute: true });

if (!files || files.length === 0) {
  console.error(`No files match pattern: ${globPattern}`);
  process.exit(1);
}

for (const filePath of files) {
  try {
    const sourceFile = project.addSourceFileAtPath(filePath);

    // backup original file
    try {
      const bak = `${filePath}.bak-${Date.now()}`;
      fs.copyFileSync(filePath, bak);
    } catch (err) {
      console.warn(`Could not create backup for ${filePath}: ${String(err)}`);
    }

    // --- 1. Remove unused named imports
    sourceFile.getImportDeclarations().forEach((imp) => {
      imp.getNamedImports().forEach((ni) => {
        const name = ni.getName();
        const refs = ni.findReferencesAsNodes().filter((r) => r.getSourceFile() === sourceFile);
        if (refs.length <= 1) {
          ni.remove();
          console.log(`Removed unused import '${name}' in ${path.basename(filePath)}`);
        }
      });

      if (
        imp.getNamedImports().length === 0 &&
        !imp.getDefaultImport() &&
        !imp.getNamespaceImport()
      ) {
        imp.remove();
      }
    });

    // --- 2. Remove unused local variables & parameters
    sourceFile.forEachDescendant((node) => {
      try {
        if (node.getKind() === SyntaxKind.VariableDeclaration) {
          const name =
            node.getName && typeof node.getName === "function" ? node.getName() : node.getText();
          const refs = node.findReferencesAsNodes().filter((r) => r.getSourceFile() === sourceFile);
          if (refs.length <= 1) {
            node.remove();
            console.log(`Removed unused variable '${name}' in ${path.basename(filePath)}`);
          }
        }

        if (node.getKind() === SyntaxKind.Parameter) {
          const name =
            node.getName && typeof node.getName === "function" ? node.getName() : node.getText();
          const refs = node.findReferencesAsNodes().filter((r) => r.getSourceFile() === sourceFile);
          if (refs.length <= 1) {
            // Safer than removing: rename unused params
            if (typeof node.rename === "function") {
              const newName = `_unused_${name}`;
              node.rename(newName);
              console.log(
                `Renamed unused parameter '${name}' to '${newName}' in ${path.basename(filePath)}`
              );
            } else {
              node.remove();
              console.log(`Removed unused parameter '${name}' in ${path.basename(filePath)}`);
            }
          }
        }
      } catch (innerErr) {
        console.warn(`Node processing error in ${path.basename(filePath)}: ${String(innerErr)}`);
      }
    });

    // save changes for this file
    sourceFile.saveSync();
  } catch (err) {
    console.error(`Error processing ${filePath}: ${String(err)}`);
  }
}

await project.save();

console.log("✅ Done cleaning unused variables/imports. Check .bak-* backups if needed.");
