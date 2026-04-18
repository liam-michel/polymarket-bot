import { InvalidArgumentError } from 'commander';

export type ErrorContext = Record<string, unknown>;

function hasErrorContext(context?: ErrorContext): context is ErrorContext {
  return context !== undefined && Object.keys(context).length > 0;
}

export function attachErrorContext<T extends Error>(
  error: T,
  context?: ErrorContext,
): T & { context?: ErrorContext } {
  if (hasErrorContext(context)) {
    Object.assign(error, { context });
  }

  return error as T & { context?: ErrorContext };
}

export function createInvalidArgumentError(
  message: string,
  context?: ErrorContext,
): InvalidArgumentError {
  return attachErrorContext(new InvalidArgumentError(message), context);
}

export function parseBoolean(value: string, context?: ErrorContext): boolean {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue !== 'true' && normalizedValue !== 'false') {
    throw createInvalidArgumentError(
      `Invalid boolean "${value}": expected "true" or "false"`,
      context,
    );
  }

  return normalizedValue === 'true';
}

export function parsePositiveInteger(
  value: string,
  label: string,
  context?: ErrorContext,
): string {
  const normalizedValue = value.trim();

  if (!/^[1-9]\d*$/.test(normalizedValue)) {
    throw createInvalidArgumentError(
      `${label} must be a positive integer`,
      context,
    );
  }

  return normalizedValue;
}

export function parseOptionalNotes(
  value?: string,
  context?: ErrorContext,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const notes = value.trim();

  if (notes.length === 0) {
    throw createInvalidArgumentError('Notes must not be empty', context);
  }

  return notes;
}
