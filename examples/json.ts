import type { JsonValue } from "emnorst";
import { EOI, type Parser, choice, el, lazy, literal, many, qo, regex } from "parsea";

const sepBy = <T>(parser: Parser<T, string>, sep: Parser<unknown, string>) =>
    qo<T[], string>(perform => {
        const head = perform(parser);
        const rest = perform(sep.then(parser).apply(many));
        return [head, ...rest];
    });

// https://www.json.org/

const ws = regex(/[ \n\r\t]*/);

const jsonValue: Parser<JsonValue, string> = lazy(() =>
    choice([
        object,
        array,
        string,
        number,
        literal("true").return(true),
        literal("false").return(false),
        literal("null").return(null),
    ]).between(ws),
);

const escapeTable = {
    b: "\b",
    f: "\f",
    n: "\n",
    r: "\r",
    t: "\t",
};

const string = regex(/(?:\\(?:["\\/bfnrt]|u[0-9A-Fa-f]{4})|[^"\\])*/)
    .between(el('"'))
    .map(escapedString =>
        escapedString.replace(/\\(u[0-9A-Fa-f]{4}|.)/g, (_, escape: string) => {
            if (escape[0] === "u") {
                return String.fromCharCode(parseInt(escape.slice(1), 16));
            }
            if (escape in escapeTable) {
                return escapeTable[escape as keyof typeof escapeTable];
            }
            return escape;
        }),
    );

const number = regex(/-?(0|[1-9]\d*)(.\d+)?([Ee][-+]?\d+)?/).map(Number);

const empty = ws.map<[]>(() => []);

const array = jsonValue.apply(sepBy, el(",")).or(empty).between(el("["), el("]"));

const keyValue = string.between(ws).skip(el(":")).and(jsonValue);

const object = keyValue
    .apply(sepBy, el(","))
    .or(empty)
    .between(el("{"), el("}"))
    .map<Record<string, JsonValue>>(Object.fromEntries);

export const jsonParser = jsonValue.skip(EOI);
