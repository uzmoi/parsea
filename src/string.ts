import * as error from "./error";
import { Parser } from "./parser";
import { updateState } from "./state";

type StringParser<T = string> = Parser<T, string>;

export const string = <const T extends string>(string: T): StringParser<T> => {
  return new Parser((state, context) => {
    if (typeof context.src !== "string") {
      context.addError(state.i);
      return null;
    }
    const slice = context.src.slice(state.i, state.i + string.length);
    if (slice !== string) {
      context.addError(state.i, error.expected(string));
      return null;
    }
    return updateState(state, string, string.length);
  });
};

const graphemeSegmenter = /* @__PURE__ */ new Intl.Segmenter();

export const graphemeString = (string: string): StringParser => {
  const normalizedString = string.normalize();
  return new Parser((state, context) => {
    if (typeof context.src !== "string") {
      context.addError(state.i);
      return null;
    }
    const segments = graphemeSegmenter.segment(context.src);
    let sourceIndex = 0;
    let normalizedIndex = 0;
    while (normalizedIndex < normalizedString.length) {
      // NOTE: TypeScriptの型定義に含まれていないが、範囲外のindexを渡せばundefinedが返ってくる。
      const segmentData = segments.containing(
        state.i + sourceIndex,
      ) satisfies Intl.SegmentData as Intl.SegmentData | undefined;
      if (segmentData == null || segmentData.index !== state.i + sourceIndex) {
        context.addError(state.i, error.expected(normalizedString));
        return null;
      }
      const normalizedSegment = segmentData.segment.normalize();
      if (
        normalizedSegment !==
        normalizedString.slice(
          normalizedIndex,
          normalizedIndex + normalizedSegment.length,
        )
      ) {
        context.addError(state.i, error.expected(normalizedString));
        return null;
      }
      normalizedIndex += normalizedSegment.length;
      sourceIndex += segmentData.segment.length;
    }
    return updateState(
      state,
      context.src.slice(state.i, state.i + sourceIndex),
      sourceIndex,
    );
  });
};

export const codePoint: StringParser = /* @__PURE__ */ new Parser(
  (state, context) => {
    if (typeof context.src !== "string") {
      context.addError(state.i);
      return null;
    }
    if (state.i + 1 > context.src.length) {
      context.addError(state.i);
      return null;
    }
    const first = context.src.charCodeAt(state.i);
    // high surrogate
    if (0xd800 <= first && first < 0xdc00) {
      if (state.i + 2 > context.src.length) {
        context.addError(state.i);
        return null;
      }
      const second = context.src.charCodeAt(state.i + 1);
      // low surrogate
      if (0xdc00 <= second && second < 0xe000) {
        return updateState(state, context.src.slice(state.i, state.i + 2), 2);
      }
      context.addError(state.i);
      return null;
    }
    // low surrogate
    if (0xdc00 <= first && first < 0xe000) {
      context.addError(state.i);
      return null;
    }
    return updateState(state, context.src[state.i], 1);
  },
);

export const anyChar: StringParser = /* @__PURE__ */ new Parser(
  (state, context) => {
    if (typeof context.src !== "string") {
      context.addError(state.i);
      return null;
    }
    const segments = graphemeSegmenter.segment(context.src);
    // NOTE: TypeScriptの型定義に含まれていないが、範囲外のindexを渡せばundefinedが返ってくる。
    const segmentData = segments.containing(
      state.i,
    ) satisfies Intl.SegmentData as Intl.SegmentData | undefined;
    if (segmentData == null || segmentData.index !== state.i) {
      context.addError(state.i);
      return null;
    }
    return updateState(state, segmentData.segment, segmentData.segment.length);
  },
);

/**
 * A parser that matches a regular expression and returns the result of `exec`.
 *
 * @see {@link regex}
 *
 * @example
 * ```ts
 * const parser = regexGroup(/(-?\d+\.\d+)([A-Z]+)/i);
 * parseA(parser, "273.15K"); // => ["273.15K", "273.15", "K", index: 0, input: "273.15K"]
 * ```
 * @example
 * ```ts
 * const parser = anyEl().then(regexGroup(/(?<=(a))b(?=(c))/)).skip(anyEl());
 * parseA(parser, "abc"); // => ["b", "a", "c", index: 1, input: "abc"]
 * ```
 */
export const regexGroup = (re: RegExp): StringParser<RegExpExecArray> => {
  let flags = re.flags.replace("g", "");
  if (!re.sticky) {
    flags += "y";
  }
  const stickyRegex = new RegExp(re, flags);

  return new Parser((state, context) => {
    if (typeof context.src !== "string") {
      context.addError(state.i);
      return null;
    }
    stickyRegex.lastIndex = state.i;
    const matchResult = stickyRegex.exec(context.src);
    if (matchResult === null) {
      context.addError(state.i);
      return null;
    }
    return updateState(state, matchResult, matchResult[0].length);
  });
};

/**
 * A parser that matches a regular expression and returns a string.
 *
 * @see {@link regexGroup}
 *
 * @example
 * ```ts
 * parseA(regex(/./), "a") // => "a"
 * ```
 * @example
 * ```ts
 * // with capturing group
 * const parser = regex(/a(.+)/, 1);
 * parseA(parser, "abc") // => "bc"
 * ```
 * @example
 * ```ts
 * // with named capturing group
 * const parser = regex(/a(?<foo>.+)/, "foo");
 * parseA(parser, "abc") // => "bc"
 * ```
 * @example
 * ```ts
 * // with default value
 * const parser = regex(/a(?<foo>.+)?/, "foo", "default");
 * parseA(parser, "a") // => "default"
 * ```
 */
export const regex: {
  (re: RegExp): StringParser<string>;
  (re: RegExp, groupId: number | string): StringParser<string | undefined>;
  <const T>(
    re: RegExp,
    groupId: number | string,
    defaultValue: T,
  ): StringParser<string | T>;
} = (re: RegExp, groupId: number | string = 0, defaultValue?: undefined) =>
  regexGroup(re).map(matchResult => {
    const groupValue =
      typeof groupId === "number"
        ? matchResult[groupId]
        : // biome-ignore lint/style/noNonNullAssertion: overrideのため
          matchResult.groups?.[groupId]!;
    return groupValue ?? defaultValue;
  });
