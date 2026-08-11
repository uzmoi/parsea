import { type Config, Context } from "./context";
import * as error from "./error";
import { type ParseState, updateState } from "./state";

export type Parsed<T> = T extends Parser<infer U> ? U : never;

export type SourceOf<T> = [T] extends [Parser<unknown, infer U>] ? U : never;

export type ParseRunner<in T, out U, in S> = (
  this: void,
  state: ParseState<T>,
  context: Context<S>,
) => ParseState<U> | null;

/**
 * @template T result
 * @template S source
 */
export class Parser<out T = unknown, in S = never> {
  constructor(readonly run: ParseRunner<unknown, T, S>) {}

  apply<A extends readonly unknown[], R, S2>(
    this: this,
    f: (parser: Parser<T, S>, ...args: A) => Parser<R, S2>,
    ...args: A
  ): Parser<R, S2> {
    return f(this, ...args);
  }
  label(this: this, label: string): Parser<T, S> {
    return new Parser((state, context) => {
      const labelStart = context.group();
      const newState = this.run(state, context);
      if (newState == null) {
        context.addError(
          state.i,
          error.label(label, context.length(labelStart)),
        );
      }
      return newState;
    });
  }
  /**
   * Makes this parser return a constant value.
   */
  return<const U>(this: this, value: U): Parser<U, S> {
    return new Parser((state, context) => {
      const newState = this.run(state, context);
      return newState && updateState(newState, value);
    });
  }
  map<U>(this: this, f: (value: T, config: Config) => U): Parser<U, S> {
    return new Parser((state, context) => {
      const newState = this.run(state, context);
      return newState && updateState(newState, f(newState.v, context.cfg));
    });
  }
  /**
   * Chains this parser with a function.
   *
   * @example
   * ```ts
   * const parser = anyEl().flatMap(value => el(value));
   * parseA(parser, "aa"); // => "a"
   * parseA(parser, "ab"); // parse error
   * ```
   */
  flatMap<U, S2>(
    this: this,
    f: (value: T, config: Config) => Parser<U, S2>,
  ): Parser<U, S & S2> {
    return new Parser((state, context) => {
      const newState = this.run(state, context);
      return newState && f(newState.v, context.cfg).run(newState, context);
    });
  }
  /**
   * Applies this parser followed by another parser, returning the result of the second parser.
   */
  then<U, S2>(this: this, parser: Parser<U, S2>): Parser<U, S & S2> {
    return new Parser((state, context) => {
      const newState = this.run(state, context);
      return newState && parser.run(newState, context);
    });
  }
  /**
   * Applies this parser followed by another parser, returning the result of this parser.
   */
  skip<S2>(this: this, parser: Parser<unknown, S2>): Parser<T, S & S2> {
    return new Parser((state, context) => {
      const newStateA = this.run(state, context);
      const newStateB = newStateA && parser.run(newStateA, context);
      return newStateB && updateState(newStateB, newStateA.v);
    });
  }

  /**
   * Applies this parser between other parsers.
   */
  between<S2>(
    this: this,
    pre: Parser<unknown, S2>,
    post: Parser<unknown, S2> = pre,
  ): Parser<T, S & S2> {
    return new Parser((state, context) => {
      const newStateA = pre.run(state, context);
      const newStateB = newStateA && this.run(newStateA, context);
      const newStateC = newStateB && post.run(newStateB, context);
      return newStateC && updateState(newStateC, newStateB.v);
    });
  }

  /**
   * Makes this parser optional, returning undefined on failure.
   * If a default value is provided, return that value instead.
   */
  option(this: this): Parser<T | undefined, S>;
  option<const U>(this: this, defaultValue: U): Parser<T | U, S>;
  option<U>(this: this, defaultValue?: U): Parser<T | U, S> {
    return new Parser<T | U, S>((state, context) => {
      return this.run(state, context) ?? updateState(state, defaultValue as U);
    });
  }
}
