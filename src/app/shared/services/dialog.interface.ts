import type { Injector, InputSignalWithTransform, OutputRef, Signal } from '@angular/core';
import type { DialogContext } from './dialog-context';

export type DialogPosition =
    | 'middle'
    | 'top'
    | 'top-left'
    | 'top-right'
    | 'middle-left'
    | 'middle-right'
    | 'bottom'
    | 'bottom-left'
    | 'bottom-right';

type DialogInputValue<T> = T extends Signal<infer ReadValue>
    ? T extends InputSignalWithTransform<ReadValue, infer WriteValue> ? WriteValue : never
    : never;

export type DialogInputs<T> = {
    readonly [Key in keyof T as [DialogInputValue<T[Key]>] extends [never] ? never : Key]?: DialogInputValue<T[Key]>;
};

export type DialogOutputs<T> = {
    readonly [Key in keyof T as T[Key] extends OutputRef<unknown> ? Key : never]:
        T[Key] extends OutputRef<infer Value> ? OutputRef<Value> : never;
};

export interface DialogOptions<T> {
    readonly inputs?: DialogInputs<T>;
    readonly ariaLabel?: string;
    readonly closeOnEscape?: boolean;
    readonly injector?: Injector;
}

export interface DialogRef<T> {
    readonly outputs: DialogOutputs<T>;
    readonly context: DialogContext;
    close(): void;
}
