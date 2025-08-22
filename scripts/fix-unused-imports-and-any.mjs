// scripts/fix-unused-imports-and-any.mjs
/**
 * Fixer script:
 * - removes unused named import specifiers in given files
 * - replaces `: any` and ` as any` with `: unknown` / ` as unknown`
 *
 * Usage:
 *  node ./scripts/fix-unused-imports-and-any.mjs src/components/dashboard/TradeJournal.tsx
 *  or pass multiple files
 *
 * NOTE: requires ts-morph installed (see instructions below).
 */

import fs from "fs";
import path from "path";
import { Project, SyntaxKind } from "ts-morph";

if (process.argv.length < 3) {
  console.error("Usage: node scripts/fix-unused-imports-and-any.mjs <file1> [file2 ...]");
  process.exit(1);
}

const files = process.argv.slice(2);

(async () => {
  // try to pick up tsconfig if present
  const tsConfigPath = fs.existsSync("tsconfig.json") ? "tsconfig.json" : undefined;
  const project = new Project(tsConfigPath ? { tsConfigFilePath: tsConfigPath } : {});

  for (const fileRel of files) {
    const filePath = path.resolve(fileRel);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping non-existent file: ${fileRel}`);
      continue;
    }

    // backup
    const bak = `${filePath}.bak-${Date.now()}`;
    fs.copyFileSync(filePath, bak);
    console.log(`Backup created: ${bak}`);

    // add/load file into project
    let sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) {
      sourceFile = project.addSourceFileAtPath(filePath);
    }

    // 1) Remove unused named imports:
    const importDecls = sourceFile.getImportDeclarations();
    for (const imp of importDecls) {
      const namedImports = imp.getNamedImports();
      for (const ni of namedImports) {
        const name = ni.getName();
        // find identifiers in the file with the same name (excluding the import itself)
        const idents = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).filter((id) => {
          try {
            return id.getText() === name && id.getStart() !== ni.getStart();
          } catch {
            return false;
          }
        });
        if (idents.length === 0) {
          // remove this named import
          ni.remove();
          console.log(`Removed unused import '${name}' from ${fileRel}`);
        }
      }
      // if import now has nothing (no named imports, no default, no namespace) remove import declaration
      const hasNamed = imp.getNamedImports().length > 0;
      const hasDefault = Boolean(imp.getDefaultImport());
      const hasNs = Boolean(imp.getNamespaceImport());
      if (!hasNamed && !hasDefault && !hasNs) {
        imp.remove();
        console.log(`Removed empty import declaration in ${fileRel}`);
      }
    }

    // 2) Replace ": any" with ": unknown" and " as any" with " as unknown"
    // We'll do string-based replace on the source text to avoid complicated AST transforms for every possible location.
    let text = sourceFile.getFullText();

    // Patterns:
    // - `: any` (type annotation)
    // - `:any` (no space)
    // - `as any` (type assertion)
    // - `<any>` in generics is valid but we will replace `<any>` -> `<unknown>` as well
    const replacements = [
      { from: /:\s*any\b/g, to: ": unknown" },
      { from: /\s+as\s+any\b/g, to: " as unknown" },
      { from: /<\s*any\s*>/g, to: "<unknown>" },
      // also handle "Record<string, any>" -> Record<string, unknown>
      { from: /\bany\b/g, to: "unknown" }, // fallback: replace bare any -> unknown
    ];

    // The last global replace (bare any -> unknown) is aggressive; we will only run it if there are `: any` or `as any` or `<any>` occurrences
    const hasAnyPattern = /(:\s*any\b|\s+as\s+any\b|<\s*any\s*>)/.test(text);
    if (hasAnyPattern) {
      text = text.replace(/:\s*any\b/g, ": unknown");
      text = text.replace(/\s+as\s+any\b/g, " as unknown");
      text = text.replace(/<\s*any\s*>/g, "<unknown>");
      // avoid replacing other occurrences wildly; only replace bare `any` in types contexts (heuristic)
      // We'll perform one more pass replacing `: any`, `as any`, and `<any>` which should have been handled
    } else {
      // As a safer fallback do nothing for bare any if not found in the file in these patterns
    }

    // If string changed vs AST text, overwrite file
    if (text !== sourceFile.getFullText()) {
      fs.writeFileSync(filePath, text, "utf8");
      console.log(`Updated ${fileRel} (imports + any -> unknown replacements applied)`);
    } else {
      // still need to save possible AST import removals
      sourceFile.saveSync();
      console.log(`Saved ${fileRel} (imports may have been modified via AST)`);
    }
  }

  // commit changes in ts-morph project
  try {
    await project.save();
  } catch (err) {
    // ignore if already saved
  }

  console.log("Done. Please run your linter/TypeScript build to see remaining issues.");
})();
