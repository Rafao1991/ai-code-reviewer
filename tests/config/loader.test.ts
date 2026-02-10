import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../../src/config/loader.js';

const TEST_DIR = path.join(tmpdir(), 'code-reviewer-config-test-' + Date.now());

describe('Config loader', () => {
  const origCwd = process.cwd();

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
    delete process.env.AI_PROVIDER;
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig();
    expect(config.ai.provider).toBe('ollama');
    expect(config.rules.performance).toBe(true);
    expect(config.rules.readability).toBe(true);
    expect(config.rules.maintainability).toBe(true);
    expect(Array.isArray(config.ignore)).toBe(true);
  });

  it('merges config from .codereviewerrc.json', async () => {
    await writeFile(
      path.join(TEST_DIR, '.codereviewerrc.json'),
      JSON.stringify({
        ai: { provider: 'gemini' },
        rules: { performance: false },
      }),
    );
    const config = await loadConfig();
    expect(config.ai.provider).toBe('gemini');
    expect(config.rules.performance).toBe(false);
    expect(config.rules.readability).toBe(true);
  });

  it('respects AI_PROVIDER env var override', async () => {
    process.env.AI_PROVIDER = 'claude';
    const config = await loadConfig();
    expect(config.ai.provider).toBe('claude');
  });

  it('returns valid ignore array', async () => {
    const config = await loadConfig();
    expect(Array.isArray(config.ignore)).toBe(true);
    expect(config.ignore).toContain('node_modules');
  });

  it('merges ANTHROPIC_API_KEY into claude config', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';
    const config = await loadConfig();
    expect(config.ai.claude?.apiKey).toBe('sk-test-key');
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('merges GEMINI_API_KEY into gemini config', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key';
    const config = await loadConfig();
    expect(config.ai.gemini?.apiKey).toBe('gemini-key');
    delete process.env.GEMINI_API_KEY;
  });

  it('merges OLLAMA_HOST into ollama config', async () => {
    process.env.OLLAMA_HOST = 'http://custom:11434';
    const config = await loadConfig();
    expect(config.ai.ollama?.host).toBe('http://custom:11434');
    delete process.env.OLLAMA_HOST;
  });
});
