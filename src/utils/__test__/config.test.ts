import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { readConfig } from '~/utils/config.js';

describe('readConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return config when all required env vars are present', () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test';

    const config = readConfig();

    expect(config).toEqual({
      DATABASE_URL: 'postgres://localhost:5432/test',
    });
  });

  it('should throw when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;

    expect(() => readConfig()).toThrow();
  });

  it('should throw with a meaningful error message when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;

    expect(() => readConfig()).toThrow(Error);
  });
});
