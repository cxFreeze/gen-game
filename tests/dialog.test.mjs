import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import ts from 'typescript';
import { loadTypeScript } from './load-typescript.mjs';

const { DialogContext } = loadTypeScript('../src/app/shared/services/dialog-context.ts', {
    '@angular/core': { signal },
});

test('dialog parameters and subscriptions preserve input and output types', () => {
    const filename = fileURLToPath(new URL('./dialog-types.fixture.ts', import.meta.url)).replaceAll('\\', '/');
    const source = `
        import type { InputSignal, InputSignalWithTransform, OutputEmitterRef, Signal } from '@angular/core';
        import type { DialogOptions, DialogRef } from '../src/app/shared/services/dialog.interface';
        import type { DialogService } from '../src/app/shared/services/dialog.service';

        declare class Content {
            readonly mode: InputSignal<'pause' | 'game-over'>;
            readonly count: InputSignalWithTransform<number, string | number>;
            readonly selected: OutputEmitterRef<number>;
            readonly state: Signal<string>;
        }

        const options: DialogOptions<Content> = { inputs: { mode: 'pause', count: '3' } };
        declare const dialog: DialogRef<Content>;
        declare const service: DialogService;
        const opened = service.open(Content, 'middle', { inputs: { mode: 'pause', count: '3' } });
        opened.outputs.selected.subscribe(value => { const count: number = value; });
        dialog.outputs.selected.subscribe(value => { const count: number = value; });
        // @ts-expect-error Inputs retain their declared value types.
        const invalidMode: DialogOptions<Content> = { inputs: { mode: 'invalid' } };
        // @ts-expect-error Input transforms retain their accepted write types.
        const invalidCount: DialogOptions<Content> = { inputs: { count: true } };
        // @ts-expect-error open checks input values against the supplied component.
        service.open(Content, 'middle', { inputs: { count: true } });
        // @ts-expect-error Regular signals are not component inputs.
        const state: DialogOptions<Content> = { inputs: { state: 'value' } };
        // @ts-expect-error Outputs cannot be supplied as inputs.
        const output: DialogOptions<Content> = { inputs: { selected: 1 } };
        // @ts-expect-error Subscriptions retain the emitted value type.
        dialog.outputs.selected.subscribe((value: string) => {});
        // @ts-expect-error Inputs are not exposed as outputs.
        dialog.outputs.mode;
        // @ts-expect-error Outputs are exposed for subscription only.
        dialog.outputs.selected.emit(1);
        // @ts-expect-error Component references remain internal to the service.
        dialog.componentRef;
    `;
    const options = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.Preserve,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        strict: true,
        experimentalDecorators: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
    };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (path, languageVersion, ...args) => path.replaceAll('\\', '/') === filename
        ? ts.createSourceFile(filename, source, languageVersion, true)
        : getSourceFile(path, languageVersion, ...args);
    const program = ts.createProgram([filename], options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.deepEqual(diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
});

function createService(t, { hasCreationError = false } = {}) {
    const applicationToken = {};
    const environmentToken = {};
    const documentToken = {};
    const destroyToken = {};
    const parent = Injector.create({ providers: [] });
    t.after(() => parent.destroy());
    const containers = [];
    const children = [];
    const elements = [];
    const attachedViews = new Set();
    const destroyCallbacks = [];
    const dependencies = new Map([
        [applicationToken, {
            attachView: view => attachedViews.add(view),
            detachView: view => assert.equal(attachedViews.delete(view), true),
        }],
        [environmentToken, {}],
        [Injector, parent],
        [documentToken, {
            body: { append: element => element.isConnected = true },
            createElement(tag) {
                assert.equal(tag, 'dialog');
                const element = {
                    open: false,
                    closeCount: 0,
                    removeCount: 0,
                    close() { this.open = false; this.closeCount++; },
                    remove() { this.isConnected = false; this.removeCount++; },
                };
                elements.push(element);
                return element;
            },
        }],
        [destroyToken, { onDestroy: callback => destroyCallbacks.push(callback) }],
    ]);
    const { DialogService } = loadTypeScript('../src/app/shared/services/dialog.service.ts', {
        '@angular/core': {
            Service: () => target => target,
            ApplicationRef: applicationToken,
            EnvironmentInjector: environmentToken,
            DOCUMENT: documentToken,
            DestroyRef: destroyToken,
            Injector,
            inject: token => dependencies.get(token),
            reflectComponentType: component => ({ inputs: component.inputs ?? [], outputs: component.outputs ?? [] }),
            createComponent(component, options) {
                const contentInstances = [];
                const container = {
                    hostView: {},
                    inputs: {},
                    destroyCount: 0,
                    changeDetectorRef: { detectChanges() {} },
                    setInput(name, value) { this.inputs[name] = value; },
                    destroy() {
                        this.destroyCount++;
                        contentInstances.forEach(child => child.ngOnDestroy?.());
                    },
                    instance: {
                        content: () => ({
                            createComponent(content, { injector }) {
                                if (hasCreationError) {
                                    throw new Error('Dialog creation failed');
                                }
                                const instance = runInInjectionContext(injector, () => new content(injector.get(DialogContext)));
                                contentInstances.push(instance);
                                const reference = {
                                    instance,
                                    injector,
                                    inputs: {},
                                    setInput(name, value) {
                                        this.inputs[name] = value;
                                        const input = content.inputs?.find(input => input.templateName === name);
                                        instance[input?.propName ?? name] = input?.transform ? input.transform(value) : value;
                                    },
                                };
                                children.push(reference);
                                return reference;
                            },
                        }),
                    },
                    options,
                };
                containers.push(container);
                return container;
            },
        },
        '../dialog/dialog.component': { DialogComponent: class {} },
        './dialog-context': { DialogContext },
    });
    const service = new DialogService();
    t.after(() => destroyCallbacks.forEach(callback => callback()));
    return { service, containers, children, elements, attachedViews, destroy: () => destroyCallbacks.forEach(callback => callback()) };
}

test('dialogs provide isolated contexts and release their views, children and DOM exactly once', t => {
    const { service, containers, children, elements, attachedViews } = createService(t);
    class Content {
        destroyCount = 0;
        constructor(context) { this.context = context; }
        ngOnDestroy() { this.destroyCount++; }
    }
    const first = service.open(Content, 'top-right');
    const second = service.open(Content, 'bottom-left');
    assert.equal(children[0].instance.context, first.context);
    assert.equal('componentRef' in first, false);
    assert.notEqual(first.context, second.context);
    assert.equal(first.context.isClosed(), false);
    assert.equal(containers[0].inputs.position, 'top-right');
    assert.equal(containers[1].inputs.position, 'bottom-left');
    assert.equal(attachedViews.size, 2);
    elements[0].open = true;
    children[0].instance.context.close();
    first.close();
    assert.equal(first.context.isClosed(), true);
    assert.equal(children[0].instance.destroyCount, 1);
    assert.equal(containers[0].destroyCount, 1);
    assert.equal(elements[0].closeCount, 1);
    assert.equal(elements[0].removeCount, 1);
    assert.equal(elements[0].isConnected, false);
    assert.equal(attachedViews.size, 1);
    assert.equal(second.context.isClosed(), false);
});

test('service destruction closes every remaining dialog and releases its injector', t => {
    const { service, children, attachedViews, destroy } = createService(t);
    const scopedToken = {};
    const scopedInjector = Injector.create({ providers: [{ provide: scopedToken, useValue: 'scoped' }] });
    t.after(() => scopedInjector.destroy());
    const first = service.open(class {}, 'middle', { injector: scopedInjector, closeOnEscape: false, ariaLabel: 'Details' });
    const second = service.open(class {});
    assert.equal(children[0].injector.get(scopedToken), 'scoped');
    destroy();
    assert.equal(attachedViews.size, 0);
    assert.equal(first.context.isClosed(), true);
    assert.equal(second.context.isClosed(), true);
    assert.throws(() => children[0].injector.get(DialogContext), /destroyed/);
    assert.equal(scopedInjector.get(scopedToken), 'scoped');
});

test('failed component creation leaves no attached view or DOM element', t => {
    const { service, containers, elements, attachedViews } = createService(t, { hasCreationError: true });
    assert.throws(() => service.open(class {}), /Dialog creation failed/);
    assert.equal(attachedViews.size, 0);
    assert.equal(containers[0].destroyCount, 1);
    assert.equal(elements[0].isConnected, false);
    assert.equal(elements[0].removeCount, 1);
});

test('open applies aliased inputs and exposes only declared outputs with working subscriptions', t => {
    const { service, children } = createService(t);
    const createOutput = () => {
        const listeners = new Set();
        return {
            subscribe(listener) {
                listeners.add(listener);
                return { unsubscribe: () => listeners.delete(listener) };
            },
            emit(value) { listeners.forEach(listener => listener(value)); },
            clear() { listeners.clear(); },
        };
    };
    class Content {
        static inputs = [
            { propName: 'mode', templateName: 'menu-mode' },
            { propName: 'count', templateName: 'count', transform: Number },
        ];
        static outputs = [{ propName: 'selected', templateName: 'selection' }];
        selected = createOutput();
        internalEvents = createOutput();
        ngOnDestroy() { this.selected.clear(); }
    }
    const dialog = service.open(Content, 'middle', { inputs: { mode: 'pause', count: '3' } });
    const content = children[0].instance;
    assert.equal(content.mode, 'pause');
    assert.equal(content.count, 3);
    assert.deepEqual(children[0].inputs, { 'menu-mode': 'pause', count: '3' });
    assert.deepEqual(Object.keys(dialog.outputs), ['selected']);
    assert.equal('componentRef' in dialog, false);
    assert.equal('emit' in dialog.outputs.selected, false);

    const values = [];
    const subscription = dialog.outputs.selected.subscribe(value => values.push(value));
    content.selected.emit('first');
    subscription.unsubscribe();
    content.selected.emit('ignored');
    dialog.outputs.selected.subscribe(value => values.push(value));
    content.selected.emit('second');
    dialog.close();
    content.selected.emit('after-close');
    assert.deepEqual(values, ['first', 'second']);
});

test('invalid input names release the created dialog instead of leaving it mounted', t => {
    const { service, containers, elements, attachedViews } = createService(t);
    assert.throws(() => service.open(class {}, 'middle', { inputs: { missing: true } }), /Unknown dialog input "missing"/);
    assert.equal(attachedViews.size, 0);
    assert.equal(containers[0].destroyCount, 1);
    assert.equal(elements[0].isConnected, false);
});

test('the wrapper opens after rendering and handles native cancellation according to its options', () => {
    let modalCount = 0;
    const elementToken = {};
    const context = new DialogContext(() => {});
    const callbacks = [];
    const { DialogComponent } = loadTypeScript('../src/app/shared/dialog/dialog.component.ts', {
        '@angular/core': {
            Component: () => target => target,
            ElementRef: elementToken,
            ViewContainerRef: {},
            input: signal,
            viewChild: { required: () => () => undefined },
            inject: token => token === DialogContext ? context : { nativeElement: { showModal: () => modalCount++ } },
            afterNextRender: callback => callbacks.push(callback),
        },
        '../panel/panel.component': { PanelComponent: class {} },
        '../services/dialog-context': { DialogContext },
    }, { KeyboardEvent: Event });
    const wrapper = new DialogComponent();
    assert.equal(modalCount, 0);
    callbacks[0]();
    assert.equal(modalCount, 1);
    wrapper.closeOnEscape.set(false);
    const gameEscape = new Event('keydown', { cancelable: true });
    wrapper.onEscape(gameEscape);
    assert.equal(gameEscape.cancelBubble, false, 'A game-controlled dialog delegates Escape to the overlay');
    const blockedCancel = new Event('cancel', { cancelable: true });
    wrapper.onCancel(blockedCancel);
    assert.equal(blockedCancel.defaultPrevented, true);
    assert.equal(context.isClosed(), false);
    wrapper.closeOnEscape.set(true);
    const genericEscape = new Event('keydown', { cancelable: true });
    wrapper.onEscape(genericEscape);
    assert.equal(genericEscape.cancelBubble, true, 'A generic dialog does not toggle the game pause state');
    const heldEscape = Object.assign(new Event('keydown', { cancelable: true }), { repeat: true });
    wrapper.onEscape(heldEscape);
    assert.equal(heldEscape.defaultPrevented, true);
    const cancel = new Event('cancel', { cancelable: true });
    wrapper.onCancel(cancel);
    assert.equal(cancel.defaultPrevented, true);
    assert.equal(context.isClosed(), true);
    callbacks[0]();
    assert.equal(modalCount, 1, 'Closing before the render callback cannot reopen the dialog');
});
