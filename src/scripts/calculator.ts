import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
// eslint-disable-next-line functional/no-let
let currentValue = 10.5;

// eslint-disable-next-line functional/functional-parameters
const fetchCurrentValue = (): TE.TaskEither<Error, number> =>
  TE.right(currentValue);

const updateCurrentValue = (value: number): TE.TaskEither<Error, number> => {
  // eslint-disable-next-line functional/no-expression-statement
  currentValue = value;
  return TE.right(currentValue);
};

type AdditionCommand = {
  readonly operation: '+';
  readonly undoOperation: '-';
  readonly value: number;
};
type SubtractionCommand = {
  readonly operation: '-';
  readonly undoOperation: '+';
  readonly value: number;
};
type MultiplicationCommand = {
  readonly operation: '*';
  readonly undoOperation: '/';
  readonly value: number;
};
type DivisionCommand = {
  readonly operation: '/';
  readonly undoOperation: '*';
  readonly value: number;
};
type Instruction = {
  readonly operation: '+' | '-' | '*' | '/';
  readonly value: number;
};
type Command =
  | AdditionCommand
  | SubtractionCommand
  | MultiplicationCommand
  | DivisionCommand;

const add = (a: number, b: number): number => a + b;
const subtract = (a: number, b: number): number => a - b;
const multiply = (a: number, b: number): number => a * b;
const divide = (a: number, b: number): number => a / b;

/**
 * Checks to see if commands are valid.
 * @param commands - the commands to validate.
 * @returns a TaskEither that resolves to the commands if the commands are valid, otherwise an error message.
 */
const planCommands = (
  instructions: readonly Instruction[]
): TE.TaskEither<Error, readonly Command[]> => {
  // eslint-disable-next-line functional/no-conditional-statement
  if (
    instructions.some(
      (instruction) => instruction.operation === '/' && instruction.value === 0
    )
  ) {
    return TE.left(new Error('Cannot divide by 0'));
  }
  return TE.right(
    instructions.map((instruction) => {
      // eslint-disable-next-line functional/no-conditional-statement
      switch (instruction.operation) {
        case '+': {
          return {
            operation: instruction.operation,
            undoOperation: '-',
            value: instruction.value,
          };
        }
        case '-': {
          return {
            operation: instruction.operation,
            undoOperation: '+',
            value: instruction.value,
          };
        }
        case '*': {
          return {
            operation: instruction.operation,
            undoOperation: '/',
            value: instruction.value,
          };
        }
        case '/': {
          return {
            operation: instruction.operation,
            undoOperation: '*',
            value: instruction.value,
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
  // eslint-disable-next-line functional/no-conditional-statement
  switch (command.operation) {
    case '+': {
      const newValue = add(currentValue, command.value);
      return TE.right({
        newValue,
        log: `${currentValue} + ${command.value} = ${newValue}`,
      });
    }
    case '-': {
      const newValue = subtract(currentValue, command.value);
      return TE.right({
        newValue,
        log: `${currentValue} - ${command.value} = ${newValue}`,
      });
    }
    case '*': {
      const newValue = multiply(currentValue, command.value);
      return TE.right({
        newValue,
        log: `${currentValue} * ${command.value} = ${newValue}`,
      });
    }
    case '/': {
      const newValue = divide(currentValue, command.value);
      return TE.right({
        newValue,
        log: `${currentValue} / ${command.value} = ${newValue}`,
      });
    }
  }
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
    TE.chain(({ newValue }) => updateCurrentValue(newValue))
  );

/**
 * Executes the commands.
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
 * Given a list of commands, returns the list of commands that would undo the original commands.
 * @param commands - the commands to undo.
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
const getUndoCommands = (commands: readonly Command[]): readonly Command[] =>
  [...commands].reverse().map((command) => {
    // eslint-disable-next-line functional/no-conditional-statement
    switch (command.operation) {
      case '+': {
        return {
          ...command,
          operation: command.undoOperation,
          undoOperation: command.operation,
        };
      }
      // eslint-disable-next-line sonarjs/no-duplicated-branches
      case '-': {
        return {
          ...command,
          operation: command.undoOperation,
          undoOperation: command.operation,
        };
      }
      // eslint-disable-next-line sonarjs/no-duplicated-branches
      case '*': {
        return {
          ...command,
          operation: command.undoOperation,
          undoOperation: command.operation,
        };
      }
      // eslint-disable-next-line sonarjs/no-duplicated-branches
      case '/': {
        return {
          ...command,
          operation: command.undoOperation,
          undoOperation: command.operation,
        };
      }
    }
  });

/**
 * Undo the commands.
 * @param commands - the commands to undo.
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
const undoCommands = (
  commands: readonly Command[]
): TE.TaskEither<Error, number> => executeCommands(getUndoCommands(commands));

/**
 * Prints out what would happen if the commands were undone.
 * @param commands - the commands to undo.
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
const reportUndoDryRun = (
  commands: readonly Command[]
): TE.TaskEither<Error, number> => reportDryRun(getUndoCommands(commands));

/**
 * Receives a list of commands and executes them.
 * @param commands - the commands to execute.
 * @param commandHandler - the command handler to use.
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
export const commandReceiver = (
  instructions: readonly Instruction[],
  commandHandler: (commands: readonly Command[]) => TE.TaskEither<Error, number>
): TE.TaskEither<Error, number> =>
  pipe(
    instructions,
    planCommands,
    TE.chain((commands) => commandHandler(commands)),
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => fetchCurrentValue()),
    TE.tapIO((currentValue) =>
      Console.info(`Final value is [${currentValue}].`)
    )
  );

const caller = async (currentValue: number, dryRun: boolean, undo: boolean) => {
  // eslint-disable-next-line functional/no-expression-statement
  updateCurrentValue(currentValue);
  const commandHandler: (
    commands: readonly Command[]
  ) => TE.TaskEither<Error, number> =
    dryRun && undo
      ? reportUndoDryRun
      : dryRun
      ? reportDryRun
      : undo
      ? undoCommands
      : executeCommands;

  const result = await commandReceiver(
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
    commandHandler
  )();

  // eslint-disable-next-line functional/no-conditional-statement
  if (E.isLeft(result)) {
    // eslint-disable-next-line functional/no-throw-statement
    throw result.left;
  }
};
// eslint-disable-next-line functional/no-expression-statement, functional/no-return-void
caller(12.25, false, false).catch((error) => {
  // eslint-disable-next-line functional/no-expression-statement
  console.info(error);
});
