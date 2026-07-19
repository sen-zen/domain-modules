
export type Nullable<T> = T | null;

export type Type<T = any> = new (...args: any[]) => T;
