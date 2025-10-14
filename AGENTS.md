# AGENTS.md

## Build & Run Commands

- **Run**: `bun run src/main.ts [symbol]` (e.g., `bun run src/main.ts Array.map`)
- **Install locally**: `bun link` (makes `tsdoc` command available globally)

## Issue Tracking

Use `bd` for tracking work if available. Common workflow:

1. **Find work**: `bd ready` - shows unblocked issues
2. **Work on issue**: Complete the task
3. **Mark complete**: `bd close <issue-id>` - close the issue when done
4. **View details**: `bd show <issue-id>` - see full issue details

Other useful commands: `bd create`, `bd list`, `bd dep add` (manage dependencies), `bd update` (modify issues).

Run `bd quickstart` for full tutorial.

## Architecture

This is a TypeScript CLI tool built with Bun that parses and displays documentation for TypeScript symbols using the TypeScript Compiler API. The codebase consists of:

- **src/main.ts**: Single-file implementation containing:
  - CLI argument parsing and help text
  - TypeScript lib file resolution
  - AST traversal and symbol lookup with dot notation support
  - Documentation extraction (JSDoc comments, type signatures, parameters)
  - Formatted output display

## Code Style

- Use TypeScript with strict type checking
- Prefer `const` over `let`
- Use explicit types for function parameters and return values
- Keep functions small and focused
- Use descriptive variable names
- Leverage TypeScript Compiler API for all AST operations

## Dependencies

- **Bun**: Runtime and package manager
- **TypeScript**: For the Compiler API to parse and analyze TypeScript code
- **@types/bun**: Type definitions for Bun APIs

Minimal dependencies by design - only what's necessary for TypeScript parsing.

## Bun Conventions

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Use Bun.$`command` instead of execa for shell commands.
