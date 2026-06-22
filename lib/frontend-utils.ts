export function extractArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is T => item !== null && item !== undefined);
  }

  if (value && typeof value === 'object') {
    const candidate = value as {
      data?: unknown;
      items?: unknown;
      results?: unknown;
    };

    const nested = candidate.data ?? candidate.items ?? candidate.results;
    if (Array.isArray(nested)) {
      return nested.filter((item): item is T => item !== null && item !== undefined);
    }
  }

  return [];
}
