import { Argv } from 'yargs';
import { RootCommand } from '..';
import { Response } from 'node-fetch';

import { getUser } from './services/user-service';
import { getGroup } from './services/group-service';
import { oktaManageClient, OktaConfiguration } from './services/client-service';

// There is no suitable way to check and confirm that a user exists/does not exist within a particular group outside of
// searching for them in a large array of users. So to preserve a timewise nature. it is best to just let commands work
// even if it didn't do anything.

const addUserToGroup = async (
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
      `User [${user}] does not exist. Can not add to an existing group.`
    );
  };

  // eslint-disable-next-line functional/functional-parameters
  const throwOnMissingGroup = () => {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(
      `Group [${group}] does not exist. Can not add a user to a non-existent group.`
    );
  };

  return maybeOktaUser === undefined
    ? throwOnMissingUser()
    : maybeOktaGroup === undefined
    ? throwOnMissingGroup()
    : maybeOktaUser.addToGroup(maybeOktaGroup.id);
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
    'add-user-to-group [user] [group]',
    'Adds an existing user to an existing group. Will perform the operation even if the user already exists in the group.',
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
      // eslint-disable-next-line @typescript-eslint/require-await
    }) => {
      // eslint-disable-next-line functional/no-try-statement
      try {
        const throwOnBadResponse = (response: unknown): string => {
          // eslint-disable-next-line functional/no-throw-statement
          throw new Error(
            `User [${args.user}] was not added to group [${
              args.group
            }] correctly, due to a bad response: [${JSON.stringify(response)}]`
          );
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response: Response = await addUserToGroup(
          {
            ...args,
          },
          args.user,
          args.group
        );
        // eslint-disable-next-line functional/no-expression-statement
        console.info(
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-member-access
          response.ok
            ? `Added user [${args.user}] to group [${args.group}].`
            : throwOnBadResponse(response)
        );
      } catch (error: unknown) {
        // eslint-disable-next-line functional/no-throw-statement
        throw error instanceof Error
          ? new Error(
              `Failed to add existing user [${args.user}] to group [${args.group}] in [${args.organisationUrl}].`,
              {
                cause: error,
              }
            )
          : new Error(
              `Failed to add existing user [${args.user}] to group [${
                args.group
              }] in [${args.organisationUrl}] because of [${JSON.stringify(
                error
              )}].`
            );
      }
    }
  );
