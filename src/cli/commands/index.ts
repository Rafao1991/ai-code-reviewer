// src/cli/commands/index.ts (index command)
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../../config/loader.js';
import {
  CodebaseIndexer,
  IndexStorage,
  IncrementalIndexer,
} from '../../indexer/index.js';
import { setVerbose, verbose, step, success, info } from '../logger.js';

export async function indexCommand(options: {
  path: string;
  force?: boolean;
  incremental?: boolean;
  verbose?: boolean;
}) {
  setVerbose(!!options.verbose);

  if (options.verbose) step('Loading configuration...');
  const config = await loadConfig();
  const rootPath = path.resolve(options.path);
  verbose(`Root path: ${rootPath}`);
  verbose(`Ignore patterns: ${config.ignore.join(', ') || 'none'}`);

  const storage = new IndexStorage();
  const indexer = new CodebaseIndexer(config.ignore);

  const indexExists = await storage.indexExists();

  if (options.force || !indexExists) {
    if (options.verbose) {
      step('Scanning codebase for TypeScript files...');
    }
    const spinner = ora(options.verbose ? '' : 'Indexing codebase...').start();
    const snippets = await indexer.indexCodebase(rootPath);
    const fileCount = [...new Set(snippets.map((s) => s.filePath))].length;
    if (options.verbose) {
      verbose(`Found ${fileCount} file(s), ${snippets.length} snippet(s).`);
      step('Saving index to disk...');
    }
    await storage.saveIndex(snippets, rootPath);
    spinner.stop();
    success(`Indexed ${snippets.length} snippet(s) from ${fileCount} file(s).`);
    return;
  }

  if (options.incremental) {
    if (options.verbose) step('Checking for changed files since last index...');
    const spinner = ora(
      options.verbose ? '' : 'Incremental indexing...',
    ).start();
    const incremental = new IncrementalIndexer(
      storage,
      indexer,
      rootPath,
      config.ignore,
    );
    const changedFiles = await incremental.getChangedFilesSinceLastIndex();
    if (changedFiles.length === 0) {
      spinner.stop();
      success('No changed files since last index.');
      return;
    }
    if (options.verbose) {
      verbose(`${changedFiles.length} file(s) changed.`);
      changedFiles.forEach((f) =>
        verbose(`  ${path.relative(rootPath, f) || f}`),
      );
      step('Updating index...');
    }
    await incremental.updateIndex(changedFiles);
    const stored = await storage.loadStoredIndex();
    const total = stored?.snippets?.length ?? 0;
    spinner.stop();
    success(
      `Updated index: ${changedFiles.length} file(s) changed, ${total} total snippet(s).`,
    );
    return;
  }

  // No --force, no --incremental, index exists
  const age = await storage.getIndexAge();
  const ageStr =
    age !== null
      ? age < 60000
        ? 'just now'
        : age < 3600000
          ? `${Math.floor(age / 60000)}m ago`
          : `${Math.floor(age / 3600000)}h ago`
      : 'unknown';
  info(
    `Index exists (${ageStr}). Use --force to rebuild, --incremental to update.`,
  );
}
