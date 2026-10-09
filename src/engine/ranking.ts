export function l2Normalize(vec: Float32Array | number[]): Float32Array {
  const out = new Float32Array(vec.length);
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += (vec[i] as number) * (vec[i] as number);
  const norm = Math.sqrt(sum);
  if (norm === 0) return out;
  for (let i = 0; i < vec.length; i++) out[i] = (vec[i] as number) / norm;
  return out;
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += (a[i] as number) * (b[i] as number);
  return s;
}

export interface RankedSpecies {
  speciesId: string;
  similarity: number;
}

/**
 * Score an image embedding against a row-major prompt matrix.
 * matrix: rows = total prompts, cols = dims. promptRowSpecies[r] = species index.
 * Returns per-species max similarity, sorted desc, topK kept.
 */
export function rankSpecies(
  imageEmbedding: ArrayLike<number>,
  matrix: Float32Array,
  dims: number,
  speciesIds: string[],
  promptOffsets: number[],
  topK: number,
): RankedSpecies[] {
  const rowCount = promptOffsets.length;
  const perSpecies = new Map<string, number>();
  for (let r = 0; r < rowCount; r++) {
    const offset = (promptOffsets[r] as number) * dims;
    let s = 0;
    for (let d = 0; d < dims; d++) {
      s += (imageEmbedding[d] as number) * (matrix[offset + d] as number);
    }
    const sid = speciesIds[r] as string;
    const prev = perSpecies.get(sid);
    if (prev === undefined || s > prev) perSpecies.set(sid, s);
  }
  return [...perSpecies.entries()]
    .map(([speciesId, similarity]) => ({ speciesId, similarity }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(0, topK));
}
