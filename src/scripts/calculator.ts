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
type Instruction = {
  readonly _tag: Operation;
  readonly value: number;
};

type AdditionCommand = Instruction & {
  readonly _tag: '+';
};

type SubstractionCommand = Instruction & {
  readonly _tag: '-';
};
type MultiplicationCommand = Instruction & {
  readonly _tag: '*';
};

type DivideCommand = Instruction & {
  readonly _tag: '/';
};

/**
 * Command to execute.
 */
type Command =
  | AdditionCommand
  | SubstractionCommand
  | MultiplicationCommand
  | DivideCommand;

const add = (a: number, b: number): number => a + b;
const substract = (a: number, b: number): number => a - b;
const multiply = (a: number, b: number): number => a * b;
const divide = (a: number, b: number): number => a / b;

const planCommand = (
  instructions: readonly Instruction[]
): TE.TaskEither<Error, readonly Command[]> => {
  const divideBy0Error = instructions.some(
    (instruction) => instruction._tag === '/' && instruction.value === 0
  );
  // eslint-disable-next-line functional/no-conditional-statement
  if (divideBy0Error) {
    return TE.left(new Error('Cannot divide by 0'));
  }
  return TE.right(instructions);
};

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

const dryRun = (
  currentValue: number,
  command: Command
): TE.TaskEither<Error, number> =>
  pipe(
    calculate(currentValue, command),
    TE.tapIO(({ log }) => Console.info(log)),
    TE.chain(({ newValue }) => TE.right(newValue))
  );

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

const executeCommand = (command: Command): TE.TaskEither<Error, number> =>
  pipe(
    fetchCurrentValue(),
    TE.chain((currentValue) => calculate(currentValue, command)),
    TE.tapIO(({ log }) => Console.info(log)),
    TE.chain(({ newValue }) => updateCurrentValue(newValue))
  );

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

export const calculatorInvoker = (
  instructions: readonly Instruction[],
  dryRun: boolean
): TE.TaskEither<Error, number> =>
  pipe(
    instructions,
    planCommand,
    TE.chain((commands) =>
      dryRun ? reportDryRun(commands) : executeCommands(commands)
    ),
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => fetchCurrentValue()),
    TE.tapIO((currentValue) =>
      Console.info(`Final value is [${currentValue}].`)
    )
  );

const caller = async (dryRun: boolean) => {
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
    dryRun
  )();
  // eslint-disable-next-line functional/no-conditional-statement
  if (E.isLeft(result)) {
    // eslint-disable-next-line functional/no-throw-statement
    throw result.left;
  }
};
// eslint-disable-next-line functional/no-expression-statement, functional/no-return-void
caller(false).catch((error) => {
  // eslint-disable-next-line functional/no-expression-statement
  console.info(error);
});
