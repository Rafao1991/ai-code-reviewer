# Step 6 — Report Generation and Full CLI Wiring

## What was done

This step connects all previous components into a fully functional end-to-end pipeline: static analysis, AI review, caching, and report formatting, wired through five CLI commands.

### 1. Report Formatter (`src/reporter/formatter.ts`)

A `ReportFormatter` class that takes an `AIReview` and outputs it in three formats:

| Format     | Description                                             |
| ---------- | ------------------------------------------------------- |
| `text`     | Terminal-friendly with chalk colors and severity badges  |
| `json`     | Pretty-printed JSON (`JSON.stringify(review, null, 2)`) |
| `markdown` | Headings, lists, and fenced code blocks                 |

Severity colors:

- **high** → red
- **medium** → yellow
- **low** → gray

Each issue shows its title, line number, snippet, explanation, suggestion, and optional example.

### 2. Analyze Command — Full Pipeline

`code-reviewer analyze <paths...>` now runs the complete flow:

1. Loads config (with CLI overrides for `--provider` / `--model`).
2. If provider is `ollama`, validates that Ollama is running and the model is available; exits with helpful messages otherwise.
3. Resolves paths (files or directories → list of `.ts`/`.tsx` files).
4. For each file:
   - Parses AST with `TypeScriptAnalyzer`.
   - Detects rule-based issues with `PatternDetector`.
   - Loads the codebase index and finds similar patterns with `CodebaseIndexer.findSimilarPatterns`.
   - Sends code + context to the AI provider via `AIAnalyzer.analyzeCode` (with caching).
   - Formats the `AIReview` with `ReportFormatter`.
5. Prints the formatted report to stdout.

```bash
# Single file (text output by default)
code-reviewer analyze src/utils/api.ts

# Directory with JSON output
code-reviewer analyze src/ --format json

# Override provider
code-reviewer analyze src/index.ts --provider gemini --model gemini-2.0-flash
```

### 3. Index Command (unchanged from Step 4)

Already fully wired. Creates, force-rebuilds, or incrementally updates `.code-reviewer/index.json`.

```bash
code-reviewer index                  # create (or show age if exists)
code-reviewer index --force          # rebuild from scratch
code-reviewer index --incremental    # update changed files only
```

### 4. Setup Command (`src/cli/commands/setup.ts`)

Interactive setup for Ollama-based workflows:

1. Checks if `ollama` binary is installed; prints install instructions on failure.
2. Checks if Ollama server is running via `healthCheck()`.
3. Displays a list of recommended models with sizes and descriptions:
   - `codellama:13b` (7 GB) — all-round code model
   - `deepseek-coder:33b` (18 GB) — strong code understanding
   - `llama3.1:8b` (4.7 GB) — fast general purpose
   - `qwen2.5-coder:7b` (4.4 GB) — optimized for code tasks
   - `codellama:70b` (38 GB) — highest quality
4. Prompts the user to choose (defaults to `codellama:13b` in non-interactive mode).
5. Pulls the selected model via `ollama pull`.
6. Writes `.codereviewerrc.json` with the chosen model and sensible defaults.
7. Prints next steps (`index` → `analyze`).

```bash
code-reviewer setup
```

### 5. Models Command (`src/cli/commands/models.ts`)

Lists all locally installed Ollama models with name, size, and last modified date.

```bash
code-reviewer models
```

Example output:

```
✔ Found 3 model(s)

  MODEL               SIZE        MODIFIED
  codellama:13b       7.4 GB      2d ago
  llama3.1:8b         4.7 GB      5d ago
  qwen2.5-coder:7b    4.4 GB      1d ago

  Tip: To download a model run: ollama pull <model-name>
```

### 6. Cache Command (unchanged from Step 4)

Already fully wired. Shows cache statistics or clears the cache directory.

```bash
code-reviewer cache --stats
code-reviewer cache --clear
```

## Files created / modified

| File                                     | Action   | Purpose                              |
| ---------------------------------------- | -------- | ------------------------------------ |
| `src/reporter/formatter.ts`              | Created  | Text / JSON / Markdown report output |
| `src/reporter/index.ts`                  | Created  | Barrel export for reporter module    |
| `src/cli/commands/analyze.ts`            | Modified | Full end-to-end analysis pipeline    |
| `src/cli/commands/setup.ts`              | Modified | Ollama setup wizard                  |
| `src/cli/commands/models.ts`             | Modified | List installed Ollama models         |
| `src/ai/providers/ollama-provider.ts`    | Modified | Added `listModels()` method          |

## Architecture

```
User runs: code-reviewer analyze src/file.ts
  │
  ├─ loadConfig()           ← cosmiconfig + Zod
  ├─ validate Ollama        ← healthCheck + isModelAvailable
  ├─ resolve files          ← fast-glob
  │
  └─ per file:
       ├─ TypeScriptAnalyzer.analyzeFile()   ← AST metadata
       ├─ PatternDetector.detectIssues()     ← rule-based issues
       ├─ IndexStorage.loadIndex()           ← cached snippets
       ├─ CodebaseIndexer.findSimilarPatterns()
       ├─ AIAnalyzer.analyzeCode()           ← AI provider + cache
       └─ ReportFormatter.format()           ← text/json/md output
```
