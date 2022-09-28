import { Argv } from 'yargs';
import { RootCommand } from '..';

import { UserService, OktaUserService } from './services/user-service';
import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';

const deleteUser = (
  service: UserService,
  userId: string
): TE.TaskEither<string, unknown> =>
  pipe(
    userId,
    service.getUser,
    TE.chain((maybeUser) =>
      pipe(
        service.validateUserExists(maybeUser, userId),
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
        E.mapLeft((errorArray) => `${errorArray[0]}. Cannot delete user.`),
        TE.fromEither,
        TE.chain((user) =>
          service.isDeactivated(user)
            ? service.deleteUser(userId)
            : TE.left(
                `User [${userId}] has not been deprovisioned. Deprovision before deleting.`
              )
        )
      )
    ),
    // eslint-disable-next-line functional/functional-parameters
    TE.chainFirstIOK((user) => Console.info(`Deleted user [${user.id}].`))
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
    'delete-user [user-id]',
    'Deletes the specified user. Only works if user status is deprovisioned.',
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs.positional('user-id', {
        describe: 'the identifier of the user to delete',
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
      // eslint-disable-next-line functional/no-try-statement

      const client = oktaManageClient({ ...args });
      const service = new OktaUserService(client);

      const result = await deleteUser(service, args.userId)();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
