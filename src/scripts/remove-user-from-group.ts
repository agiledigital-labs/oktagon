import { Argv } from 'yargs';
import { RootCommand } from '..';
import { Response } from 'node-fetch';

import { getUser } from './services/user-service';
import { getGroup } from './services/group-service';
import { oktaManageClient, OktaConfiguration } from './services/client-service';

// There is no suitable way to check and confirm that a user exists/does not exist within a particular group outside of
// searching for them in a large array of users. So to preserve a timewise nature. it is best to just let commands work
// even if it didn't do anything.

const removeUserfromGroup = async (
  oktaConfiguration: OktaConfiguration,
  user: string,
  group: string
): Promise<Response> => {
  const client = oktaManageClient(oktaConfiguration, ['groups', 'users']);

  const maybeOktaUser = await getUser(user, client);
  const maybeOktaGroup = await getGroup(group, client);

  // eslint-disable-next-line functional/functional-parameters
  const throwOnMissingUser = () => {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(
      `User [${user}] does not exist. Can not remove from an existing group.`
    );
  };

  // eslint-disable-next-line functional/functional-parameters
  const throwOnMissingGroup = () => {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(
      `Group [${group}] does not exist. Can not remove a user from a non-existent group.`
    );
  };

  return maybeOktaUser === undefined
    ? throwOnMissingUser()
    : maybeOktaGroup === undefined
    ? throwOnMissingGroup()
    : maybeOktaGroup.removeUser(maybeOktaUser.id);
};

export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly organisationUrl: string;
  readonly user: string;
  readonly group: string;
}> =>
  rootCommand.command(
    'remove-user-from-group [user] [group]',
    'Removes an existing user from an existing group. Will perform the operation even if the user already does not exist in the group.',
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs
        .option('user-id', {
          type: 'string',
          alias: ['user-login', 'user-email', 'user'],
          // eslint-disable-next-line quotes
          describe: "The user's ID, login, or email address",
          demandOption: true,
        })
        .option('group', {
          type: 'string',
          // eslint-disable-next-line quotes
          describe: "The group's ID",
          demandOption: true,
        });
    },
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
      readonly user: string;
      readonly group: string;
    }) => {
      // eslint-disable-next-line functional/no-try-statement
      try {
        const throwOnBadResponse = (response: unknown): string => {
          // eslint-disable-next-line functional/no-throw-statement
          throw new Error(JSON.stringify(response));
        };

        const response: Response = await removeUserfromGroup(
          {
            ...args,
          },
          args.user,
          args.group
        );
        // eslint-disable-next-line functional/no-expression-statement
        console.info(
          response.ok
            ? `Removed user [${args.user}] from group [${args.group}].`
            : throwOnBadResponse(response)
        );
      } catch (error: unknown) {
        // eslint-disable-next-line functional/no-throw-statement
        throw error instanceof Error
          ? new Error(
              `Failed from remove existing user [${args.user}] from group [${args.group}] in [${args.organisationUrl}].`,
              {
                cause: error,
              }
            )
          : new Error(
              `Failed from remove existing user [${args.user}] remove group [${
                args.group
              }] in [${args.organisationUrl}] because of [${JSON.stringify(
                error
              )}].`
            );
      }
    }
  );
