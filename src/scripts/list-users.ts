/* eslint-disable functional/prefer-readonly-type */
/* eslint-disable functional/no-expression-statement */
import { Argv } from 'yargs';
import { RootCommand } from '..';
import * as okta from '@okta/okta-sdk-nodejs';

import chalk from 'chalk';
import { table } from 'table';

/**
 * Subset of User information provided by Okta. See okta.User for further information on it's derived type.
 *
 * @see https://developer.okta.com/docs/reference/api/users/
 */
type User = {
  /**
   * User login string.
   */
  readonly login: string;
  /**
   * User email adress.
   */
  readonly email: string;
  /**
   * User's first name. Adding a last name causes the list to be far too wide to fit in a terminal.
   */
  readonly name: string;
  /**
   * User status as a string.
   */
  readonly status: string;
};

/**
 * Get a list of users given a set of arguments relating to the client's information.
 *
 * @async
 * @param clientId The provided clientId string.
 * @param privateKey The provided privateKey, formatted as a string, parseable as a JWT JSON Object.
 * @param organisationUrl The provided organisation URL string
 * @param truncate Whether or not to truncate long strings
 * @returns An array of user data formatted using the predefined subset data type
 *
 */
async function getUsers(
  clientId: string,
  privateKey: string,
  organisationUrl: string
): Promise<User[]> {
  const client = new okta.Client({
    orgUrl: organisationUrl,
    authorizationMode: 'PrivateKey',
    clientId: clientId,
    scopes: ['okta.users.read'],
    privateKey: privateKey,
  });

  const users: User[] = [
    { login: 'Login', email: 'Email', name: 'Name', status: 'Status' },
  ];

  // We need to populate users with all of the client data so it can be
  // returned. Okta's listUsers() function returns a custon collection that
  // does not allow for any form of mapping, so array mutation is needed.
  await client.listUsers().each((user: okta.User) => {
    // eslint-disable-next-line functional/immutable-data
    users.push({
      login: user.profile.login,
      email: user.profile.email,
      name: user.profile.firstName + ' ' + user.profile.lastName,
      status: String(user.status),
    });
  });

  return users;
}

export default ({ command }: RootCommand): Argv<unknown> =>
  command(
    'list-users',
    // eslint-disable-next-line quotes
    "Provides a list of all users' logins, emails, display names, and statuses. Allows for environment variables under the name OKTAGON_[arg].",
    (yargs) => {
      yargs
        .env('OKTAGON')
        .option('client-id', {
          type: 'string',
          alias: 'cid',
          describe: 'Okta client ID',
        })
        .option('private-key', {
          type: 'string',
          alias: 'pk',
          describe: 'Okta private key as string form of JSON',
        })
        .option('organisation-url', {
          type: 'string',
          alias: ['org-url', 'ou'],
          describe: 'Okta URL for Organisation',
        })
        .help()
        .demandOption(
          ['client-id', 'private-key', 'org-url'],
          'Three arguments are required to sign into Okta'
        );
    },
    (args: {
      clientId: string;
      privateKey: string;
      organisationUrl: string;
      long: boolean;
    }) => {
      void listUsers(args);
    }
  );

const listUsers = async (args: {
  clientId: string;
  privateKey: string;
  organisationUrl: string;
}): Promise<void> => {
  // A try statement is needed for error handling
  // eslint-disable-next-line functional/no-try-statement
  try {
    const users: readonly User[] = await getUsers(
      args.clientId,
      args.privateKey,
      args.organisationUrl
    );

    const config = {
      columns: [
        {
          width: (process.stdout.columns / 4 - 4) | 0,
          wrapWord: true,
        },
      ],
    };

    // This is required due to a 'require' statement for chalkTable
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const outTable = table(
      users.map((user: User) => {
        return Object.values(user);
      }),
      config
    );
    console.info(outTable);
  } catch (error: unknown) {
    // There must be a conditional in here to check if error is of the correct type
    const errMsg =
      error instanceof Error
        ? `\n${chalk.red.bold('ERROR')} encountered while listing users from [${
            args.organisationUrl
          }]: [${chalk.green(
            error.message
          )}]\nThis is most likely caused by an incorrect private key or client id value inputted either in argument or in environment.\n`
        : 'No errors!';

    console.error(errMsg);
  }
};
