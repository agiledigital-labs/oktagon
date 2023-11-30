import { Argv } from 'yargs';
import { RootCommand } from '..';

import { table } from 'table';
import { OktaUserService, User, UserService } from './services/user-service';
import { oktaReadOnlyClient } from './services/client-service';
import * as okta from '@okta/okta-sdk-nodejs';

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
import { ReadonlyURL } from 'readonly-types';

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

export const users = (service: UserService, listAll: boolean) =>
  pipe(
    service.listUsers(listAll),
    TE.map((users) => usersTable(users)),
    TE.chainFirstIOK(Console.info)
  );

export const usersInGroup = (
  userService: UserService,
  groupService: GroupService,
  groupId: string,
  listAll: boolean
) =>
  pipe(
    groupService.getGroup(groupId),
    TE.chain(
      O.fold(
        (): TE.TaskEither<Error, Group> =>
          TE.left(new Error(`The group [${groupId}] does not exist.`)),
        (group: Group) => TE.right(group)
      )
    ),
    TE.chain((group) => userService.listUsersInGroup(group, listAll)),
    TE.map((users) => usersTable(users)),
    TE.chainFirstIOK(Console.info)
  );

export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly all: boolean;
  readonly orgUrl: ReadonlyURL;
  readonly groupId?: string;
}> =>
  rootCommand.command(
    'list-users',
    `Provides a list of all users' ID's, email addresses, display names, and statuses, except for ${okta.UserStatus.DEPROVISIONED} users. Allows a specification of a group to list from.`,
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs
        .positional('group', {
          type: 'string',
          alias: ['group-id'],
          // eslint-disable-next-line quotes
          describe: "The group's ID",
        })
        .option('all', {
          alias: 'all',
          type: 'boolean',
          describe: `if true, will list all users, including ${okta.UserStatus.DEPROVISIONED} ones`,
          demandOption: false,
          default: false,
        });
    },
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly all: boolean;
      readonly orgUrl: ReadonlyURL;
      readonly groupId?: string;
    }) => {
      const { groupId, all } = args;
      const client = oktaReadOnlyClient(
        {
          clientId: args.clientId,
          privateKey: args.privateKey,
          orgUrl: args.orgUrl,
        },
        args.groupId === undefined ? ['users'] : ['groups']
      );
      const userService = new OktaUserService(client);
      const groupService = new OktaGroupService(client);

      // eslint-disable-next-line functional/no-expression-statement
      Console.info(groupId);
      const result: E.Either<Error, string> = await (groupId === undefined
        ? users(userService, all)
        : usersInGroup(userService, groupService, groupId, all))();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw result.left;
      }
    }
  );
