import { choice, el, lazy, many, type Parser, parseA, regex } from "parsea";

export type SExpression = string | readonly SExpression[];

const list = lazy(() => SExpression.apply(many).between(el("("), el(")")));

export const SExpression: Parser<SExpression, string> = choice([
  el("'").then(list.map(list => ["quote", ...list])),
  list,
  regex(/"([^"\\]|\\.)*"/),
  regex(/[^\s()"]+/),
]).between(regex(/\s*/));

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  test("Hello world!", () => {
    expect(parseA(SExpression, '(print "Hello world!")')).toEqual([
      "print",
      '"Hello world!"',
    ]);
  });

  test("quote list", () => {
    expect(parseA(SExpression, "'(1 2 3 4)")).toEqual([
      "quote",
      "1",
      "2",
      "3",
      "4",
    ]);
  });
}
