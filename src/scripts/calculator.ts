import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';

// eslint-disable-next-line functional/no-let
let currentValue = 0;
// eslint-disable-next-line functional/no-let
let history: readonly Command[] = [];
// eslint-disable-next-line functional/functional-parameters
const fetchHistory = (): TE.TaskEither<Error, readonly Command[]> =>
  TE.right(history);

const addNewCommand = (
  command: Command
): TE.TaskEither<Error, readonly Command[]> => {
  // eslint-disable-next-line functional/no-expression-statement
  history = [...history, command];
  return TE.right(history);
};
// eslint-disable-next-line functional/functional-parameters
const removeLastCommand = (): TE.TaskEither<Error, readonly Command[]> => {
  // eslint-disable-next-line functional/no-expression-statement
  history = history.slice(0, -1);
  return TE.right(history);
};

// eslint-disable-next-line functional/functional-parameters
const fetchCurrentValue = (): TE.TaskEither<Error, number> =>
  TE.right(currentValue);

const updateCurrentValue = (
  value: number,
  command?: Command | 'undo'
): TE.TaskEither<Error, number> => {
  // eslint-disable-next-line functional/no-expression-statement
  command === undefined
    ? TE.right([])
    : command === 'undo'
    ? removeLastCommand()
    : addNewCommand(command);
  // eslint-disable-next-line functional/no-expression-statement
  currentValue = value;
  return TE.right(currentValue);
};

type Instruction = {
  readonly operation: '+' | '-' | '*' | '/';
  readonly undoOperation: '+' | '-' | '*' | '/';
  readonly value: number;
};

type Command = Instruction & {
  readonly execute: (a: number, b: number) => number;
  readonly undo: (a: number, b: number) => number;
};

const add = (a: number, b: number): number => a + b;
const subtract = (a: number, b: number): number => a - b;
const multiply = (a: number, b: number): number => a * b;
const divide = (a: number, b: number): number => a / b;

/**
 * Plans the commands based on the instructions.
 * @param instructions - the instructions to plan.
 * @returns a TaskEither that resolves to the commands if the instructions are valid, otherwise an error message.
 */
const planCommands = (
  instructions: readonly Instruction[]
  // eslint-disable-next-line sonarjs/cognitive-complexity
): TE.TaskEither<Error, readonly Command[]> => {
  const errors: readonly Error[] = instructions
    .map((instruction, index) =>
      !(
        (instruction.operation === '+' && instruction.undoOperation === '-') ||
        (instruction.operation === '-' && instruction.undoOperation === '+') ||
        (instruction.operation === '*' && instruction.undoOperation === '/') ||
        (instruction.operation === '/' && instruction.undoOperation === '*')
      )
        ? new Error(
            `Invalid instruction at index [${index}]. The operation [${instruction.operation}] cannot be undone with the operation [${instruction.undoOperation}].`
          )
        : instruction.operation === '/' && instruction.value === 0
        ? new Error('Cannot divide by 0')
        : undefined
    )
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    .filter((maybeError): maybeError is Error => maybeError !== undefined);

  // eslint-disable-next-line functional/no-conditional-statement
  if (errors.length > 0) {
    return TE.left(new Error(errors.join(' ')));
  }

  return TE.right(
    instructions.map((instruction) => {
      // eslint-disable-next-line functional/no-conditional-statement
      switch (instruction.operation) {
        case '+': {
          return {
            ...instruction,
            execute: add,
            undo: subtract,
          };
        }
        case '-': {
          return {
            ...instruction,
            execute: subtract,
            undo: add,
          };
        }
        case '*': {
          return {
            ...instruction,
            execute: multiply,
            undo: divide,
          };
        }
        case '/': {
          return {
            ...instruction,
            execute: divide,
            undo: multiply,
          };
        }
      }
    })
  );
};

/**
 * Calculates the new value based on the current value and the command.
 * @param currentValue - the current value.
 * @param command - the command to execute.
 * @returns a TaskEither that resolves to the new value and a log message if the command is valid, otherwise an error message.
 */
const calculate = (
  currentValue: number,
  command: Command
): TE.TaskEither<
  Error,
  { readonly newValue: number; readonly log: string }
> => {
  return TE.right({
    newValue: command.execute(currentValue, command.value),
    log: `${currentValue} ${command.operation} ${
      command.value
    } = ${command.execute(currentValue, command.value)}`,
  });
};

/**
 * Calculates the undone value based on the current value and the command.
 * @param currentValue - the current value.
 * @param command - the command to undo.
 * @returns a TaskEither that resolves to the new value and a log message if the command is valid, otherwise an error message.
 */
const undoCalculate = (
  currentValue: number,
  command: Command
): TE.TaskEither<
  Error,
  { readonly newValue: number; readonly log: string }
> => {
  return TE.right({
    newValue: command.undo(currentValue, command.value),
    log: `${currentValue} ${command.undoOperation} ${
      command.value
    } = ${command.undo(currentValue, command.value)}`,
  });
};

/**
 * Prints out what would happen if the command was executed.
 * @param currentValue - the current value.
 * @param command - the command to dry run.
 * @returns a TaskEither that resolves to the new value if the command is valid, otherwise an error message.
 */
const dryRun = (
  currentValue: number,
  command: Command
): TE.TaskEither<Error, number> =>
  pipe(
    calculate(currentValue, command),
    TE.tapIO(({ log }) => Console.info(log)),
    TE.chain(({ newValue }) => TE.right(newValue))
  );

/**
 * Prints out what would happen if the commands were executed.
 * @param commands - the commands to dry run.
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
const reportDryRun = (
  commands: readonly Command[]
): TE.TaskEither<Error, number> =>
  pipe(
    fetchCurrentValue(),
    TE.tapIO((currentValue) =>
      Console.info(`Current value is [${currentValue}].`)
    ),
    TE.chain((currentValue) => {
      return commands.reduce((acc: TE.TaskEither<Error, number>, command) => {
        return pipe(
          acc,
          TE.chain((acc) => dryRun(acc, command))
        );
      }, TE.right(currentValue));
    }),
    TE.tapIO((finalValue) => Console.info(`New value will be [${finalValue}].`))
  );

/**
 * Executes the command.
 * @param command - the command to execute.
 * @returns a TaskEither that resolves to the new value if the command is valid, otherwise an error message.
 */
const executeCommand = (command: Command): TE.TaskEither<Error, number> =>
  pipe(
    fetchCurrentValue(),
    TE.chain((currentValue) => calculate(currentValue, command)),
    TE.tapIO(({ log }) => Console.info(log)),
    TE.chain(({ newValue }) => updateCurrentValue(newValue, command))
  );

/**
 * Execute the commands.
 * @param commands - the commands to execute.
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
const executeCommands = (
  commands: readonly Command[]
): TE.TaskEither<Error, number> =>
  pipe(
    fetchCurrentValue(),
    TE.tapIO((currentValue) =>
      Console.info(`Current value is [${currentValue}].`)
    ),
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => TE.traverseSeqArray(executeCommand)(commands)),
    TE.chain((values) => {
      const finalValue = values[values.length - 1];
      return finalValue === undefined
        ? TE.left(new Error('Received undefined value.'))
        : TE.right(finalValue);
    })
  );

/**
 * Gets the latest command.
 * @param commandHistory - the command history
 * @returns the latest command
 */
const getLatestCommand = (
  commandHistory: readonly Command[]
): TE.TaskEither<Error, Command> => {
  const latestCommand = [...commandHistory].reverse()[0];
  return latestCommand === undefined
    ? TE.left(new Error('No commands to undo.'))
    : TE.right(latestCommand);
};

/**
 * Gets the current value and the latest command.
 * @param command - the command to undo
 * @returns a TaskEither that resolves to the current value and the command to undo, otherwise an error message.
 */
const thenGetCurrentValue = (
  command: Command
): TE.TaskEither<
  Error,
  { readonly currentValue: number; readonly command: Command }
> =>
  pipe(
    fetchCurrentValue(),
    TE.chain((currentValue) => {
      return TE.right({
        currentValue,
        command,
      });
    })
  );

/**
 * Undoes the last command.
 * @param updateValue - whether to update the current value
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
const undoLastCommand = (dryRun: boolean): TE.TaskEither<Error, number> =>
  pipe(
    fetchHistory(),
    TE.chain((commands) => getLatestCommand(commands)),
    TE.chain((command) => thenGetCurrentValue(command)),
    TE.chain(({ currentValue, command }) =>
      undoCalculate(currentValue, command)
    ),
    TE.tapIO(({ log }) => Console.info(log)),
    TE.chain(({ newValue }) =>
      dryRun ? TE.right(newValue) : updateCurrentValue(newValue, 'undo')
    )
  );

/**
 * Handles a list of commands.
 * @param commands - the commands to run
 * @param dryRun - whether to dry run the commands
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
export const commandHandler = (
  commands: readonly Command[],
  dryRun: boolean
): TE.TaskEither<Error, number> =>
  pipe(
    Console.info(
      dryRun ? 'Executing commands in dry run mode...' : 'Executing commands...'
    ),
    TE.rightIO,
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() =>
      dryRun ? reportDryRun(commands) : executeCommands(commands)
    ),
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => fetchCurrentValue()),
    TE.tapIO((currentValue) =>
      Console.info(`Final value is [${currentValue}].`)
    )
  );

/**
 * Undoes the last command
 * @param dryRun - whether to dry run the undo commands
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
export const undoReceiver = (dryRun: boolean): TE.TaskEither<Error, number> =>
  pipe(
    Console.info(
      dryRun
        ? 'Undoing latest command in dry run mode...'
        : 'Undoing latest command...'
    ),
    TE.rightIO,
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => undoLastCommand(dryRun)),
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => fetchCurrentValue()),
    TE.tapIO((currentValue) =>
      Console.info(`Final value is [${currentValue}].`)
    )
  );

const caller = async (currentValue?: number) => {
  // eslint-disable-next-line functional/no-try-statement
  try {
    // eslint-disable-next-line functional/no-expression-statement
    currentValue === undefined ? undefined : updateCurrentValue(currentValue);

    const result = await pipe(
      [
        {
          operation: '+',
          undoOperation: '-',
          value: 1,
        },
        {
          operation: '+',
          undoOperation: '-',
          value: 5,
        },
        {
          operation: '+',
          undoOperation: '-',
          value: 7,
        },
        {
          operation: '*',
          undoOperation: '/',
          value: 7,
        },
        {
          operation: '-',
          undoOperation: '+',
          value: 7,
        },
        {
          operation: '/',
          undoOperation: '*',
          value: 2,
        },
        {
          operation: '/',
          undoOperation: '*',
          value: 4,
        },
      ],
      planCommands,
      TE.chain((commands) => commandHandler(commands, false))
    )();
    // eslint-disable-next-line functional/no-conditional-statement
    if (E.isLeft(result)) {
      // eslint-disable-next-line functional/no-throw-statement
      throw result.left;
    }

    // eslint-disable-next-line functional/no-expression-statement
    console.info('\n');
    const undoResult1 = await undoReceiver(false)();
    // eslint-disable-next-line functional/no-conditional-statement
    if (E.isLeft(undoResult1)) {
      // eslint-disable-next-line functional/no-throw-statement
      throw undoResult1.left;
    }

    // eslint-disable-next-line functional/no-expression-statement
    console.info('\n');
    const undoResult2 = await undoReceiver(false)();
    // eslint-disable-next-line functional/no-conditional-statement
    if (E.isLeft(undoResult2)) {
      // eslint-disable-next-line functional/no-throw-statement
      throw undoResult2.left;
    }

    // eslint-disable-next-line functional/no-expression-statement
    console.info('\n');
    const undoResult3 = await undoReceiver(false)();
    // eslint-disable-next-line functional/no-conditional-statement
    if (E.isLeft(undoResult3)) {
      // eslint-disable-next-line functional/no-throw-statement
      throw undoResult3.left;
    }
  } catch (error: unknown) {
    // eslint-disable-next-line functional/no-expression-statement
    console.info(error);
  }
};
// eslint-disable-next-line functional/no-expression-statement, functional/no-return-void
caller(12.25).catch((error) => {
  // eslint-disable-next-line functional/no-expression-statement
  console.info(error);
});
