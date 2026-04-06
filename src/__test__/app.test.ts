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
import { GammaMarketApiClient } from '~/gamma/market/market.js';
import type { Storage } from '~/storage/index.js';

const storage = td.object<Storage>();
const logger = td.object<Logger>();
const gammaApiClient = td.object<GammaMarketApiClient>();

let app: App;
let instruction: AppInstruction<string>;

beforeEach(() => {
  td.reset();
  app = initializeApp({ storage, logger, gammaApiClient });
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
