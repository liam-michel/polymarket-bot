import type { Logger } from 'pino';
import * as td from 'testdouble';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  App,
  AppInstruction,
  initializeApp,
  instruction as instructionFactory,
} from '~/app.js';
import { DataApiClient } from '~/data-api/index.js';
import { GammaMarketApiClient } from '~/gamma/market/index.js';
import { createServices, createTransactionRunner } from '~/services/index.js';
import type { Storage } from '~/storage/index.js';

const storage = td.object<Storage>();
const logger = td.object<Logger>();
const gammaApiClient = td.object<GammaMarketApiClient>();
const dataApiClient = td.object<DataApiClient>();

let app: App;
let instruction: AppInstruction<string>;

beforeEach(() => {
  td.reset();
  const services = createServices({
    repo: storage,
    gammaApiClient,
    dataApiClient,
  });
  const withTransaction = createTransactionRunner({
    storage,
    gammaApiClient,
    dataApiClient,
  });
  app = initializeApp({
    storage,
    logger,
    gammaApiClient,
    dataApiClient,
    services,
    withTransaction,
  });
  instruction = td.function<AppInstruction<string>>();
});

describe('execute:once', () => {
  it('should execute the instruction once', async () => {
    let executionCount = 0;
    td.when(instruction(td.matchers.anything(), td.matchers.anything())).thenDo(
      () => {
        executionCount++;
        return instructionFactory(() => Promise.resolve('test'));
      },
    );

    const result = await app.execute(instruction).once();

    expect(result).toBe('test');
    expect(executionCount).toBe(1);
  });

  it('should log errors when the instruction throws', async () => {
    td.when(instruction(td.matchers.anything(), td.matchers.anything())).thenDo(
      () => instructionFactory(() => Promise.reject(new Error('test error'))),
    );

    await expect(app.execute(instruction).once()).rejects.toThrow('test error');

    td.verify(
      logger.error(td.matchers.anything(), 'Error executing instruction'),
    );
  });

  it('should include contextual error fields in logs when present', async () => {
    const contextualError = Object.assign(new Error('test error'), {
      context: {
        signalId: '1',
      },
    });

    td.when(instruction(td.matchers.anything(), td.matchers.anything())).thenDo(
      () => instructionFactory(() => Promise.reject(contextualError)),
    );

    await expect(app.execute(instruction).once()).rejects.toThrow('test error');

    td.verify(
      logger.error(
        td.matchers.contains({ signalId: '1' }),
        'Error executing instruction',
      ),
    );
  });
});

describe('execute:times', () => {
  it('should execute the instruction the specified number of times', async () => {
    td.when(
      instruction(td.matchers.anything(), td.matchers.anything()),
    ).thenReturn(
      instructionFactory(() => Promise.resolve('test1')),
      instructionFactory(() => Promise.resolve('test2')),
      instructionFactory(() => Promise.resolve('test3')),
    );

    const result = await app.execute(instruction).times(3);

    expect(result).toEqual(['test1', 'test2', 'test3']);
  });

  it('should log errors when an execution fails', async () => {
    td.when(
      instruction(td.matchers.anything(), td.matchers.anything()),
    ).thenReturn(
      instructionFactory(() => Promise.resolve('test1')),
      instructionFactory(() => Promise.reject(new Error('test error'))),
    );

    await expect(app.execute(instruction).times(2)).rejects.toThrow(
      'test error',
    );

    td.verify(
      logger.error(td.matchers.anything(), 'Error executing instruction'),
    );
  });
});

describe('execute:every', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute repeatedly at the specified interval', async () => {
    let executionCount = 0;
    td.when(instruction(td.matchers.anything(), td.matchers.anything())).thenDo(
      () => {
        executionCount++;
        return instructionFactory(() => Promise.resolve('test'));
      },
    );

    const cancel = app.execute(instruction).every(1000);

    expect(executionCount).toBe(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(executionCount).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(executionCount).toBe(2);

    cancel();
  });

  it('should stop when cancel is called', async () => {
    let executionCount = 0;
    td.when(instruction(td.matchers.anything(), td.matchers.anything())).thenDo(
      () => {
        executionCount++;
        return instructionFactory(() => Promise.resolve('test'));
      },
    );

    const cancel = app.execute(instruction).every(1000);

    await vi.advanceTimersByTimeAsync(1000);
    expect(executionCount).toBe(1);

    cancel();

    await vi.advanceTimersByTimeAsync(5000);
    expect(executionCount).toBe(1);
  });

  it('should log errors but continue scheduling when instruction throws', async () => {
    let executionCount = 0;
    td.when(instruction(td.matchers.anything(), td.matchers.anything())).thenDo(
      () => {
        executionCount++;
        if (executionCount === 1) {
          return instructionFactory(() =>
            Promise.reject(new Error('test error')),
          );
        }
        return instructionFactory(() => Promise.resolve('test'));
      },
    );

    const cancel = app.execute(instruction).every(1000);

    await vi.advanceTimersByTimeAsync(1000);
    expect(executionCount).toBe(1);
    td.verify(logger.error(td.matchers.anything(), td.matchers.anything()));

    await vi.advanceTimersByTimeAsync(1000);
    expect(executionCount).toBe(2);

    cancel();
  });
});

describe('cleanup', () => {
  it('should not throw if there are no instructions to cleanup', async () => {
    await app.cleanup();
  });
});
