# Step 1: Project Foundation – Implementation Summary

This document describes what was implemented in Step 1 (Project Foundation and Configuration) and how to use it.

## What Was Done

### 1. Project initialization

- **package.json**  
  - ESM module (`"type": "module"`)  
  - Node engine requirement (`>=20`)  
  - Build, start, and dev scripts  
  - Bin entry `codereviewer` for CLI usage  

- **Dependencies**  
  - `commander` – CLI framework  
  - `ts-morph` – TypeScript AST parsing  
  - `@anthropic-ai/sdk`, `ollama`, `@google/genai` – AI providers (optional)  
  - `chalk`, `ora`, `execa` – ESM-only utilities  
  - `cosmiconfig` – config discovery  
  - `fast-glob` – file matching  
  - `zod` – schema validation  

- **Dev dependencies**  
  - `typescript`, `@types/node`, `tsx`  

### 2. TypeScript configuration

- **tsconfig.json**  
  - Target: ES2022  
  - Module: NodeNext  
  - Strict mode enabled  
  - Output: `dist/`  
  - Root: `src/`  

### 3. Folder structure

```
src/
├── cli/       # CLI entry point
├── analyzer/  # Code analysis (future)
├── indexer/   # Codebase indexing (future)
├── ai/        # AI providers (future)
├── reporter/  # Report generation (future)
├── types/     # Shared types
├── config/    # Configuration loader
└── storage/   # Storage (future)
```

### 4. Shared types (`src/types/index.ts`)

Central types used across the codebase:

- `FunctionInfo`, `ClassInfo`, `ImportInfo` – analyzer output  
- `CodeMetadata` – per-file metadata  
- `CodeIssue` – found issues (performance, readability, maintainability)  
- `CodeSnippet`, `SnippetCategory` – indexer snippets  
- `ReviewItem`, `AIReview` – AI review output  

### 5. Configuration system (`src/config/loader.ts`)

- Uses **cosmiconfig** to discover config (`.codereviewerrc.json`, `package.json`, etc.)  
- Uses **Zod** for schema validation and type inference  
- Supports env overrides:  
  - `AI_PROVIDER` – `ollama` | `claude` | `gemini`  
  - `OLLAMA_HOST` – Ollama host URL  
  - `ANTHROPIC_API_KEY` – Claude API key  
  - `GEMINI_API_KEY` – Gemini API key  

### 6. Example config and env

- **`.codereviewerrc.json.example`** – example config  
- **`.env.example`** – example env variables  

### 7. Minimal CLI (`src/cli/index.ts`)

Entry point that loads config and types as a sanity check. Ready for CLI commands in later steps.

---

## How to Use

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Run the CLI (sanity check)

```bash
npm run start
# or
node dist/cli/index.js
```

### Develop (with tsx)

```bash
npm run dev
```

### Configure the tool

1. Copy the example config:

   ```bash
   cp .codereviewerrc.json.example .codereviewerrc.json
   ```

2. Edit `.codereviewerrc.json` as needed:

   ```json
   {
     "ai": {
       "provider": "ollama",
       "ollama": { "host": "http://localhost:11434", "model": "codellama:13b" }
     },
     "rules": { "performance": true, "readability": true, "maintainability": true },
     "ignore": ["node_modules", "dist", "*.test.ts"],
     "indexing": { "enabled": true }
   }
   ```

3. Optional: use `.env` for secrets:

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

### How to create API keys

**Claude (Anthropic)**

1. Create an account at [platform.claude.com](https://platform.claude.com).
2. Go to [API Keys](https://console.anthropic.com/settings/keys).
3. Create a new key. Keys start with `sk-ant-`.
4. Set `ANTHROPIC_API_KEY` in your `.env` file.

**Gemini (Google)**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Create an API key (Google can auto-create a default project for new users).
4. Set `GEMINI_API_KEY` in your `.env` file.

> For both providers, prefer environment variables over storing keys in config files.

### Config file discovery

Cosmiconfig looks for config in (in order):

- `codereviewer` property in `package.json`  
- `.codereviewerrc`, `.codereviewerrc.json`, `.codereviewerrc.yaml`, etc.  
- `codereviewer.config.js`, `codereviewer.config.ts`, etc.  

Config is validated with Zod; invalid values will throw at load time.

---

## Verification

- [x] `npm run build` completes without errors  
- [x] `loadConfig()` returns default config when no config file exists  
- [x] `loadConfig()` returns merged + validated config when `.codereviewerrc.json` exists  
- [x] Shared types importable from `src/types/index.ts`  
- [x] Minimal CLI imports types and config successfully  
