# Step 4: Codebase Indexing and Storage – Implementation Summary

This document describes what was implemented in Step 4 and how to use it.

## What Was Done

### 1. Storage layout

```
project-root/
├── .code-reviewer/
│   ├── index.json       # Codebase index (snippets + metadata)
│   └── cache/           # Analysis cache (hash.json files)
├── .codereviewerrc.json
└── src/
```

### 2. Codebase indexer (`src/indexer/codebase-indexer.ts`)

- **CodebaseIndexer** – Accepts `ignorePatterns` (no API key required)
- **indexCodebase(rootPath)** – Globs `**/*.ts`, indexes each file
- **indexFile(filePath)** – Returns `CodeSnippet[]` for one file (used by full and incremental indexing)
- Extracts functions with `bodyLength >= 5` as snippets
- **categorizeSnippet** – Path-based: controller, service, repository, middleware, util
- **findSimilarPatterns(targetCode, limit, snippets?)** – Keyword overlap (imports, function calls) scores snippets; pass `snippets` from storage for analyze flow

### 3. Index storage (`src/indexer/storage.ts`)

- **StoredIndex** – version, indexedAt, projectPath, gitHash?, snippets, metadata
- **IndexStorage** – saveIndex, loadIndex, loadStoredIndex, indexExists, getIndexAge
- **getTimeAgo(isoDate)** – Human-readable age string

### 4. Analysis cache (`src/ai/cache.ts`)

- **CachedAnalysis** – codeHash, review, timestamp, provider, model
- **AnalysisCache** – get, set, deleteHash, clear, getCacheStats
- SHA-256 hash of code; TTL 7 days; provider/model must match

### 5. Incremental indexer (`src/indexer/incremental.ts`)

- **getChangedFilesSinceLastIndex()** – Uses `git diff --name-only <gitHash> HEAD`; if no index/gitHash, returns all .ts files
- **updateIndex(changedFiles)** – Removes snippets from changed files, re-indexes them, merges, saves

### 6. Privacy manager (`src/storage/privacy.ts`)

- **PrivacyManager.sanitizeForSharing(snippet)** – anonymizePath (last 3 path parts), removeLiterals (replace string literals with `***`)

### 7. .gitignore

- `.code-reviewer/cache/`
- `.code-reviewer/vectors.db/`
- `.code-reviewer/index.json` is **not** ignored (optional to commit)

---

## How to Use

### Index command

```bash
# Full index (first run or --force)
code-reviewer index
code-reviewer index --path ./my-project
code-reviewer index --force

# Incremental (after full index)
code-reviewer index --incremental
```

### Cache command

```bash
code-reviewer cache --stats
code-reviewer cache --clear
```

### Loading index for analyze

When wiring the analyze flow (Step 6), use:

1. **IndexStorage.loadIndex()** to load snippets
2. **CodebaseIndexer.findSimilarPatterns(targetCode, limit, snippets)** (or a helper) to find similar patterns

---

## Verification

- [x] `code-reviewer index` creates `.code-reviewer/index.json` with snippets and metadata
- [x] `code-reviewer index --force` overwrites the index
- [x] `code-reviewer index` when index exists shows age and suggests --force / --incremental
- [x] `code-reviewer index --incremental` updates only changed files
- [x] `code-reviewer cache --stats` returns count/size/oldestAge (0 if empty)
- [x] `code-reviewer cache --clear` clears cache
- [x] **PrivacyManager.sanitizeForSharing** returns shortened path and literals replaced
