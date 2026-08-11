import { isInt32 } from "emnorst";
import { describe, expect, test } from "vitest";
import { qo } from "./do";
import { ParseAError, parseA } from "./parsea";
import { anyEl, eoi, fail, satisfy } from "./primitive";

describe("qo", () => {
  test("error", () => {
    const parser = qo(() => {
      throw null;
    });
    expect(() => parseA(parser, [])).toThrow();
  });
  test("do", () => {
    const parser = qo(perform => {
      const a = perform(satisfy<number>(isInt32));
      const b = perform(satisfy<string>(el => typeof el === "string"));
      return { a, b };
    });
    expect(parseA(parser, [5, "*"])).toEqual({ a: 5, b: "*" });
    expect(() => parseA(parser, [20, 5])).toThrow(ParseAError);
  });
  test("option", () => {
    const parser = qo(perform => perform.option(anyEl()));
    expect(parseA(parser, [])).toBeUndefined();
    expect(parseA(parser, [0])).toBe(0);
  });
  test("try > rollback state", () => {
    const parser = qo(perform => {
      perform.try(() => {
        perform(anyEl());
        perform(fail());
      });
      perform(anyEl());
    });
    expect(parseA(parser, ["hoge"])).toBeUndefined();
  });
  test("try > no rollback if allowPartial", () => {
    const parser = qo(perform => {
      perform.try(() => {
        perform(anyEl());
        perform(fail(), { allowPartial: true });
      });
      perform(eoi);
    });
    expect(parseA(parser, ["hoge"])).toBeUndefined();
  });
  test("while", () => {
    const parser = qo(perform => {
      const result: unknown[] = [];
      perform.while(() => {
        result.push(perform(anyEl()));
      });
      return result;
    });
    expect(parseA(parser, [0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
  });
  test("while + allowPartial", () => {
    const parser = qo(perform => {
      const result: unknown[] = [];
      perform.while(() => {
        result.push(perform(anyEl()));
        perform(anyEl(), { allowPartial: true });
      });
      return result;
    });
    expect(parseA(parser, ["hoge"])).toEqual(["hoge"]);
  });
});
