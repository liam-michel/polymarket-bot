import { InvalidArgumentError } from 'commander';
import { describe, expect, it } from 'vitest';

import {
  attachErrorContext,
  parseBoolean,
  parseOptionalNotes,
  parsePositiveInteger,
} from '~/cli/parsers.js';

describe('attachErrorContext', () => {
  it('adds context to an error', () => {
    const error = attachErrorContext(new Error('boom'), { signalId: '1' });

    expect(error).toMatchObject({
      context: {
        signalId: '1',
      },
    });
  });
});

describe('parseBoolean', () => {
  it('parses true values case-insensitively', () => {
    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean(' TRUE ')).toBe(true);
  });

  it('parses false values case-insensitively', () => {
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean(' False ')).toBe(false);
  });

  it('throws an InvalidArgumentError for invalid boolean input', () => {
    expect(() => parseBoolean('maybe')).toThrow(InvalidArgumentError);
    expect(() => parseBoolean('maybe')).toThrow(
      'Invalid boolean "maybe": expected "true" or "false"',
    );
  });

  it('attaches context to invalid boolean input', () => {
    try {
      parseBoolean('maybe', { signalId: '1' });
    } catch (error) {
      expect(error).toMatchObject({
        context: {
          signalId: '1',
        },
      });
    }
  });
});

describe('parsePositiveInteger', () => {
  it('returns a trimmed positive integer string', () => {
    expect(parsePositiveInteger(' 42 ', 'Signal ID')).toBe('42');
  });

  it('throws an InvalidArgumentError for non-positive integer input', () => {
    expect(() => parsePositiveInteger('0', 'Signal ID')).toThrow(
      InvalidArgumentError,
    );
    expect(() => parsePositiveInteger('0', 'Signal ID')).toThrow(
      'Signal ID must be a positive integer',
    );
  });
});

describe('parseOptionalNotes', () => {
  it('returns undefined when notes are omitted', () => {
    expect(parseOptionalNotes()).toBeUndefined();
  });

  it('returns trimmed notes when provided', () => {
    expect(parseOptionalNotes('  hello world  ')).toBe('hello world');
  });

  it('throws an InvalidArgumentError for empty notes', () => {
    expect(() => parseOptionalNotes('   ')).toThrow(InvalidArgumentError);
    expect(() => parseOptionalNotes('   ')).toThrow('Notes must not be empty');
  });
});
