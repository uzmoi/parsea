import type { Context } from "./context";
import type { ParseError } from "./error";
import type { ParseState } from "./state";

type SuccessParseResult<out T> = {
  success: true;
  index: number;
  value: T;
};

type FailureParseResult = {
  success: false;
  index: number;
  errors: ParseError[];
};

export type ParseResult<T> = SuccessParseResult<T> | FailureParseResult;

export const createParseResult = <T>(
  finalState: ParseState<T> | null,
  context: Context,
): ParseResult<T> => {
  if (finalState == null) {
    const error = context.makeError();
    return {
      success: false,
      index: error.index,
      errors: error.errors,
    };
  }
  return {
    success: true,
    index: finalState.i,
    value: finalState.v,
  };
};
