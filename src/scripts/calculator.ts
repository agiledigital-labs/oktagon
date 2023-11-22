import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
// eslint-disable-next-line functional/no-let
let currentValue = 0;

// eslint-disable-next-line functional/functional-parameters
const fetchCurrentValue = (): TE.TaskEither<Error, number> =>
  TE.right(currentValue);

const updateCurrentValue = (value: number): TE.TaskEither<Error, number> => {
  // eslint-disable-next-line functional/no-expression-statement
  currentValue = value;
  return TE.right(currentValue);
};

type Operation = '+' | '-' | '*' | '/';
type Command = {
  readonly _tag: Operation;
  readonly value: number;
};

const add = (a: number, b: number): number => a + b;
const substract = (a: number, b: number): number => a - b;
const multiply = (a: number, b: number): number => a * b;
const divide = (a: number, b: number): number => a / b;

/**
 * Checks to see if commands are valid.
 * @param commands - the commands to validate.
 * @returns a TaskEither that resolves to the commands if the commands are valid, otherwise an error message.
 */
const validateCommands = (
  commands: readonly Command[]
): TE.TaskEither<Error, readonly Command[]> =>
  commands.some((command) => command._tag === '/' && command.value === 0)
    ? TE.left(new Error('Cannot divide by 0'))
    : TE.right(commands);

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
  switch (command._tag) {
    case '+': {
      const newValue = add(currentValue, command.value);
      return TE.right({
        newValue,
        log: `${currentValue} + ${command.value} = ${newValue}`,
      });
    }
    case '-': {
      const newValue = substract(currentValue, command.value);
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
  [...commands].reverse().map((command) => ({
    ...command,
    _tag:
      command._tag === '+'
        ? '-'
        : command._tag === '-'
        ? '+'
        : command._tag === '*'
        ? '/'
        : '*',
  }));

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
 * Invokes the commands with the given commandHandler.
 * @param commands - the commands to execute.
 * @param commandHandler - the command handler to use.
 * @returns a TaskEither that resolves to the new value if the commands are valid, otherwise an error message.
 */
export const calculatorInvoker = (
  commands: readonly Command[],
  commandHandler: (commands: readonly Command[]) => TE.TaskEither<Error, number>
): TE.TaskEither<Error, number> =>
  pipe(
    commands,
    validateCommands,
    TE.chain((commands) => commandHandler(commands)),
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => fetchCurrentValue()),
    TE.tapIO((currentValue) =>
      Console.info(`Final value is [${currentValue}].`)
    )
  );

const caller = async (dryRun: boolean, undo: boolean) => {
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

  const result = await calculatorInvoker(
    [
      {
        _tag: '+',
        value: 1,
      },
      {
        _tag: '+',
        value: 5,
      },
      {
        _tag: '+',
        value: 7,
      },
      {
        _tag: '*',
        value: 7,
      },
      {
        _tag: '-',
        value: 7,
      },
      {
        _tag: '/',
        value: 2,
      },
      {
        _tag: '/',
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
caller(false, false).catch((error) => {
  // eslint-disable-next-line functional/no-expression-statement
  console.info(error);
});
