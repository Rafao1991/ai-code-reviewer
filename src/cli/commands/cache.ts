// src/cli/commands/cache.ts
import chalk from 'chalk';
import ora from 'ora';
import { AnalysisCache } from '../../ai/cache.js';

export async function cacheCommand(options: {
  clear?: boolean;
  stats?: boolean;
}) {
  const cache = new AnalysisCache();

  if (options.clear) {
    const spinner = ora('Clearing cache...').start();
    await cache.clear();
    spinner.succeed(chalk.green('Cache cleared.'));
    return;
  }

  if (options.stats) {
    const spinner = ora('Reading cache stats...').start();
    const stats = await cache.getCacheStats();
    spinner.succeed(chalk.green('Cache statistics:'));
    console.log(`  Count: ${stats.count} file(s)`);
    console.log(`  Size:  ${(stats.size / 1024).toFixed(1)} KB`);
    console.log(
      `  Oldest: ${
        stats.oldestAge !== null
          ? stats.oldestAge < 60000
            ? 'just now'
            : stats.oldestAge < 3600000
              ? `${Math.floor(stats.oldestAge / 60000)}m ago`
              : `${Math.floor(stats.oldestAge / 3600000)}h ago`
          : 'N/A'
      }`,
    );
    return;
  }

  console.log(chalk.gray('Use --clear or --stats'));
}
