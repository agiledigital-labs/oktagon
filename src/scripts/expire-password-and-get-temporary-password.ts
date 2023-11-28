import { Argv } from 'yargs';
import { RootCommand } from '..';
import { OktaUserService, User, UserService } from './services/user-service';
import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
import * as okta from '@okta/okta-sdk-nodejs';
import { parseUrlWrapper } from './services/okta-service';

/**
 * User that can have their password expired.
 */
type PasswordExpirableUser = User & {
  readonly status:
    | okta.UserStatus.ACTIVE
    | okta.UserStatus.STAGED
    | okta.UserStatus.PROVISIONED
    | okta.UserStatus.LOCKED_OUT
    | okta.UserStatus.RECOVERY
    | okta.UserStatus.PASSWORD_EXPIRED;
};

/**
 * Checks to see if user exists.
 * @param service - the service to use to get the user.
 * @param userId - the id of the user to get.
 * @returns a TaskEither that resolves to the user if the user exists, otherwise an error message.
 */
const validateUserExist = (
  service: UserService,
  userId: string
): TE.TaskEither<Error, User> =>
  pipe(
    Console.info(`Fetching user with ID [${userId}]...`),
    TE.rightIO,
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => service.getUser(userId)),
    TE.chain(
      TE.fromOption(
        // eslint-disable-next-line functional/functional-parameters
        () =>
          new Error(`User [${userId}] does not exist. Can not expire password.`)
      )
    )
  );

/**
 * Checks to see if user has a status of active, staged, provisioned, locked out, recovery, or password expired.
 * @param user - the user to check the status of.
 * @returns - a TaskEither that resolves to the user if the user has a status of active, staged, provisioned, locked out, recovery, or password expired, otherwise an error message.
 */
const validateUserStatusPriorToPasswordExpiration = (
  user: User
): TE.TaskEither<Error, PasswordExpirableUser> => {
  const userStatus = user.status;

  // eslint-disable-next-line functional/no-conditional-statement
  switch (userStatus) {
    case okta.UserStatus.SUSPENDED:
    case okta.UserStatus.DEPROVISIONED: {
      return TE.left(
        new Error(
          `Expiring a password is reserved for users with status: ${okta.UserStatus.ACTIVE}, ${okta.UserStatus.STAGED}, ${okta.UserStatus.PROVISIONED}, ${okta.UserStatus.LOCKED_OUT}, ${okta.UserStatus.RECOVERY}, or ${okta.UserStatus.PASSWORD_EXPIRED}. User [${user.id}] [${user.email}] has status [${userStatus}].`
        )
      );
    }
    default: {
      return TE.right({
        ...user,
        status: userStatus,
      });
    }
  }
};

/**
 * Prints out what would happen if we were to expire the password of the user.
 * @param user - the user to dry run the password expiration for.
 * @returns a TaskEither that resolves to the user and temporary password.
 */
const dryRunExpirePasswordAndGetTemporaryPassword = (
  user: PasswordExpirableUser
): TE.TaskEither<
  Error,
  { readonly user: User; readonly temporaryPassword: string }
> =>
  pipe(
    Console.info(
      `Will attempt to expire password of user [${user.id}] [${user.email}] with status [${user.status}].`
    ),
    TE.rightIO,
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => TE.right({ user: user, temporaryPassword: '' }))
  );

/**
 * Expires the password for a user and gets a temporary password for them.
 * @param service - the service to use to expire the password and get a temporary password.
 * @param user - the user to expire the password and get a temporary password for.
 * @returns a TaskEither that resolves to the user and temporary password.
 */
const expirePasswordAndGetTemporaryPassword = (
  service: UserService,
  user: PasswordExpirableUser
): TE.TaskEither<
  Error,
  { readonly user: User; readonly temporaryPassword: string }
> =>
  pipe(
    Console.info(
      `Expiring password of user [${user.id}] [${user.email}] with status [${user.status}]...`
    ),
    TE.rightIO,
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => service.expirePasswordAndGetTemporaryPassword(user.id)),
    TE.tapIO(({ user, temporaryPassword }) =>
      Console.info(
        `Expired password for user [${user.id}] [${user.email}]. Temporary password is [${temporaryPassword}].`
      )
    )
  );

/**
 * Expires the password for a user and gets a temporary password for them, only works if user currently has the status: active, staged, provisioned, locked out, recovery, or password expired.
 * @param service - the service to use to expire the password and get a temporary password.
 * @param userId - the id of the user to expire the password and get a temporary password for.
 * @param dryRun - if true, will not expire the password of the user, but will print out what would happen.
 * @returns a TaskEither that resolves to the user and temporary password.
 */
export const expirePasswordAndGetTemporaryPasswordHandler = (
  service: UserService,
  userId: string,
  dryRun: boolean
): TE.TaskEither<
  Error,
  { readonly user: User; readonly temporaryPassword: string }
> =>
  pipe(
    validateUserExist(service, userId),
    TE.chain((user) => validateUserStatusPriorToPasswordExpiration(user)),
    TE.chain((user) =>
      dryRun
        ? dryRunExpirePasswordAndGetTemporaryPassword(user)
        : expirePasswordAndGetTemporaryPassword(service, user)
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
  readonly dryRun: boolean;
}> =>
  rootCommand.command(
    'expire-password-and-get-temporary-password [user-id]',
    'expires the password for a user and gets a temporary password for them, only works if user currently has the status: active, staged, provisioned, locked out, recovery, or password expired.',
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs
        .option('dry-run', {
          type: 'boolean',
          describe:
            'if true, will not expire the password of the user, but will print out the user status.',
          demandOption: false,
          default: false,
        })
        .positional('user-id', {
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
      readonly dryRun: boolean;
    }) => {
      const { organisationUrl, userId, dryRun } = args;
      const result = await parseUrlWrapper(organisationUrl, (url: string) =>
        pipe(
          TE.right(oktaManageClient({ ...args, organisationUrl: url })),
          // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
          TE.chain((client) => TE.right(new OktaUserService(client))),
          // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
          TE.chain((service) =>
            expirePasswordAndGetTemporaryPasswordHandler(
              service,
              userId,
              dryRun
            )
          )
        )
      )();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw result.left;
      }
    }
  );
