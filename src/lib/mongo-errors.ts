export function isMongoDuplicateKeyError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return "code" in error && (error as Error & { code?: number }).code === 11000;
}
