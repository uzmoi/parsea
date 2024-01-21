import { type Config, type Parser, qo } from "../src";

// For simplicity, the behavior may differ in a few cases.

const pure = <T>(value: T) => qo(() => value);

const map = <T, U, S>(parser: Parser<T, S>, f: (value: T, config: Config) => U) =>
    qo<U, S>((perform, config) => f(perform(parser), config));

const flatMap = <T, U, S>(
    parser: Parser<T, S>,
    f: (value: T, config: Config) => Parser<U, S>,
) => qo<U, S>((perform, config) => perform(f(perform(parser), config)));

const and = <T, S>(left: Parser<unknown, S>, right: Parser<T, S>) =>
    qo<T, S>(perform => {
        perform(left);
        return perform(right);
    });

const skip = <T, S>(left: Parser<T, S>, right: Parser<unknown, S>) =>
    qo<T, S>(perform => {
        const leftValue = perform(left);
        perform(right);
        return leftValue;
    });

const between = <T, S>(parser: Parser<T, S>, pre: Parser<unknown, S>, post = pre) =>
    qo<T, S>(perform => {
        perform(pre);
        const value = perform(parser);
        perform(post);
        return value;
    });

const or = <T, U, S>(left: Parser<T, S>, right: Parser<U, S>) =>
    qo<T | U, S>(perform => {
        const symbol = Symbol();
        const leftResult = perform.try(symbol, () => perform(left));
        return leftResult === symbol ? perform(right) : leftResult;
    });

const option = <T, U, S>(parser: Parser<T, S>, defaultValue: U) =>
    qo<T | U, S>(perform => {
        return perform.try(defaultValue, () => perform(parser));
    });

const seq = <T, S>(parsers: readonly Parser<T, S>[]): Parser<T[], S> =>
    qo(perform => {
        const accum: T[] = [];
        for (const parser of parsers) {
            accum.push(perform(parser));
        }
        return accum;
    });

const many = <T, S>(parser: Parser<T, S>): Parser<T[], S> =>
    qo(perform => {
        const xs: T[] = [];
        perform.try(undefined, () => {
            for (;;) {
                xs.push(perform(parser, { allowPartial: true }));
            }
        });
        return xs;
    });
