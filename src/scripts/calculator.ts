import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';

// eslint-disable-next-line functional/no-let
let currentValue = 0;
// eslint-disable-next-line functional/no-let
let history: readonly ConcreteCommand[] = [];
// eslint-disable-next-line functional/functional-parameters
const fetchCommandHistory = (): TE.TaskEither<
  Error,
  readonly ConcreteCommand[]
> => TE.right(history);

const addNewCommandToCommandHistory = (
  command: ConcreteCommand
): TE.TaskEither<Error, readonly ConcreteCommand[]> => {
  // eslint-disable-next-line functional/no-expression-statement
  history = [...history, command];
  return TE.right(history);
};
// eslint-disable-next-line functional/functional-parameters
const removeLastCommandFromCommandHistory = (): TE.TaskEither<
  Error,
  readonly ConcreteCommand[]
> => {
  // eslint-disable-next-line functional/no-expression-statement
  history = history.slice(0, -1);
  return TE.right(history);
};

// eslint-disable-next-line functional/functional-parameters
const fetchCurrentValue = (): TE.TaskEither<Error, number> =>
  TE.right(currentValue);

const updateCurrentValue = (
  value: number,
  command?: ConcreteCommand | 'undo'
): TE.TaskEither<Error, number> => {
  // eslint-disable-next-line functional/no-expression-statement
  command === undefined
    ? TE.right([])
    : command === 'undo'
    ? removeLastCommandFromCommandHistory()
    : addNewCommandToCommandHistory(command);
  // eslint-disable-next-line functional/no-expression-statement
  currentValue = value;
  return TE.right(currentValue);
};
type Instruction = {
  readonly operation: '+' | '-' | '*' | '/';
  readonly value: number;
};

type Command = {
  readonly execute: (a: number, b: number) => TE.TaskEither<Error, number>;
  readonly undo: (a: number, b: number) => TE.TaskEither<Error, number>;
};
type AdditionCommand = {
  readonly operation: '+';
  readonly undoOperation: '-';
  readonly value: number;
} & Command;
type SubtractionCommand = {
  readonly operation: '-';
  readonly undoOperation: '+';
  readonly value: number;
} & Command;
type MultiplicationCommand = {
  readonly operation: '*';
  readonly undoOperation: '/';
  readonly value: number;
} & Command;
type DivisionCommand = {
  readonly operation: '/';
  readonly undoOperation: '*';
  readonly value: number;
} & Command;

type ConcreteCommand =
  | AdditionCommand
  | SubtractionCommand
  | MultiplicationCommand
  | DivisionCommand;

const add = (a: number, b: number): TE.TaskEither<Error, number> =>
  TE.right(a + b);
const subtract = (a: number, b: number): TE.TaskEither<Error, number> =>
  TE.right(a - b);
const multiply = (a: number, b: number): TE.TaskEither<Error, number> =>
  TE.right(a * b);
const divide = (a: number, b: number): TE.TaskEither<Error, number> =>
  b === 0 ? TE.left(new Error('Cannot divide by 0.')) : TE.right(a / b);

/**
 * Plans the commands based on the instructions.
 * @param instructions - the instructions to plan.
 * @returns a TaskEither that resolves to the commands if the instructions are valid, otherwise an error message.
 */
const planCommands = (
  instructions: readonly Instruction[]
  // eslint-disable-next-line sonarjs/cognitive-complexity
): TE.TaskEither<Error, readonly ConcreteCommand[]> =>
  TE.right(
    instructions.map((instruction) => {
      // eslint-disable-next-line functional/no-conditional-statement
      switch (instruction.operation) {
        case '+': {
          return {
            operation: instruction.operation,
            undoOperation: '-',
            value: instruction.value,
            execute: add,
            undo: subtract,
          };
        }
        case '-': {
          return {
            operation: instruction.operation,
            undoOperation: '+',
            value: instruction.value,
            execute: subtract,
            undo: add,
          };
        }
        case '*': {
          return {
            operation: instruction.operation,
            undoOperation: '/',
            value: instruction.value,
            execute: multiply,
            undo: divide,
          };
        }
        case '/': {
          return {
            operation: instruction.operation,
            undoOperation: '*',
            value: instruction.value,
            execute: divide,
            undo: multiply,
          };
        }
      }
    })
  );

/**
 * Calculates the new value based on the current value and the command.
 * @param currentValue - the current value.
 * @param command - the command to execute.
 * @returns a TaskEither that resolves to the new value and a log message if the command is valid, otherwise an error message.
 */
const calculate = (
  currentValue: number,
  command: ConcreteCommand
): TE.TaskEither<Error, { readonly newValue: number; readonly log: string }> =>
  pipe(
    command.execute(currentValue, command.value),
    TE.map((newValue) => ({
      newValue,
      log: `${currentValue} ${command.operation} ${command.value} = ${newValue}`,
    }))
  );

/**
 * Calculates the undone value based on the current value and the command.
 * @param currentValue - the current value.
 * @param command - the command to undo.
 * @returns a TaskEither that resolves to the new value and a log message if the command is valid, otherwise an error message.
 */
const undoCalculate = (
  currentValue: number,
  command: ConcreteCommand
): TE.TaskEither<Error, { readonly newValue: number; readonly log: string }> =>
  pipe(
    command.undo(currentValue, command.value),
    TE.map((newValue) => ({
      newValue,
      log: `${currentValue} ${command.undoOperation} ${command.value} = ${newValue}`,
    }))
  );

/**
 * Prints out what would happen if the command was executed.
 * @param currentValue - the current value.
 * @param command - the command to dry run.
 * @returns a TaskEither that resolves to the new value if the command is valid, otherwise an error message.
 */
const dryRun = (
  currentValue: number,
  command: ConcreteCommand
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
  commands: readonly ConcreteCommand[]
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
    TE.tapIO((newValue) => Console.info(`New value will be [${newValue}].`))
  );

/**
 * Executes the command.
 * @param command - the command to execute.
 * @returns a TaskEither that resolves to the new value if the command is valid, otherwise an error message.
 */
const executeCommand = (
  command: ConcreteCommand
): TE.TaskEither<Error, number> =>
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
  commands: readonly ConcreteCommand[]
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
  commandHistory: readonly ConcreteCommand[]
): TE.TaskEither<Error, ConcreteCommand> => {
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
  command: ConcreteCommand
): TE.TaskEither<
  Error,
  { readonly currentValue: number; readonly command: ConcreteCommand }
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
    fetchCommandHistory(),
    TE.chain((commands) => getLatestCommand(commands)),
    TE.chain((command) => thenGetCurrentValue(command)),
    TE.tapIO(({ currentValue }) =>
      Console.info(`Current value is [${currentValue}].`)
    ),
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
  commands: readonly ConcreteCommand[],
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
 * Handles undoing of most recent command.
 * @param dryRun - whether to dry run the undo commands
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
export const undoHandler = (dryRun: boolean): TE.TaskEither<Error, number> =>
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
          value: 1,
        },
        {
          operation: '+',
          value: 5,
        },
        {
          operation: '+',
          value: 7,
        },
        {
          operation: '*',
          value: 7,
        },
        {
          operation: '-',
          value: 7,
        },
        {
          operation: '/',
          value: 2,
        },
        {
          operation: '/',
          value: 4,
        },
      ],
      planCommands,
      TE.chain((commands) => commandHandler(commands, true))
    )();
    // eslint-disable-next-line functional/no-conditional-statement
    if (E.isLeft(result)) {
      // eslint-disable-next-line functional/no-throw-statement
      throw result.left;
    }

    // eslint-disable-next-line functional/no-expression-statement
    console.info('\n');
    const undoLastCommand = await undoHandler(false)();
    // eslint-disable-next-line functional/no-conditional-statement
    if (E.isLeft(undoLastCommand)) {
      // eslint-disable-next-line functional/no-throw-statement
      throw undoLastCommand.left;
    }

    // eslint-disable-next-line functional/no-expression-statement
    console.info('\n');
    const undoResult2 = await undoHandler(false)();
    // eslint-disable-next-line functional/no-conditional-statement
    if (E.isLeft(undoResult2)) {
      // eslint-disable-next-line functional/no-throw-statement
      throw undoResult2.left;
    }

    // eslint-disable-next-line functional/no-expression-statement
    console.info('\n');
    const undoResult3 = await undoHandler(false)();
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
