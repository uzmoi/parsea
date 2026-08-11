import { type Config, Context } from "./context";
import type { ParseError } from "./error";
import type { Parser } from "./parser";
import { initState } from "./state";

export class ParseAError extends Error {
  constructor(
    public index: number,
    public errors: readonly ParseError[],
  ) {
    super();
  }
}

export const parseA = <T, S>(
  parser: Parser<T, S>,
  source: ArrayLike<S>,
  config: Config = {},
): T => {
  const context = new Context(source, config);
  const finalState = parser.run(initState, context);

  if (finalState == null) {
    const error = context.makeError();
    throw new ParseAError(error.index, error.errors);
  }

  if (finalState.i < context.src.length) {
    throw new ParseAError(finalState.i, []);
  }

  return finalState.v;
};
