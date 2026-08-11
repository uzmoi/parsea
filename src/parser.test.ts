import { describe, expect, test, vi } from "vitest";
import { label } from "./error";
import { parseA } from "./parsea";
import type { Parser } from "./parser";
import { fail, literal, pure } from "./primitive";

describe("Parser", () => {
  test("label", () => {
    expect(literal("hoge").label("label").parse([])).toEqual({
      success: false,
      index: 0,
      errors: [label("label", 1)],
    });
  });

  test("map", () => {
    const fn = vi.fn<() => string>().mockReturnValue("hoge");

    expect(parseA(pure("fuga").map(fn), [])).toBe("hoge");
    expect(fn).lastCalledWith("fuga", {});
  });

  test("flatMap", () => {
    const fn = vi.fn<() => Parser<string>>().mockReturnValue(pure("hoge"));

    expect(parseA(pure("fuga").flatMap(fn), [])).toBe("hoge");
    expect(fn).lastCalledWith("fuga", {});
  });

  describe("option", () => {
    test("success", () => {
      expect(parseA(fail().option("defaultValue"), [])).toBe("defaultValue");
    });
    test("default", () => {
      expect(parseA(fail().option(), [])).toBeUndefined();
    });
  });
});
