import * as TE from 'fp-ts/TaskEither';
import * as Console from 'fp-ts/Console';
import { flow } from 'fp-ts/function';

/**
 * Handles a `TaskEither` instance by logging information to the console in case
 * of success, or throwing an error if the computation fails.
 *
 * @template E The type of the error that the `TaskEither` might contain.
 * @template A The type of the successful result that the `TaskEither` might
 * contain.
 * @param ma The `TaskEither` instance to handle.
 * @returns {void}
 * @throws {E} Throws the error contained in the `TaskEither` if it represents a
 * failure.
 */
// eslint-disable-next-line functional/no-return-void
export const handleTaskEither: <E, A>(ma: TE.TaskEither<E, A>) => void = flow(
  TE.tapIO(Console.info),
  TE.getOrElse((error) => {
    // eslint-disable-next-line functional/no-throw-statement, @typescript-eslint/no-throw-literal
    throw error;
  }),
  (result) => void result()
);
