# Step 2: CLI Framework – Implementation Summary

This document describes what was implemented in Step 2 (CLI Framework and Command Stubs) and how to use it.

## What Was Done

### 1. Bin entry point

- **package.json** – Bin entry `code-reviewer` pointing to `./dist/cli/index.js`
- Runs via `node dist/cli/index.js` after build, or `npm run dev` with tsx for development

### 2. Commander.js CLI program

**`src/cli/index.ts`**

- Program name: `code-reviewer`
- Version: `1.0.0`
- Uses `parseAsync()` for async command handlers
- Five subcommands wired up with options

### 3. Subcommands and options

| Command   | Description                          | Key options                                           |
|----------|--------------------------------------|--------------------------------------------------------|
| `analyze`| Analyze files or directories         | `--format`, `--provider`, `--model`, `--performance`, `--readability`, `--maintainability`, `--diff` |
| `index`  | Index codebase for learning patterns | `--path`, `--force`, `--incremental`                  |
| `setup`  | Setup Ollama and download models     | —                                                      |
| `models` | List available Ollama models         | —                                                      |
| `cache`  | Manage analysis cache                | `--clear`, `--stats`                                  |

### 4. Command stubs

Each command has a stub in `src/cli/commands/`:

- **analyze.ts** – Shows spinner, prints stub message with path count and format
- **index.ts** – Shows spinner, prints stub message with path
- **setup.ts** – Success message for setup stub
- **models.ts** – Info message for models stub
- **cache.ts** – Handles `--clear` and `--stats`, otherwise suggests options

All stubs use chalk for colors and ora for spinners. No real analysis or indexing logic yet.

### 5. Folder structure update

```
src/cli/
├── index.ts           # Commander program entry
└── commands/
    ├── analyze.ts
    ├── index.ts       # index subcommand
    ├── setup.ts
    ├── models.ts
    └── cache.ts
```

---

## How to Use

### Build and run

```bash
npm run build
node dist/cli/index.js --help
```

### Development (no build)

```bash
npm run dev -- --help
npm run dev -- analyze src/
```

### Available commands

```bash
# Main help
code-reviewer --help

# Subcommand help
code-reviewer analyze --help
code-reviewer index --help
code-reviewer setup --help
code-reviewer models --help
code-reviewer cache --help

# Run stubs
code-reviewer analyze src/foo.ts src/bar.ts
code-reviewer index --path ./my-project
code-reviewer setup
code-reviewer models
code-reviewer cache --stats
code-reviewer cache --clear
```

### Global install (optional)

```bash
npm link
code-reviewer --help
```

---

## Verification

- [x] `npm run build` completes without errors
- [x] `node dist/cli/index.js --help` shows program description and commands
- [x] Each subcommand's `--help` shows its options
- [x] `node dist/cli/index.js analyze src/foo.ts` runs stub and prints message
- [x] `node dist/cli/index.js index` runs stub without error
- [x] `npm run dev -- --help` works for development
