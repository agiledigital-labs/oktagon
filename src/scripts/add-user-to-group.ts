import { Argv } from 'yargs';
import { RootCommand } from '..';
import { Response } from 'node-fetch';

import { getUser } from './services/user-service';
import { getGroup, userExistsInGroup } from './services/group-service';
import { oktaManageClient, OktaConfiguration } from './services/client-service';

const addUserToGroup = async (
  oktaConfiguration: OktaConfiguration,
  user: string,
  group: string
): Promise<Response> => {
  const client = oktaManageClient(oktaConfiguration, ['groups', 'users']);

  const maybeOktaUser = await getUser(user, client);
  const maybeOktaGroup = await getGroup(group, client);

  const throwOnMissing = (userMissing: boolean, groupMissing: boolean) => {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(
      `${
        userMissing
          ? `User [${user}] does not exist. Can not add to an existing group.`
          : ''
      }${userMissing && groupMissing ? '\n' : ''}${
        groupMissing
          ? `Group [${group}] does not exist. Can not add a user to a non-existent group.`
          : ''
      }`
    );
  };

  // eslint-disable-next-line functional/functional-parameters
  const throwOnAlreadyPresent = () => {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error('User already exists in group.');
  };

  return maybeOktaUser === undefined || maybeOktaGroup === undefined
    ? throwOnMissing(maybeOktaUser === undefined, maybeOktaGroup === undefined)
    : (await userExistsInGroup(maybeOktaGroup, maybeOktaUser.id))
    ? throwOnAlreadyPresent()
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
    'Adds an existing user to an existing group.',
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
            : `User [${args.user}] was not added to group [${args.group}] correctly, however no errors were caught when attempting to do so.`
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
