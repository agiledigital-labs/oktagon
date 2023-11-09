import { Argv } from 'yargs';
import { RootCommand } from '..';

import { OktaUserService, User, UserService } from './services/user-service';
import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { flow, pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';

const getTemporaryUserPassword = (
  service: UserService,
  userId: string
): TE.TaskEither<
  string,
  {
    readonly user: User;
    readonly temporaryPassword: string;
  }
> =>
  pipe(
    userId,
    service.getUser,
    TE.chain(
      flow(
        O.fold(
          () =>
            TE.left(
              `User [${userId}] does not exist. Cannot get temporary user password.`
            ),
          // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
          () => service.getTemporaryUserPassword(userId)
        )
      )
    ),
    TE.chainFirstIOK(({ user, temporaryPassword }) =>
      Console.info(
        `Retrieved temporary password for user [${user.id}] [${user.email}]. Temporary password is [${temporaryPassword}].`
      )
    )
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
    'get-temporary-user-password [user-id]',
    'gets a temporary password for a user, only works if user currently has the status: staged, provisioned, or password expired.',
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

      const result = await getTemporaryUserPassword(service, args.userId)();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
