import { parseA } from "parsea";
import { describe, expect, test } from "vitest";
import { expression, statement } from "./script";

describe("stmt", () => {
  test("Let", () => {
    expect(parseA(statement, "let hoge = 0;")).toEqual({
      type: "Let",
      name: "hoge",
      init: { type: "Number", value: 0 },
    });
  });

  test("DefFn", () => {
    expect(parseA(statement, "fn main(arg) {};")).toEqual({
      type: "DefFn",
      name: "main",
      params: ["arg"],
      body: { type: "Block", statements: [], last: null },
    });
  });

  test("Return", () => {
    expect(parseA(statement, "return;")).toEqual({
      type: "Return",
      body: null,
    });
  });

  test("While", () => {
    expect(parseA(statement, "while (false) {};")).toEqual({
      type: "While",
      test: { type: "Bool", value: false },
      body: { type: "Block", statements: [], last: null },
    });
  });

  test("Break", () => {
    expect(parseA(statement, "break;")).toEqual({
      type: "Break",
    });
  });

  test("Expr", () => {
    expect(parseA(statement, "0;")).toEqual({
      type: "Expression",
      expression: { type: "Number", value: 0 },
    });
  });
});

describe("expr", () => {
  describe("Bool", () => {
    test.each([true, false])("%s", value => {
      expect(parseA(expression, String(value))).toEqual({
        type: "Bool",
        value,
      });
    });
  });

  describe("Number", () => {
    test.each([
      ["int", "42", 42],
      ["minus float", "-273.25", -273.25],
    ])("%s (%f)", (_, src, value) => {
      expect(parseA(expression, src)).toEqual({
        type: "Number",
        value,
      });
    });
  });

  test("String", () => {
    expect(parseA(expression, `"Hello world!"`)).toEqual({
      type: "String",
      value: "Hello world!",
    });
  });

  test("Ident", () => {
    expect(parseA(expression, "hoge")).toEqual({
      type: "Ident",
      name: "hoge",
    });
  });

  describe("Tuple", () => {
    test("empty", () => {
      expect(parseA(expression, "()")).toEqual({
        type: "Tuple",
        elements: [],
      });
    });
    test("elements", () => {
      expect(parseA(expression, `(0, "", hoge)`)).toEqual({
        type: "Tuple",
        elements: [
          { type: "Number", value: 0 },
          { type: "String", value: "" },
          { type: "Ident", name: "hoge" },
        ],
      });
    });
    test("trailing comma", () => {
      expect(parseA(expression, "(0, )")).toEqual({
        type: "Tuple",
        elements: [{ type: "Number", value: 0 }],
      });
    });
  });

  describe("Block", () => {
    test("empty", () => {
      expect(parseA(expression, "{}")).toEqual({
        type: "Block",
        statements: [],
        last: null,
      });
    });
    test("stmts", () => {
      expect(parseA(expression, "{ 0; }")).toEqual({
        type: "Block",
        statements: [
          { type: "Expression", expression: { type: "Number", value: 0 } },
        ],
        last: null,
      });
    });
    test("expr", () => {
      expect(parseA(expression, "{ 0 }")).toEqual({
        type: "Block",
        statements: [],
        last: { type: "Number", value: 0 },
      });
    });
  });

  describe("If", () => {
    test("then only", () => {
      expect(parseA(expression, "if (true) {}")).toEqual({
        type: "If",
        test: { type: "Bool", value: true },
        then: { type: "Block", statements: [], last: null },
        else: null,
      });
    });
    test("with else", () => {
      expect(parseA(expression, "if (true) 1 else 0")).toEqual({
        type: "If",
        test: { type: "Bool", value: true },
        then: { type: "Number", value: 1 },
        else: { type: "Number", value: 0 },
      });
    });
  });

  test("tail", () => {
    expect(parseA(expression, "f(0)(1)")).toEqual({
      type: "Call",
      callee: {
        type: "Call",
        callee: { type: "Ident", name: "f" },
        arguments: [{ type: "Number", value: 0 }],
      },
      arguments: [{ type: "Number", value: 1 }],
    });
  });

  test("Call", () => {
    expect(parseA(expression, `print("Hello world!")`)).toEqual({
      type: "Call",
      callee: { type: "Ident", name: "print" },
      arguments: [{ type: "String", value: "Hello world!" }],
    });
  });

  test("Property", () => {
    expect(parseA(expression, "().property")).toEqual({
      type: "Property",
      target: { type: "Tuple", elements: [] },
      name: "property",
    });
  });
});

test("script", () => {
  const source = `{
        fn main() {
            print("Hello world!");
            ()
        };
    }`;
  expect(parseA(expression, source)).toMatchSnapshot();
});
