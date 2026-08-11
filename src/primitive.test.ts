import { describe, expect, test, vi } from "vitest";
import { ParseAError, parseA } from "./parsea";
import { anyEl, el, eoi, literal, pure, satisfy } from "./primitive";

test("pure", () => {
  const symbol = Symbol();
  expect(parseA(pure(symbol), [])).toBe(symbol);
});

describe("eoi", () => {
  test("end of input", () => {
    expect(parseA(anyEl().then(eoi), ["el"])).toBe("el");
  });
  test("消費しきっていない要素がある場合失敗", () => {
    expect(() => parseA(eoi, ["el"])).toThrow();
  });
});

describe("anyEl", () => {
  test("lengthが1以上必要", () => {
    expect(() => parseA(anyEl(), [])).toThrow();
  });
  test("長さを1消費", () => {
    expect(() => parseA(anyEl().skip(anyEl()), [0])).toThrow();
  });
  test("任意の要素で成功する", () => {
    expect(parseA(anyEl(), ["el"])).toBe("el");
  });
});

describe("el", () => {
  test("SameValueZero", () => {
    expect(parseA(el(1), [1])).toBe(1);
    expect(() => parseA(el(2), [1])).toThrow();
    expect(parseA(el(NaN), [NaN])).toBe(NaN);
    expect(parseA(el(-0), [0])).toBe(0);
  });
});

describe("satisfy", () => {
  test("success", () => {
    const parser = satisfy(() => true);
    expect(parseA(parser, [1])).toBe(1);
  });
  test("failure", () => {
    const parser = satisfy(() => false);
    expect(() => parseA(parser, [1])).toThrow(ParseAError);
  });
  test("empty", () => {
    const fn = vi.fn<() => boolean>();
    expect(() => parseA(satisfy(fn), [])).toThrow(ParseAError);
    expect(fn).toHaveBeenCalledTimes(0);
  });
});

describe("literal", () => {
  test("empty", () => {
    expect(parseA(literal([]), [])).toEqual([]);
  });
  test("sourceが短いと失敗", () => {
    expect(() => parseA(literal("abc"), "ab")).toThrow(ParseAError);
  });
  test("違う要素で失敗", () => {
    expect(() => parseA(literal("ふんいき"), "ふいんき")).toThrow(ParseAError);
  });
  test("SameValueZero", () => {
    const parser = literal(["hoge", NaN, -0]);
    expect(parseA(parser, ["hoge", NaN, 0])).toEqual(["hoge", NaN, -0]);
  });
});
