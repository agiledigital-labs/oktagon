import { Argv } from 'yargs';
import { RootCommand } from '..';

import { table } from 'table';
import {
  OktaGroupService,
  Group,
  GroupService,
} from './services/group-service';
import { oktaReadOnlyClient } from './services/client-service';

import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';

/**
 * Tabulates group information for display.
 * @param groups groups to be tabulated.
 * @returns group information table formatted as a string.
 */
const groupsTable = (groups: readonly Group[]): string => {
  return table(
    [
      ['ID', 'Name', 'Type'],
      ...groups.map((group: Group) => [group.id, group.name, group.type]),
    ],
    {
      // eslint-disable-next-line functional/functional-parameters
      drawHorizontalLine: () => false,
      // eslint-disable-next-line functional/functional-parameters
      drawVerticalLine: () => false,
    }
  );
};

const groups = (service: GroupService) =>
  pipe(
    // eslint-disable-next-line functional/functional-parameters
    service.listGroups(),
    TE.map((groups) => groupsTable(groups)),
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
    'list-groups',
    // eslint-disable-next-line quotes
    "Provides a list of all groups' ID's, email addresses, display names, and statuses.",
    // eslint-disable-next-line functional/no-return-void, functional/functional-parameters, @typescript-eslint/no-empty-function
    () => {},
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
    }) => {
      const client = oktaReadOnlyClient({ ...args }, ['groups']);
      const service = new OktaGroupService(client);

      const result = await groups(service)();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
