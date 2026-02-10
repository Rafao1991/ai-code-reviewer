# Code Reviewer

Context-aware AI-powered code review for TypeScript/Node.js. Uses static analysis, codebase indexing, and AI (Ollama, Claude, Gemini) to produce actionable review reports.

## Requirements

- **Node.js** 20+
- **Ollama** (optional) for free local analysis
- **API keys** for Claude or Gemini if using cloud providers

## Installing Ollama

Ollama runs large language models locally. Install it before using `code-reviewer setup`:

- **macOS** — Homebrew: `brew install ollama` (or GUI: `brew install --cask ollama-app`) — or install script: `curl -fsSL https://ollama.com/install.sh | sh`
- **Linux** — Snap: `sudo snap install ollama` — or install script: `curl -fsSL https://ollama.com/install.sh | sh`
- **Windows** — winget: `winget install Ollama.Ollama` — or download [OllamaSetup.exe](https://ollama.com/download)

After installation, start the server (it may auto-start on some systems):

```bash
ollama serve
```

Then run `code-reviewer setup` to pull a recommended model and generate your config.

## Quick Start

```bash
# Install globally
npm install -g code-reviewer

# Setup Ollama (one-time)
code-reviewer setup

# Index your codebase
code-reviewer index

# Run your first review
code-reviewer analyze src/
```

## Commands

| Command | Description |
|---------|-------------|
| `analyze <paths...>` | Analyze files or directories. Output formats: `text` (default), `json`, `markdown`. |
| `index` | Index codebase for similar-pattern lookup. Use `--force` to rebuild, `--incremental` to update changed files only. Use `-v, --verbose` for detailed logs. |
| `setup` | Interactive setup for Ollama: check install, pull a model, write config. |
| `models` | List installed Ollama models. |
| `cache` | Manage analysis cache. Use `--stats` or `--clear`. |

### Analyze options

- `-f, --format <type>` — Output format: `text`, `json`, `markdown`
- `--provider <provider>` — AI provider: `ollama`, `claude`, `gemini`
- `--model <model>` — Override model (e.g. `codellama:13b`, `gemini-2.0-flash`)
- `-v, --verbose` — Show detailed progress (config, file resolution, parsing, cache hits, AI calls)

## Configuration

Create `.codereviewerrc.json` in your project root:

```json
{
  "ai": {
    "provider": "ollama",
    "ollama": { "host": "http://localhost:11434", "model": "codellama:13b" }
  },
  "rules": {
    "performance": true,
    "readability": true,
    "maintainability": true
  },
  "ignore": ["node_modules", "dist", "coverage"]
}
```

### Environment variables

- `AI_PROVIDER` — Override provider (`ollama`, `claude`, `gemini`)
- `OLLAMA_HOST` — Ollama server URL
- `GEMINI_API_KEY` — For Gemini provider
- `ANTHROPIC_API_KEY` — For Claude provider

## Providers

| Provider | Cost | Notes |
|----------|------|-------|
| **Ollama** | Free | Local models. Run `ollama serve` and pull a model. |
| **Gemini** | Free tier | Set `GEMINI_API_KEY`. |
| **Claude** | Paid | Set `ANTHROPIC_API_KEY`. |

## CI/CD

Example GitHub Actions workflows are in [`.github/workflows/examples/`](.github/workflows/examples/):

- `code-review-ollama.yml` — Self-hosted runner with Ollama
- `code-review-gemini.yml` — Cloud runner, uses `GEMINI_API_KEY` secret
- `code-review-claude.yml` — Cloud runner, uses `ANTHROPIC_API_KEY` secret

Copy one into `.github/workflows/` and configure secrets as needed.

## Demo

Try the demo scenarios with intentional issues. See [demo/README.md](demo/README.md) for the full list.

```bash
code-reviewer analyze demo/order-service.ts      # sequential awaits, retry logic
code-reviewer analyze demo/api-sequential-fetches.ts  # parallelizable API calls
code-reviewer analyze demo/  # all scenarios
```

## License

MIT
