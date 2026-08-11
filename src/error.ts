export type ParseError =
  | { type: "Expected"; value: ArrayLike<unknown> }
  | { type: "Label"; name: string; length: number };

export const expected = (value: ArrayLike<unknown>): ParseError => ({
  type: "Expected",
  value,
});

export const label = (name: string, length = 0): ParseError => ({
  type: "Label",
  name,
  length,
});
