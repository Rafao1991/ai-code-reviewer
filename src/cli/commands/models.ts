// src/cli/commands/models.ts
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../../config/loader.js';
import { OllamaProvider } from '../../ai/providers/ollama-provider.js';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export async function modelsCommand() {
  const config = await loadConfig();
  const host = config.ai.ollama?.host ?? 'http://localhost:11434';
  const provider = new OllamaProvider(host, 'any');

  const spinner = ora('Connecting to Ollama...').start();
  const healthy = await provider.healthCheck();
  if (!healthy) {
    spinner.fail(
      chalk.red(
        'Cannot connect to Ollama. Make sure it is running: ollama serve',
      ),
    );
    process.exit(1);
  }
  spinner.text = 'Fetching models...';

  try {
    const models = await provider.listModels();
    spinner.succeed(chalk.green(`Found ${models.length} model(s)`));
    console.log('');

    if (models.length === 0) {
      console.log(chalk.dim('No models installed.'));
      console.log(
        `  Download one with: ${chalk.cyan('ollama pull codellama:13b')}`,
      );
      return;
    }

    const maxName = Math.max(...models.map((m) => m.name.length), 10);
    console.log(
      chalk.bold(
        `  ${'MODEL'.padEnd(maxName + 2)}${'SIZE'.padEnd(12)}MODIFIED`,
      ),
    );
    for (const m of models) {
      console.log(
        `  ${chalk.cyan(m.name.padEnd(maxName + 2))}${formatBytes(m.size).padEnd(12)}${timeAgo(m.modifiedAt)}`,
      );
    }
    console.log('');
    console.log(
      chalk.dim(`  Tip: To download a model run: ollama pull <model-name>`),
    );
  } catch (err) {
    spinner.fail(chalk.red(`Failed to list models: ${(err as Error).message}`));
    process.exit(1);
  }
}
