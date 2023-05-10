import * as error from "./error";
import { Parser, type Parsed } from "./parser";
import { updateState, type ParseState } from "./state";

/**
 * Delays variable references until the parser runs.
 */
export const lazy = <T>(getParser: () => Parser<T>): Parser<T> => {
    let parser: Parser<T>;
    return new Parser((state, context) => {
        if (parser == null) {
            parser = getParser();
        }
        return parser.run(state, context);
    });
};

export const notFollowedBy = (parser: Parser): Parser =>
    new Parser((state, context) => {
        const newState = parser.run(state, context);
        if (newState == null) {
            return state;
        }
        context.addError(error.unknown(state.i));
        return null;
    });

export const lookAhead = <T>(parser: Parser<T>): Parser<T> =>
    new Parser((state, context) => {
        const newState = parser.run(state, context);
        return newState && updateState(state, newState.v, 0);
    });

type Seq<out T extends readonly Parser[]> = {
    [K in keyof T]: Parsed<T[K]>;
};

export const seq: {
    <T extends readonly Parser[] | []>(
        parsers: T,
        options?: { allowPartial?: false },
    ): Parser<Seq<T>>;
    <T extends readonly Parser[] | []>(
        parsers: T,
        options: { allowPartial: boolean },
    ): Parser<Partial<Seq<T>>>;
} = (parsers, options) =>
    new Parser((state, context) => {
        const values: unknown[] = [];
        for (const parser of parsers) {
            const newState = parser.run(state, context);
            if (newState == null) {
                if (options?.allowPartial) break;
                return null;
            }
            values.push((state = newState).v);
        }
        return updateState(state, values, 0);
    });

type Choice<T extends readonly Parser[]> = Parser<Parsed<T[number]>>;

export const choice = <T extends readonly Parser[] | []>(parsers: T): Choice<T> =>
    new Parser((state, context) => {
        for (const parser of parsers) {
            const newState = parser.run(state, context);
            if (newState != null) {
                return newState as ParseState<Parsed<T[number]>>;
            }
        }
        return null;
    });
