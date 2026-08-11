import type { JsonValue } from "emnorst";
import * as P from "parsea";

// https://www.json.org/

const ws = P.regex(/[ \n\r\t]*/);

export const json: P.Parser<JsonValue, string> = P.lazy(() =>
  P.choice([
    object,
    array,
    string,
    number,
    P.string("true").return(true),
    P.string("false").return(false),
    P.string("null").return(null),
  ]).between(ws),
);

const escapeTable = {
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

// cspell:ignore bfnrt
const string = P.regex(/(?:\\(?:["\\/bfnrt]|u[0-9A-Fa-f]{4})|[^"\\])*/)
  .between(P.el('"'))
  .map(escapedString =>
    escapedString.replace(/\\(u[0-9A-Fa-f]{4}|.)/g, (_, escape: string) => {
      if (escape.startsWith("u")) {
        return String.fromCharCode(parseInt(escape.slice(1), 16));
      }
      if (escape in escapeTable) {
        return escapeTable[escape as keyof typeof escapeTable];
      }
      return escape;
    }),
  );

const number = P.regex(/-?(0|[1-9]\d*)(.\d+)?([Ee][-+]?\d+)?/).map(Number);

const empty = ws.map<[]>(() => []);

const array = P.sepBy(json, P.el(","))
  .skip(empty)
  .between(P.el("["), P.el("]"));

const keyValue = P.seq([string.between(ws).skip(P.el(":")), json]);

const object = P.sepBy(keyValue, P.el(","))
  .skip(empty)
  .between(P.el("{"), P.el("}"))
  .map(Object.fromEntries<JsonValue>);

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  test.each([
    " null ",
    " [ ] ",
    " [ null , 0 ] ",
    " {  } ",
    ` { "1" : null , "2" : 0 } `,
    "0",
    "3.141592",
    "4.2195e1",
    "0.00E+00",
    "-0e-0",
  ])("%o", jsonString => {
    expect(P.parseA(json, jsonString)).toEqual(JSON.parse(jsonString));
  });

  test.each(["00", "- 0", "0.", ".0"])("%o is invalid json.", n => {
    expect(() => P.parseA(json, n)).toThrow(P.ParseAError);
  });

  test.each([
    ['"'],
    ["\\"],
    ["/"],
    ["b", "\b"],
    ["f", "\f"],
    ["n", "\n"],
    ["r", "\r"],
    ["t", "\t"],
    ["u1234", "\u1234"],
  ])("escape %s", (escapeChar, char = escapeChar) => {
    expect(P.parseA(json, `"\\${escapeChar}"`)).toBe(char);
  });
}
