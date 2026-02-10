// src/cli/commands/setup.ts
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import { OllamaProvider } from '../../ai/providers/ollama-provider.js';

const RECOMMENDED_MODELS = [
  {
    name: 'codellama:13b',
    size: '~7 GB',
    desc: 'Meta Code Llama — solid all-round code model',
  },
  {
    name: 'deepseek-coder:33b',
    size: '~18 GB',
    desc: 'DeepSeek Coder — strong code understanding',
  },
  {
    name: 'llama3.1:8b',
    size: '~4.7 GB',
    desc: 'Llama 3.1 — fast general-purpose model',
  },
  {
    name: 'qwen2.5-coder:7b',
    size: '~4.4 GB',
    desc: 'Qwen 2.5 Coder — optimized for code tasks',
  },
  {
    name: 'codellama:70b',
    size: '~38 GB',
    desc: 'Code Llama 70B — highest quality, needs 48 GB+ RAM',
  },
];

export async function setupCommand() {
  console.log(chalk.bold.underline('Code Reviewer — Ollama Setup\n'));

  // 1. Check Ollama installed
  const installSpinner = ora('Checking Ollama installation...').start();
  try {
    const { stdout } = await execa('ollama', ['--version']);
    installSpinner.succeed(chalk.green(`Ollama found: ${stdout.trim()}`));
  } catch {
    installSpinner.fail(chalk.red('Ollama is not installed.'));
    console.log('');
    console.log(chalk.bold('Install instructions:'));
    console.log(
      `  ${chalk.cyan('macOS:')}    curl -fsSL https://ollama.com/install.sh | sh`,
    );
    console.log(
      `  ${chalk.cyan('Linux:')}    curl -fsSL https://ollama.com/install.sh | sh`,
    );
    console.log(
      `  ${chalk.cyan('Windows:')}  Download from https://ollama.com/download`,
    );
    process.exit(1);
  }

  // 2. Check Ollama running
  const runSpinner = ora('Checking Ollama is running...').start();
  const testProvider = new OllamaProvider('http://localhost:11434', 'test');
  const healthy = await testProvider.healthCheck();
  if (!healthy) {
    runSpinner.fail(chalk.red('Ollama is not running.'));
    console.log(`\n  Start it with: ${chalk.cyan('ollama serve')}\n`);
    process.exit(1);
  }
  runSpinner.succeed(chalk.green('Ollama is running.'));

  // 3. Show recommended models
  console.log('');
  console.log(chalk.bold('Recommended models:'));
  RECOMMENDED_MODELS.forEach((m, i) => {
    console.log(
      `  ${chalk.cyan(String(i + 1))}. ${chalk.bold(m.name)} ${chalk.dim(`(${m.size})`)}`,
    );
    console.log(`     ${m.desc}`);
  });
  console.log('');

  // 4. Prompt user to choose
  let selectedModel = RECOMMENDED_MODELS[0].name;

  if (process.stdin.isTTY) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question(
      `Choose a model [1-${RECOMMENDED_MODELS.length}] (default: 1): `,
    );
    rl.close();

    const choice = parseInt(answer.trim(), 10);
    if (choice >= 1 && choice <= RECOMMENDED_MODELS.length) {
      selectedModel = RECOMMENDED_MODELS[choice - 1].name;
    }
  } else {
    console.log(
      chalk.dim(`Non-interactive mode, defaulting to ${selectedModel}`),
    );
  }

  console.log(`\nSelected: ${chalk.bold.green(selectedModel)}`);

  // 5. Pull model
  const pullSpinner = ora(
    `Pulling ${selectedModel}... (this may take a while)`,
  ).start();
  try {
    await execa('ollama', ['pull', selectedModel], { stdio: 'pipe' });
    pullSpinner.succeed(chalk.green(`Model ${selectedModel} is ready.`));
  } catch (err) {
    pullSpinner.fail(
      chalk.red(`Failed to pull ${selectedModel}: ${(err as Error).message}`),
    );
    process.exit(1);
  }

  // 6. Write .codereviewerrc.json
  const configPath = path.join(process.cwd(), '.codereviewerrc.json');
  const config = {
    ai: {
      provider: 'ollama',
      ollama: {
        host: 'http://localhost:11434',
        model: selectedModel,
      },
    },
    rules: {
      performance: true,
      readability: true,
      maintainability: true,
    },
    ignore: ['node_modules', 'dist', '.git', 'coverage'],
    indexing: {
      autoIndex: true,
      maxFileSize: 50000,
    },
  };
  await writeFile(configPath, JSON.stringify(config, null, 2));
  console.log(
    chalk.green(
      `\nConfiguration written to ${chalk.bold('.codereviewerrc.json')}`,
    ),
  );

  // 7. Next steps
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log(
    `  1. ${chalk.cyan('code-reviewer index')}     — index your codebase`,
  );
  console.log(
    `  2. ${chalk.cyan('code-reviewer analyze src/')} — run your first review`,
  );
  console.log('');
}
