# Context7 MCP

Context7 is an MCP server that provides up-to-date, version-specific documentation and code examples for programming libraries directly within AI coding assistants.

## Problem It Solves

LLMs rely on outdated training data, hallucinate APIs that do not exist, and give generic version-agnostic answers. Context7 grounds the model with current documentation from library sources.

## What It Does

- Pulls current documentation and code snippets from library source repositories
- Injects them into LLM prompts in real-time
- Indexes thousands of libraries and frameworks
- Returns relevant content based on natural language queries
- Supports version pinning (e.g., `/vercel/next.js/v15.1.8`)

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| **resolve-library-id** | Maps a library name (e.g., "Next.js") to a Context7-compatible ID (e.g., `/vercel/next.js`). Required before `query-docs` unless the user provides the ID. Parameters: `query`, `libraryName`. |
| **query-docs** | Fetches documentation and code examples for a library. Parameters: `libraryId` (required), `query` (the question or task). |

## Typical Workflow

1. **Resolve** library name to a Context7-compatible ID via `resolve-library-id`
2. **Query** documentation with `query-docs` using that ID and a specific question
3. **Use** the retrieved content in the prompt for accurate, current code generation

## How to Use in Cursor

- Add `use context7` to prompts when you need up-to-date library documentation
- Example: *"Create a Next.js middleware that checks for a valid JWT in cookies. use context7"*
- No tab-switching; documentation is fetched and injected automatically

## API and Configuration

- Requires an API key from [context7.com/dashboard](https://context7.com/dashboard) for higher rate limits
- REST API endpoints: `GET /api/v2/libs/search`, `GET /api/v2/context`
- Open-source project: [github.com/upstash/context7](https://github.com/upstash/context7)

## Best Practices

- Be specific with queries (detailed questions return better results)
- Use exact versions when consistency matters
- Call `resolve-library-id` before `query-docs` unless the user provides a library ID like `/org/project`

## Resources

- [Official docs](https://context7.com/docs)
- [Installation](https://github.com/upstash/context7#installation)
- [Cursor setup](https://context7.com/docs/clients/cursor)
