import { describe, expect, test } from "@jest/globals";
import { isInt32 } from "emnorst";
import { qo } from "./do";
import { satisfy } from "./primitive";

describe("qo", () => {
    test("error", () => {
        const parser = qo(() => {
            throw null;
        });
        expect(() => {
            parser.parse([]);
        }).toThrow();
    });
    test("do", () => {
        const parser = qo(perform => {
            const a = perform(satisfy<number>(isInt32));
            const b = perform(satisfy<string>(el => typeof el === "string"));
            return { a, b };
        });
        expect(parser.parse([5, "*"])).toEqual({
            success: true,
            index: 2,
            value: { a: 5, b: "*" },
        });
        expect(parser.parse([20, 5])).toHaveProperty("success", false);
    });
});
