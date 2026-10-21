const TRANSIENT_DATABASE_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ENETDOWN', 'ENETUNREACH',
  '57P01', '57P02', '57P03', '53300',
]);

export const getDatabaseErrorCode = (error: unknown, seen = new Set<unknown>()): string | undefined => {
  if (!error || typeof error !== 'object' || seen.has(error)) return undefined;
  seen.add(error);
  const candidate = error as { code?: unknown; cause?: unknown; errors?: unknown[] };
  if (typeof candidate.code === 'string') return candidate.code;
  const causeCode = getDatabaseErrorCode(candidate.cause, seen);
  if (causeCode) return causeCode;
  for (const nested of candidate.errors ?? []) {
    const nestedCode = getDatabaseErrorCode(nested, seen);
    if (nestedCode) return nestedCode;
  }
  return undefined;
};

export const isTransientDatabaseError = (error: unknown) => {
  const code = getDatabaseErrorCode(error);
  return Boolean(code && (TRANSIENT_DATABASE_CODES.has(code) || code.startsWith('08')));
};

/** Retry only side-effect-free reads whose first connection failed transiently. */
export const retryTransientDatabaseRead = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientDatabaseError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 150));
    return operation();
  }
};
