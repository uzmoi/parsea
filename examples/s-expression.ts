import { type Parser, choice, el, lazy, many, regex } from "parsea";

export type SExpression = string | readonly SExpression[];

const list = lazy(() => SExpression)
    .apply(many)
    .between(el("("), el(")"));

export const SExpression: Parser<SExpression, string> = choice([
    el("'")
        .option()
        .and(list)
        .map(([quote, list]) => (quote ? ["quote", ...list] : list)),
    regex(/"([^"\\]|\\.)*"/),
    regex(/[^\s()"]+/),
]).between(regex(/\s*/));
