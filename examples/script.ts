import * as P from "../src";

export type Expr =
    | { type: "Bool"; value: boolean }
    | { type: "Number"; value: number }
    | { type: "String"; value: string }
    | { type: "Tuple"; elements: readonly Expr[] }
    | { type: "Block"; stats: Stat[]; last: Expr | null }
    | { type: "If"; test: Expr; then: Expr; else: Expr | null }
    | { type: "Ident"; name: string }
    | { type: "Call"; callee: Expr; arguments: readonly Expr[] }
    | { type: "Property"; target: Expr; name: string };

export const expr: P.Parser<Expr> = P.lazy(() =>
    P.choice([Bool, Number, String, Tuple, Block, If, Ident]).between(ws).flatMap(tail),
);

const sepBy = <T>(parser: P.Parser<T>, sep: P.Parser): P.Parser<T[]> => {
    return P.qo(perform => {
        const xs: T[] = [];
        perform.try(() => {
            for (;;) {
                xs.push(perform(parser));
                perform(sep);
            }
        }, true);
        return xs;
    });
};

const ws = P.regex(/\s*/);

const Ident = P.regex(/\w+/).map(name => ({ type: "Ident", name } satisfies Expr));

export type Stat =
    | { type: "Let"; name: string; init: Expr }
    | { type: "DefFn"; name: string; params: readonly string[]; body: Expr }
    | { type: "Return"; body: Expr | null }
    | { type: "While"; test: Expr; body: Expr }
    | { type: "Break" }
    | { type: "Expr"; expr: Expr };

const Let = P.literal("let")
    .then(Ident.between(ws))
    .skip(P.el("="))
    .andMap(expr, ({ name }, init): Stat => ({ type: "Let", name, init }));

const DefFn = P.seq([
    P.literal("fn").then(Ident.between(ws)),
    Ident.between(ws)
        .apply(sepBy, P.el(","))
        .skip(ws)
        .between(P.el("("), P.el(")"))
        .map(nodes => nodes.map(node => node.name)),
    expr,
]).map<Stat>(([{ name }, params, body]) => ({
    type: "DefFn",
    name,
    params,
    body,
}));

const Return = P.literal("return")
    .then(expr.option(null))
    .skip(ws)
    .map<Stat>(body => ({ type: "Return", body }));

const While = P.literal("while")
    .skip(ws)
    .then(expr.between(P.el("("), P.el(")")))
    .andMap(expr, (test, body): Stat => ({ type: "While", test, body }));

const Break = P.literal("break").return<Stat>({ type: "Break" }).skip(ws);

const Expr = expr.map<Stat>(expr => ({ type: "Expr", expr }));

export const stat: P.Parser<Stat> = P.choice([Let, DefFn, Return, While, Break, Expr])
    .skip(P.el(";"))
    .between(ws);

const Bool = P.choice([
    P.literal("true").return(true),
    P.literal("false").return(false),
]).map<Expr>(value => ({ type: "Bool", value }));

const digit = P.oneOf("0123456789");
const digits = digit.apply(
    P.manyAccum<string, string>,
    (accum, digit) => accum + digit,
    () => "",
    { min: 1 },
);

const sign = P.oneOf(["+", "-"] as const).option("+" as const);

const Number = sign
    .andMap(digits, (sign, digits) => sign + digits)
    .andMap(P.el(".").then(digits).option(""), (int, fDigits) => {
        return {
            type: "Number",
            value: parseFloat(`${int}.${fDigits}`),
        } satisfies Expr;
    });

const String = P.regex(/([^"\\]|\\.)*/)
    .between(P.el('"'))
    .map<Expr>(value => ({ type: "String", value }));

const Tuple = expr
    .apply(sepBy, P.el(","))
    .skip(ws)
    .between(P.el("("), P.el(")"))
    .map(elements => ({ type: "Tuple", elements } satisfies Expr));

const Block = stat
    .apply(P.many)
    .andMap(expr.option(null), (stats, last) => {
        return { type: "Block", stats, last } satisfies Expr;
    })
    .skip(ws)
    .between(P.el("{"), P.el("}"));

const If = P.seq([
    P.literal("if")
        .then(ws)
        .then(expr.between(P.el("("), P.el(")"))),
    expr,
    P.literal("else").then(expr).option(null),
]).map<Expr>(([test, then, else_]) => ({
    type: "If",
    test,
    then,
    else: else_,
}));

const tail = (expr: Expr) =>
    P.choice([Call, Property])
        .skip(ws)
        .apply(P.many)
        .map(tails => tails.reduce((expr, tail) => tail(expr), expr));

const Call = Tuple.map<(callee: Expr) => Expr>(({ elements }) => callee => ({
    type: "Call",
    callee,
    arguments: elements,
}));

const Property = P.el(".")
    .then(ws)
    .then(Ident)
    .map<(target: Expr) => Expr>(({ name }) => target => ({
        type: "Property",
        target,
        name,
    }));