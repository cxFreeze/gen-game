import { ApplicationRef, ComponentRef, DOCUMENT, DestroyRef, EnvironmentInjector, Injector, Service, createComponent, inject, reflectComponentType } from '@angular/core';
import type { OutputRef, Type } from '@angular/core';
import { DialogComponent } from '../dialog/dialog.component';
import { DialogContext } from './dialog-context';
import type { DialogOptions, DialogOutputs, DialogPosition, DialogRef } from './dialog.interface';

function isOutputRef(value: unknown): value is OutputRef<unknown> {
    return typeof value === 'object' && value !== null && 'subscribe' in value && typeof value.subscribe === 'function';
}

@Service()
export class DialogService {
    private readonly applicationRef = inject(ApplicationRef);
    private readonly environmentInjector = inject(EnvironmentInjector);
    private readonly injector = inject(Injector);
    private readonly document = inject(DOCUMENT);
    private readonly dialogs = new Set<DialogContext>();

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            for (const dialog of this.dialogs) {
                dialog.close();
            }
        });
    }

    open<T extends object>(component: Type<T>, position: DialogPosition = 'middle', options: DialogOptions<T> = {}): DialogRef<T> {
        const element = this.document.createElement('dialog');
        let container: ComponentRef<DialogComponent> | undefined;
        let hasAttachedView = false;
        const context = new DialogContext(() => {
            if (element.open) {
                element.close();
            }
            if (container) {
                if (hasAttachedView) {
                    this.applicationRef.detachView(container.hostView);
                }
                container.destroy();
            }
            dialogInjector.destroy();
            element.remove();
            this.dialogs.delete(context);
        });
        const dialogInjector = Injector.create({
            parent: options.injector ?? this.injector,
            providers: [{ provide: DialogContext, useValue: context }],
        });
        this.dialogs.add(context);

        try {
            container = createComponent(DialogComponent, {
                hostElement: element,
                environmentInjector: this.environmentInjector,
                elementInjector: dialogInjector,
            });
            container.setInput('position', position);
            container.setInput('ariaLabel', options.ariaLabel ?? null);
            container.setInput('closeOnEscape', options.closeOnEscape ?? true);
            this.document.body.append(element);
            this.applicationRef.attachView(container.hostView);
            hasAttachedView = true;
            container.changeDetectorRef.detectChanges();
            const componentRef = container.instance.content().createComponent(component, { injector: dialogInjector });
            const metadata = reflectComponentType(component);
            for (const [name, value] of Object.entries(options.inputs ?? {})) {
                const input = metadata?.inputs.find(input => input.propName === name);
                if (!input) {
                    throw new Error(`Unknown dialog input "${name}"`);
                }
                componentRef.setInput(input.templateName, value);
            }
            const outputs = this.getOutputs(componentRef.instance, metadata?.outputs.map(output => output.propName) ?? []);
            return { outputs, context, close: () => context.close() };
        }
        catch (error: unknown) {
            context.close();
            throw error;
        }
    }

    private getOutputs<T extends object>(instance: T, names: readonly string[]): DialogOutputs<T>;
    private getOutputs(instance: object, names: readonly string[]): Record<string, OutputRef<unknown>> {
        return Object.fromEntries(names.map(name => {
            const output: unknown = Reflect.get(instance, name);
            if (!isOutputRef(output)) {
                throw new Error(`Invalid dialog output "${name}"`);
            }
            return [name, { subscribe: (callback: (value: unknown) => void) => output.subscribe(callback) }];
        }));
    }
}
