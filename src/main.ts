#!/usr/bin/env bun

import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

function printUsage() {
  console.log(`Usage: tsdoc [options] <symbol>

Show documentation for TypeScript symbols from built-in types, Node.js APIs, and imported packages.

Examples:
  tsdoc Array.map
  tsdoc Promise.all
  tsdoc fs.readFile
  tsdoc express.Request

Options:
  -h, --help        Show this help message
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    printUsage();
    process.exit(0);
  }

  const symbolPath = args[0];
  
  try {
    findAndPrintDocs(symbolPath);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

function findAndPrintDocs(symbolPath: string) {
  const parts = symbolPath.split(".");
  const rootModule = parts[0];

  const libFiles = getLibFiles();
  const program = ts.createProgram(libFiles, {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
  });

  const checker = program.getTypeChecker();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      const symbol = findSymbolInFile(sourceFile, parts, checker);
      if (symbol) {
        printSymbolDocs(symbol, checker, sourceFile);
        return;
      }
    }
  }

  console.error(`Symbol '${symbolPath}' not found`);
  process.exit(1);
}

function getLibFiles(): string[] {
  try {
    const tsPath = require.resolve("typescript");
    const libDir = path.dirname(tsPath);
    const files: string[] = [];

    const libFiles = fs.readdirSync(libDir).filter((f) => f.startsWith("lib.") && f.endsWith(".d.ts"));
    
    for (const file of libFiles) {
      files.push(path.join(libDir, file));
    }

    return files;
  } catch (e) {
    console.error("Failed to find TypeScript lib files:", e);
    return [];
  }
}

function findSymbolInFile(
  sourceFile: ts.SourceFile,
  parts: string[],
  checker: ts.TypeChecker
): ts.Symbol | undefined {
  const [first, ...rest] = parts;

  let currentSymbol: ts.Symbol | undefined;

  function visit(node: ts.Node) {
    if (currentSymbol) return;

    if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      if (node.name?.getText() === first) {
        currentSymbol = checker.getSymbolAtLocation(node.name);
      }
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.getText() === first) {
          currentSymbol = checker.getSymbolAtLocation(decl.name);
        }
      }
    } else if (ts.isModuleDeclaration(node)) {
      const moduleName = node.name.getText().replace(/['"]/g, "");
      if (moduleName === first) {
        currentSymbol = checker.getSymbolAtLocation(node.name);
      }
      if (node.body) {
        ts.forEachChild(node.body, visit);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!currentSymbol) return undefined;

  for (const part of rest) {
    const decl = currentSymbol.valueDeclaration || currentSymbol.declarations?.[0];
    if (!decl) return undefined;
    const type = checker.getTypeOfSymbolAtLocation(currentSymbol, decl);
    const prop = type.getProperty(part);
    if (!prop) return undefined;
    currentSymbol = prop;
  }

  return currentSymbol;
}

function printSymbolDocs(symbol: ts.Symbol, checker: ts.TypeChecker, sourceFile: ts.SourceFile) {
  const name = symbol.getName();
  const decl = symbol.valueDeclaration || symbol.declarations?.[0];
  if (!decl) return;
  
  const type = checker.getTypeOfSymbolAtLocation(symbol, decl);
  
  console.log(`\n${name}`);
  console.log("=".repeat(name.length));
  
  const { line } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
  console.log(`\nLocation: ${sourceFile.fileName}:${line + 1}`);

  const callSignatures = type.getCallSignatures();
  const constructSignatures = type.getConstructSignatures();

  if (constructSignatures.length > 0) {
    console.log(`\nConstructor Signatures:`);
    for (const sig of constructSignatures) {
      const sigString = checker.signatureToString(sig, undefined, ts.TypeFormatFlags.NoTruncation);
      console.log(`  new ${sigString}`);
    }
  }

  if (callSignatures.length > 0) {
    console.log(`\nCall Signatures:`);
    for (const sig of callSignatures) {
      const sigString = checker.signatureToString(sig, undefined, ts.TypeFormatFlags.NoTruncation);
      console.log(`  ${sigString}`);
    }
  }

  if (callSignatures.length === 0 && constructSignatures.length === 0) {
    const typeString = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
    console.log(`\nType: ${typeString}`);
  }

  const jsdocTags = symbol.getJsDocTags(checker);
  
  const deprecatedTag = jsdocTags.find(tag => tag.name === "deprecated");
  if (deprecatedTag) {
    const deprecatedText = ts.displayPartsToString(deprecatedTag.text);
    console.log(`\nDEPRECATED${deprecatedText ? `: ${deprecatedText}` : ""}`);
  }

  const docComment = ts.displayPartsToString(symbol.getDocumentationComment(checker));
  if (docComment) {
    console.log(`\nDescription:\n${docComment}`);
  }

  const exampleTags = jsdocTags.filter(tag => tag.name === "example");
  if (exampleTags.length > 0) {
    console.log(`\nExamples:`);
    for (const example of exampleTags) {
      const exampleText = ts.displayPartsToString(example.text);
      if (exampleText) {
        console.log(exampleText);
      }
    }
  }

  const seeTags = jsdocTags.filter(tag => tag.name === "see");
  if (seeTags.length > 0) {
    console.log(`\nSee also:`);
    for (const see of seeTags) {
      const seeText = ts.displayPartsToString(see.text);
      console.log(`  ${seeText}`);
    }
  }

  const otherTags = jsdocTags.filter(
    tag => tag.name !== "deprecated" && tag.name !== "example" && tag.name !== "see"
  );
  if (otherTags.length > 0) {
    console.log(`\nTags:`);
    for (const tag of otherTags) {
      const tagText = ts.displayPartsToString(tag.text);
      console.log(`  @${tag.name}${tagText ? ` ${tagText}` : ""}`);
    }
  }

  const props = type.getProperties();
  if (props.length > 0) {
    console.log(`\nMembers:`);
    for (const prop of props.slice(0, 20)) {
      const propDecl = prop.valueDeclaration || prop.declarations?.[0];
      if (!propDecl) continue;
      const propType = checker.getTypeOfSymbolAtLocation(prop, propDecl);
      const propTypeStr = checker.typeToString(propType);
      const propDoc = ts.displayPartsToString(prop.getDocumentationComment(checker));
      console.log(`  ${prop.getName()}: ${propTypeStr}`);
      if (propDoc) {
        console.log(`    ${propDoc.split("\n")[0]}`);
      }
    }
    if (props.length > 20) {
      console.log(`  ... and ${props.length - 20} more`);
    }
  }
}

main();
