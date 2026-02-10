# Step 3: Code Analysis Engine – Implementation Summary

This document describes what was implemented in Step 3 (Code Analysis Engine) and how to use it.

## What Was Done

### 1. TypeScript AST Parser (`src/analyzer/ts-parser.ts`)

Uses **ts-morph** to parse TypeScript/JavaScript files and extract structured metadata.

- **TypeScriptAnalyzer** – Creates a ts-morph Project with `skipAddingFilesFromTsConfig: true` and optional `tsConfigFilePath`
- **analyzeFile(filePath)** – Returns `CodeMetadata` with:
  - `filePath`, `functions`, `classes`, `imports`
  - `complexity` – sum of all function cyclomatic complexities
  - `linesOfCode` – from `sourceFile.getEndLineNumber()`

- **extractFunctions** – Iterates `getFunctions()`; for each: name, lineNumber, endLineNumber, parameters, returnType, isAsync, bodyLength (statement count), cyclomaticComplexity
- **extractClasses** – name, lineNumber, methods, isExported
- **extractImports** – moduleSpecifier, namedImports, defaultImport, lineNumber
- **calculateFunctionComplexity** – Counts IfStatement, For/ForIn/ForOf, While, CaseClause, ConditionalExpression, and `&&`/`||` in BinaryExpressions (cyclomatic complexity)

### 2. Pattern Detector (`src/analyzer/patterns.ts`)

Rule-based checks that produce `CodeIssue[]`:

- **Performance** – Async functions with 2+ sequential `await` calls → suggests `Promise.all()`
- **Readability** – Functions with bodyLength > 25 or cyclomaticComplexity > 10 → suggests splitting (severity medium/high if complexity > 15)
- **Maintainability** – Files with complexity > 50 or > 15 functions → suggests splitting modules

Helpers: `extractCodeSnippet()`, `hasSequentialAwaits()`.

### 3. Shared Types Update

- `FunctionInfo` – Added `endLineNumber` for accurate function-bound detection (used by `hasSequentialAwaits`).

### 4. Analyze Command Integration

The `analyze` command now:

- Loads config (uses `ignore` patterns)
- Expands paths to `.ts`/`.tsx` files via fast-glob (files or directories)
- Runs `TypeScriptAnalyzer.analyzeFile()` and `PatternDetector.detectIssues()` per file
- Respects `rules.performance`, `rules.readability`, `rules.maintainability` (config + CLI flags)
- Outputs in `text`, `json`, or `markdown` format

---

## How to Use

### Analyze a file

```bash
code-reviewer analyze src/analyzer/ts-parser.ts
```

### Analyze a directory

```bash
code-reviewer analyze src/
```

### Output formats

```bash
# Text (default)
code-reviewer analyze src/ --format text

# JSON
code-reviewer analyze src/ --format json

# Markdown
code-reviewer analyze src/ --format markdown
```

### Rule filters (override config)

```bash
code-reviewer analyze src/ --performance --readability
code-reviewer analyze src/ --maintainability
```

### Test fixture

`demo/sample-with-issues.ts` contains:

- An async function with sequential awaits (performance issue)
- A long function (readability issue)

```bash
code-reviewer analyze demo/sample-with-issues.ts
```

---

## Verification

- [x] `TypeScriptAnalyzer.analyzeFile()` returns `CodeMetadata` with functions, classes, imports, complexity, linesOfCode
- [x] `PatternDetector.detectIssues()` finds performance issues (sequential awaits)
- [x] `PatternDetector.detectIssues()` finds readability issues (long/complex functions)
- [x] `PatternDetector.detectIssues()` finds maintainability issues (high file complexity)
- [x] `analyze` command works with files and directories
- [x] Text, JSON, and Markdown output formats work
