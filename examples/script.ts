import * as P from "parsea";

export type Expr =
    | { type: "Bool"; value: boolean }
    | { type: "Number"; value: number }
    | { type: "String"; value: string }
    | { type: "Tuple"; elements: readonly Expr[] }
    | { type: "Block"; stmts: Stmt[]; last: Expr | null }
    | { type: "If"; test: Expr; then: Expr; else: Expr | null }
    | { type: "Ident"; name: string }
    | { type: "Call"; callee: Expr; arguments: readonly Expr[] }
    | { type: "Property"; target: Expr; name: string };

export const expr: P.Parser<Expr, string> = P.lazy(() =>
    P.choice([Bool, Number, String, Tuple, Block, If, Ident]).between(ws).flatMap(tail),
);

const sepBy = <T, S>(
    parser: P.Parser<T, S>,
    sep: P.Parser<unknown, S>,
): P.Parser<T[], S> => {
    return P.qo(perform => {
        const xs: T[] = [];
        perform.try(undefined, () => {
            for (;;) {
                xs.push(perform(parser, { allowPartial: true }));
                perform(sep, { allowPartial: true });
            }
        });
        return xs;
    });
};

const ws = P.regex(/\s*/);

const keyword = (keyword: string): P.Parser<unknown, string> => {
    return P.literal(keyword).then(P.notFollowedBy(P.regex(/\w/)));
};

const Ident = P.regex(/\w+/).map(name => ({ type: "Ident", name }) satisfies Expr);

export type Stmt =
    | { type: "Let"; name: string; init: Expr }
    | { type: "DefFn"; name: string; params: readonly string[]; body: Expr }
    | { type: "Return"; body: Expr | null }
    | { type: "While"; test: Expr; body: Expr }
    | { type: "Break" }
    | { type: "Expr"; expr: Expr };

const Let = keyword("let")
    .then(Ident.between(ws))
    .skip(P.el("="))
    .andMap(expr, ({ name }, init): Stmt => ({ type: "Let", name, init }));

const DefFn = P.seq([
    keyword("fn").then(Ident.between(ws)),
    Ident.between(ws)
        .apply(sepBy, P.el(","))
        .skip(ws)
        .between(P.el("("), P.el(")"))
        .map(nodes => nodes.map(node => node.name)),
    expr,
]).map<Stmt>(([{ name }, params, body]) => ({
    type: "DefFn",
    name,
    params,
    body,
}));

const Return = keyword("return")
    .then(expr.option(null))
    .skip(ws)
    .map<Stmt>(body => ({ type: "Return", body }));

const While = keyword("while")
    .skip(ws)
    .then(expr.between(P.el("("), P.el(")")))
    .andMap(expr, (test, body): Stmt => ({ type: "While", test, body }));

const Break = keyword("break").return<Stmt>({ type: "Break" }).skip(ws);

const Expr = expr.map<Stmt>(expr => ({ type: "Expr", expr }));

export const stmt: P.Parser<Stmt, string> = P.choice([
    Let,
    DefFn,
    Return,
    While,
    Break,
    Expr,
])
    .skip(P.el(";"))
    .between(ws);

const Bool = P.choice([
    keyword("true").return(true),
    keyword("false").return(false),
]).map<Expr>(value => ({ type: "Bool", value }));

const digit = P.oneOf("0123456789");
const digits = digit.apply(
    P.manyAccum<string, string, string>,
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
    .map(elements => ({ type: "Tuple", elements }) satisfies Expr);

const Block = stmt
    .apply(P.many)
    .andMap(expr.option(null), (stmts, last) => {
        return { type: "Block", stmts, last } satisfies Expr;
    })
    .skip(ws)
    .between(P.el("{"), P.el("}"));

const If = P.seq([
    keyword("if")
        .then(ws)
        .then(expr.between(P.el("("), P.el(")"))),
    expr,
    keyword("else").then(expr).option(null),
]).map<Expr>(([test, then, else_]) => ({
    type: "If",
    test,
    then,
    else: else_,
}));

const tail = (expr: Expr) =>
    P.choice([Call, Property])
        .skip(ws)
        .apply(
            P.manyAccum<(callee: Expr) => Expr, Expr, string>,
            (expr, tail) => tail(expr),
            () => expr,
        );

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
