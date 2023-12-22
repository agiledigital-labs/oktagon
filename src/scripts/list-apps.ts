import { type Argv } from 'yargs';
import { type RootCommand } from '..';

import { table } from 'table';
import {
  type App,
  type OktaAppService,
  createOktaAppService,
} from './services/app-service';
import { oktaReadOnlyClient } from './services/client-service';

import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { constant, pipe } from 'fp-ts/function';
import { type ReadonlyURL } from 'readonly-types';
import { handleTaskEither } from './services/error-service';
import { UserIdOption } from './list-groups';

/**
 * Tabulates app information for display.
 *
 * @param apps Apps to be tabulated.
 * @returns App information table formatted as a string.
 */
const formatAppsTable: (apps: readonly App[]) => string = (apps) =>
  table(
    [
      ['ID', 'Name', 'Label', 'Status', 'Last Updated', 'Created'],
      ...apps.map(({ id, name, label, status, lastUpdated, created }) => [
        id,
        name,
        label,
        status,
        lastUpdated,
        created,
      ]),
    ],
    {
      drawHorizontalLine: constant(false),
      drawVerticalLine: constant(false),
    }
  );

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
const getAppsListTableString: (
  userIdOption: UserIdOption
) => (oktaAppService: OktaAppService) => TE.TaskEither<Error, string> =
  (userIdOption) => (oktaAppService) =>
    pipe(
      userIdOption,
      O.match(oktaAppService.listApps, oktaAppService.listUserApps),
      TE.map(formatAppsTable)
    );

/**
 * Options passed to the `list-apps` command.
 */
type ListAppsOptions = {
  readonly clientId: string;
  readonly privateKey: string;
  readonly orgUrl: ReadonlyURL;
  readonly userId?: string;
};

/**
 * Builds the `list-apps` command.
 */
export default (rootCommand: RootCommand): Argv<ListAppsOptions> =>
  rootCommand.command(
    'list-apps',
    // eslint-disable-next-line quotes
    "Provides a list of all apps' IDs, names, labels, statuses, last updated dates, and created dates. Allows a specification of a user ID to list only apps that the user has been assigned.",
    // eslint-disable-next-line functional/no-return-void
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs.positional('user', {
        type: 'string',
        alias: ['user-id'],
        // eslint-disable-next-line quotes
        describe: "The user's ID",
      });
    },
    // eslint-disable-next-line functional/no-return-void
    (listAppsOptions) => {
      const userIdOption = O.fromNullable(listAppsOptions.userId);
      return pipe(
        oktaReadOnlyClient(listAppsOptions, ['apps']),
        createOktaAppService,
        getAppsListTableString(userIdOption),
        handleTaskEither
      );
    }
  );
