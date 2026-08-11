import { isArrayLike } from "emnorst";
import type { ParseError } from "./error";

export interface Config {
  readonly [key: string]: unknown;
}

export class Context<out T = unknown> {
  constructor(
    readonly src: ArrayLike<T>,
    readonly cfg: Config,
  ) {
    if (!isArrayLike(src)) {
      throw new TypeError("source is not ArrayLike.");
    }
  }
  private errorIndex = -1;
  private errors: ParseError[] = [];
  addError(index: number, error?: ParseError): void {
    if (index > this.errorIndex) {
      this.errorIndex = index;
      this.errors = [];
    }
    if (error && index === this.errorIndex) {
      this.errors.push(error);
    }
  }
  // @internal
  group(): [number, number] {
    return [this.errorIndex, this.errors.length];
  }
  // @internal
  length([startErrorIndex, startErrorLength]: [number, number]): number {
    return (
      this.errors.length -
      (startErrorIndex !== this.errorIndex ? 0 : startErrorLength)
    );
  }
  makeError(): { index: number; errors: ParseError[] } {
    const errors = [];
    for (const error of this.errors) {
      if (error.type === "Label") {
        const labelStart = errors.length - labelLength(errors, error.length);
        errors.splice(labelStart);
      }
      errors.push(error);
    }
    return { index: this.errorIndex, errors };
  }
}

const labelLength = (errors: readonly ParseError[], length: number): number => {
  let accum = 0;
  let count = 0;
  for (const error of errors.slice().reverse()) {
    accum += error.type === "Label" ? error.length - 1 : 1;
    count++;
    if (accum >= length) break;
  }
  return count;
};
