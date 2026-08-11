import { clamp, MAX_INT32 } from "emnorst";
import { type Parsed, Parser, type SourceOf } from "./parser";
import { type ParseState, updateState } from "./state";

/**
 * Defers variable references until the parser runs.
 */
export const lazy = <T, S>(getParser: () => Parser<T, S>): Parser<T, S> => {
  const lazyParser: Parser<T, S> = new Parser((state, context) => {
    // @ts-expect-error readonly
    return (lazyParser.run = getParser().run)(state, context);
  });
  return lazyParser;
};

/**
 * Succeeds if the given parser fails, without consuming input.
 */
export const notFollowedBy = <S>(
  parser: Parser<unknown, S>,
): Parser<unknown, S> =>
  new Parser((state, context) => {
    const newState = parser.run(state, context);
    if (newState == null) {
      return state;
    }
    context.addError(state.i);
    return null;
  });

/**
 * Applies the given parser without consuming input.
 */
export const lookAhead = <T, S = unknown>(parser: Parser<T, S>): Parser<T, S> =>
  new Parser((state, context) => {
    const newState = parser.run(state, context);
    return newState && updateState(state, newState.v);
  });

type Seq<out T extends readonly Parser[]> = {
  [K in keyof T]: Parsed<T[K]>;
};

/**
 * @example
 * ```ts
 * const parser = seq([el("a"), anyEl()]);
 * parseA(parser, "ab"); // => ["a", "b"]
 * parseA(parser, "a1"); // => ["a", "1"]
 * parseA(parser, "a"); // parse error
 * ```
 */
export const seq: {
  <T extends readonly Parser[] | []>(
    parsers: T,
    options?: { allowPartial?: false },
  ): Parser<Seq<T>, SourceOf<T[number]>>;
  <T extends readonly Parser[] | []>(
    parsers: T,
    options: { allowPartial: boolean },
  ): Parser<Partial<Seq<T>>, SourceOf<T[number]>>;
} = (parsers, options) =>
  new Parser((state, context) => {
    const values: unknown[] = [];
    for (const parser of parsers) {
      const newState = parser.run(state, context as never);
      if (newState == null) {
        if (options?.allowPartial) break;
        return null;
      }
      values.push((state = newState).v);
    }
    return updateState(state, values);
  });

type Choice<T extends readonly Parser[]> = Parser<
  Parsed<T[number]>,
  SourceOf<T[number]>
>;

/**
 * @example
 * ```ts
 * const parser = choice([el("a"), el("b")]);
 * parseA(parser, "a"); // => "a"
 * parseA(parser, "b"); // => "b"
 * parseA(parser, "c"); // parse error
 * ```
 */
export const choice = <T extends readonly Parser[] | []>(
  parsers: T,
): Choice<T> =>
  new Parser((state, context) => {
    for (const parser of parsers) {
      const newState = parser.run(state, context as never);
      if (newState != null) {
        return newState as ParseState<Parsed<T[number]>>;
      }
    }
    return null;
  });

/**
 * @example
 * ```ts
 * const parser = many(anyEl());
 * parseA(parser, "ab"); // => ["a", "b"]
 * ```
 * @example
 * ```ts
 * const parser = many(anyEl(), { min: 1 });
 * parseA(parser, ""); // parse error
 * parseA(parser, "a"); // => ["a"]
 * ```
 */
export const many = <T, S>(
  parser: Parser<T, S>,
  options?: { min?: number; max?: number },
): Parser<T[], S> => {
  const min = clamp(options?.min || 0, 0, MAX_INT32) | 0;
  const max = clamp(options?.max || MAX_INT32, min, MAX_INT32) | 0;

  return new Parser((state, context) => {
    const result: T[] = [];
    while (result.length < max) {
      const newState = parser.run(state, context);
      if (newState == null || !(state.i < newState.i)) break;
      result.push((state = newState).v);
    }
    return result.length < min ? null : updateState(state, result);
  });
};

/**
 * To require the trailing {@link separator}, use {@link many} with `parser.skip(separator)`.
 *
 * @example
 * ```ts
 * const parser = sepBy(anyEl(), el(","), { min: 1 });
 * parseA(parser, ""); // parse error
 * parseA(parser, "a"); // => ["a"]
 * parseA(parser, "a,b"); // => ["a", "b"]
 * ```
 * @example
 * ```ts
 * const parser = sepBy(anyEl(), el(","), { trailing: "allow" });
 * parseA(parser, ""); // => []
 * parseA(parser, "a"); // => ["a"]
 * parseA(parser, "a,b,"); // => ["a", "b"]
 * ```
 */
export const sepBy = <T, S>(
  parser: Parser<T, S>,
  separator: Parser<unknown, S>,
  options?: { min?: number; max?: number; trailing?: "none" | "allow" },
): Parser<T[], S> => {
  const min = clamp(options?.min || 0, 0, MAX_INT32) | 0;
  const max = clamp(options?.max || MAX_INT32, min, MAX_INT32) | 0;

  return new Parser((state, context) => {
    const result: T[] = [];
    let lastState = state;
    while (result.length < max) {
      const start = state.i;

      const newStateA = parser.run(state, context);
      if (newStateA == null) break;
      result.push((lastState = state = newStateA).v);

      const newStateB = separator.run(newStateA, context);
      if (newStateB == null) break;
      state = newStateB;

      if (!(start < state.i)) break;
    }

    if (options?.trailing === "allow") {
      lastState = state;
    }

    return result.length < min ? null : updateState(lastState, result);
  });
};
