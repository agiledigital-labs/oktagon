import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';

// eslint-disable-next-line functional/no-let
let currentValue = 0;
// eslint-disable-next-line functional/no-let
let history: readonly Command[] = [];
// eslint-disable-next-line functional/functional-parameters
const fetchStack = (): TE.TaskEither<Error, readonly Command[]> =>
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
  command?: Command,
  undo = false
): TE.TaskEither<Error, number> => {
  // eslint-disable-next-line functional/no-expression-statement
  command === undefined
    ? TE.right([])
    : undo
    ? removeLastCommand()
    : addNewCommand(command);
  // eslint-disable-next-line functional/no-expression-statement
  currentValue = value;
  return TE.right(currentValue);
};

type Instruction = {
  readonly operation: '+' | '-' | '*' | '/';
  readonly value: number;
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
    TE.chain(({ newValue }) => updateCurrentValue(newValue, command))
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
 * Undoes the command.
 * @param command
 * @returns
 */
const undoCommand = (command: Command): TE.TaskEither<Error, number> =>
  pipe(
    fetchCurrentValue(),
    TE.chain((currentValue) => calculate(currentValue, command)),
    TE.tapIO(({ log }) => Console.info(log)),
    TE.chain(({ newValue }) => updateCurrentValue(newValue, command, true))
  );

/**
 * Undoes the last command.
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
// eslint-disable-next-line functional/functional-parameters
const undoLastCommand = (): TE.TaskEither<Error, number> =>
  pipe(
    fetchStack(),
    TE.chain((commands) => TE.right(getUndoCommands(commands))),
    TE.chain((commands) =>
      commands[0] === undefined
        ? TE.left(new Error('No commands to undo.'))
        : undoCommand(commands[0])
    )
  );

/**
 * Prints out what would happen if the last command was undone.
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
// eslint-disable-next-line functional/functional-parameters
const reportUndoDryRun = (): TE.TaskEither<Error, number> =>
  pipe(
    fetchStack(),
    TE.chain((commands) => TE.right(getUndoCommands(commands))),
    TE.chain((commands) =>
      reportDryRun(commands[0] === undefined ? [] : [commands[0]])
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
    TE.chain(() => (dryRun ? reportUndoDryRun() : undoLastCommand())),
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

    // // eslint-disable-next-line functional/no-expression-statement
    // console.info('\n');
    // const undoResult2 = await undoReceiver(true)();
    // // eslint-disable-next-line functional/no-conditional-statement
    // if (E.isLeft(undoResult2)) {
    //   // eslint-disable-next-line functional/no-throw-statement
    //   throw undoResult2.left;
    // }

    // // eslint-disable-next-line functional/no-expression-statement
    // console.info('\n');
    // const undoResult3 = await undoReceiver(false)();
    // // eslint-disable-next-line functional/no-conditional-statement
    // if (E.isLeft(undoResult3)) {
    //   // eslint-disable-next-line functional/no-throw-statement
    //   throw undoResult3.left;
    // }
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
