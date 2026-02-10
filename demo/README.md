# Demo Scenarios

These fixtures show intentional patterns that the code reviewer can detect. Run:

```bash
code-reviewer analyze demo/<file>.ts
```

| File | Scenario |
|------|----------|
| `order-service.ts` | Sequential awaits, inline retry logic |
| `sample-with-issues.ts` | Sequential awaits, long function |
| `api-sequential-fetches.ts` | API client with sequential fetches |
| `db-queries-sequential.ts` | Sequential DB queries |
| `http-client-sequential.ts` | HTTP client with sequential calls |
| `data-aggregation-long.ts` | Long aggregation function |
| `transform-pipeline-long.ts` | Long transform pipeline |
| `event-handler-fat.ts` | Fat event handler |
| `validation-duplication.ts` | Repeated validation logic (many functions) |
| `config-parser-complex.ts` | High cyclomatic complexity |
| `nested-conditionals.ts` | Deep nesting |
| `calculator-switch-heavy.ts` | Heavy switch statement |
| `retry-manual-inline.ts` | Inline retry logic |
| `repo-many-methods.ts` | Many small methods (maintainability) |
| `high-complexity.ts` | 16+ functions (maintainability) |
| `clean.ts` | Minimal clean code (no issues) |
