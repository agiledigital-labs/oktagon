/* eslint-disable functional/prefer-readonly-type */
/* eslint-disable functional/no-expression-statement */
import { Argv } from 'yargs';
import { RootCommand } from '..';
import * as okta from '@okta/okta-sdk-nodejs';

import chalk from 'chalk';
import { table } from 'table';

/**
 * Subset of User information provided by Okta. See okta.User for further information on it's derived type.
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
 * @async
 * @param clientId The provided clientId string.
 * @param privateKey The provided privateKey, formatted as a string, parseable as a JWT JSON Object.
 * @param organisationUrl The provided organisation URL string
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
      name: `${user.profile.firstName} ${user.profile.lastName}`,
      status: String(user.status),
    });
  });

  return users;
}

/**
 * Forms a string table detailing the user information.
 * @param users Array containing all listable users of type User
 * @returns String formatted as an output table
 */
function tableUsers(users: readonly User[] | User[]): string {
  const config = {
    columns: [
      {
        width: (process.stdout.columns / 4 - 4) | 0,
        wrapWord: true,
      },
    ],
  };

  return table(
    users.map((user: User) => {
      return Object.values(user);
    }),
    config
  );
}

/**
 * Generates an error message given the throwable and the provided organisation URL.
 * @param error The thrown object that has been caught
 * @param organisationUrl The organisation URL submitted via argument
 * @returns Text containing the error message in question
 */
function generateErrorMessage(
  error: unknown | Error,
  organisationUrl = 'NO URL GIVEN'
): string {
  return error instanceof Error
    ? `\n${chalk.red.bold(
        'ERROR'
      )} encountered while listing users from [${chalk.blue.underline(
        organisationUrl
      )}]: [${chalk.green(
        error.message
      )}]\n\nThis is most likely caused by incorrect credentials inputted either in argument or in environment.\n`
    : `Some sort of issue was encountered while executing the command: [${String(
        error
      )}]`;
}

/**
 * Produce a set of error/task messages involving listing the users from Okta.
 * @async
 * @param args The provided yargs argument object.
 *
 */
const listUsers = async (args: {
  clientId: string;
  privateKey: string;
  organisationUrl: string;
}): Promise<[string, boolean]> => {
  // A try statement is needed for error handling
  // eslint-disable-next-line functional/no-try-statement
  try {
    return [
      tableUsers(
        await getUsers(args.clientId, args.privateKey, args.organisationUrl)
      ),
      false,
    ];
  } catch (error: unknown) {
    return [generateErrorMessage(error, args.organisationUrl), true];
  }
};

export default ({ command }: RootCommand): Argv<unknown> =>
  command(
    'list-users',
    // eslint-disable-next-line quotes
    "Provides a list of all users' logins, emails, display names, and statuses. Allows for environment variables under the name OKTAGON_[arg].",
    (yargs) => {
      yargs;
    },
    (args: {
      clientId: string;
      privateKey: string;
      organisationUrl: string;
      long: boolean;
    }) => {
      const printMessageToConsole = async (args: {
        clientId: string;
        privateKey: string;
        organisationUrl: string;
        long: boolean;
      }): Promise<void> => {
        const [message, errFlag] = await listUsers(args);
        errFlag ? console.info(message) : console.error(message);
      };

      void printMessageToConsole(args);
    }
  );
