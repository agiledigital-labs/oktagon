import { Argv } from 'yargs';
import { RootCommand } from '..';

import { table } from 'table';
import { oktaUserAsUser, User } from './services/user-service';
import {
  oktaReadOnlyClient,
  OktaConfiguration,
} from './services/client-service';

/**
 * Gets a list of users given a set of arguments relating to the client's information.
 *
 * @param oktaConfiguration configuration for the connection to the Okta API.
 * @returns the list of users.
 *
 */
const fetchUsers = async (
  oktaConfiguration: OktaConfiguration
): Promise<readonly User[]> => {
  const client = oktaReadOnlyClient(oktaConfiguration);

  // We need to populate users with all of the client data so it can be
  // returned. Okta's listUsers() function returns a custom collection that
  // does not allow for any form of mapping, so array mutation is needed.

  // eslint-disable-next-line functional/prefer-readonly-type
  const users: User[] = [];

  // eslint-disable-next-line functional/no-expression-statement
  await client
    .listUsers()
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    .each((oktaUser) => {
      // eslint-disable-next-line functional/immutable-data, functional/no-expression-statement
      users.push(oktaUserAsUser(oktaUser));
    });

  return users;
};

/**
 * Tabulates user information for display.
 * @param users users to be tabulated.
 * @returns user information table formatted as a string.
 */
const usersTable = (users: readonly User[]): string => {
  return table(
    [
      ['ID', 'Email', 'Name', 'Status'],
      ...users.map((user: User) => [
        user.id,
        user.email,
        user.name,
        user.status,
      ]),
    ],
    {
      // eslint-disable-next-line functional/functional-parameters
      drawHorizontalLine: () => false,
      // eslint-disable-next-line functional/functional-parameters
      drawVerticalLine: () => false,
    }
  );
};

export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly organisationUrl: string;
}> =>
  rootCommand.command(
    'list-users',
    // eslint-disable-next-line quotes
    "Provides a list of all users' ID's, email addresses, display names, and statuses.",
    // eslint-disable-next-line functional/no-return-void, functional/functional-parameters, @typescript-eslint/no-empty-function
    () => {},
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
    }) => {
      // eslint-disable-next-line functional/no-try-statement
      try {
        const users = await fetchUsers({
          ...args,
        });
        const tabulated = usersTable(users);
        // eslint-disable-next-line functional/no-expression-statement
        console.info(tabulated);
      } catch (error: unknown) {
        // eslint-disable-next-line functional/no-throw-statement
        throw error instanceof Error
          ? new Error(`Failed to fetch users from [${args.organisationUrl}].`, {
              cause: error,
            })
          : new Error(
              `Failed to fetch users from [${
                args.organisationUrl
              }] because of [${JSON.stringify(error)}].`
            );
      }
    }
  );
