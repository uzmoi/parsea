import { describe, expect, test } from "vitest";
import { choice, many, sepBy, seq } from "./combinator";
import { ParseAError, parseA } from "./parsea";
import { el, oneOf, pure } from "./primitive";

describe("choice", () => {
  test("最初に成功した結果で成功", () => {
    const parser = choice([el(2), el(4), pure(11)]);
    expect(parseA(parser, [4])).toBe(4);
    expect(parseA(parser, [])).toBe(11);
  });
  test("いずれかが成功すれば成功", () => {
    const browsers = ["Google Chrome", "Firefox", "Safari", "Microsoft Edge"];
    const parser = choice(browsers.map(el));
    for (const browser of browsers) {
      expect(parseA(parser, [browser])).toBe(browser);
    }
    expect(() => parseA(parser, ["Internet Explorer"])).toThrow(ParseAError);
  });
});

describe("seq", () => {
  test("順番にパースして各パーサーの結果の配列で成功", () => {
    expect(parseA(seq([el(1), el(2)]), [1, 2])).toEqual([1, 2]);
  });
  test("途中で失敗するとその時点で失敗", () => {
    expect(() => parseA(seq([el(1), el(2)]), [1])).toThrow(ParseAError);
  });
  test("allowPartialで途中で失敗してもその時点までの結果で成功", () => {
    expect(parseA(seq([el(1), el(2)], { allowPartial: true }), [1])).toEqual([
      1,
    ]);
  });
});

describe("many", () => {
  test("empty", () => {
    expect(parseA(many(el(1)), [])).toEqual([]);
  });
  test("min", () => {
    const parser = many(el(1), { min: 2 });
    expect(parseA(parser, [1, 1])).toEqual([1, 1]);
    expect(() => parseA(parser, [1])).toThrow(ParseAError);
  });
  test("max", () => {
    const parser = many(el(1), { max: 2 }).skip(el(1));
    expect(parseA(parser, [1, 1, 1])).toEqual([1, 1]);
  });
  test("min > max", () => {
    const parser = many(el(1), { min: 3, max: 1 }).skip(el(1));
    expect(parseA(parser, [1, 1, 1, 1])).toEqual([1, 1, 1]);
  });
});

describe("sepBy", () => {
  const digit = oneOf("0123456789").map(Number);

  test("empty", () => {
    expect(parseA(sepBy(digit, el(",")), "")).toEqual([]);
  });
  test("omit trailing separator", () => {
    expect(parseA(sepBy(digit, el(",")), "0,1")).toEqual([0, 1]);
  });
  test("with trailing separator", () => {
    const parser = sepBy(digit, el(",")).skip(el(","));
    expect(parseA(parser, "0,1,")).toEqual([0, 1]);
  });
  test('omit trailing separator { trailing: "allow" }', () => {
    const parser = sepBy(digit, el(","), { trailing: "allow" });
    expect(parseA(parser, "0,1")).toEqual([0, 1]);
  });
  test('with trailing separator { trailing: "allow" }', () => {
    const parser = sepBy(digit, el(","), { trailing: "allow" });
    expect(parseA(parser, "0,1,")).toEqual([0, 1]);
  });
  test("min", () => {
    const parser = sepBy(digit, el(","), { min: 2 });
    expect(parseA(parser, "0,1")).toEqual([0, 1]);
    expect(() => parseA(parser, "0")).toThrow(ParseAError);
    expect(() => parseA(parser, "")).toThrow(ParseAError);
  });
  test("max", () => {
    const parser = sepBy(digit, el(","), { max: 2 }).skip(el(",")).skip(digit);
    expect(parseA(parser, "0,1,2")).toEqual([0, 1]);
  });
});
