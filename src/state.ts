export interface ParseState<out T> {
  readonly i: number;
  readonly v: T;
}

export const initState: ParseState<null> = {
  i: 0,
  v: null,
};

export const updateState = <T>(
  state: ParseState<unknown>,
  value: T,
  consumeLength = 0,
): ParseState<T> => ({
  i: state.i + consumeLength,
  v: value,
});
