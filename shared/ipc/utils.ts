export const literal = <T extends Record<string, string>>(value: T) => Object.freeze(value) as { readonly [K in keyof T]: T[K] };

export const tuple = <T extends readonly string[]>(...items: T) => items;
