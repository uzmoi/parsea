export interface ParseState<out T> {
    pos: number;
    val: T;
}

export const initState: ParseState<null> = {
    pos: 0,
    val: null,
};

export const updateState = <T>(
    state: ParseState<unknown>,
    value: T,
    consumeLength: number,
): ParseState<T> => ({
    pos: state.pos + consumeLength,
    val: value,
});
