import { has } from "emnorst";
import type { Config } from "./context";
import { Parser } from "./parser";
import { type ParseState, updateState } from "./state";

const doError = /* #__PURE__ */ Symbol("parsea.doError");

const get = (error: unknown) => {
  if (has(error, doError)) {
    return error[doError] as PerformOptions | undefined;
  }
  throw error;
};

export interface PerformOptions {
  allowPartial?: boolean;
}

export interface Perform<S> {
  <T>(parser: Parser<T, S>, options?: PerformOptions): T;
  /**
   * @example
   * ```ts
   * const parser = qo(perform => {
   *   return perform.option(el("a"), "default");
   * });
   * parseA(parser, "a"); // => "a"
   * parseA(parser, ""); // => "default"
   * ```
   */
  option<T>(parser: Parser<T, S>): T | undefined;
  option<T, const U = T>(parser: Parser<T, S>, defaultValue: U): T | U;
  /**
   * @example
   * ```ts
   * const parser = qo(perform => {
   *   const result = perform.try(() => {
   *     perform(el("a"));
   *     perform(el("b"));
   *     return "ab";
   *   }, "default");
   *   perform(el("c"));
   *   return result;
   * });
   * parseA(parser, "abc"); // => "ab"
   * parseA(parser, "c"); // => "default"
   * ```
   */
  try<const T>(runner: () => T): T | undefined;
  try<const T, const U = T>(runner: () => T, defaultValue: U): T | U;
  /**
   * @example
   * ```ts
   * const parser = qo(perform => {
   *   return perform.many(anyEl());
   * });
   * parseA(parser, "abc"); // => ["a", "b", "c"]
   * ```
   */
  many<T>(parser: Parser<T, S>): T[];
  /**
   * @example
   * ```ts
   * const parser = qo(perform => {
   *   const result = [];
   *   perform.while(() => {
   *     result.push(perform(anyEl()));
   *     perform(el(","), { allowPartial: true });
   *   });
   *   return result;
   * });
   * parseA(parser, "a,b,c"); // => ["a", "b", "c"]
   * parseA(parser, "a,"); // => ["a"]
   * ```
   */
  while(runner: () => void): void;
}

/**
 * @example
 * ```ts
 * const parser = qo(perform => {
 *   const a = perform(anyEl());
 *   perform(el(","));
 *   const b = perform(anyEl());
 *   return { a, b };
 * });
 * parseA(parser, "a,b"); // => { a: "a", b: "b" }
 * ```
 */
export const qo = <T, S>(
  runner: (perform: Perform<S>, config: Config) => T,
): Parser<T, S> =>
  new Parser((state, context) => {
    const perform: Perform<S> = (parser, options) => {
      const newState = parser.run(state, context);
      if (newState == null) throw { [doError]: options };
      return (state = newState).v;
    };

    perform.option = ((parser, defaultValue) => {
      const newState = parser.run(state, context);
      return newState == null ? defaultValue : (state = newState).v;
    }) as Perform<S>["option"];

    perform.try = ((runner, defaultValue) => {
      const beforeTryState = state;
      try {
        return runner();
      } catch (error) {
        const options = get(error);
        if (!options?.allowPartial) {
          state = beforeTryState;
        }
        return defaultValue;
      }
    }) as Perform<S>["try"];

    perform.many = parser => {
      const result = [];
      while (true) {
        const newState = parser.run(state, context);
        if (newState == null || !(state.i < newState.i)) break;
        result.push((state = newState).v);
      }
      return result;
    };

    perform.while = runner => {
      let beforeWhileState!: ParseState<unknown>;
      try {
        do {
          beforeWhileState = state;
          runner();
        } while (beforeWhileState.i < state.i);
      } catch (error) {
        const options = get(error);
        if (!(options?.allowPartial ?? true)) {
          state = beforeWhileState;
        }
      }
    };

    return perform.try(() => {
      const value = runner(perform, context.cfg);
      return updateState(state, value);
    }, null);
  });

export { qo as do_ };
