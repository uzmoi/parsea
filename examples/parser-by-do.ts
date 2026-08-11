import { type Config, type Parser, qo } from "parsea";

// For simplicity, the behavior may differ in a few cases.

const pure = <T>(value: T) => qo(() => value);

const map = <T, U, S>(
  parser: Parser<T, S>,
  f: (value: T, config: Config) => U,
) => qo<U, S>((perform, config) => f(perform(parser), config));

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
    const result = perform(left);
    perform(right);
    return result;
  });

const between = <T, S>(
  parser: Parser<T, S>,
  pre: Parser<unknown, S>,
  post = pre,
) =>
  qo<T, S>(perform => {
    perform(pre);
    const value = perform(parser);
    perform(post);
    return value;
  });

const or = <T, U, S>(left: Parser<T, S>, right: Parser<U, S>) =>
  qo<T | U, S>(perform => {
    const [success, result] = perform.try(
      () => [true, perform(left)] as const,
      [false],
    );
    return success ? result : perform(right);
  });

const option = <T, U, S>(parser: Parser<T, S>, defaultValue: U) =>
  qo<T | U, S>(perform => perform.option(parser, defaultValue));

const seq = <T, S>(parsers: readonly Parser<T, S>[]): Parser<T[], S> =>
  qo(perform => parsers.map(parser => perform(parser)));

const many = <T, S>(parser: Parser<T, S>): Parser<T[], S> =>
  qo(perform => {
    const result: T[] = [];
    perform.while(() => {
      result.push(perform(parser));
    });
    return result;
  });

const sepBy = <T, S>(
  parser: Parser<T, S>,
  sep: Parser<unknown, S>,
): Parser<T[], S> =>
  qo(perform => {
    const result: T[] = [];
    perform.while(() => {
      result.push(perform(parser));
      perform(sep, { allowPartial: true });
    });
    return result;
  });
