# Autonomous Build Agent Specification

## Table of Contents
1. [Purpose](#purpose)
2. [Agent Execution Loop](#agent-execution-loop)
3. [Error Categories](#error-categories)
4. [Auto-Fixing Rules](#auto-fixing-rules)
5. [Production-Ready Rules](#production-ready-rules)
6. [Pre-Commit Checklist](#pre-commit-checklist)
7. [Vercel Deployment Guarantee](#vercel-deployment-guarantee)

---

## 1. Purpose

This autonomous AI build agent is designed to automatically maintain and fix the Tradia codebase whenever new features or changes are made. The agent operates as a self-running build system that ensures zero build errors and production-ready code at all times.

### Core Responsibilities

The agent MUST perform the following tasks automatically:

1. **Execute Build Process**: Run `pnpm build` (fallback to `npm run build` or `yarn build` if pnpm is unavailable)
2. **Capture All Errors**: Collect all build errors, TypeScript errors, runtime errors, and lint errors from stderr and stdout
3. **Parse Errors**: Structure errors with file path, line number, error message, TypeScript error code, and ESLint rule
4. **Fix Errors**: Apply code modifications directly to the codebase without human intervention
5. **Rebuild**: Execute the build process again to verify fixes
6. **Loop Until Clean**: Continue the run → detect → fix → rebuild cycle until zero errors remain
7. **Commit Changes**: Stage all changes with `git add .` and commit with a descriptive message
8. **Prepare for Deployment**: Ensure Vercel deployment will succeed without permission or authority errors

### Success Criteria

The agent has succeeded when:
- `pnpm build` completes with exit code 0
- No TypeScript errors reported by `tsc --noEmit`
- No ESLint errors reported by `next lint`
- All API routes and pages compile successfully
- No missing environment variables that would block deployment
- No configuration errors in `next.config.js`, `tsconfig.json`, or `vercel.json`
- Code is committed and ready for deployment to Vercel

---

## 2. Agent Execution Loop

The agent operates in a continuous loop until the codebase is error-free. This loop is the core operational mechanism.

### Step 1: Run Build

**Command**: `pnpm build`

**Fallback Commands** (in order of priority):
1. If pnpm not found: `npm run build`
2. If npm not found: `yarn build`

**Capture Requirements**:
- Capture stdout and stderr streams
- Record exit code
- Timestamp the build start and end times
- Store output in a temporary buffer for parsing

**Example Execution**:
```bash
cd /path/to/tradia
pnpm build 2>&1 | tee build-output.log
EXIT_CODE=${PIPESTATUS[0]}
```

### Step 2: Parse Errors

The agent MUST parse and structure all errors from the build output.

**Error Pattern Matching**:

**TypeScript Errors**:
```
Pattern: "(.+?):(\d+):(\d+) - error TS(\d+): (.+)"
Extract: file, line, column, TS_code, message
```

**ESLint Errors**:
```
Pattern: "(.+?)\s+(\d+):(\d+)\s+error\s+(.+?)\s+([\w/-]+)"
Extract: file, line, column, message, rule
```

**Next.js Build Errors**:
```
Pattern: "Error: (.+?) in (.+?):(\d+)"
Extract: message, file, line
```

**Import Errors**:
```
Pattern: "Module not found: Can't resolve '(.+?)'"
Extract: missing_module
```

**Syntax Errors**:
```
Pattern: "SyntaxError: (.+?) \((\d+):(\d+)\)"
Extract: message, line, column
```

**Structured Error Object**:
```json
{
  "file": "src/components/Dashboard.tsx",
  "line": 42,
  "column": 15,
  "type": "TypeScript",
  "code": "TS2345",
  "rule": null,
  "message": "Argument of type 'string' is not assignable to parameter of type 'number'",
  "severity": "error",
  "context": "const result = calculateTotal('100');"
}
```

### Step 3: Fix Errors

For each structured error, the agent applies appropriate fixes:

**Fix Decision Tree**:

1. **TypeScript Type Errors** (TS2xxx):
   - TS2304 (Cannot find name): Add import or declare type
   - TS2345 (Argument type mismatch): Convert type or fix function signature
   - TS2322 (Type not assignable): Add type assertion or fix type definition
   - TS2307 (Cannot find module): Install missing package or fix import path
   - TS2339 (Property does not exist): Add property to type or fix property name
   - TS2571 (Object is of type unknown): Add type assertion or type guard
   - TS7006 (Parameter implicitly has 'any'): Add explicit type annotation
   - TS7016 (Could not find declaration): Add @types package or create .d.ts file

2. **ESLint Errors**:
   - `no-unused-vars`: Remove unused variable or add underscore prefix
   - `no-undef`: Add import or declare variable
   - `react-hooks/exhaustive-deps`: Add missing dependencies or disable with explanation
   - `react-hooks/rules-of-hooks`: Move hook to component body
   - `@next/next/no-img-element`: Replace `<img>` with `<Image>` from next/image
   - `react/no-unescaped-entities`: Escape quotes or use HTML entities
   - `prefer-const`: Change `let` to `const`
   - `no-console`: Remove or suppress with comment if intentional

3. **Import Errors**:
   - Missing module: Run `pnpm add <package>` for production dependency
   - Missing dev module: Run `pnpm add -D <package>` for dev dependency
   - Wrong import path: Fix relative path (../, ./, etc.)
   - Missing file extension: Add .ts, .tsx, .js, .jsx extension

4. **Next.js Specific Errors**:
   - Server/Client component conflict: Add 'use client' directive
   - Async component in client: Move to server component or remove 'use client'
   - Missing metadata export: Add metadata export to layout/page
   - Invalid route structure: Reorganize files per Next.js 13+ conventions
   - Dynamic route naming: Rename files to [param] or [...slug] format

5. **React Errors**:
   - Invalid JSX syntax: Fix closing tags, proper nesting
   - Missing key prop: Add unique key to list items
   - setState in render: Move to useEffect or event handler
   - Incorrect hook usage: Move to component body, ensure conditional rendering doesn't affect hooks

6. **API Route Errors**:
   - Missing request/response types: Add NextRequest/NextResponse types
   - Invalid HTTP method handling: Add proper method checks
   - Missing error handling: Wrap in try-catch with appropriate error responses
   - CORS issues: Add proper headers in next.config.js or route handler

7. **Environment Variable Errors**:
   - Missing variable: Log warning and use fallback value
   - Wrong variable name: Fix reference to match .env.example
   - Not prefixed with NEXT_PUBLIC_: Rename or access server-side only

8. **Dependency Errors**:
   - Version mismatch: Update package.json version
   - Peer dependency: Install required peer dependencies
   - Conflicting versions: Resolve with resolutions in package.json
   - Missing types: Install @types/ package

**Fix Implementation Process**:

For each error:
1. Open the file specified in error.file
2. Navigate to error.line and error.column
3. Read surrounding context (±10 lines)
4. Apply the appropriate fix based on error type and code
5. Preserve existing code style and formatting
6. Add minimal comments only if necessary for complex fixes
7. Validate fix doesn't introduce new errors
8. Save file

**Fix Examples**:

**Example 1: TS2345 Type Error**
```typescript
// Before (Error: Argument of type 'string' is not assignable to parameter of type 'number')
const total = calculateTotal('100');

// After (Fix: Parse string to number)
const total = calculateTotal(Number('100'));
```

**Example 2: Missing Import**
```typescript
// Before (Error: Cannot find name 'useState')
const [count, setCount] = useState(0);

// After (Fix: Add import)
import { useState } from 'react';
const [count, setCount] = useState(0);
```

**Example 3: Server/Client Component Conflict**
```typescript
// Before (Error: useState cannot be used in server component)
export default function Page() {
  const [state, setState] = useState(false);
  return <div>{state}</div>;
}

// After (Fix: Add 'use client' directive)
'use client';

export default function Page() {
  const [state, setState] = useState(false);
  return <div>{state}</div>;
}
```

### Step 4: Rebuild

After applying fixes:

1. **Clear Cache** (if needed):
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   ```

2. **Reinstall Dependencies** (if package.json changed):
   ```bash
   pnpm install
   ```

3. **Run Build Again**:
   ```bash
   pnpm build
   ```

4. **Capture New Output**: Record all stdout/stderr again

### Step 5: Continue Until Clean

**Loop Control**:

```pseudo
iteration = 0
max_iterations = 10
previous_error_count = Infinity

while true:
  iteration += 1
  
  if iteration > max_iterations:
    report "Maximum iterations reached, manual intervention required"
    break
  
  errors = run_build_and_parse()
  error_count = len(errors)
  
  if error_count == 0:
    report "Build successful, no errors found"
    break
  
  if error_count >= previous_error_count:
    report "Error count not decreasing, manual review needed"
    break
  
  previous_error_count = error_count
  apply_fixes(errors)
```

**Termination Conditions**:
- ✅ **Success**: Zero errors reported
- ⚠️ **Max Iterations**: 10 iterations completed without reaching zero errors
- ⚠️ **Stagnation**: Error count not decreasing between iterations
- ⚠️ **Critical Error**: Cannot parse error or apply fix safely

### Step 6: Commit Results

Once the build is clean:

**Pre-Commit Validation**:
1. Verify `pnpm build` exit code is 0
2. Verify `pnpm run lint` passes or has only warnings
3. Verify `pnpm run type-check` passes
4. Verify no untracked files that should be ignored

**Commit Process**:
```bash
# Stage all changes
git add .

# Generate commit message
COMMIT_MSG="fix: auto-resolved build errors

- Fixed TypeScript errors: [count]
- Fixed ESLint issues: [count]
- Fixed import errors: [count]
- Updated dependencies: [list]
- Build status: ✅ passing"

# Commit with detailed message
git commit -m "$COMMIT_MSG"

# Prepare for push (agent does not push automatically)
echo "Ready to push to origin"
```

**Commit Message Format**:
- Type: `fix:` for error fixes, `chore:` for maintenance
- Subject: Clear, concise description
- Body: Detailed list of changes
- Footer: Any breaking changes or notes

### Step 7: Prepare for Vercel

**Vercel Deployment Checklist**:

1. **Environment Variables Validation**:
   - Check all NEXT_PUBLIC_* variables are defined in vercel.json or .env.production
   - Verify no hardcoded secrets in code
   - Ensure NEXTAUTH_URL matches Vercel domain
   - Validate database connection strings

2. **Configuration Files**:
   - `next.config.js`: No syntax errors, valid exports
   - `vercel.json`: Valid JSON, correct build settings
   - `tsconfig.json`: Compatible with Next.js and Vercel
   - `package.json`: All dependencies listed, no missing peer deps

3. **Build Output**:
   - `.next` directory generated successfully
   - No critical warnings in build output
   - Static pages generated correctly
   - API routes compiled

4. **Security Headers**:
   - CSP headers configured if needed
   - No exposed sensitive data in client bundles
   - Proper CORS configuration

5. **Permissions & Authority**:
   - No file system operations outside allowed paths
   - No shell command executions in API routes
   - No database migrations that require elevated privileges
   - No external API calls without proper error handling

**Vercel Build Command Validation**:
```bash
# Simulate Vercel build locally
NODE_ENV=production pnpm build

# Check build output
if [ -d ".next" ]; then
  echo "✅ Build output generated"
else
  echo "❌ Build output missing"
fi

# Verify no blocking errors
if grep -r "Error:" .next/build-manifest.json 2>/dev/null; then
  echo "❌ Build manifest contains errors"
else
  echo "✅ Build manifest clean"
fi
```

---

## 3. Error Categories

The agent MUST handle the following error categories:

### 3.1 TypeScript Errors

**Strict Mode Violations**:
- TS2322: Type not assignable
- TS2345: Argument type mismatch
- TS2769: No overload matches this call
- TS2345: Missing required parameters
- TS7006: Parameter implicitly has 'any' type
- TS2571: Object is of type 'unknown'
- TS2531: Object is possibly 'null'
- TS2532: Object is possibly 'undefined'
- TS18046: 'x' is of type 'unknown' with strictNullChecks

**Import/Export Errors**:
- TS2307: Cannot find module
- TS2305: Module has no exported member
- TS2304: Cannot find name
- TS1192: Module has no default export
- TS2306: File is not a module

**Type Definition Errors**:
- TS2314: Generic type requires type arguments
- TS2315: Type is not generic
- TS2344: Type does not satisfy constraint
- TS2339: Property does not exist on type
- TS2551: Property does not exist (did you mean X?)

**Configuration Errors**:
- TS5023: Unknown compiler option
- TS6053: File not under rootDir
- TS18003: No inputs were found in config file

### 3.2 Next.js Build Errors

**Route Errors**:
- Invalid route configuration
- Duplicate routes
- Missing page.tsx or layout.tsx
- Invalid dynamic route syntax
- Conflicting catch-all routes

**Component Errors**:
- Server component using client-only features
- Client component using server-only features
- Invalid use of async components
- Missing 'use client' directive when needed
- Missing 'use server' directive when needed

**Metadata Errors**:
- Invalid metadata export
- Missing required metadata fields
- Wrong metadata structure
- Conflicting metadata in layout hierarchy

**Image Optimization Errors**:
- Invalid image source
- Missing alt text
- Incorrect Image component usage
- Unsupported image format

**Build Output Errors**:
- Failed to compile pages
- Static generation failed
- ISR (Incremental Static Regeneration) errors
- Dynamic import errors

### 3.3 ESLint Errors

**Code Quality Issues**:
- no-unused-vars: Unused variables/imports
- no-console: Console statements (in production code)
- no-debugger: Debugger statements
- no-unreachable: Unreachable code after return/throw
- no-const-assign: Reassignment to const
- no-dupe-keys: Duplicate keys in objects
- no-duplicate-case: Duplicate case labels

**React Specific**:
- react-hooks/rules-of-hooks: Invalid hook usage
- react-hooks/exhaustive-deps: Missing dependencies in hooks
- react/no-unescaped-entities: Unescaped quotes/characters
- react/jsx-key: Missing key prop in lists
- react/jsx-no-duplicate-props: Duplicate props
- react/no-children-prop: Using children as prop

**Next.js Specific**:
- @next/next/no-html-link-for-pages: Use Link component
- @next/next/no-img-element: Use Image component
- @next/next/no-sync-scripts: Use next/script component
- @next/next/no-page-custom-font: Use next/font

**Import/Export Issues**:
- import/no-unresolved: Cannot resolve module
- import/no-duplicates: Duplicate imports
- import/order: Import order violations

### 3.4 Missing Imports / Wrong Imports

**Common Missing Imports**:
- React hooks: useState, useEffect, useCallback, useMemo, useRef
- Next.js components: Link, Image, Script
- Next.js navigation: useRouter, usePathname, useSearchParams
- Next.js server: NextRequest, NextResponse
- Type imports: Type, Interface definitions

**Wrong Import Paths**:
- Incorrect relative paths (../../)
- Missing file extensions for non-TS files
- Case sensitivity issues
- Absolute imports using @/* not resolving

**Import Resolution Strategy**:
1. Check if module exists in node_modules
2. Check if it's a local file with correct path
3. Check if type definitions exist
4. Install package if missing
5. Fix path if incorrect

### 3.5 Unused Variables & Unreachable Code

**Unused Variables**:
- Unused function parameters: Prefix with `_`
- Unused imported modules: Remove import
- Unused local variables: Remove declaration
- Unused function declarations: Remove or export if intentional

**Unreachable Code**:
- Code after return statement: Remove
- Code after throw statement: Remove
- Code in if (false) blocks: Remove
- Dead branches in switch statements: Remove

### 3.6 API Route Errors

**Type Errors**:
- Missing NextRequest type
- Missing NextResponse type
- Incorrect request body types
- Wrong HTTP method handling

**Runtime Errors**:
- Unhandled promise rejections
- Missing error handling
- Invalid JSON parsing
- Database connection errors

**Response Errors**:
- Wrong status codes
- Missing Content-Type headers
- Invalid JSON responses
- Unhandled errors returning HTML

### 3.7 React Server/Client Component Conflicts

**Server Component Issues**:
- Using useState/useEffect in server component
- Using browser-only APIs
- Using event handlers without 'use client'
- Accessing window/document objects

**Client Component Issues**:
- Using async component functions
- Using server-only modules
- Direct database access
- Using server-side environment variables

**Resolution Strategies**:
1. Add 'use client' if component needs interactivity
2. Split component into server and client parts
3. Move data fetching to server component
4. Pass data as props from server to client

### 3.8 Missing Environment Variables

**Detection**:
- Check for process.env.VARIABLE_NAME usage
- Cross-reference with .env.example
- Validate NEXT_PUBLIC_ prefix for client variables

**Resolution**:
1. Add to .env.local for development
2. Document in .env.example
3. Add to vercel.json or Vercel dashboard
4. Provide fallback values when appropriate
5. Log warning if optional variable missing

### 3.9 Mismatched Dependencies

**Version Conflicts**:
- Peer dependency warnings
- Major version mismatches
- React version conflicts
- Next.js incompatible packages

**Resolution**:
1. Update package.json to compatible versions
2. Use resolutions field for forced versions
3. Install peer dependencies explicitly
4. Remove conflicting packages if not needed

### 3.10 Duplicate Default Exports

**Detection**:
- Multiple `export default` in same file
- Named export and default export with same name
- Re-exporting default from multiple sources

**Resolution**:
1. Remove duplicate exports
2. Convert one to named export
3. Use re-export syntax correctly: `export { default as Name } from './file'`

### 3.11 Undefined Functions or Props

**Function Errors**:
- Function called before declaration
- Typo in function name
- Missing import of external function

**Prop Errors**:
- Using prop not defined in interface
- Typo in prop name
- Missing required props

**Resolution**:
1. Fix typos
2. Add function declaration or import
3. Update type definitions to include prop
4. Add missing required props

### 3.12 Zod Validation Issues

**Schema Errors**:
- Invalid schema definition
- Circular references
- Wrong type methods

**Validation Errors**:
- Failed validation in API routes
- Missing error handling for validation
- Wrong error message format

**Resolution**:
1. Fix schema definition syntax
2. Add proper error handling
3. Parse validation errors correctly
4. Return appropriate HTTP status codes

### 3.13 Other Compile-Time Errors

**Build Configuration**:
- Invalid webpack config
- Wrong babel config
- Incorrect TypeScript config
- PostCSS errors
- Tailwind CSS compilation errors

**Module System**:
- CommonJS/ESM conflicts
- Dynamic imports not working
- Circular dependencies
- Module not found errors

**Asset Errors**:
- Missing image files
- Invalid CSS imports
- Font loading errors
- SVG import issues

---

## 4. Auto-Fixing Rules

The agent MUST follow these rules when applying fixes:

### 4.1 Fix Code Safely and Minimally

**Minimal Change Principle**:
- Change only what is necessary to fix the error
- Do not refactor code beyond the error fix
- Preserve existing code structure and style
- Maintain consistency with surrounding code

**Safety Checks**:
- Never modify code you don't understand
- Never apply fixes that might change business logic
- Always prefer explicit fixes over clever workarounds
- Test fix doesn't introduce new errors

**Examples**:

❌ **Unsafe Fix**:
```typescript
// Error: Type 'string | undefined' is not assignable to type 'string'
// Bad fix: Remove all undefined handling
const name: string = user?.name!; // Dangerous non-null assertion
```

✅ **Safe Fix**:
```typescript
// Error: Type 'string | undefined' is not assignable to type 'string'
// Good fix: Handle undefined properly
const name: string = user?.name ?? 'Unknown';
```

### 4.2 Preserve Original Logic

**Never Change Functionality**:
- Keep the same business logic
- Maintain the same user-facing behavior
- Preserve the same API contracts
- Keep the same data flow

**Logic Preservation Examples**:

❌ **Logic Change**:
```typescript
// Original: Calculate tax based on location
const tax = location === 'NY' ? price * 0.08 : price * 0.05;

// Bad fix changes logic
const tax = price * 0.08; // Changed tax calculation!
```

✅ **Logic Preserved**:
```typescript
// Original: Calculate tax based on location
const tax = location === 'NY' ? price * 0.08 : price * 0.05;

// Good fix: Just fix type error
const tax: number = location === 'NY' ? price * 0.08 : price * 0.05;
```

### 4.3 Never Break Existing Features

**Feature Integrity**:
- Test that existing features still work
- Don't remove functionality to fix errors
- Don't disable working code
- Maintain backward compatibility

**Testing After Fixes**:
1. Run build to check no new errors
2. Check related components still compile
3. Verify no runtime errors introduced
4. Test that removed code wasn't used elsewhere

### 4.4 Never Comment Out Large Blocks

**Avoid Quick Fixes**:
- Never comment out code to "fix" errors
- Never delete code without understanding impact
- Never disable entire features

**Acceptable Commenting**:
- Remove small unused code snippets
- Add TODO comments for complex issues
- Comment deprecated code with migration path

❌ **Bad Practice**:
```typescript
// Error in this code block
// export function complexFeature() {
//   // 100 lines of code
// }
```

✅ **Correct Approach**:
```typescript
// Fixed the error in the complex feature
export function complexFeature(): ReturnType {
  // Fixed implementation
}
```

### 4.5 Prefer Most Correct Fix

**Quality Over Speed**:
- Choose the most correct solution, not the quickest
- Prefer proper types over 'any'
- Use proper error handling over try-catch silence
- Follow best practices over shortcuts

**Fix Priority Order**:
1. ✅ **Best**: Fix root cause with proper types/logic
2. ⚠️ **Acceptable**: Use type assertion if type is correct
3. ❌ **Avoid**: Use 'any' or disable type checking
4. ❌ **Never**: Comment out or delete code

**Examples**:

❌ **Quick but wrong**:
```typescript
const data: any = await fetchData(); // Loses type safety
```

✅ **Correct solution**:
```typescript
interface ApiResponse {
  id: number;
  name: string;
  items: Item[];
}
const data: ApiResponse = await fetchData();
```

### 4.6 Remove Dead Code if Needed

**Dead Code Identification**:
- Unused imports
- Unreachable code paths
- Unused variables and functions
- Commented-out code blocks

**Removal Strategy**:
1. Verify code is truly unused (check all references)
2. Remove unused imports automatically
3. Remove unreachable code after return/throw
4. Remove unused local variables
5. Keep exported functions (might be used externally)

**Safe Removal Examples**:

✅ **Safe to remove**:
```typescript
import { unused } from 'module'; // Not used anywhere - remove

function process() {
  return result;
  console.log('never runs'); // Unreachable - remove
}

const temp = calculate(); // Never used - remove
```

❌ **Do not remove**:
```typescript
export function helperFunction() {} // Exported - keep even if unused internally
```

### 4.7 Convert Deprecated APIs

**Migration Strategy**:
- Identify deprecated APIs from build warnings
- Find modern equivalent in documentation
- Replace with new API maintaining same behavior
- Update types if needed

**Common Migrations**:

**Next.js 12 → 13**:
```typescript
// Deprecated
import { useRouter } from 'next/router';

// Modern
import { useRouter } from 'next/navigation';
```

**React 17 → 18**:
```typescript
// Deprecated
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, root);

// Modern
import { createRoot } from 'react-dom/client';
createRoot(root).render(<App />);
```

---

## 5. Production-Ready Rules

The agent ensures the codebase is production-ready for Vercel deployment.

### 5.1 Enforce TypeScript Strict Mode Stability

**Strict Mode Configuration** (tsconfig.json):
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Enforcement Rules**:
1. All variables must have explicit types (no implicit 'any')
2. All null/undefined must be handled explicitly
3. All function parameters must be typed
4. All return types must be explicit for exported functions
5. No type assertions without validation

**Validation Command**:
```bash
pnpm run type-check # Must pass with 0 errors
```

### 5.2 Ensure Vercel Build Does Not Fail

**Pre-Deployment Build Check**:
```bash
# Clean build from scratch
rm -rf .next node_modules/.cache
pnpm install --frozen-lockfile
NODE_ENV=production pnpm build
```

**Build Must Succeed**:
- Exit code 0
- No compilation errors
- All pages built successfully
- All API routes compiled
- Static assets generated

**Common Vercel Build Issues**:

1. **Memory Issues**:
   - Large dependencies causing OOM
   - Too many static pages
   - Large image files

   **Fix**: Add to vercel.json:
   ```json
   {
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/next",
         "config": {
           "maxLambdaSize": "50mb"
         }
       }
     ]
   }
   ```

2. **Environment Variables**:
   - Missing required variables
   - Wrong variable names
   - Not prefixed with NEXT_PUBLIC_

   **Fix**: Validate all variables exist in Vercel settings

3. **Dependency Issues**:
   - Missing dependencies in package.json
   - Dev dependencies used in production
   - Version conflicts

   **Fix**: Use `pnpm install --production` to test

### 5.3 Ensure Every Route, Page, and Component Compiles

**Route Validation**:

Scan all route files:
```bash
app/
  page.tsx ✅ Must compile
  layout.tsx ✅ Must compile
  error.tsx ✅ Must compile (optional)
  loading.tsx ✅ Must compile (optional)
  not-found.tsx ✅ Must compile (optional)
  [dynamicRoute]/
    page.tsx ✅ Must compile
```

**Component Validation**:

All components in `src/components/` must:
- Have valid TypeScript syntax
- Export properly (default or named)
- Have no unused imports
- Pass type checking

**API Route Validation**:

All routes in `app/api/` must:
- Export proper HTTP method handlers (GET, POST, etc.)
- Return NextResponse
- Handle errors properly
- Have valid TypeScript types

**Validation Script**:
```bash
# Check all files compile individually
find app -name "*.tsx" -o -name "*.ts" | while read file; do
  echo "Checking $file"
  npx tsc --noEmit "$file" || echo "❌ Failed: $file"
done
```

### 5.4 Ensure No Missing Exports

**Export Verification**:

1. **Check all imports have corresponding exports**:
   ```bash
   # Find import statements
   grep -r "import.*from" src/ app/
   
   # Verify each imported module exports the name
   ```

2. **Common missing exports**:
   - Components not exported from index files
   - Types not exported from definition files
   - Utils not exported from utility files

3. **Fix missing exports**:
   ```typescript
   // Before: Not exported
   function helper() {}
   
   // After: Exported
   export function helper() {}
   ```

### 5.5 Test Critical Flows After Fixing

**Critical Flow Testing**:

After all fixes are applied, the agent MUST verify:

1. **Authentication Flow**:
   - Login page loads
   - Signup page loads
   - Protected routes redirect properly

2. **Main Pages**:
   - Home page renders
   - Dashboard loads
   - Profile page loads

3. **API Endpoints**:
   - Health check endpoint responds
   - Auth endpoints respond
   - Data endpoints respond

**Testing Method**:
```bash
# Start development server
pnpm dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Test endpoints
curl -f http://localhost:3000/ || echo "❌ Home page failed"
curl -f http://localhost:3000/api/health || echo "❌ Health check failed"

# Stop server
kill $DEV_PID
```

### 5.6 Optimize Imports for Tree-Shaking

**Import Optimization Rules**:

1. **Use named imports over namespace imports**:
   ```typescript
   // ❌ Bad: Imports entire library
   import * as _ from 'lodash';
   
   // ✅ Good: Only imports needed function
   import { debounce } from 'lodash';
   ```

2. **Use specific imports for large libraries**:
   ```typescript
   // ❌ Bad: Large bundle
   import { Button } from '@radix-ui/react';
   
   // ✅ Good: Specific import
   import { Button } from '@radix-ui/react-button';
   ```

3. **Dynamic imports for heavy components**:
   ```typescript
   // ✅ Good: Lazy load heavy components
   const Chart = dynamic(() => import('./Chart'), {
     ssr: false,
     loading: () => <Skeleton />
   });
   ```

4. **Remove unused imports automatically**:
   - Agent should remove all unused imports found
   - Check with ESLint no-unused-vars rule

**Validation**:
```bash
# Check bundle size
pnpm run analyze
# Review analyze/client.html for large chunks
```

---

## 6. Pre-Commit Checklist

Before committing, the agent MUST verify all items in this checklist:

### ✅ Build Status
- [ ] `pnpm build` completes with exit code 0
- [ ] No TypeScript errors in output
- [ ] No critical warnings in output
- [ ] `.next` directory generated successfully
- [ ] Build time is reasonable (< 5 minutes for standard project)

### ✅ Type Checking
- [ ] `pnpm run type-check` passes with 0 errors
- [ ] All files have proper type annotations
- [ ] No 'any' types introduced (except where necessary)
- [ ] Strict mode enabled and passing

### ✅ Linting
- [ ] `pnpm run lint` passes or has only warnings
- [ ] No new ESLint errors introduced
- [ ] All auto-fixable issues fixed
- [ ] No disabled rules without justification

### ✅ Code Quality
- [ ] No console.log statements in production code
- [ ] No debugger statements
- [ ] No commented-out code blocks
- [ ] No TODO comments without tracking
- [ ] Proper error handling in all async functions

### ✅ Imports & Dependencies
- [ ] All imports resolve correctly
- [ ] No unused imports
- [ ] No circular dependencies
- [ ] All dependencies in package.json
- [ ] No development dependencies used in production

### ✅ Next.js Specific
- [ ] All pages have proper exports
- [ ] Server/client components properly separated
- [ ] No 'use client' in unnecessary files
- [ ] Metadata exports in layouts/pages
- [ ] Image components used (not img tags)
- [ ] Link components used for navigation

### ✅ API Routes
- [ ] All routes return proper responses
- [ ] Proper HTTP status codes used
- [ ] Error handling in place
- [ ] TypeScript types for request/response
- [ ] No unhandled promise rejections

### ✅ Environment Variables
- [ ] All required variables documented in .env.example
- [ ] No hardcoded secrets in code
- [ ] NEXT_PUBLIC_ prefix for client variables
- [ ] Server variables not exposed to client

### ✅ Vercel Compatibility
- [ ] No file system operations outside /tmp
- [ ] No process.cwd() without proper handling
- [ ] No shell commands in production code
- [ ] Build output size under limits
- [ ] No serverless function timeout issues

### ✅ Security
- [ ] No exposed API keys or secrets
- [ ] Proper input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection where needed

### ✅ Git Status
- [ ] All changes staged with `git add .`
- [ ] No untracked files that should be committed
- [ ] No temporary files in staging
- [ ] .gitignore properly configured
- [ ] Commit message follows convention

### ✅ Final Validation
- [ ] Changed files reviewed for correctness
- [ ] No breaking changes introduced
- [ ] Backward compatibility maintained
- [ ] Documentation updated if needed
- [ ] Ready for code review

**Checklist Command**:
```bash
#!/bin/bash
echo "🔍 Running pre-commit checklist..."

# Build
echo "1. Checking build..."
pnpm build > /dev/null 2>&1 && echo "✅ Build passed" || echo "❌ Build failed"

# Type check
echo "2. Type checking..."
pnpm run type-check > /dev/null 2>&1 && echo "✅ Types passed" || echo "❌ Types failed"

# Lint
echo "3. Linting..."
pnpm run lint > /dev/null 2>&1 && echo "✅ Lint passed" || echo "⚠️ Lint warnings"

# Git status
echo "4. Checking git status..."
git status --short

echo "✅ Pre-commit checklist complete"
```

---

## 7. Vercel Deployment Guarantee

The agent guarantees successful Vercel deployment by ensuring:

### 7.1 No Permission / Authority Limit Errors

**Potential Permission Issues**:

1. **File System Access**:
   - ❌ Writing to directories outside /tmp
   - ❌ Reading from file system in serverless functions
   - ❌ Using fs module without proper checks

   **Solution**:
   ```typescript
   // ✅ Correct: Use /tmp for temp files in Vercel
   import { writeFileSync } from 'fs';
   import { tmpdir } from 'os';
   import path from 'path';
   
   const tempFile = path.join(tmpdir(), 'temp-data.json');
   writeFileSync(tempFile, data);
   ```

2. **Environment Variables**:
   - ❌ Accessing server variables from client
   - ❌ Missing required environment variables
   - ❌ Hardcoded values that should be environment variables

   **Solution**:
   - Use NEXT_PUBLIC_ prefix for client variables
   - Validate all variables exist at build time
   - Provide fallbacks for optional variables

3. **External Service Access**:
   - ❌ Blocked outbound connections
   - ❌ Timeout issues with external APIs
   - ❌ Missing API keys in Vercel settings

   **Solution**:
   - Set proper timeouts
   - Handle network errors gracefully
   - Add all required keys to Vercel project

4. **Database Connections**:
   - ❌ Connection string not in Vercel
   - ❌ IP not whitelisted for Vercel
   - ❌ Connection pooling issues

   **Solution**:
   - Add DATABASE_URL to Vercel
   - Whitelist Vercel IPs in database firewall
   - Use connection pooling (e.g., @neondatabase/serverless)

### 7.2 Build Command Validation

**Vercel Build Settings** (vercel.json):
```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

**Validation**:
1. Verify build command matches package.json
2. Test build command locally
3. Ensure no custom build steps missing
4. Check output directory is correct

### 7.3 Serverless Function Limits

**Vercel Limits**:
- Function size: 50MB (default), 250MB (pro)
- Execution time: 10s (hobby), 60s (pro)
- Memory: 1024MB (default), 3008MB (pro)

**Ensure Compliance**:
1. Keep dependencies minimal
2. Use dynamic imports for large libraries
3. Optimize images and assets
4. Avoid long-running operations

**Check Function Sizes**:
```bash
# After build, check .next/server directory
du -sh .next/server/app/**/*.js
```

### 7.4 Static Asset Optimization

**Optimization Checklist**:
- [ ] Images optimized (use next/image)
- [ ] Fonts properly loaded (use next/font)
- [ ] CSS minimized
- [ ] JavaScript tree-shaken
- [ ] No large client-side bundles

**Image Optimization**:
```typescript
// ✅ Correct: Use Next.js Image component
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>
```

### 7.5 Domain & SSL Configuration

**Requirements**:
- [ ] Domain properly configured
- [ ] SSL certificate auto-generated
- [ ] NEXTAUTH_URL matches domain
- [ ] Redirect rules if needed

**Domain Configuration** (vercel.json):
```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [{"type": "host", "value": "old-domain.com"}],
      "destination": "https://new-domain.com/:path*",
      "permanent": true
    }
  ]
}
```

### 7.6 Monitoring & Error Tracking

**Post-Deployment Verification**:

1. **Health Check Endpoint**:
   ```typescript
   // app/api/health/route.ts
   export async function GET() {
     return NextResponse.json({
       status: 'healthy',
       timestamp: new Date().toISOString(),
       version: process.env.VERCEL_GIT_COMMIT_SHA
     });
   }
   ```

2. **Error Monitoring**:
   - Verify Sentry is configured (if used)
   - Check error logs in Vercel dashboard
   - Monitor function execution times

3. **Performance Monitoring**:
   - Use Vercel Analytics
   - Monitor Core Web Vitals
   - Check function cold starts

### 7.7 Final Deployment Guarantee

**The agent guarantees**:

✅ **Build Success**: 
- Local `pnpm build` completes with exit code 0
- No TypeScript errors
- No ESLint errors
- All pages compile

✅ **Configuration Valid**:
- next.config.js has no errors
- vercel.json is valid JSON
- tsconfig.json compatible with Next.js
- All environment variables documented

✅ **No Permission Issues**:
- No file system operations outside /tmp
- No shell commands in production
- No elevated privilege requirements
- All API calls have proper error handling

✅ **Vercel Specific**:
- Function sizes under limits
- No serverless function timeouts
- Static assets optimized
- Database connections pooled

✅ **Security**:
- No exposed secrets
- Proper authentication
- Input validation
- CORS configured correctly

✅ **Testing**:
- Critical flows verified
- API endpoints respond correctly
- Pages render without errors
- No runtime errors in console

**Deployment Command**:
```bash
# Agent prepares for deployment, but does not push
git status # Verify clean working directory
echo "✅ Ready for deployment to Vercel"
echo "Run: git push origin main"
echo "Vercel will automatically deploy from main branch"
```

---

## Final Notes

This agent specification provides a complete, autonomous system for maintaining build quality and ensuring production readiness for the Tradia project. The agent operates continuously, fixing errors automatically while maintaining code quality and safety standards.

**Key Principles**:
1. **Autonomous**: Runs without human intervention
2. **Safe**: Never breaks existing functionality
3. **Thorough**: Handles all error categories
4. **Production-Ready**: Guarantees Vercel deployment success
5. **Minimal**: Makes smallest possible changes
6. **Correct**: Prefers proper fixes over quick hacks

**Success Metrics**:
- Zero build errors after agent run
- Zero TypeScript errors
- Zero blocking ESLint errors
- Successful Vercel deployment
- No broken features
- Clean commit history

This specification is executable and complete. An AI agent following these instructions will successfully maintain the Tradia codebase in a production-ready state at all times.
