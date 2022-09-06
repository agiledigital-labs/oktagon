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

const deactivateUser = async (
  oktaConfiguration: OktaConfiguration,
  userId: string
): Promise<User> => {
  const client = oktaManageClient(oktaConfiguration);

  const maybeOktaUser = await getUser(userId, client);

  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  const deactivate = async (oktaUser: OktaUser) => {
    // eslint-disable-next-line functional/no-expression-statement
    await oktaUser.deactivate({
      sendEmail: false,
    });

    const deactivatedOktaUser = await client.getUser(userId);

    return oktaUserAsUser(deactivatedOktaUser);
  };

  // eslint-disable-next-line functional/functional-parameters
  const throwOnMissing = () => {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(`User [${userId}] does not exist. Can not de-activate.`);
  };

  return maybeOktaUser === undefined
    ? throwOnMissing()
    : maybeOktaUser.status === UserStatus.DEPROVISIONED
    ? oktaUserAsUser(maybeOktaUser)
    : deactivate(maybeOktaUser);
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
      // eslint-disable-next-line functional/no-try-statement
      try {
        const user = await deactivateUser(
          {
            ...args,
          },
          args.userId
        );
        // eslint-disable-next-line functional/no-expression-statement
        console.info(`De-activated [${user.id}] [${user.email}].`);
      } catch (error: unknown) {
        // eslint-disable-next-line functional/no-throw-statement
        throw error instanceof Error
          ? new Error(
              `Failed to deactivate user [${args.userId}] in [${args.organisationUrl}].`,
              {
                cause: error,
              }
            )
          : new Error(
              `Failed to deactivate user [${args.userId}] in [${
                args.organisationUrl
              }] because of [${JSON.stringify(error)}].`
            );
      }
    }
  );
