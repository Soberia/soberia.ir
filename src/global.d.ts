/// <reference types="react-scripts" />

/** `React.useState()` hook dispatch function shorthand. */
type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

/** Overrides object's properties. */
type Override<T extends object, U extends object> = Omit<T, keyof U> & U;

/** Mimics `ReturnType<typeof Object.entries>`. */
type ObjectEntries<T extends object, U extends keyof T = keyof T> = [U, T[U]][];

/** Values of nested object. Doesn't support `array` or `tuple`. */
type RecursiveValueof<T> = T extends object ? RecursiveValueof<T[keyof T]> : T;

/** Keys of nested object. */
type RecursiveKeyof<T> = T extends object
  ? keyof T | {[K in keyof T]: RecursiveKeyof<T[K]>}[keyof T]
  : never;

/** Removes keys of nested object. */
type RecursiveOmit<T extends object, U> = {
  [K in keyof T as K extends U ? never : K]: T[K] extends object
    ? RecursiveOmit<T[K], U>
    : T[K];
};

/** Joined keys of nested object. */
type JoinedKeyof<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${JoinedKeyof<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];
