import { type Argv } from 'yargs';
import { type RootCommand } from '..';

import { table } from 'table';
import { type Group, OktaGroupService } from './services/group-service';
import {
  type ResourceType,
  oktaReadOnlyClient,
} from './services/client-service';

import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { constant, pipe } from 'fp-ts/function';
import { type ReadonlyURL } from 'readonly-types';
import { handleTaskEither } from './services/error-service';

/**
 * Tabulates group information for display.
 * @param groups groups to be tabulated.
 * @returns group information table formatted as a string.
 */
const formatGroupsTable: (groups: readonly Group[]) => string = (
  groups
): string =>
  table(
    [
      ['ID', 'Name', 'Type'],
      ...groups.map(({ id, name, type }: Group) => [id, name, type]),
    ],
    {
      drawHorizontalLine: constant(false),
      drawVerticalLine: constant(false),
    }
  );

/**
 * User ID option.
 *
 * @example
 * ```typescript
 * const userIdOption: UserIdOption = O.some('00gddktac01w2dgmL5d7');
 * ```
 */
export type UserIdOption = O.Option<string>;

/**
 * Returns a `TaskEither` that resolves to a groups table string or rejects with
 * an error, given an Okta group service and a user ID option. The groups table
 * is generated from the list of all groups if the user ID option is `O.none`.
 * Otherwise, the groups table consists of the list of groups that the user is a
 * member of.
 *
 * @param userIdOption An Okta user ID option.
 * @param oktaGroupService An Okta group service.
 * @returns A `TaskEither` that resolves to a string or rejects with an error.
 */
const getGroupsListTableString: (
  userIdOption: UserIdOption
) => (
  oktaGroupService: Readonly<OktaGroupService>
) => TE.TaskEither<Error, string> = (userIdOption) => (oktaGroupService) =>
  pipe(
    userIdOption,
    O.match(oktaGroupService.listGroups, oktaGroupService.listUserGroups),
    TE.map(formatGroupsTable)
  );

/**
 * Options passed to the `list-groups` command. Includes the client ID, private
 * key, organisation URL, and user ID (optional).
 *
 * @example
 * ```typescript
 * const listGroupsOptions: ListGroupsOptions = {
 *   clientId: '0oaddqhpa2nPVsxJX5d7',
 *   privateKey: <private key>,
 *   orgUrl: readonlyURL('https://dev-69870217.okta.com'),
 *   userId: '00uddtlbyrKj9nyAX5d7',
 * };
 * ```
 */
type ListGroupsOptions = {
  readonly clientId: string;
  readonly privateKey: string;
  readonly orgUrl: ReadonlyURL;
  readonly userId?: string;
};

/**
 * Builds the `list-groups` command.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export default (rootCommand: RootCommand): Argv<ListGroupsOptions> =>
  rootCommand.command(
    'list-groups',
    // eslint-disable-next-line quotes
    "Provides a list of all groups' IDs, email addresses, display names, and statuses. Allows a specification of a user ID to list only groups that the user is a member of.",
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs.positional('user', {
        type: 'string',
        alias: ['user-id'],
        // eslint-disable-next-line quotes
        describe: "The user's ID",
      });
    },
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (listGroupsOptions) => {
      const userIdOption = O.fromNullable(listGroupsOptions.userId);
      return pipe(
        new OktaGroupService(
          oktaReadOnlyClient(
            listGroupsOptions,
            O.match<string, readonly ResourceType[]>(
              constant(['groups']),
              constant(['users'])
            )(userIdOption)
          )
        ),
        getGroupsListTableString(userIdOption),
        handleTaskEither
      );
    }
  );
