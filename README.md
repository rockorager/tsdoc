# tsdoc

A command-line tool to view documentation for TypeScript symbols from built-in types, Node.js APIs, third-party packages, and local project files.

## Installation

```bash
bun install
bun link
```

## Usage

```
Usage: tsdoc [options] <symbol>

Show documentation for TypeScript symbols from built-in types, Node.js APIs, third-party packages, and local project files.

Examples:
  tsdoc Array.map              # Built-in types
  tsdoc Promise.all            # Built-in types
  tsdoc express.Request        # Third-party package (from node_modules)
  tsdoc react.Component        # Third-party package (from node_modules)
  tsdoc zod.ZodString          # Third-party package (from node_modules)
  tsdoc mymodule               # Local project file (./mymodule.ts or ./src/mymodule.ts)
  tsdoc mymodule.MyClass       # Exported symbol from local file

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

# Local project files
tsdoc example                    # List all exports from ./example.ts
tsdoc example.greet              # Show greet function from local file
tsdoc utils.helpers              # Show exports from ./src/utils/helpers.ts
```

## Features

- **Built-in TypeScript types** - View documentation for any public symbol in TypeScript's standard library
- **Third-party packages** - View documentation for packages installed in node_modules
- **Local project files** - View documentation for TypeScript files in your current project
- **Package exports** - List all exports from a package or local module by querying the name alone
- **Type information** - Shows constructor signatures, call signatures, and type parameters with constraints
- **Complete signatures** - Displays parameters with types, optional markers, default values, and descriptions
- **Return types** - Shows return type information with documentation
- **JSDoc support** - Displays @deprecated, @since, @throws, @example, @see tags and more
- **Members listing** - Shows interface/class members with their types and documentation
- **Dot notation** - Follows dot notation to navigate nested properties and methods
- **Automatic resolution** - Resolves package types from package.json or @types packages, and local files from current directory or src/
- **Zero configuration** - Works out of the box

## Development

```bash
# Format code
bun run fmt
```
