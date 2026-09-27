import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

/** Executes a source module in memory with explicit dependency doubles. */
export function loadTypeScript(path, dependencies = {}, globals = {}, modules = new Map()) {
    const source = new URL(path, import.meta.url);
    if (modules.has(source.href)) {
        return modules.get(source.href);
    }
    const { outputText } = ts.transpileModule(readFileSync(source, 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            experimentalDecorators: true,
            useDefineForClassFields: true,
        },
    });
    const exports = {};
    modules.set(source.href, exports);
    runInNewContext(outputText, {
        exports,
        require: name => dependencies[name] ?? (name.startsWith('.')
            ? loadTypeScript(new URL(name.endsWith('.ts') ? name : `${name}.ts`, source), {}, globals, modules)
            : require(name)),
        AbortController,
        setTimeout,
        clearTimeout,
        console,
        ...globals,
    }, { filename: source.pathname });
    return exports;
}
