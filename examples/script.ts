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

const ws = P.regex(/\s*/);

const keywords = [
    "let",
    "fn",
    "return",
    "while",
    "break",
    "true",
    "false",
    "if",
    "else",
] as const;

const keyword = (keyword: (typeof keywords)[number]): P.Parser<unknown, string> => {
    return P.literal(keyword).then(P.regex(/\b/));
};

const Ident = P.notFollowedBy(P.choice(keywords.map(keyword)))
    .then(P.regex(/\b\w+\b/))
    .map(name => ({ type: "Ident", name }) satisfies Expr);

export type Stmt =
    | { type: "Let"; name: string; init: Expr }
    | { type: "DefFn"; name: string; params: readonly string[]; body: Expr }
    | { type: "Return"; body: Expr | null }
    | { type: "While"; test: Expr; body: Expr }
    | { type: "Break" }
    | { type: "Expr"; expr: Expr };

const Let = P.seq([keyword("let").then(Ident.between(ws)).skip(P.el("=")), expr]).map(
    ([{ name }, init]): Stmt => ({ type: "Let", name, init }),
);

const DefFn = P.seq([
    keyword("fn").then(Ident.between(ws)),
    Ident.between(ws)
        .apply(P.sepBy, P.el(","), { trailing: "allow" })
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

const While = P.seq([
    keyword("while")
        .skip(ws)
        .then(expr.between(P.el("("), P.el(")"))),
    expr,
]).map(([test, body]): Stmt => ({ type: "While", test, body }));

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
const digits = digit.apply(P.many, { min: 1 }).map(digits => digits.join(""));

const sign = P.oneOf(["+", "-"]).option("+");

const Number = P.seq([sign, digits, P.el(".").then(digits).option("")]).map(
    ([sign, intDigits, floatDigits]) => {
        return {
            type: "Number",
            value: parseFloat(`${sign}${intDigits}.${floatDigits}`),
        } satisfies Expr;
    },
);

const String = P.regex(/([^"\\]|\\.)*/)
    .between(P.el('"'))
    .map<Expr>(value => ({ type: "String", value }));

const Tuple = expr
    .apply(P.sepBy, P.el(","), { trailing: "allow" })
    .skip(ws)
    .between(P.el("("), P.el(")"))
    .map(elements => ({ type: "Tuple", elements }) satisfies Expr);

const Block = P.seq([stmt.apply(P.many), expr.option(null)])
    .map(([stmts, last]) => {
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
