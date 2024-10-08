# parsea

[![NPM Version][npm-badge]](https://www.npmjs.com/package/parsea)
[![JSR Version][jsr-badge]](https://jsr.io/@uzmoi/parsea)
[![License][license-badge]](https://opensource.org/license/MIT)
[![npm bundle size][bundle-size-badge]](https://bundlephobia.com/package/parsea)
[![Codecov][codecov-badge]](https://app.codecov.io/gh/uzmoi/parsea)

[npm-badge]: https://img.shields.io/npm/v/parsea?style=flat-square
[jsr-badge]: https://img.shields.io/jsr/v/@uzmoi/parsea?style=flat-square
[license-badge]: https://img.shields.io/github/license/uzmoi/parsea?style=flat-square
[bundle-size-badge]: https://img.shields.io/bundlephobia/min/parsea?style=flat-square
[codecov-badge]: https://img.shields.io/codecov/c/gh/uzmoi/parsea?style=flat-square

parsea is a parser combinator library for parsing ArrayLike with TypeScript.

```ts
import * as P from "parsea";

const parser = P.seq([
    P.regex(/-?\d+(\.\d+)?/).map(Number.parseFloat),
    P.regex(/[A-Z]+/i),
]).map(([value, unit]) => ({ value, unit }));

P.parseA(parser, "273.15K"); // => { value: 273.15, unit: "K" }
```

See also [examples/ directory](https://github.com/uzmoi/parsea/tree/main/examples).

Inspired by

- [loquat](https://github.com/susisu/loquat)
- [parsimmon](https://github.com/jneen/parsimmon)
- [parsec](https://github.com/haskell/parsec) (haskell)
