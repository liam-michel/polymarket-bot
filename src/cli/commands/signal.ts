import { createCommand, createOption, InvalidArgumentError } from 'commander';
import { Decimal } from 'decimal.js';
import { z } from 'zod';

import { App, instruction } from '~/app.js';
import { markCommandErrorLogged, normalizeError } from '~/cli/errors.js';
import { Models } from '~/storage/models.js';
import type { CreateSignalInput, ListSignalsInput } from '~/storage/signal.js';

const SIGNAL_PRICE_SCALE = 6;
const SIGNAL_PRICE_MAX = new Decimal('9999.999999');
const SIGNAL_CONFIDENCE_SCALE = 4;

type Signal = Models['Signal'];

type SignalCreateCommandInput = {
  wallet: Signal['wallet'];
  condition_id: Signal['condition_id'];
  signal_type: string;
  side: string;
  outcome_index: Signal['outcome_index'];
  price: string;
  confidence: string;
  dry_run: boolean;
  notes?: string;
};

type SignalListCommandInput = {
  wallet?: Signal['wallet'];
  condition_id?: Signal['condition_id'];
  signal_type?: string;
  executed?: boolean;
};

type SignalCreateOptions = {
  type: string;
  dryRun: boolean;
  notes?: string;
};

type SignalListOptions = {
  wallet?: string;
  market?: string;
  type?: string;
  executed?: boolean;
};

type MarkSignalExecutedOptions = {
  notes?: string;
};

const trimmedRequiredString = (message: string) =>
  z.string().trim().min(1, message);

const SIGNAL_CREATE_INPUT = z.object({
  wallet: trimmedRequiredString('Wallet address is required'),
  condition_id: trimmedRequiredString('Condition ID is required'),
  signal_type: Models.Signal.shape.signal_type,
  side: Models.Signal.shape.side,
  outcome_index: Models.Signal.shape.outcome_index,
  price: trimmedRequiredString('Price is required'),
  confidence: trimmedRequiredString('Confidence is required'),
  dry_run: z.boolean(),
  notes: trimmedRequiredString('Notes must not be empty').optional(),
});

const SIGNAL_LIST_INPUT = z.object({
  wallet: trimmedRequiredString('Wallet address is required').optional(),
  condition_id: trimmedRequiredString('Condition ID is required').optional(),
  signal_type: Models.Signal.shape.signal_type.optional(),
  executed: z.boolean().optional(),
});

const SIGNAL_ID_INPUT = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, 'Signal ID must be a positive integer');

function parseBoolean(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue !== 'true' && normalizedValue !== 'false') {
    throw new InvalidArgumentError(
      `Invalid boolean "${value}": expected "true" or "false"`,
    );
  }

  return normalizedValue === 'true';
}

function parseOutcomeIndex(value: string): Signal['outcome_index'] {
  const outcomeIndex = Number(value.trim());

  if (
    !Number.isInteger(outcomeIndex) ||
    (outcomeIndex !== 0 && outcomeIndex !== 1)
  ) {
    throw new InvalidArgumentError(
      `Invalid outcome index "${value}": outcome index must be 0 or 1`,
    );
  }

  return outcomeIndex;
}

function parseSignalPrice(value: string): string {
  let price: Decimal;
  const normalizedValue = value.trim();

  try {
    price = new Decimal(normalizedValue);
  } catch {
    throw new InvalidArgumentError(`Invalid price "${value}"`);
  }

  if (!price.isFinite()) {
    throw new InvalidArgumentError(
      `Invalid price "${value}": price must be a finite decimal number`,
    );
  }

  if (price.isNegative()) {
    throw new InvalidArgumentError(
      `Invalid price "${value}": price must be greater than or equal to 0`,
    );
  }

  if (price.decimalPlaces() > SIGNAL_PRICE_SCALE) {
    throw new InvalidArgumentError(
      `Invalid price "${value}": price must have no more than ${SIGNAL_PRICE_SCALE} decimal places`,
    );
  }

  if (price.greaterThan(SIGNAL_PRICE_MAX)) {
    throw new InvalidArgumentError(
      `Invalid price "${value}": price must fit within DECIMAL(10,6)`,
    );
  }

  return price.toString();
}

function parseSignalConfidence(value: string): string {
  let confidence: Decimal;
  const normalizedValue = value.trim();

  try {
    confidence = new Decimal(normalizedValue);
  } catch {
    throw new InvalidArgumentError(`Invalid confidence "${value}"`);
  }

  if (!confidence.isFinite()) {
    throw new InvalidArgumentError(
      `Invalid confidence "${value}": confidence must be a finite decimal number`,
    );
  }

  if (confidence.isNegative() || confidence.greaterThan(1)) {
    throw new InvalidArgumentError(
      `Invalid confidence "${value}": confidence must be between 0 and 1`,
    );
  }

  if (confidence.decimalPlaces() > SIGNAL_CONFIDENCE_SCALE) {
    throw new InvalidArgumentError(
      `Invalid confidence "${value}": confidence must have no more than ${SIGNAL_CONFIDENCE_SCALE} decimal places`,
    );
  }

  return confidence.toString();
}

function parseSignalId(value: string): string {
  const result = SIGNAL_ID_INPUT.safeParse(value);

  if (!result.success) {
    throw new InvalidArgumentError(
      result.error.issues[0]?.message ?? 'Signal ID is required',
    );
  }

  return result.data;
}

function parseOptionalNotes(value?: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const notes = value.trim();

  if (notes.length === 0) {
    throw new InvalidArgumentError('Notes must not be empty');
  }

  return notes;
}

function logAndRethrowCommandError(
  app: App,
  message: string,
  error: unknown,
  context: Record<string, unknown>,
): never {
  const normalizedError = markCommandErrorLogged(normalizeError(error));

  app.logger.error(
    {
      ...context,
      error: normalizedError,
    },
    message,
  );

  throw normalizedError;
}

function parseSignalCreateInput(
  input: SignalCreateCommandInput,
): CreateSignalInput {
  const result = SIGNAL_CREATE_INPUT.safeParse(input);

  if (!result.success) {
    throw new InvalidArgumentError(
      result.error.issues[0]?.message ?? 'Invalid input',
    );
  }

  return {
    wallet: result.data.wallet,
    condition_id: result.data.condition_id,
    signal_type: result.data.signal_type,
    side: result.data.side,
    outcome_index: result.data.outcome_index,
    price: parseSignalPrice(result.data.price),
    confidence: parseSignalConfidence(result.data.confidence),
    dry_run: result.data.dry_run,
    notes: result.data.notes,
  };
}

function parseSignalListInput(input: SignalListCommandInput): ListSignalsInput {
  const result = SIGNAL_LIST_INPUT.safeParse(input);

  if (!result.success) {
    throw new InvalidArgumentError(
      result.error.issues[0]?.message ?? 'Invalid input',
    );
  }

  return result.data;
}

const createSignal = (app: App) =>
  createCommand('create')
    .description('Create a signal manually')
    .argument('<wallet>', 'Wallet address that produced the signal')
    .argument('<conditionId>', 'Market condition ID')
    .argument('<side>', 'Signal side (BUY or SELL)')
    .argument('<outcomeIndex>', 'Outcome index (0 or 1)')
    .argument('<price>', 'Signal price as a decimal value')
    .argument('<confidence>', 'Signal confidence as a decimal value')
    .addOption(
      createOption('--type <signalType>', 'Signal type').default('MANUAL'),
    )
    .addOption(
      createOption(
        '--dry-run <boolean>',
        'Whether the signal should remain a dry run',
      )
        .default(true)
        .argParser(parseBoolean),
    )
    .addOption(createOption('--notes <notes>', 'Optional notes for the signal'))
    .action(
      async (
        wallet: string,
        conditionId: string,
        side: string,
        outcomeIndex: string,
        price: string,
        confidence: string,
        opts: SignalCreateOptions,
      ) => {
        try {
          const input = parseSignalCreateInput({
            wallet,
            condition_id: conditionId,
            signal_type: opts.type,
            side,
            outcome_index: parseOutcomeIndex(outcomeIndex),
            price,
            confidence,
            dry_run: opts.dryRun,
            notes: opts.notes,
          });

          const result = await app
            .execute(({ storage }) =>
              instruction(() => storage.signal.createSignal(input)),
            )
            .once();

          app.logger.info({ result }, 'Signal created successfully');
        } catch (error) {
          logAndRethrowCommandError(app, 'Failed to create signal', error, {
            wallet,
            conditionId,
          });
        }
      },
    );

const listSignals = (app: App) =>
  createCommand('list')
    .description('List signals')
    .addOption(createOption('--wallet <wallet>', 'Filter by wallet address'))
    .addOption(
      createOption('--market <conditionId>', 'Filter by market condition ID'),
    )
    .addOption(createOption('--type <signalType>', 'Filter by signal type'))
    .addOption(
      createOption(
        '--executed <boolean>',
        'Filter by execution status',
      ).argParser(parseBoolean),
    )
    .action(async (opts: SignalListOptions) => {
      try {
        const input = parseSignalListInput({
          wallet: opts.wallet,
          condition_id: opts.market,
          signal_type: opts.type,
          executed: opts.executed,
        });

        const result = await app
          .execute(({ storage }) =>
            instruction(() => storage.signal.listSignals(input)),
          )
          .once();

        app.logger.info({ result }, 'Signals listed successfully');
      } catch (error) {
        logAndRethrowCommandError(app, 'Failed to list signals', error, {
          wallet: opts.wallet,
          conditionId: opts.market,
          signalType: opts.type,
          executed: opts.executed,
        });
      }
    });

const getSignal = (app: App) =>
  createCommand('get')
    .description('Get a signal by ID')
    .argument('<id>', 'Signal ID')
    .action(async (id: string) => {
      try {
        const signalId = parseSignalId(id);

        const result = await app
          .execute(({ storage }) =>
            instruction(() => storage.signal.getSignalById(signalId)),
          )
          .once();

        if (!result) {
          throw new Error(`Signal with ID "${signalId}" was not found`);
        }

        app.logger.info({ result }, 'Signal fetched successfully');
      } catch (error) {
        logAndRethrowCommandError(app, 'Failed to get signal', error, {
          signalId: id,
        });
      }
    });

const markSignalExecuted = (app: App) =>
  createCommand('mark-executed')
    .description('Mark a signal as executed')
    .argument('<id>', 'Signal ID')
    .addOption(createOption('--notes <notes>', 'Optional execution notes'))
    .action(async (id: string, opts: MarkSignalExecutedOptions) => {
      let notes: string | undefined;

      try {
        const signalId = parseSignalId(id);
        notes = parseOptionalNotes(opts.notes);

        const result = await app
          .execute(({ storage }) =>
            instruction(() =>
              storage.signal.markSignalExecuted(signalId, notes),
            ),
          )
          .once();

        if (!result) {
          throw new Error(`Signal with ID "${signalId}" was not found`);
        }

        app.logger.info({ result }, 'Signal marked executed successfully');
      } catch (error) {
        logAndRethrowCommandError(
          app,
          'Failed to mark signal executed',
          error,
          {
            signalId: id,
            notes,
          },
        );
      }
    });

export const signal = (app: App) => {
  const parentCommand = createCommand('signal').description(
    'Commands for managing signals',
  );

  parentCommand.addCommand(createSignal(app));
  parentCommand.addCommand(listSignals(app));
  parentCommand.addCommand(getSignal(app));
  parentCommand.addCommand(markSignalExecuted(app));

  return parentCommand;
};
