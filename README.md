# tsdoc

A command-line tool to view documentation for TypeScript symbols from built-in types, Node.js APIs, and third-party packages.

## Installation

```bash
bun install
bun link
```

## Usage

```
Usage: tsdoc [options] <symbol>

Show documentation for TypeScript symbols from built-in types, Node.js APIs, and third-party packages.

Examples:
  tsdoc Array.map              # Built-in types
  tsdoc Promise.all            # Built-in types
  tsdoc express.Request        # Third-party package (from node_modules)
  tsdoc react.Component        # Third-party package (from node_modules)
  tsdoc zod.ZodString          # Third-party package (from node_modules)

Options:
  -h, --help        Show this help message
```

## Examples

```bash
# Built-in types
tsdoc Array                      # Show Array interface with all members
tsdoc Promise.all                # Show Promise.all method signature
tsdoc Array.isArray              # Show Array.isArray static method
tsdoc String.prototype.split     # Show string split method

# Third-party packages
tsdoc express                    # List all exports from express package
tsdoc express.Request            # Show express Request interface
tsdoc react.Component            # Show React Component class
```

## Features

- **Built-in TypeScript types** - View documentation for any public symbol in TypeScript's standard library
- **Third-party packages** - View documentation for packages installed in node_modules
- **Package exports** - List all exports from a package by querying the package name alone
- **Type information** - Shows constructor signatures, call signatures, and type parameters with constraints
- **Complete signatures** - Displays parameters with types, optional markers, default values, and descriptions
- **Return types** - Shows return type information with documentation
- **JSDoc support** - Displays @deprecated, @since, @throws, @example, @see tags and more
- **Members listing** - Shows interface/class members with their types and documentation
- **Dot notation** - Follows dot notation to navigate nested properties and methods
- **Automatic resolution** - Resolves package types from package.json or @types packages
- **Zero configuration** - Works out of the box

## Development

```bash
# Format code
bun run fmt
```
