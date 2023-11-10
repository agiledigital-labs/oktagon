import { Argv } from 'yargs';
import { RootCommand } from '..';
import { OktaUserService, User, UserService } from './services/user-service';
import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { flow, pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
import * as okta from '@okta/okta-sdk-nodejs';
import * as O from 'fp-ts/lib/Option';

/**
 * Expires the password for a user and gets a temporary password for them, only works if user currently has the status: active, staged, provisioned, locked out, recovery, or password expired.
 * @param service - the service to use to expire the password and get a temporary password.
 * @param userId - the id of the user to expire the password and get a temporary password for.
 * @returns a TaskEither that resolves to the user and temporary password.
 */
export const expirePasswordAndGetTemporaryPassword = (
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
              `User [${userId}] does not exist. Can not expire password.`
            ),
          // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
          (user) => TE.right(user)
        )
      )
    ),
    TE.tapIO((user) =>
      Console.info(
        `Prior to password expiration, the user has status: [${user.status}].`
      )
    ),
    TE.chain((user) => priorToPasswordExpirationUserStatusCheck(user)),
    TE.chain((user) => service.expirePasswordAndGetTemporaryPassword(user.id)),
    TE.tapIO(({ user, temporaryPassword }) =>
      Console.info(
        `Expired password for user [${user.id}] [${user.email}]. Temporary password is [${temporaryPassword}].`
      )
    )
  );

const priorToPasswordExpirationUserStatusCheck = (
  user: User
): TE.TaskEither<string, User> => {
  // eslint-disable-next-line sonarjs/no-small-switch, functional/no-conditional-statement
  switch (user.status) {
    case okta.UserStatus.SUSPENDED:
    case okta.UserStatus.DEPROVISIONED: {
      return TE.left(
        `Expiring a password is reserved for users with status: ${okta.UserStatus.ACTIVE}, ${okta.UserStatus.STAGED}, ${okta.UserStatus.PROVISIONED}, ${okta.UserStatus.LOCKED_OUT}, ${okta.UserStatus.RECOVERY}, or ${okta.UserStatus.PASSWORD_EXPIRED}.`
      );
    }
    default: {
      return TE.right(user);
    }
  }
};

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
    'expire-password-and-get-temporary-password [user-id]',
    'expires the password for a user and gets a temporary password for them, only works if user currently has the status: active, staged, provisioned, locked out, recovery, or password expired.',
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
      const result = await expirePasswordAndGetTemporaryPassword(
        service,
        args.userId
      )();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
