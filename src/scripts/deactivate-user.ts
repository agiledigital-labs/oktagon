import { Argv } from 'yargs';
import { RootCommand } from '..';

import {
  oktaManageClient,
  OktaConfiguration,
  user,
  User,
} from './services/user-service';

const deactivateUser = async (
  oktaConfiguration: OktaConfiguration,
  userId: string
): Promise<User> => {
  const client = oktaManageClient(oktaConfiguration);

  const oktaUser = await client.getUser(userId);

  // eslint-disable-next-line functional/no-expression-statement
  await oktaUser.deactivate();

  const decativatedOktaUser = await client.getUser(userId);

  return user(decativatedOktaUser);
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
    'Deactivates the specified user',
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
        console.info(user);
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
