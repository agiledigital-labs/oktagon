import { Argv } from 'yargs';
import { RootCommand } from '..';
import { OktaUserService, User, UserService } from './services/user-service';
import * as okta from '@okta/okta-sdk-nodejs';
import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { flow, pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
import * as O from 'fp-ts/lib/Option';

/**
 * User that can be activated.
 */
type ActivatableUser = User & {
  readonly status: okta.UserStatus.DEPROVISIONED | okta.UserStatus.STAGED;
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
): TE.TaskEither<string, User> =>
  pipe(
    userId,
    service.getUser,
    TE.chain(
      flow(
        O.fold(
          () => TE.left(`User [${userId}] does not exist. Can not activate.`),
          // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
          (user) => TE.right(user)
        )
      )
    )
  );

/**
 * Checks to see if user has a status of staged or deprovisioned.
 * @param user - the user to check the status of.
 * @returns - a TaskEither that resolves to the user if the user has a status of staged or deprovisioned, otherwise an error message.
 */
const validateUserStatusPriorToActivation = (
  user: User
): TE.TaskEither<string, ActivatableUser> => {
  const userStatus = user.status;
  const activeStatus = okta.UserStatus.ACTIVE;
  const context = `User [${user.id}] [${user.email}] has status [${userStatus}]. Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}.`;

  // eslint-disable-next-line sonarjs/no-small-switch, functional/no-conditional-statement
  switch (userStatus) {
    case okta.UserStatus.ACTIVE: {
      return TE.left(context);
    }
    case okta.UserStatus.PROVISIONED: {
      return TE.left(
        `${context} To transition user to ${activeStatus} status, please follow through with the activation workflow.`
      );
    }

    case okta.UserStatus.LOCKED_OUT: {
      return TE.left(
        `${context} To transition user to ${activeStatus} status, please use the unlock command.`
      );
    }
    case okta.UserStatus.PASSWORD_EXPIRED: {
      return TE.left(
        `${context} To transition user to ${activeStatus} status, please instruct user to login with temporary password and follow the password reset process.`
      );
    }
    case okta.UserStatus.RECOVERY: {
      return TE.left(
        `${context} To transition user to ${activeStatus} status, please follow through with the activation workflow or restart the workflow using the reactivate-user command.`
      );
    }
    case okta.UserStatus.SUSPENDED: {
      return TE.left(
        `${context} To transition user to ${activeStatus} status, please use the unsuspend-user command.`
      );
    }
    // STAGED or DEPROVISIONED user status
    default: {
      return TE.right({
        ...user,
        status: userStatus,
      });
    }
  }
};

/**
 * Prints out what would happen if we were to activate the user.
 * @param user - the user to dry run the activation for.
 * @returns a TaskEither that resolves to the user.
 */
const dryRunActivateUser = (
  user: ActivatableUser
): TE.TaskEither<string, User> => {
  // eslint-disable-next-line functional/no-expression-statement
  console.info(
    `User current status is [${user.status}]. Will attempt to activate [${user.id}] [${user.email}].`
  );
  return TE.right(user);
};

/**
 * Activates the user.
 * @param service - the service to use to activate the user.
 * @param user - the user to activate.
 * @returns a TaskEither that resolves to the activated user.
 */
const activateUser = (
  service: UserService,
  user: ActivatableUser
): TE.TaskEither<string, User> => {
  // eslint-disable-next-line functional/no-expression-statement
  console.info(`User current status is [${user.status}].`);
  return pipe(
    service.activateUser(user.id),
    TE.tapIO((user) => Console.info(`Activated [${user.id}] [${user.email}].`))
  );
};

/**
 * Activates a user, only works if user currently has the status: staged or deprovisioned.
 * @param service - the service to use to activate the user.
 * @param userId - the id of the user to activate.
 * @param dryRun - if true, will not actually activate the user, but will print out what would happen.
 * @returns a TaskEither that resolves to the activated user.
 */
export const activateUserHandler = (
  service: UserService,
  userId: string,
  dryRun: boolean
): TE.TaskEither<string, User> =>
  pipe(
    validateUserExist(service, userId),
    TE.chain((user) => validateUserStatusPriorToActivation(user)),
    TE.chain((user) =>
      dryRun ? dryRunActivateUser(user) : activateUser(service, user)
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
    'activate-user [user-id]',
    'activates the specified user, only works if user currently has the status: staged or deprovisioned.',
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs
        .option('dry-run', {
          type: 'boolean',
          describe:
            'if true, will not activate the user, but will print out the user status.',
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
      const client = oktaManageClient({ ...args });
      const service = new OktaUserService(client);
      const { userId, dryRun } = args;
      const result = await activateUserHandler(service, userId, dryRun)();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
