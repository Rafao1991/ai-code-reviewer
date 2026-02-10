// src/reporter/formatter.ts
import chalk from 'chalk';
import type { AIReview } from '../ai/schemas.js';
import type { ReviewItem } from '../types/index.js';

export type OutputFormat = 'text' | 'json' | 'markdown';

export class ReportFormatter {
  format(review: AIReview, fmt: OutputFormat): string {
    switch (fmt) {
      case 'json':
        return this.formatJSON(review);
      case 'markdown':
        return this.formatMarkdown(review);
      default:
        return this.formatText(review);
    }
  }

  private formatText(review: AIReview): string {
    const lines: string[] = [];
    lines.push(chalk.bold.underline('Code Review Report'));
    lines.push('');
    lines.push(chalk.bold('Summary: ') + review.summary);
    lines.push('');

    this.appendIssueSection(lines, 'Performance', review.performanceIssues);
    this.appendIssueSection(lines, 'Readability', review.readabilityIssues);
    this.appendIssueSection(
      lines,
      'Maintainability',
      review.maintainabilityIssues,
    );

    if (review.positives.length > 0) {
      lines.push(chalk.bold.green('Positives:'));
      for (const p of review.positives) {
        lines.push(`  ${chalk.green('+')} ${p}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private appendIssueSection(
    lines: string[],
    title: string,
    issues: ReviewItem[],
  ): void {
    if (issues.length === 0) return;
    lines.push(chalk.bold(`${title} Issues (${issues.length}):`));
    issues.forEach((issue, idx) => {
      lines.push(this.formatIssueText(issue, idx + 1));
    });
    lines.push('');
  }

  private formatIssueText(issue: ReviewItem, index: number): string {
    const sev =
      issue.severity === 'high'
        ? chalk.red(`[${issue.severity}]`)
        : issue.severity === 'medium'
          ? chalk.yellow(`[${issue.severity}]`)
          : chalk.gray(`[${issue.severity}]`);
    const lines: string[] = [];
    lines.push(`  ${index}. ${sev} ${chalk.bold(issue.title)}`);
    lines.push(
      `     Line ${issue.location.line}: ${chalk.dim(issue.location.snippet)}`,
    );
    lines.push(`     ${issue.explanation}`);
    lines.push(`     ${chalk.cyan('Suggestion:')} ${issue.suggestion}`);
    if (issue.example) {
      lines.push(`     ${chalk.dim('Example:')} ${issue.example}`);
    }
    return lines.join('\n');
  }

  private formatMarkdown(review: AIReview): string {
    const lines: string[] = [];
    lines.push('# Code Review Report', '');
    lines.push('## Summary', '', review.summary, '');

    this.appendIssueMarkdown(lines, 'Performance', review.performanceIssues);
    this.appendIssueMarkdown(lines, 'Readability', review.readabilityIssues);
    this.appendIssueMarkdown(
      lines,
      'Maintainability',
      review.maintainabilityIssues,
    );

    if (review.positives.length > 0) {
      lines.push('## Positives', '');
      for (const p of review.positives) {
        lines.push(`- ${p}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private appendIssueMarkdown(
    lines: string[],
    title: string,
    issues: ReviewItem[],
  ): void {
    if (issues.length === 0) return;
    lines.push(`## ${title} Issues`, '');
    issues.forEach((issue, idx) => {
      lines.push(this.formatIssueMarkdown(issue, idx + 1));
    });
  }

  private formatIssueMarkdown(issue: ReviewItem, index: number): string {
    const lines: string[] = [];
    lines.push(`### ${index}. ${issue.title} (${issue.severity})`, '');
    lines.push(`- **Line:** ${issue.location.line}`);
    lines.push(`- **Snippet:** \`${issue.location.snippet}\``);
    lines.push(`- **Explanation:** ${issue.explanation}`);
    lines.push(`- **Suggestion:** ${issue.suggestion}`);
    if (issue.example) {
      lines.push('', '```typescript', issue.example, '```');
    }
    lines.push('');
    return lines.join('\n');
  }

  private formatJSON(review: AIReview): string {
    return JSON.stringify(review, null, 2);
  }
}
