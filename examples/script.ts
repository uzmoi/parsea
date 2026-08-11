import * as P from "parsea";

export type Expression =
  | { type: "Bool"; value: boolean }
  | { type: "Number"; value: number }
  | { type: "String"; value: string }
  | { type: "Tuple"; elements: readonly Expression[] }
  | { type: "Block"; statements: Statement[]; last: Expression | null }
  | { type: "If"; test: Expression; then: Expression; else: Expression | null }
  | { type: "Ident"; name: string }
  | { type: "Call"; callee: Expression; arguments: readonly Expression[] }
  | { type: "Property"; target: Expression; name: string };

export const expression: P.Parser<Expression, string> = P.lazy(() =>
  P.choice([Bool, Number, String, Tuple, Block, If, Ident])
    .between(ws)
    .flatMap(tail),
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

const keyword = (
  keyword: (typeof keywords)[number],
): P.Parser<unknown, string> => {
  return P.literal(keyword).then(P.regex(/\b/));
};

const Ident = P.notFollowedBy(P.choice(keywords.map(keyword)))
  .then(P.regex(/\b\w+\b/))
  .map(name => ({ type: "Ident", name }) satisfies Expression);

export type Statement =
  | { type: "Let"; name: string; init: Expression }
  | { type: "DefFn"; name: string; params: readonly string[]; body: Expression }
  | { type: "Return"; body: Expression | null }
  | { type: "While"; test: Expression; body: Expression }
  | { type: "Break" }
  | { type: "Expression"; expression: Expression };

const Let = P.seq([
  keyword("let").then(Ident.between(ws)).skip(P.el("=")),
  expression,
]).map(([{ name }, init]): Statement => ({ type: "Let", name, init }));

const DefFn = P.seq([
  keyword("fn").then(Ident.between(ws)),
  Ident.between(ws)
    .apply(P.sepBy, P.el(","), { trailing: "allow" })
    .skip(ws)
    .between(P.el("("), P.el(")"))
    .map(nodes => nodes.map(node => node.name)),
  expression,
]).map<Statement>(([{ name }, params, body]) => ({
  type: "DefFn",
  name,
  params,
  body,
}));

const Return = keyword("return")
  .then(expression.option(null))
  .skip(ws)
  .map<Statement>(body => ({ type: "Return", body }));

const While = P.seq([
  keyword("while")
    .skip(ws)
    .then(expression.between(P.el("("), P.el(")"))),
  expression,
]).map(([test, body]): Statement => ({ type: "While", test, body }));

const Break = keyword("break").return<Statement>({ type: "Break" }).skip(ws);

const Expression = expression.map<Statement>(expression => ({
  type: "Expression",
  expression,
}));

export const statement: P.Parser<Statement, string> = P.choice([
  Let,
  DefFn,
  Return,
  While,
  Break,
  Expression,
])
  .skip(P.el(";"))
  .between(ws);

const Bool = P.choice([
  keyword("true").return(true),
  keyword("false").return(false),
]).map<Expression>(value => ({ type: "Bool", value }));

const digit = P.oneOf("0123456789");
const digits = digit.apply(P.many, { min: 1 }).map(digits => digits.join(""));

const sign = P.oneOf(["+", "-"]).option("+");

const Number = P.seq([sign, digits, P.el(".").then(digits).option("")]).map(
  ([sign, intDigits, floatDigits]) => {
    return {
      type: "Number",
      value: parseFloat(`${sign}${intDigits}.${floatDigits}`),
    } satisfies Expression;
  },
);

const String = P.regex(/([^"\\]|\\.)*/)
  .between(P.el('"'))
  .map<Expression>(value => ({ type: "String", value }));

const Tuple = expression
  .apply(P.sepBy, P.el(","), { trailing: "allow" })
  .skip(ws)
  .between(P.el("("), P.el(")"))
  .map(elements => ({ type: "Tuple", elements }) satisfies Expression);

const Block = P.seq([statement.apply(P.many), expression.option(null)])
  .map(([statements, last]) => {
    return { type: "Block", statements, last } satisfies Expression;
  })
  .skip(ws)
  .between(P.el("{"), P.el("}"));

const If = P.seq([
  keyword("if")
    .then(ws)
    .then(expression.between(P.el("("), P.el(")"))),
  expression,
  keyword("else").then(expression).option(null),
]).map<Expression>(([test, then, else_]) => ({
  type: "If",
  test,
  then,
  else: else_,
}));

const tail = (target: Expression) =>
  P.choice([Call, Property])
    .skip(ws)
    .apply(P.many)
    .map(tails => tails.reduce((expr, tail) => tail(expr), target));

const Call = Tuple.map<(callee: Expression) => Expression>(
  ({ elements }) =>
    callee => ({
      type: "Call",
      callee,
      arguments: elements,
    }),
);

const Property = P.el(".")
  .then(ws)
  .then(Ident)
  .map<(target: Expression) => Expression>(({ name }) => target => ({
    type: "Property",
    target,
    name,
  }));
