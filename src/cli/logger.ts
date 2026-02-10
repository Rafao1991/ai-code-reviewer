// src/cli/logger.ts — CLI logging with optional verbose output
import chalk from 'chalk';

let verboseMode = false;

export function setVerbose(enabled: boolean): void {
  verboseMode = !!enabled;
}

export function isVerbose(): boolean {
  return verboseMode;
}

/** Log only when --verbose is set. */
export function verbose(message: string): void {
  if (verboseMode) {
    console.log(chalk.dim('  ' + message));
  }
}

/** Always-visible step or status (e.g. "Loading config..."). */
export function step(message: string): void {
  console.log(chalk.blue('→') + ' ' + message);
}

/** Informational message (e.g. summary). */
export function info(message: string): void {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

/** Success message. */
export function success(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

/** Warning (non-fatal). */
export function warn(message: string): void {
  console.log(chalk.yellow('⚠') + ' ' + message);
}

/** Error message (use before exit or for reporting). */
export function error(message: string): void {
  console.error(chalk.red('✗') + ' ' + message);
}
