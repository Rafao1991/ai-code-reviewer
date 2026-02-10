// src/analyzer/ts-parser.ts
import {
  Project,
  type SourceFile,
  type Node,
  SyntaxKind,
} from 'ts-morph';
import type {
  CodeMetadata,
  FunctionInfo,
  ClassInfo,
  ImportInfo,
} from '../types/index.js';

function getStatementCount(node: Node | undefined): number {
  const body = node as { getStatements?: () => unknown[] } | undefined;
  return body?.getStatements?.()?.length ?? 0;
}

export class TypeScriptAnalyzer {
  private project: Project;

  constructor(tsConfigPath?: string) {
    this.project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
    });
  }

  async analyzeFile(filePath: string): Promise<CodeMetadata> {
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    const functions = this.extractFunctions(sourceFile);
    const classes = this.extractClasses(sourceFile);
    const imports = this.extractImports(sourceFile);
    const complexity = functions.reduce(
      (sum, f) => sum + f.cyclomaticComplexity,
      0
    );
    return {
      filePath,
      functions,
      classes,
      imports,
      complexity,
      linesOfCode: sourceFile.getEndLineNumber(),
    };
  }

  private extractFunctions(sourceFile: SourceFile): FunctionInfo[] {
    return sourceFile.getFunctions().map((fn) => ({
      name: fn.getName() ?? 'anonymous',
      lineNumber: fn.getStartLineNumber(),
      endLineNumber: fn.getEndLineNumber(),
      parameters: fn.getParameters().map((p) => p.getName()),
      returnType: fn.getReturnType().getText(),
      isAsync: fn.isAsync(),
      bodyLength: getStatementCount(fn.getBody()),
      cyclomaticComplexity: this.calculateFunctionComplexity(fn),
    }));
  }

  private calculateFunctionComplexity(fn: Node): number {
    let complexity = 1;
    const add = () => {
      complexity += 1;
    };
    fn.getDescendantsOfKind(SyntaxKind.IfStatement).forEach(add);
    fn.getDescendantsOfKind(SyntaxKind.ForStatement).forEach(add);
    fn.getDescendantsOfKind(SyntaxKind.ForInStatement).forEach(add);
    fn.getDescendantsOfKind(SyntaxKind.ForOfStatement).forEach(add);
    fn.getDescendantsOfKind(SyntaxKind.WhileStatement).forEach(add);
    fn.getDescendantsOfKind(SyntaxKind.CaseClause).forEach(add);
    fn.getDescendantsOfKind(SyntaxKind.ConditionalExpression).forEach(add);
    fn.getDescendantsOfKind(SyntaxKind.BinaryExpression).forEach((expr) => {
      const token = (expr as { getOperatorToken?: () => { getKind: () => SyntaxKind } }).getOperatorToken?.();
      if (
        token &&
        (token.getKind() === SyntaxKind.AmpersandAmpersandToken ||
          token.getKind() === SyntaxKind.BarBarToken)
      ) {
        add();
      }
    });
    return complexity;
  }

  private extractClasses(sourceFile: SourceFile): ClassInfo[] {
    return sourceFile.getClasses().map((c) => ({
      name: c.getName() ?? 'Anonymous',
      lineNumber: c.getStartLineNumber(),
      methods: c.getMethods().map((m) => m.getName()),
      isExported: c.isExported(),
    }));
  }

  private extractImports(sourceFile: SourceFile): ImportInfo[] {
    return sourceFile.getImportDeclarations().map((imp) => ({
      moduleSpecifier: imp.getModuleSpecifierValue(),
      namedImports: imp.getNamedImports().map((n) => n.getName()),
      defaultImport: imp.getDefaultImport()?.getText(),
      lineNumber: imp.getStartLineNumber(),
    }));
  }
}
