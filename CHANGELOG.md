
# Change Log

## [Unreleased]
### Added
- Added alias `do_` for `qo`.
- Added `PerformOptions` type.

### Changed
- Moved option to rollback state if `perform.try` fails to `PerformOptions`.
- Added defaultValue parameter to `perform.try`.

## [0.9.0] - 2024-01-16
### Added
- Added helper `Perform` type to specify source type in `qo` function.

### Changed
- Add source type parameter to `Parser`.
- `Source` type changed to helper that returns the input type of the parser.

## [0.8.0] - 2023-06-24
### Added
- Added `Parser.prototype.apply`
- Added `Parser.prototype.label`
- Added `many`
- Added `manyAccum`
- Added `string`
- Added `graphemeString`
- Added `CODE_POINT`
- Added `ANY_CHAR`
- Added `index` and `errors` properties to FailureParseResult.

### Changed
- Change default for `Parser.prototype.option` to undefined.

### Deprecated
- `Parser.prototype.many`
- `Parser.prototype.manyAccum`

## [0.7.0] - 2023-05-13
### Added
- Added `lookAhead`
- Added `oneOf`
- Added `noneOf`
- Added `Parser.prototype.skip`
- Added `Parser.prototype.then`
- Added `Parser.prototype.andMap`
- Added `ParseResult`
- Added `perform.try` in qo

### Changed
- Renamed `seq` option "`droppable`" to "`allowPartial`".
- Change type of `choice`.
- Change match algorithm from SameValue to SameValueZero in el and literal.
- Added defaultValue parameter in `regex`.
- Change parse result type to `ParseResult`.
- `Parser.prototype.and` now returns the results of both parsers as a tuple. Use "then" or "skip" for the previous use.

### Removed
- `RegExpGroupArray` type
- Removed `isParseaError`. Use `perform.try` instead.

## [0.6.0] - 2023-01-26
### Added
- Added `option` to Parser class.
- Added `return` to Parser class.
- Added `between` to Parser class.

### Changed
- Merged `left` and `right` into `and`.
- Changed return value of `parse`.

### Fixed
- Fixed `regexGroup` not to ignore the start index.
