// src/cli/commands/analyze.ts
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import fg from 'fast-glob';
import { loadConfig } from '../../config/loader.js';
import type { Config } from '../../config/loader.js';
import { TypeScriptAnalyzer, PatternDetector } from '../../analyzer/index.js';
import { AIAnalyzer } from '../../ai/analyzer.js';
import { AnalysisCache } from '../../ai/cache.js';
import { OllamaProvider } from '../../ai/providers/ollama-provider.js';
import { IndexStorage } from '../../indexer/storage.js';
import { CodebaseIndexer } from '../../indexer/codebase-indexer.js';
import {
  ReportFormatter,
  type OutputFormat,
} from '../../reporter/formatter.js';
import type {
  CodeMetadata,
  CodeIssue,
  CodeSnippet,
} from '../../types/index.js';
import {
  setVerbose,
  verbose,
  step,
  success,
  error as logError,
} from '../logger.js';

export async function analyzeCommand(
  paths: string[],
  options: {
    format: string;
    provider?: string;
    model?: string;
    performance?: boolean;
    readability?: boolean;
    maintainability?: boolean;
    diff?: boolean;
    verbose?: boolean;
  },
) {
  setVerbose(!!options.verbose);

  if (options.verbose) {
    step('Loading configuration...');
  }
  const config = await loadConfig();
  verbose(`Provider: ${config.ai.provider}`);
  if (config.ai.provider === 'ollama' && config.ai.ollama) {
    verbose(`Model: ${config.ai.ollama.model}`);
  } else if (config.ai.provider === 'claude' && config.ai.claude) {
    verbose(`Model: ${config.ai.claude.model}`);
  } else if (config.ai.provider === 'gemini' && config.ai.gemini) {
    verbose(`Model: ${config.ai.gemini.model}`);
  }

  // Override provider/model from CLI options
  if (options.provider) {
    (config as { ai: Config['ai'] }).ai.provider =
      options.provider as Config['ai']['provider'];
  }
  if (options.model) {
    const p = config.ai.provider;
    if (p === 'ollama' && config.ai.ollama)
      config.ai.ollama.model = options.model;
    else if (p === 'claude' && config.ai.claude)
      config.ai.claude.model = options.model;
    else if (p === 'gemini' && config.ai.gemini)
      config.ai.gemini.model = options.model;
  }

  // Validate Ollama if selected
  if (config.ai.provider === 'ollama') {
    if (options.verbose) step('Checking Ollama connection...');
    const host = config.ai.ollama?.host ?? 'http://localhost:11434';
    const model = config.ai.ollama?.model ?? 'codellama:13b';
    const ollamaCheck = new OllamaProvider(host, model);
    const healthy = await ollamaCheck.healthCheck();
    if (!healthy) {
      logError(
        'Ollama is not running. Start it with: ollama serve\nOr run: code-reviewer setup',
      );
      process.exit(1);
    }
    const available = await ollamaCheck.isModelAvailable();
    if (!available) {
      logError(
        `Model "${model}" not found. Pull it: ollama pull ${model}\nOr run: code-reviewer setup`,
      );
      process.exit(1);
    }
    verbose('Ollama is ready.');
  }

  if (options.verbose) {
    step('Resolving files to analyze...');
  }
  const spinner = ora(options.verbose ? '' : 'Analyzing files...').start();

  // Resolve files
  const ignorePatterns = config.ignore.flatMap((p) => [
    `**/${p}/**`,
    `**/${p}`,
  ]);
  const allFiles: string[] = [];
  for (const p of paths) {
    const resolved = path.resolve(p);
    if (existsSync(resolved)) {
      const fileStat = await stat(resolved);
      if (fileStat.isFile() && /\.tsx?$/.test(p)) {
        allFiles.push(resolved);
      } else if (fileStat.isDirectory()) {
        const files = await fg('**/*.{ts,tsx}', {
          cwd: resolved,
          absolute: true,
          ignore: ignorePatterns,
        });
        allFiles.push(...files);
      }
    }
  }
  const uniqueFiles = [...new Set(allFiles)];

  if (uniqueFiles.length === 0) {
    spinner.fail('No TypeScript files found to analyze.');
    return;
  }

  if (options.verbose) {
    verbose(`Found ${uniqueFiles.length} file(s):`);
    uniqueFiles.forEach((f) =>
      verbose(`  ${path.relative(process.cwd(), f) || f}`),
    );
  }

  // Create tools
  const tsAnalyzer = new TypeScriptAnalyzer();
  const patternDetector = new PatternDetector();
  const cache = new AnalysisCache();
  const aiAnalyzer = new AIAnalyzer(config, cache, undefined, (event) => {
    if (!options.verbose) return;
    if (event.type === 'cache-hit')
      verbose('  Cache hit — using cached review.');
    if (event.type === 'cache-miss')
      verbose(`  Calling AI (${event.provider}/${event.model})...`);
  });
  const formatter = new ReportFormatter();

  // Load index for similar patterns
  if (options.verbose) step('Loading codebase index for similar patterns...');
  const storage = new IndexStorage();
  const indexSnippets = await storage.loadIndex();
  verbose(`Index: ${indexSnippets.length} snippet(s) loaded.`);
  const codebaseIndexer = new CodebaseIndexer(config.ignore);

  const rules = {
    performance: options.performance ?? config.rules.performance,
    readability: options.readability ?? config.rules.readability,
    maintainability: options.maintainability ?? config.rules.maintainability,
  };

  const total = uniqueFiles.length;
  spinner.text = total === 1 ? 'Analyzing...' : `Analyzing ${total} file(s)...`;

  for (let i = 0; i < uniqueFiles.length; i++) {
    const filePath = uniqueFiles[i];
    const current = i + 1;
    const shortName = path.basename(filePath);
    const progress = total > 1 ? chalk.dim(` [${current}/${total}]`) : '';

    try {
      if (options.verbose) {
        step(`Analyzing ${shortName}${progress}`);
        verbose('  Reading file...');
      }
      const sourceCode = await readFile(filePath, 'utf-8');
      if (options.verbose) verbose('  Parsing TypeScript...');
      const metadata = await tsAnalyzer.analyzeFile(filePath);
      if (options.verbose) verbose('  Detecting patterns...');
      const detectedIssues = patternDetector.detectIssues(metadata, sourceCode);
      const filtered = detectedIssues.filter((i) => rules[i.type]);
      if (options.verbose)
        verbose(`  Found ${filtered.length} issue(s) from static analysis.`);
      const similarPatterns = codebaseIndexer.findSimilarPatterns(
        sourceCode,
        5,
        indexSnippets,
      );
      if (options.verbose)
        verbose(
          `  Using ${similarPatterns.length} similar pattern(s) from index.`,
        );

      spinner.text = `AI reviewing ${shortName}${progress}`;
      const review = await aiAnalyzer.analyzeCode({
        targetCode: sourceCode,
        metadata,
        detectedIssues: filtered,
        similarPatterns,
      });

      if (options.verbose) verbose('  Formatting report...');
      spinner.stop();
      const report = formatter.format(review, options.format as OutputFormat);
      console.log(report);
      if (uniqueFiles.length > 1) console.log('');
      spinner.start();
    } catch (err) {
      spinner.warn(
        chalk.yellow(`Skipped ${filePath}: ${(err as Error).message}`),
      );
    }
  }

  spinner.stop();
  success(`Completed analysis of ${uniqueFiles.length} file(s).`);
}
