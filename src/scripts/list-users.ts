import { Argv } from 'yargs';
import { RootCommand } from '..';

import { table } from 'table';
import { OktaUserService, User, UserService } from './services/user-service';
import { oktaReadOnlyClient } from './services/client-service';

import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';
import {
  OktaGroupService,
  GroupService,
  Group,
} from './services/group-service';

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

export const users = (service: UserService) =>
  pipe(
    // eslint-disable-next-line functional/functional-parameters
    service.listUsers(),
    TE.map((users) => usersTable(users)),
    TE.chainFirstIOK(Console.info)
  );

export const usersInGroup = (
  userService: UserService,
  groupService: GroupService,
  groupId: string
) =>
  pipe(
    groupService.getGroup(groupId),
    TE.chain(
      O.fold(
        (): TE.TaskEither<string, Group> =>
          TE.left(`The group [${groupId}] does not exist`),
        (group: Group) => TE.right(group)
      )
    ),
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(userService.listUsersInGroup),
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
  readonly groupId?: string;
}> =>
  rootCommand.command(
    'list-users',
    // eslint-disable-next-line quotes
    "Provides a list of all users' ID's, email addresses, display names, and statuses. Allows a specification of a group to list from.",
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs.positional('group', {
        type: 'string',
        alias: ['group-id'],
        // eslint-disable-next-line quotes
        describe: "The group's ID",
      });
    },
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
      readonly groupId?: string;
    }) => {
      const client = oktaReadOnlyClient(
        { ...args },
        args.groupId === undefined ? ['users'] : ['groups']
      );
      const userService = new OktaUserService(client);
      const groupService = new OktaGroupService(client);

      // eslint-disable-next-line functional/no-expression-statement
      Console.info(args.groupId);

      const result: E.Either<string, string> = await (args.groupId === undefined
        ? users(userService)
        : usersInGroup(userService, groupService, args.groupId))();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
