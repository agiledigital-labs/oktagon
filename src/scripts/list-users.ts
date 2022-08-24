/* eslint-disable functional/prefer-readonly-type */
/* eslint-disable functional/no-expression-statement */
import { Argv } from 'yargs';
import { RootCommand } from '..';
import * as okta from '@okta/okta-sdk-nodejs';

import chalk from 'chalk';
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const chalkTable = require('chalk-table');

// Subset of User information provided by Okta
type user = {
  readonly login: string;
  readonly email: string;
  readonly firstName: string;
  readonly status: string;
};

/**
 * Get a list of users given a set of arguments relating to the client's information.
 *
 * @async
 * @param {string} clientId The provided clientId string.
 * @param {string} privateKey The provided privateKey, formatted as a string, parseable as a JWT JSON Object.
 * @returns {user[]} An array of user data formatted using the predefined subset data type
 *
 */
async function getUsers(clientId: string, privateKey: string): Promise<user[]> {
  const client = new okta.Client({
    orgUrl: 'https://live-nonprod-esgtech-co.oktapreview.com/',
    authorizationMode: 'PrivateKey',
    clientId: clientId,
    scopes: ['okta.users.read'],
    privateKey: privateKey,
  });

  const users: user[] = [];

  // We need to populate users with all of the client data so it can be
  // returned. Okta's listUsers() function returns a custon collection that
  // does not allow for any form of mapping, so array mutation is needed.
  await client
    .listUsers()
    .each(
      (user: {
        profile: { login: unknown; email: unknown; firstName: unknown };
        status: unknown;
      }) => {
        // eslint-disable-next-line functional/immutable-data
        users.push({
          login: String(user.profile.login),
          email: String(user.profile.email),
          firstName: String(user.profile.firstName),
          status: String(user.status),
        });
      }
    );

  return users;
}

export default ({ command }: RootCommand): Argv<unknown> =>
  command(
    'list-users',
    // eslint-disable-next-line prettier/prettier
    'Provides a list of all users\' logins, emails, display names, and statuses. Allows for environment variables under the name OKTAGON_[arg].',
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
        .help()
        .demandOption(
          ['client-id', 'private-key'],
          'Both arguments are required to sign into Okta'
        );
    },
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (args: { clientId: string; privateKey: string }) => {
      // eslint-disable-next-line functional/no-try-statement
      try {
        const clients: readonly user[] = await getUsers(
          args.clientId,
          args.privateKey
        );

        const options = {
          leftPad: 1,
          columns: [
            { field: 'login', name: chalk.green('Login') },
            { field: 'email', name: chalk.green('Email') },
            { field: 'firstName', name: chalk.white('D.Name') },
            { field: 'status', name: chalk.yellow('Status') },
          ],
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const table = chalkTable(options, clients);
        console.info(table);
        // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch, @typescript-eslint/no-explicit-any
      } catch (error: any) {
        // eslint-disable-next-line functional/no-conditional-statement
        if (error instanceof Error) {
          console.error(
            '\n' +
              chalk.red.bold('ERROR') +
              ' encountered while performing instruction: ' +
              chalk.green(error.message)
          );
          console.error(
            'This is most likely caused by an incorrect private key or client id value inputted either in argument or in environment.\n'
          );
        }
      }
    }
  );
