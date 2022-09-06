import { UserStatus, User as OktaUser } from '@okta/okta-sdk-nodejs';
import { Argv } from 'yargs';
import { RootCommand } from '..';

import {
  oktaManageClient,
  OktaConfiguration,
  oktaUserAsUser,
  User,
  getUser,
} from './services/user-service';

const deleteUser = async (
  oktaConfiguration: OktaConfiguration,
  userId: string
): Promise<User> => {
  const client = oktaManageClient(oktaConfiguration);

  const maybeOktaUser = await getUser(userId, client);

  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  const performDelete = async (oktaUser: OktaUser) => {
    // eslint-disable-next-line functional/no-expression-statement
    await oktaUser.delete({
      sendEmail: false,
    });

    return oktaUserAsUser(oktaUser);
  };

  // eslint-disable-next-line functional/functional-parameters
  const throwOnNotDeprovisioned = () => {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(
      `User [${userId}] has not been deprovisioned. Deprovision before deleting.`
    );
  };

  // eslint-disable-next-line functional/functional-parameters
  const throwOnMissing = () => {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(`User [${userId}] does not exist. Can not delete.`);
  };

  return maybeOktaUser === undefined
    ? throwOnMissing()
    : maybeOktaUser.status === UserStatus.DEPROVISIONED
    ? performDelete(maybeOktaUser)
    : throwOnNotDeprovisioned();
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
    'delete-user [user-id]',
    'Deletes the specified user. Only works if user status is deprovisioned',
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
      try {
        const user = await deleteUser(
          {
            ...args,
          },
          args.userId
        );
        // eslint-disable-next-line functional/no-expression-statement
        console.info(`Deleted [${user.id}] [${user.email}].`);
      } catch (error: unknown) {
        // eslint-disable-next-line functional/no-throw-statement
        throw error instanceof Error
          ? new Error(
              `Failed to delete user [${args.userId}] in [${args.organisationUrl}].`,
              {
                cause: error,
              }
            )
          : new Error(
              `Failed to delete user [${args.userId}] in [${
                args.organisationUrl
              }] because of [${JSON.stringify(error)}].`
            );
      }
    }
  );
