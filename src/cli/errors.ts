const loggedCommandErrors = new WeakSet<Error>();

export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

export function markCommandErrorLogged(error: Error): Error {
  loggedCommandErrors.add(error);
  return error;
}

export function isCommandErrorLogged(error: unknown): error is Error {
  return error instanceof Error && loggedCommandErrors.has(error);
}
