import { Argv } from 'yargs';
import { RootCommand } from '..';

import { table } from 'table';
import { oktaGroupAsGroup, Group } from './services/group-service';
import {
  oktaReadOnlyClient,
  OktaConfiguration,
} from './services/client-service';

/**
 * Gets a list of groups given a set of arguments relating to the client's information.
 *
 * @param oktaConfiguration configuration for the connection to the Okta API.
 * @returns the list of groups.
 *
 */
const fetchGroups = async (
  oktaConfiguration: OktaConfiguration
): Promise<readonly Group[]> => {
  const client = oktaReadOnlyClient(oktaConfiguration, ['groups']);

  // We need to populate groups with all of the client data so it can be
  // returned. Okta's listGroups() function returns a custom collection that
  // does not allow for any form of mapping, so array mutation is needed.

  // eslint-disable-next-line functional/prefer-readonly-type
  const groups: Group[] = [];

  // eslint-disable-next-line functional/no-expression-statement
  await client
    .listGroups()
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    .each((oktaGroup) => {
      // eslint-disable-next-line functional/immutable-data, functional/no-expression-statement
      groups.push(oktaGroupAsGroup(oktaGroup));
    });

  return groups;
};

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
    "Provides a list of all groups' logins, emails, display names, and statuses. Allows for environment variables under the name OKTAGON_[arg].",
    // eslint-disable-next-line functional/no-return-void, functional/functional-parameters, @typescript-eslint/no-empty-function
    () => {},
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
    }) => {
      // eslint-disable-next-line functional/no-try-statement
      try {
        const groups = await fetchGroups({
          ...args,
        });
        const tabulated = groupsTable(groups);
        // eslint-disable-next-line functional/no-expression-statement
        console.info(tabulated);
      } catch (error: unknown) {
        // eslint-disable-next-line functional/no-throw-statement
        throw error instanceof Error
          ? new Error(
              `Failed to fetch groups from [${args.organisationUrl}].`,
              {
                cause: error,
              }
            )
          : new Error(
              `Failed to fetch groups from [${
                args.organisationUrl
              }] because of [${JSON.stringify(error)}].`
            );
      }
    }
  );
