/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

// @ts-check

/** @type {import("@jest/types").Config.InitialOptions} */
export default {
    injectGlobals: false,
    coverageDirectory: "coverage",
    coverageProvider: "v8",
    transform: { "\\.ts$": "@swc/jest" },
    moduleNameMapper: { "^parsea": "<rootDir>/src" },
};
