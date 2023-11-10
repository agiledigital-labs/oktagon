import { Argv } from 'yargs';
import { RootCommand } from '..';

import { OktaUserService, User, UserService } from './services/user-service';
import * as okta from '@okta/okta-sdk-nodejs';

import { oktaManageClient } from './services/client-service';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
import { retrieveUser } from '../common';

/**
 * Activates a user, only works if user currently has the status: staged or deprovisioned.
 * @param service - the service to use to activate the user.
 * @param userId - the id of the user to activate.
 * @returns a TaskEither that resolves to the activated user.
 */
export const activateUser = (
  service: UserService,
  userId: string
): TE.TaskEither<string, User> =>
  pipe(
    retrieveUser(service, userId),
    TE.chainFirstIOK((user) =>
      Console.info(
        `Prior to activation, the user has status: [${user.status}].`
      )
    ),
    TE.chain((user) => priorToActivationkUserStatusCheck(user)),
    TE.chain((user) => service.activateUser(user.id)),
    TE.chainFirstIOK((user) =>
      Console.info(
        `Activated [${user.id}] [${user.email}]. The status of the user is now [${user.status}].`
      )
    )
  );

const priorToActivationkUserStatusCheck = (
  user: User
): TE.TaskEither<string, User> => {
  const activeStatus = okta.UserStatus.ACTIVE;
  // eslint-disable-next-line sonarjs/no-small-switch, functional/no-conditional-statement
  switch (user.status) {
    case okta.UserStatus.ACTIVE: {
      return TE.left(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. User [${user.id}] is already ${okta.UserStatus.ACTIVE}.`
      );
    }
    case okta.UserStatus.PROVISIONED: {
      return TE.left(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ${activeStatus} status, please follow through with the activation workflow.`
      );
    }

    case okta.UserStatus.LOCKED_OUT: {
      return TE.left(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ${activeStatus} status, please use the unlock command.`
      );
    }
    case okta.UserStatus.PASSWORD_EXPIRED: {
      return TE.left(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ${activeStatus} status, please instruct user to login with temporary password and follow the password reset process.`
      );
    }
    case okta.UserStatus.RECOVERY: {
      return TE.left(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ${activeStatus} status, please follow through with the activation workflow or restart the workflow using the reactivate-user command.`
      );
    }
    case okta.UserStatus.SUSPENDED: {
      return TE.left(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ${activeStatus} status, please use the unsuspend-user command.`
      );
    }
    // STAGED or DEPROVISIONED user status
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
    'activate-user [user-id]',
    'activates the specified user, only works if user currently has the status: staged or deprovisioned.',
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
      const userId = args.userId;
      const result = await activateUser(service, userId)();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
