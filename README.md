# tsdoc

A command-line tool to view documentation for TypeScript symbols from built-in types, Node.js APIs, and imported packages.

## Installation

```bash
bun install
bun link
```

## Usage

```
Usage: tsdoc [options] <symbol>

Show documentation for TypeScript symbols from built-in types, Node.js APIs, and imported packages.

Examples:
  tsdoc Array.map
  tsdoc Promise.all
  tsdoc Array.isArray
  tsdoc String.prototype.split

Options:
  -h, --help        Show this help message
```

## Examples

```bash
# Built-in types
tsdoc Array
tsdoc Promise.all
tsdoc Array.isArray

# String methods
tsdoc String.prototype.split
```

## Features

- View documentation for any public symbol in TypeScript's standard library
- Shows symbol location, signature, and JSDoc comments
- Displays parameters, return types, and tags
- Follows dot notation to nested properties and methods
- Zero configuration - works out of the box
