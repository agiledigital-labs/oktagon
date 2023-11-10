import { User, UserService } from './scripts/services/user-service';
import * as TE from 'fp-ts/lib/TaskEither';
import { flow, pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';

/**
 * Retrieves a user's details from Okta
 * @param service - the service to use to retrieve the user.
 * @param userId - the id of the user to retrieve.
 * @returns a TaskEither that resolves to the user.
 */
export const retrieveUser = (
  service: UserService,
  userId: string
): TE.TaskEither<string, User> =>
  pipe(
    userId,
    service.getUser,
    TE.chain(
      flow(
        O.fold(
          () => TE.left(`User [${userId}] does not exist.`),
          // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
          (user) => TE.right(user)
        )
      )
    )
  );
