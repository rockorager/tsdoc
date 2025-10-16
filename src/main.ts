#!/usr/bin/env bun

import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

function printUsage() {
    console.log(`Usage: tsdoc [options] <symbol>

Show documentation for TypeScript symbols from built-in types, Node.js APIs, and third-party packages.

Examples:
  tsdoc Array                  # Show Array interface with all members
  tsdoc Promise.all            # Show Promise.all method signature
  tsdoc express                # List all exports from express package
  tsdoc express.Request        # Show express Request interface details
  tsdoc react.Component        # Show React Component class details

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
        console.error(
            `Error: ${error instanceof Error ? error.message : error}`,
        );
        process.exit(1);
    }
}

function tryFindPackage(packageName: string): boolean {
    try {
        require.resolve(`${packageName}/package.json`);
        return true;
    } catch {
        try {
            const typesPackage = `@types/${packageName.replace("@", "").replace("/", "__")}`;
            require.resolve(`${typesPackage}/package.json`);
            return true;
        } catch {
            return false;
        }
    }
}

function findAndPrintDocs(symbolPath: string) {
    const parts = symbolPath.split(".");
    const rootModule = parts[0];

    let libFiles: string[];
    let searchParts = parts;
    let isPackageQuery = false;

    if (tryFindPackage(rootModule)) {
        libFiles = getLibFiles(rootModule);
        searchParts = parts.slice(1);
        isPackageQuery = searchParts.length === 0;
    } else {
        libFiles = getLibFiles();
    }

    const program = ts.createProgram(libFiles, {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
    });

    const checker = program.getTypeChecker();

    const packageTypeFiles = libFiles.filter(
        (f) => !f.includes("/typescript/lib/"),
    );

    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) {
            if (
                isPackageQuery &&
                packageTypeFiles.some((f) => sourceFile.fileName === f)
            ) {
                printModuleExports(sourceFile, checker, rootModule);
                return;
            } else if (!isPackageQuery) {
                const symbol = findSymbolInFile(
                    sourceFile,
                    searchParts,
                    checker,
                );
                if (symbol) {
                    printSymbolDocs(symbol, checker, sourceFile);
                    return;
                }
            }
        }
    }

    console.error(`Symbol '${symbolPath}' not found`);
    process.exit(1);
}

function resolvePackageTypes(packageName: string): string[] {
    const files: string[] = [];

    try {
        const packageJsonPath = require.resolve(`${packageName}/package.json`);
        const packageDir = path.dirname(packageJsonPath);
        const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf-8"),
        );

        if (packageJson.types) {
            files.push(path.join(packageDir, packageJson.types));
        } else if (packageJson.typings) {
            files.push(path.join(packageDir, packageJson.typings));
        } else {
            const indexDts = path.join(packageDir, "index.d.ts");
            if (fs.existsSync(indexDts)) {
                files.push(indexDts);
            }
        }

        try {
            const typesPackage = `@types/${packageName.replace("@", "").replace("/", "__")}`;
            const typesJsonPath = require.resolve(
                `${typesPackage}/package.json`,
            );
            const typesDir = path.dirname(typesJsonPath);
            const typesJson = JSON.parse(
                fs.readFileSync(typesJsonPath, "utf-8"),
            );

            if (typesJson.types) {
                files.push(path.join(typesDir, typesJson.types));
            } else if (typesJson.typings) {
                files.push(path.join(typesDir, typesJson.typings));
            } else {
                const indexDts = path.join(typesDir, "index.d.ts");
                if (fs.existsSync(indexDts)) {
                    files.push(indexDts);
                }
            }
        } catch {}
    } catch (e) {
        try {
            const typesPackage = `@types/${packageName.replace("@", "").replace("/", "__")}`;
            const typesJsonPath = require.resolve(
                `${typesPackage}/package.json`,
            );
            const typesDir = path.dirname(typesJsonPath);
            const typesJson = JSON.parse(
                fs.readFileSync(typesJsonPath, "utf-8"),
            );

            if (typesJson.types) {
                files.push(path.join(typesDir, typesJson.types));
            } else if (typesJson.typings) {
                files.push(path.join(typesDir, typesJson.typings));
            } else {
                const indexDts = path.join(typesDir, "index.d.ts");
                if (fs.existsSync(indexDts)) {
                    files.push(indexDts);
                }
            }
        } catch {}
    }

    return files;
}

function getLibFiles(packageName?: string): string[] {
    try {
        const tsPath = require.resolve("typescript");
        const libDir = path.dirname(tsPath);
        const files: string[] = [];

        const libFiles = fs
            .readdirSync(libDir)
            .filter((f) => f.startsWith("lib.") && f.endsWith(".d.ts"));

        for (const file of libFiles) {
            files.push(path.join(libDir, file));
        }

        if (packageName) {
            const packageFiles = resolvePackageTypes(packageName);
            files.push(...packageFiles);
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
    checker: ts.TypeChecker,
): ts.Symbol | undefined {
    const [first, ...rest] = parts;

    let currentSymbol: ts.Symbol | undefined;

    function visit(node: ts.Node) {
        if (currentSymbol) return;

        if (
            ts.isInterfaceDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isTypeAliasDeclaration(node)
        ) {
            if (node.name?.getText() === first) {
                currentSymbol = checker.getSymbolAtLocation(node.name);
            }
        } else if (ts.isVariableStatement(node)) {
            for (const decl of node.declarationList.declarations) {
                if (
                    ts.isIdentifier(decl.name) &&
                    decl.name.getText() === first
                ) {
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
        } else if (
            ts.isExportDeclaration(node) &&
            node.exportClause &&
            ts.isNamedExports(node.exportClause)
        ) {
            for (const element of node.exportClause.elements) {
                const exportName = element.name.getText();
                if (exportName === first) {
                    currentSymbol = checker.getSymbolAtLocation(element.name);
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    if (!currentSymbol) {
        const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
        if (moduleSymbol) {
            const exports = checker.getExportsOfModule(moduleSymbol);
            currentSymbol = exports.find((e) => e.getName() === first);
        }
    }

    if (!currentSymbol) return undefined;

    for (const part of rest) {
        const decl =
            currentSymbol.valueDeclaration || currentSymbol.declarations?.[0];
        if (!decl) return undefined;
        const type = checker.getTypeOfSymbolAtLocation(currentSymbol, decl);
        const prop = type.getProperty(part);
        if (!prop) return undefined;
        currentSymbol = prop;
    }

    return currentSymbol;
}

function getSymbolKind(decl: ts.Node): string {
    if (ts.isInterfaceDeclaration(decl)) return "interface";
    if (ts.isClassDeclaration(decl)) return "class";
    if (ts.isTypeAliasDeclaration(decl)) return "type alias";
    if (ts.isFunctionDeclaration(decl)) return "function";
    if (ts.isMethodDeclaration(decl) || ts.isMethodSignature(decl))
        return "method";
    if (ts.isPropertyDeclaration(decl) || ts.isPropertySignature(decl))
        return "property";
    if (ts.isVariableDeclaration(decl)) return "variable";
    if (ts.isEnumDeclaration(decl)) return "enum";
    if (ts.isModuleDeclaration(decl)) return "module";
    return "symbol";
}

function printModuleExports(
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
    packageName: string,
) {
    console.log(`\n${packageName}`);
    console.log("=".repeat(packageName.length));
    console.log(`\nKind: package`);
    console.log(`Location: ${sourceFile.fileName}`);

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) {
        console.log("\nNo exports found");
        return;
    }

    const exports = checker.getExportsOfModule(moduleSymbol);

    if (exports.length > 0) {
        console.log(`\nExports (${exports.length}):`);
        for (const exp of exports.slice(0, 50)) {
            const decl = exp.valueDeclaration || exp.declarations?.[0];
            if (!decl) continue;

            const type = checker.getTypeOfSymbolAtLocation(exp, decl);
            const kind = getSymbolKind(decl);
            const typeStr = checker.typeToString(
                type,
                undefined,
                ts.TypeFormatFlags.NoTruncation,
            );

            const shortTypeStr =
                typeStr.length > 100 ? typeStr.slice(0, 100) + "..." : typeStr;
            const doc = ts.displayPartsToString(
                exp.getDocumentationComment(checker),
            );
            const shortDoc = doc
                ? doc.split("\n")[0].slice(0, 80) +
                  (doc.length > 80 ? "..." : "")
                : "";

            console.log(`  ${exp.getName()} (${kind})`);
            if (shortDoc) {
                console.log(`    ${shortDoc}`);
            }
        }
        if (exports.length > 50) {
            console.log(`  ... and ${exports.length - 50} more`);
        }
        console.log(
            `\nTip: Use 'tsdoc ${packageName}.<symbol>' to view details for a specific export`,
        );
    }
}

function printSymbolDocs(
    symbol: ts.Symbol,
    checker: ts.TypeChecker,
    sourceFile: ts.SourceFile,
) {
    const name = symbol.getName();
    const decl = symbol.valueDeclaration || symbol.declarations?.[0];
    if (!decl) return;

    const type = checker.getTypeOfSymbolAtLocation(symbol, decl);

    console.log(`\n${name}`);
    console.log("=".repeat(name.length));

    const symbolKind = getSymbolKind(decl);
    console.log(`\nKind: ${symbolKind}`);

    const { line } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
    console.log(`Location: ${sourceFile.fileName}:${line + 1}`);

    const callSignatures = type.getCallSignatures();
    const constructSignatures = type.getConstructSignatures();

    if (constructSignatures.length > 0) {
        console.log(`\nConstructor Signatures:`);
        for (const sig of constructSignatures) {
            const sigString = checker.signatureToString(
                sig,
                undefined,
                ts.TypeFormatFlags.NoTruncation,
            );
            console.log(`  new ${sigString}`);

            const typeParams = sig.getTypeParameters();
            if (typeParams && typeParams.length > 0) {
                console.log(`\n  Type Parameters:`);
                for (const tp of typeParams) {
                    const constraint = tp.getConstraint();
                    const constraintStr = constraint
                        ? ` extends ${checker.typeToString(constraint)}`
                        : "";
                    const defaultType = tp.getDefault();
                    const defaultStr = defaultType
                        ? ` = ${checker.typeToString(defaultType)}`
                        : "";
                    console.log(
                        `    ${tp.symbol.name}${constraintStr}${defaultStr}`,
                    );
                }
            }

            const params = sig.getParameters();
            if (params.length > 0) {
                console.log(`\n  Parameters:`);
                for (const param of params) {
                    const paramDecl = param.valueDeclaration;
                    const paramType = checker.getTypeOfSymbolAtLocation(
                        param,
                        paramDecl!,
                    );
                    const paramTypeStr = checker.typeToString(paramType);
                    const optional = checker.isOptionalParameter(
                        paramDecl as ts.ParameterDeclaration,
                    )
                        ? "?"
                        : "";
                    const defaultValue = (paramDecl as ts.ParameterDeclaration)
                        ?.initializer
                        ? ` = ${(paramDecl as ts.ParameterDeclaration).initializer!.getText()}`
                        : "";
                    const paramDoc = ts.displayPartsToString(
                        param.getDocumentationComment(checker),
                    );
                    console.log(
                        `    ${param.name}${optional}: ${paramTypeStr}${defaultValue}`,
                    );
                    if (paramDoc) {
                        console.log(`      ${paramDoc}`);
                    }
                }
            }
        }
    }

    if (callSignatures.length > 0) {
        console.log(`\nCall Signatures:`);
        for (const sig of callSignatures) {
            const sigString = checker.signatureToString(
                sig,
                undefined,
                ts.TypeFormatFlags.NoTruncation,
            );
            console.log(`  ${sigString}`);

            const typeParams = sig.getTypeParameters();
            if (typeParams && typeParams.length > 0) {
                console.log(`\n  Type Parameters:`);
                for (const tp of typeParams) {
                    const constraint = tp.getConstraint();
                    const constraintStr = constraint
                        ? ` extends ${checker.typeToString(constraint)}`
                        : "";
                    const defaultType = tp.getDefault();
                    const defaultStr = defaultType
                        ? ` = ${checker.typeToString(defaultType)}`
                        : "";
                    console.log(
                        `    ${tp.symbol.name}${constraintStr}${defaultStr}`,
                    );
                }
            }

            const params = sig.getParameters();
            if (params.length > 0) {
                console.log(`\n  Parameters:`);
                for (const param of params) {
                    const paramDecl = param.valueDeclaration;
                    const paramType = checker.getTypeOfSymbolAtLocation(
                        param,
                        paramDecl!,
                    );
                    const paramTypeStr = checker.typeToString(paramType);
                    const optional = checker.isOptionalParameter(
                        paramDecl as ts.ParameterDeclaration,
                    )
                        ? "?"
                        : "";
                    const defaultValue = (paramDecl as ts.ParameterDeclaration)
                        ?.initializer
                        ? ` = ${(paramDecl as ts.ParameterDeclaration).initializer!.getText()}`
                        : "";
                    const paramDoc = ts.displayPartsToString(
                        param.getDocumentationComment(checker),
                    );
                    console.log(
                        `    ${param.name}${optional}: ${paramTypeStr}${defaultValue}`,
                    );
                    if (paramDoc) {
                        console.log(`      ${paramDoc}`);
                    }
                }
            }

            const returnType = sig.getReturnType();
            const returnTypeStr = checker.typeToString(returnType);
            console.log(`\n  Returns: ${returnTypeStr}`);
            const returnTag = sig
                .getJsDocTags()
                .find((tag) => tag.name === "returns" || tag.name === "return");
            if (returnTag) {
                const returnDoc = ts.displayPartsToString(returnTag.text);
                if (returnDoc) {
                    console.log(`    ${returnDoc}`);
                }
            }
        }
    }

    if (callSignatures.length === 0 && constructSignatures.length === 0) {
        if (ts.isTypeAliasDeclaration(decl)) {
            const typeText = decl.type.getText(sourceFile);
            console.log(`\nType: ${typeText}`);
        } else if (ts.isInterfaceDeclaration(decl)) {
            // For interfaces, show members below instead of type
        } else {
            const typeString = checker.typeToString(
                type,
                undefined,
                ts.TypeFormatFlags.NoTruncation,
            );
            console.log(`\nType: ${typeString}`);
        }
    }

    const jsdocTags = symbol.getJsDocTags(checker);

    const deprecatedTag = jsdocTags.find((tag) => tag.name === "deprecated");
    if (deprecatedTag) {
        const deprecatedText = ts.displayPartsToString(deprecatedTag.text);
        console.log(
            `\nDEPRECATED${deprecatedText ? `: ${deprecatedText}` : ""}`,
        );
    }

    const sinceTag = jsdocTags.find((tag) => tag.name === "since");
    if (sinceTag) {
        const sinceText = ts.displayPartsToString(sinceTag.text);
        console.log(`\nSince: ${sinceText}`);
    }

    const docComment = ts.displayPartsToString(
        symbol.getDocumentationComment(checker),
    );
    if (docComment) {
        console.log(`\nDescription:\n${docComment}`);
    }

    const throwsTags = jsdocTags.filter(
        (tag) => tag.name === "throws" || tag.name === "exception",
    );
    if (throwsTags.length > 0) {
        console.log(`\nThrows:`);
        for (const throwsTag of throwsTags) {
            const throwsText = ts.displayPartsToString(throwsTag.text);
            console.log(`  ${throwsText}`);
        }
    }

    const exampleTags = jsdocTags.filter((tag) => tag.name === "example");
    if (exampleTags.length > 0) {
        console.log(`\nExamples:`);
        for (const example of exampleTags) {
            const exampleText = ts.displayPartsToString(example.text);
            if (exampleText) {
                console.log(exampleText);
            }
        }
    }

    const seeTags = jsdocTags.filter((tag) => tag.name === "see");
    if (seeTags.length > 0) {
        console.log(`\nSee also:`);
        for (const see of seeTags) {
            const seeText = ts.displayPartsToString(see.text);
            console.log(`  ${seeText}`);
        }
    }

    const otherTags = jsdocTags.filter(
        (tag) =>
            tag.name !== "deprecated" &&
            tag.name !== "example" &&
            tag.name !== "see" &&
            tag.name !== "since" &&
            tag.name !== "throws" &&
            tag.name !== "exception" &&
            tag.name !== "param" &&
            tag.name !== "returns" &&
            tag.name !== "return" &&
            tag.name !== "template",
    );
    if (otherTags.length > 0) {
        console.log(`\nTags:`);
        for (const tag of otherTags) {
            const tagText = ts.displayPartsToString(tag.text);
            console.log(`  @${tag.name}${tagText ? ` ${tagText}` : ""}`);
        }
    }

    // Show interface members if it's an interface
    if (ts.isInterfaceDeclaration(decl)) {
        console.log(`\nMembers:`);
        for (const member of decl.members) {
            const memberName = member.name?.getText();
            if (!memberName) continue;

            let memberTypeStr = "";
            let modifiers: string[] = [];
            let isOptional = false;

            if (
                ts.isPropertySignature(member) ||
                ts.isPropertyDeclaration(member)
            ) {
                if (member.type) {
                    memberTypeStr = member.type.getText(sourceFile);
                }
                if (member.modifiers) {
                    if (
                        member.modifiers.some(
                            (m) => m.kind === ts.SyntaxKind.ReadonlyKeyword,
                        )
                    ) {
                        modifiers.push("readonly");
                    }
                }
                isOptional = !!member.questionToken;
            } else if (
                ts.isMethodSignature(member) ||
                ts.isMethodDeclaration(member)
            ) {
                // For methods, show signature
                const sig = checker.getSignatureFromDeclaration(
                    member as ts.MethodDeclaration | ts.MethodSignature,
                );
                if (sig) {
                    memberTypeStr = checker.signatureToString(sig);
                }
            }

            const optionalMarker = isOptional ? "?" : "";
            const modifierStr =
                modifiers.length > 0 ? modifiers.join(" ") + " " : "";
            const memberDoc = ts.displayPartsToString(
                checker
                    .getSymbolAtLocation(member.name!)!
                    .getDocumentationComment(checker),
            );
            console.log(
                `  ${modifierStr}${memberName}${optionalMarker}: ${memberTypeStr}`,
            );
            if (memberDoc) {
                console.log(`    ${memberDoc.split("\\n")[0]}`);
            }
        }
    } else {
        const props = type.getProperties();
        if (props.length > 0) {
            console.log(`\nMembers:`);
            for (const prop of props.slice(0, 20)) {
                const propDecl =
                    prop.valueDeclaration || prop.declarations?.[0];
                if (!propDecl) continue;
                const propType = checker.getTypeOfSymbolAtLocation(
                    prop,
                    propDecl,
                );
                const propTypeStr = checker.typeToString(propType);

                const modifiers: string[] = [];
                if (propDecl.modifiers) {
                    if (
                        propDecl.modifiers.some(
                            (m) => m.kind === ts.SyntaxKind.ReadonlyKeyword,
                        )
                    ) {
                        modifiers.push("readonly");
                    }
                    if (
                        propDecl.modifiers.some(
                            (m) => m.kind === ts.SyntaxKind.StaticKeyword,
                        )
                    ) {
                        modifiers.push("static");
                    }
                }

                const isOptional =
                    (prop.flags & ts.SymbolFlags.Optional) !== 0 ||
                    (ts.isPropertySignature(propDecl) &&
                        propDecl.questionToken !== undefined) ||
                    (ts.isPropertyDeclaration(propDecl) &&
                        propDecl.questionToken !== undefined);
                const optionalMarker = isOptional ? "?" : "";

                const modifierStr =
                    modifiers.length > 0 ? modifiers.join(" ") + " " : "";
                const propDoc = ts.displayPartsToString(
                    prop.getDocumentationComment(checker),
                );
                console.log(
                    `  ${modifierStr}${prop.getName()}${optionalMarker}: ${propTypeStr}`,
                );
                if (propDoc) {
                    console.log(`    ${propDoc.split("\n")[0]}`);
                }
            }
            if (props.length > 20) {
                console.log(`  ... and ${props.length - 20} more`);
            }
        }
    }
}

main();
