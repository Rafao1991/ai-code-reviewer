// src/cli/index.ts
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { indexCommand } from './commands/index.js';
import { setupCommand } from './commands/setup.js';
import { modelsCommand } from './commands/models.js';
import { cacheCommand } from './commands/cache.js';

const program = new Command();

program
  .name('code-reviewer')
  .description('AI-powered code review for TypeScript/Node.js')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze files or directories')
  .argument('<paths...>', 'Files or directories to analyze')
  .option('-f, --format <type>', 'Output format: text, json, markdown', 'text')
  .option('--provider <provider>', 'AI provider: ollama, claude, gemini')
  .option(
    '--model <model>',
    'Specific model to use (e.g., codellama:13b, llama3.1:8b)',
  )
  .option('--performance', 'Focus on performance issues')
  .option('--readability', 'Focus on readability issues')
  .option('--maintainability', 'Focus on maintainability issues')
  .option(
    '--diff',
    'Only analyze changed hunks from git diff (reduces tokens, ideal for pre-commit)',
  )
  .option('-v, --verbose', 'Show detailed progress and step-by-step logs')
  .action(analyzeCommand);

program
  .command('index')
  .description('Index codebase for learning patterns')
  .option('-p, --path <path>', 'Root path to index', process.cwd())
  .option('--force', 'Force rebuild index even if it exists')
  .option('--incremental', 'Only re-index changed files')
  .option('-v, --verbose', 'Show detailed progress and step-by-step logs')
  .action(indexCommand);

program
  .command('setup')
  .description('Setup Ollama and download recommended models')
  .action(setupCommand);

program
  .command('models')
  .description('List available Ollama models')
  .action(modelsCommand);

program
  .command('cache')
  .description('Manage analysis cache')
  .option('--clear', 'Clear all cached analyses')
  .option('--stats', 'Show cache statistics')
  .action(cacheCommand);

program.parseAsync().catch(console.error);
