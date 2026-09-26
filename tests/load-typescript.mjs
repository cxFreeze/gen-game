import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

/** Executes a source module in memory with explicit dependency doubles. */
export function loadTypeScript(path, dependencies = {}, globals = {}) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            experimentalDecorators: true,
            useDefineForClassFields: true,
        },
    });
    const exports = {};
    runInNewContext(outputText, {
        exports,
        require: name => dependencies[name] ?? require(name),
        AbortController,
        setTimeout,
        clearTimeout,
        console,
        ...globals,
    }, { filename: path });
    return exports;
}
