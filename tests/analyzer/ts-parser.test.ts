import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { TypeScriptAnalyzer } from '../../src/analyzer/ts-parser.js';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEMO_DIR = path.join(PROJECT_ROOT, 'demo');

const TEMP_DIR = path.join(tmpdir(), 'code-reviewer-test-' + Date.now());

describe('TypeScriptAnalyzer', () => {
  const analyzer = new TypeScriptAnalyzer();

  beforeEach(async () => {
    await mkdir(TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEMP_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('extracts async function metadata', async () => {
    const filePath = path.join(TEMP_DIR, 'sample.ts');
    const code = `
interface User {
  id: string;
  name: string;
}

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json();
}
`;
    await writeFile(filePath, code.trim());

    const metadata = await analyzer.analyzeFile(filePath);

    expect(metadata.functions).toHaveLength(1);
    expect(metadata.functions[0].name).toBe('fetchUser');
    expect(metadata.functions[0].isAsync).toBe(true);
    expect(metadata.functions[0].parameters).toContain('id');
    expect(metadata.functions[0].returnType).toContain('User');
  });

  it('extracts class metadata', async () => {
    const filePath = path.join(DEMO_DIR, 'order-service.ts');
    const metadata = await analyzer.analyzeFile(filePath);
    expect(metadata.classes.length).toBeGreaterThanOrEqual(1);
    const cls = metadata.classes.find((c) => c.name === 'OrderService');
    expect(cls).toBeDefined();
    expect(cls?.methods).toContain('processOrder');
  });

  it('extracts imports from demo file', async () => {
    const filePath = path.join(DEMO_DIR, 'order-service.ts');
    const metadata = await analyzer.analyzeFile(filePath);
    expect(metadata.imports).toBeDefined();
    expect(Array.isArray(metadata.imports)).toBe(true);
  });

  it('calculates cyclomatic complexity for conditional logic', async () => {
    const filePath = path.join(TEMP_DIR, 'complex.ts');
    const code = `
function test(x: number) {
  if (x > 0) return 1;
  if (x < 0) return -1;
  for (let i = 0; i < 5; i++) {}
  return 0;
}
`;
    await writeFile(filePath, code.trim());
    const metadata = await analyzer.analyzeFile(filePath);
    expect(metadata.functions).toHaveLength(1);
    expect(metadata.functions[0].cyclomaticComplexity).toBeGreaterThan(1);
  });

  it('returns empty functions array for file with no functions', async () => {
    const filePath = path.join(TEMP_DIR, 'types.ts');
    const code = `const x = 1; type T = string;`;
    await writeFile(filePath, code);
    const metadata = await analyzer.analyzeFile(filePath);
    expect(metadata.functions).toHaveLength(0);
  });

  it('handles file with multiple functions', async () => {
    const filePath = path.join(DEMO_DIR, 'clean.ts');
    const metadata = await analyzer.analyzeFile(filePath);
    expect(metadata.functions.length).toBeGreaterThanOrEqual(1);
    const addFn = metadata.functions.find((f) => f.name === 'add');
    expect(addFn).toBeDefined();
  });

  it('extracts imports including default import', async () => {
    const filePath = path.join(TEMP_DIR, 'with-imports.ts');
    const code = `import React from 'react';\nimport { useState } from 'react';\nexport function App() { return null; }`;
    await writeFile(filePath, code);
    const metadata = await analyzer.analyzeFile(filePath);
    expect(metadata.imports.length).toBeGreaterThanOrEqual(1);
  });

  it('calculates complexity for logical operators', async () => {
    const filePath = path.join(TEMP_DIR, 'logical.ts');
    const code = `function test(a: boolean, b: boolean) { return a && b || !a; }`;
    await writeFile(filePath, code);
    const metadata = await analyzer.analyzeFile(filePath);
    expect(metadata.functions[0].cyclomaticComplexity).toBeGreaterThan(1);
  });
});
