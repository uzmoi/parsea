import { equals } from "emnorst";
import type { Config } from "./context";
import * as error from "./error";
import { Parser } from "./parser";
import { updateState } from "./state";

/**
 * Always succeeds with the given value.
 */
export const pure = <const T>(value: T): Parser<T, unknown> =>
  new Parser(state => updateState(state, value));

/**
 * Always fails.
 */
export const fail = (): Parser<never, unknown> =>
  new Parser((state, context) => {
    context.addError(state.i);
    return null;
  });

/**
 * Succeeds only at the end of input.
 */
export const eoi: Parser<unknown, unknown> = /* #__PURE__ */ new Parser(
  (state, context) => {
    if (state.i < context.src.length) {
      context.addError(state.i);
      return null;
    }
    return state;
  },
);

/**
 * Consumes any element.
 */
export const anyEl = <T>(): Parser<T, T> =>
  new Parser((state, context) => {
    if (state.i < context.src.length) {
      return updateState(state, context.src[state.i], 1);
    }
    context.addError(state.i);
    return null;
  });

/**
 * Consumes an element equal to the given value using SameValueZero comparison.
 */
export const el = <const T>(value: T): Parser<T, unknown> =>
  satisfy(srcEl => equals(srcEl, value), {
    error: error.expected(
      typeof value === "string" && value.length === 1 ? value : [value],
    ),
  });

/**
 * Consumes an element if it matches any of the specified values using SameValueZero comparison.
 */
export const oneOf = <const T>(values: Iterable<T>): Parser<T, unknown> => {
  const set = new Set<unknown>(values);
  return satisfy(el => set.has(el));
};

/**
 * Consumes an element if it does not match any of the specified values using SameValueZero comparison.
 */
export const noneOf = <T>(values: Iterable<unknown>): Parser<T, T> => {
  const set = new Set(values);
  return satisfy(el => !set.has(el));
};

/**
 * Consumes an element satisfying a predicate.
 *
 * @example
 * ```ts
 * const parser = satisfy(Number.isInteger);
 * parseA(parser, [0]); // => 0
 * parseA(parser, [1.5]); // parse error
 * ```
 */
export const satisfy = <T extends S, S = unknown>(
  predicate:
    | ((el: S, config: Config) => boolean)
    | ((el: S, config: Config) => el is T),
  options?: { error?: error.ParseError },
): Parser<T, S> =>
  new Parser((state, context) => {
    let srcEl: unknown;
    if (
      state.i < context.src.length &&
      predicate((srcEl = context.src[state.i]), context.cfg)
    ) {
      return updateState(state, srcEl as T, 1);
    }
    context.addError(state.i, options?.error);
    return null;
  });

/**
 * Consumes a literal sequence of elements using SameValueZero comparison.
 */
export const literal = <const T extends ArrayLike<unknown>>(
  chunk: T,
): Parser<T, unknown> =>
  new Parser((state, context) => {
    if (state.i + chunk.length > context.src.length) {
      context.addError(state.i, error.expected(chunk));
      return null;
    }
    for (let i = 0; i < chunk.length; i++) {
      const srcEl = context.src[state.i + i];
      const chunkEl = chunk[i];
      if (!equals(srcEl, chunkEl)) {
        context.addError(state.i, error.expected(chunk));
        return null;
      }
    }
    return updateState(state, chunk, chunk.length);
  });
