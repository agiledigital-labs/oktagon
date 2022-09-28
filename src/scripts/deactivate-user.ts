import { Argv } from 'yargs';
import { RootCommand } from '..';

import { OktaUserService, User, UserService } from './services/user-service';
import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';

const deactivateUser = (
  service: UserService,
  userId: string
): TE.TaskEither<string, User> =>
  pipe(
    userId,
    service.getUser,
    TE.chain((maybeUser) =>
      pipe(
        service.validateUserExists(maybeUser, userId),
        E.mapLeft(
          // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
          (errorArray) => `${errorArray[0]}. Cannot deactivate user.`
        ),
        TE.fromEither,
        TE.chain((user) =>
          service.isDeactivated(user)
            ? TE.left(
                `User [${userId}] is already deprovisioned. There is no need to deprovision it.`
              )
            : service.deleteUser(userId)
        )
      )
    ),
    // eslint-disable-next-line functional/functional-parameters
    TE.chainFirstIOK((user) => Console.info(`Deactivated user [${user.id}].`))
  );
export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly organisationUrl: string;
  readonly userId: string;
}> =>
  rootCommand.command(
    'deactivate-user [user-id]',
    'Deactivates the specified user, only works if user has not been deprovisioned.',
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs.positional('user-id', {
        describe: 'a unique identifier for the server',
        type: 'string',
        demandOption: true,
      });
    },
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
      readonly userId: string;
    }) => {
      const client = oktaManageClient({ ...args });
      const service = new OktaUserService(client);

      const result = await deactivateUser(service, args.userId)();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
