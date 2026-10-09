/**
 * Deep Look output decoding, isolated from the worker so it is unit-testable
 * without model weights. `generate` returns the full token sequence
 * (prompt + new tokens); the prompt slice must be removed before JSON
 * parsing, and `batch_decode` is synchronous (it returns `string[]`).
 */

export type SliceSpec = number | readonly (number | null)[] | null;

export type SliceableIds = {
  slice: (...slices: SliceSpec[]) => unknown;
};

export function promptTokenLength(inputs: { input_ids?: { dims?: readonly number[] } }): number {
  const len = inputs.input_ids?.dims?.[1];
  return typeof len === "number" ? len : 0;
}

export function decodeGeneratedOutput(
  output: SliceableIds,
  promptLen: number,
  batchDecode: (ids: unknown, opts: { skip_special_tokens: boolean }) => string[],
): string {
  const generated = output.slice(null, [promptLen, null]);
  return batchDecode(generated, { skip_special_tokens: true }).join("");
}
