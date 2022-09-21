import { Argv } from 'yargs';
import { RootCommand } from '..';

import { table } from 'table';
import { OktaUserService, User, UserService } from './services/user-service';
import { oktaReadOnlyClient } from './services/client-service';

import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';

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

const users = (service: UserService) =>
  pipe(
    // eslint-disable-next-line functional/functional-parameters
    service.listUsers(),
    TE.map((users) => usersTable(users)),
    TE.chainFirstIOK(Console.info)
  );

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
      const client = oktaReadOnlyClient({ ...args });
      const service = new OktaUserService(client);

      const result = await users(service)();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
