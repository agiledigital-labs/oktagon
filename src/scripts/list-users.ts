import { Argv } from 'yargs';
import { RootCommand } from '..';
import * as okta from '@okta/okta-sdk-nodejs';

import { table } from 'table';

/**
 * Subset of User information provided by Okta. See okta.User for further information on it's derived type.
 * @see https://developer.okta.com/docs/reference/api/users/
 */
type User = {
  /** The internal Okta identifier. */
  readonly id: string;
  /**
   * User login string.
   */
  readonly login: string;
  /**
   * User email adress.
   */
  readonly email: string;
  /**
   * Name of the user.
   */
  readonly name: string;
  /**
   * User status as a string.
   */
  readonly status: string;
};

/**
 * Gets a list of users given a set of arguments relating to the client's information.
 *
 * @param clientId clientId of the Okta API integration.
 * @param privateKey privateKey of the Okta API integration (formatted as a string, parseable as a JWT JSON Object).
 * @param organisationUrl organisation URL of the Okta tenancy from which users will be listed.
 * @returns the list of users.
 *
 */
const fetchUsers = async (
  clientId: string,
  privateKey: string,
  organisationUrl: string
): Promise<readonly User[]> => {
  const client = new okta.Client({
    orgUrl: organisationUrl,
    authorizationMode: 'PrivateKey',
    clientId: clientId,
    scopes: ['okta.users.read'],
    privateKey: privateKey,
  });

  // We need to populate users with all of the client data so it can be
  // returned. Okta's listUsers() function returns a custom collection that
  // does not allow for any form of mapping, so array mutation is needed.

  // eslint-disable-next-line functional/prefer-readonly-type
  const users: User[] = [];

  // eslint-disable-next-line functional/no-expression-statement
  await client
    .listUsers()
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    .each((user: okta.User) => {
      // eslint-disable-next-line functional/immutable-data, functional/no-expression-statement
      users.push({
        id: user.id,
        login: user.profile.login,
        email: user.profile.email,
        name: user.profile.displayName,
        status: String(user.status),
      });
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
  readonly long: boolean;
}> =>
  rootCommand.command(
    'list-users',
    // eslint-disable-next-line quotes
    "Provides a list of all users' logins, emails, display names, and statuses. Allows for environment variables under the name OKTAGON_[arg].",
    // eslint-disable-next-line functional/no-return-void, functional/functional-parameters, @typescript-eslint/no-empty-function
    () => {},
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
      readonly long: boolean;
    }) => {
      // eslint-disable-next-line functional/no-try-statement
      try {
        const users = await fetchUsers(
          args.clientId,
          args.privateKey,
          args.organisationUrl
        );
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
