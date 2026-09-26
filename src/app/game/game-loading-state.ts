export type GameLoadingState =
    | { readonly status: 'loading' }
    | { readonly status: 'ready' }
    | { readonly status: 'error', readonly message: string };
