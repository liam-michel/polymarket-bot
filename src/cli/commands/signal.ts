import { createCommand, createOption } from 'commander';
import { Decimal } from 'decimal.js';
import { z } from 'zod';

import { App, instruction } from '~/app.js';
import {
  attachErrorContext,
  createInvalidArgumentError,
  type ErrorContext,
  parseBoolean,
  parseOptionalNotes,
  parsePositiveInteger,
} from '~/cli/parsers.js';
import { Models } from '~/storage/models.js';
import type { CreateSignalInput, ListSignalsInput } from '~/storage/signal.js';

const SIGNAL_PRICE_SCALE = 6;
const SIGNAL_PRICE_MAX = new Decimal('9999.999999');
const SIGNAL_CONFIDENCE_SCALE = 4;

type Signal = Models['Signal'];

type SignalCreateOptions = {
  type: string;
  dryRun: string;
  notes?: string;
};

type SignalListOptions = {
  wallet?: string;
  market?: string;
  type?: string;
  executed?: string;
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

type SignalCreateCommandInput = z.infer<typeof SIGNAL_CREATE_INPUT>;
type SignalListCommandInput = z.infer<typeof SIGNAL_LIST_INPUT>;

function parseOutcomeIndex(
  value: string,
  context?: ErrorContext,
): Signal['outcome_index'] {
  const outcomeIndex = Number(value.trim());

  if (
    !Number.isInteger(outcomeIndex) ||
    (outcomeIndex !== 0 && outcomeIndex !== 1)
  ) {
    throw createInvalidArgumentError(
      `Invalid outcome index "${value}": outcome index must be 0 or 1`,
      context,
    );
  }

  return outcomeIndex;
}

function parseSignalPrice(value: string, context?: ErrorContext): string {
  let price: Decimal;
  const normalizedValue = value.trim();

  try {
    price = new Decimal(normalizedValue);
  } catch {
    throw createInvalidArgumentError(`Invalid price "${value}"`, context);
  }

  if (!price.isFinite()) {
    throw createInvalidArgumentError(
      `Invalid price "${value}": price must be a finite decimal number`,
      context,
    );
  }

  if (price.isNegative()) {
    throw createInvalidArgumentError(
      `Invalid price "${value}": price must be greater than or equal to 0`,
      context,
    );
  }

  if (price.decimalPlaces() > SIGNAL_PRICE_SCALE) {
    throw createInvalidArgumentError(
      `Invalid price "${value}": price must have no more than ${SIGNAL_PRICE_SCALE} decimal places`,
      context,
    );
  }

  if (price.greaterThan(SIGNAL_PRICE_MAX)) {
    throw createInvalidArgumentError(
      `Invalid price "${value}": price must fit within DECIMAL(10,6)`,
      context,
    );
  }

  return price.toString();
}

function parseSignalConfidence(value: string, context?: ErrorContext): string {
  let confidence: Decimal;
  const normalizedValue = value.trim();

  try {
    confidence = new Decimal(normalizedValue);
  } catch {
    throw createInvalidArgumentError(`Invalid confidence "${value}"`, context);
  }

  if (!confidence.isFinite()) {
    throw createInvalidArgumentError(
      `Invalid confidence "${value}": confidence must be a finite decimal number`,
      context,
    );
  }

  if (confidence.isNegative() || confidence.greaterThan(1)) {
    throw createInvalidArgumentError(
      `Invalid confidence "${value}": confidence must be between 0 and 1`,
      context,
    );
  }

  if (confidence.decimalPlaces() > SIGNAL_CONFIDENCE_SCALE) {
    throw createInvalidArgumentError(
      `Invalid confidence "${value}": confidence must have no more than ${SIGNAL_CONFIDENCE_SCALE} decimal places`,
      context,
    );
  }

  return confidence.toString();
}

function parseSignalCreateInput(
  input: unknown,
  context?: ErrorContext,
): CreateSignalInput {
  const result = SIGNAL_CREATE_INPUT.safeParse(input);

  if (!result.success) {
    throw createInvalidArgumentError(
      result.error.issues[0]?.message ?? 'Invalid input',
      context,
    );
  }

  const parsedInput: SignalCreateCommandInput = result.data;

  return {
    wallet: parsedInput.wallet,
    condition_id: parsedInput.condition_id,
    signal_type: parsedInput.signal_type,
    side: parsedInput.side,
    outcome_index: parsedInput.outcome_index,
    price: parseSignalPrice(parsedInput.price, context),
    confidence: parseSignalConfidence(parsedInput.confidence, context),
    dry_run: parsedInput.dry_run,
    notes: parsedInput.notes,
  };
}

function parseSignalListInput(
  input: unknown,
  context?: ErrorContext,
): ListSignalsInput {
  const result = SIGNAL_LIST_INPUT.safeParse(input);

  if (!result.success) {
    throw createInvalidArgumentError(
      result.error.issues[0]?.message ?? 'Invalid input',
      context,
    );
  }

  const parsedInput: SignalListCommandInput = result.data;

  return parsedInput;
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
      ).default('true'),
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
        const context = {
          wallet,
          conditionId,
          side,
          outcomeIndex,
          price,
          confidence,
          signalType: opts.type,
          dryRun: opts.dryRun,
          notes: opts.notes,
        };

        const result = await app
          .execute(({ storage }) =>
            instruction(async () => {
              const input = parseSignalCreateInput(
                {
                  wallet,
                  condition_id: conditionId,
                  signal_type: opts.type,
                  side,
                  outcome_index: parseOutcomeIndex(outcomeIndex, context),
                  price,
                  confidence,
                  dry_run: parseBoolean(opts.dryRun, context),
                  notes: opts.notes,
                },
                context,
              );

              return await storage.signal.createSignal(input);
            }),
          )
          .once();

        app.logger.info({ result }, 'Signal created successfully');
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
      createOption('--executed <boolean>', 'Filter by execution status'),
    )
    .action(async (opts: SignalListOptions) => {
      const context = {
        wallet: opts.wallet,
        conditionId: opts.market,
        signalType: opts.type,
        executed: opts.executed,
      };

      const result = await app
        .execute(({ storage }) =>
          instruction(async () => {
            const input = parseSignalListInput(
              {
                wallet: opts.wallet,
                condition_id: opts.market,
                signal_type: opts.type,
                executed:
                  opts.executed === undefined
                    ? undefined
                    : parseBoolean(opts.executed, context),
              },
              context,
            );

            return await storage.signal.listSignals(input);
          }),
        )
        .once();

      app.logger.info({ result }, 'Signals listed successfully');
    });

const getSignal = (app: App) =>
  createCommand('get')
    .description('Get a signal by ID')
    .argument('<id>', 'Signal ID')
    .action(async (id: string) => {
      const result = await app
        .execute(({ storage }) =>
          instruction(async () => {
            const parseContext = { signalId: id };
            const signalId = parsePositiveInteger(
              id,
              'Signal ID',
              parseContext,
            );
            const result = await storage.signal.getSignalById(signalId);

            if (!result) {
              throw attachErrorContext(
                new Error(`Signal with ID "${signalId}" was not found`),
                { signalId },
              );
            }

            return result;
          }),
        )
        .once();

      app.logger.info({ result }, 'Signal fetched successfully');
    });

const markSignalExecuted = (app: App) =>
  createCommand('mark-executed')
    .description('Mark a signal as executed')
    .argument('<id>', 'Signal ID')
    .addOption(createOption('--notes <notes>', 'Optional execution notes'))
    .action(async (id: string, opts: MarkSignalExecutedOptions) => {
      const result = await app
        .execute(({ storage }) =>
          instruction(async () => {
            const parseContext = {
              signalId: id,
              notes: opts.notes,
            };
            const signalId = parsePositiveInteger(
              id,
              'Signal ID',
              parseContext,
            );
            const notes = parseOptionalNotes(opts.notes, parseContext);
            const result = await storage.signal.markSignalExecuted(
              signalId,
              notes,
            );

            if (!result) {
              throw attachErrorContext(
                new Error(`Signal with ID "${signalId}" was not found`),
                {
                  signalId,
                  notes,
                },
              );
            }

            return result;
          }),
        )
        .once();

      app.logger.info({ result }, 'Signal marked executed successfully');
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
