/* eslint-disable functional/no-expression-statement */
import yargs from 'yargs';
import { parseUrl } from './scripts/services/okta-service';
import * as E from 'fp-ts/lib/Either';
import activateUser from './scripts/activate-user';
import addUserToGroup from './scripts/add-user-to-group';
import createUser from './scripts/create-user';
import deactivateUser from './scripts/deactivate-user';
import deleteUser from './scripts/delete-user';
import expirePasswordAndGetTemporaryPassword from './scripts/expire-password-and-get-temporary-password';
import listGroups from './scripts/list-groups';
import listUsers from './scripts/list-users';
import ping from './scripts/ping';
import removeUserFromGroup from './scripts/remove-user-from-group';
import logs from './scripts/logs';
import { ReadonlyURL } from 'readonly-types';

const organisationURL = 'organisation-url';
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Require {
      // eslint-disable-next-line @typescript-eslint/prefer-function-type
      <T>(id: string): T;
    }
  }
}

/**
 * Add global arguments here using the .option function.
 * E.g. const rootCommand = yargs.option('example', {type: 'string'});
 */
const rootCommand = yargs
  .env('OKTAGON')
  .option('client-id', {
    type: 'string',
    alias: 'cid',
    describe: 'Okta client ID',
    demandOption: true,
  })
  .option('private-key', {
    type: 'string',
    alias: 'pk',
    describe: 'Okta private key as string form of JSON',
    demandOption: true,
  })
  .option(organisationURL, {
    alias: ['org-url', 'ou'],
    describe: 'Okta URL for Organisation',
    demandOption: true,
    coerce: (url: string): ReadonlyURL => {
      const result = parseUrl(url);
      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw result.left;
      }
      return result.right;
    },
  })
  .group(
    ['client-id', 'private-key', organisationURL],
    'Okta connection settings:'
  )
  .help();

/**
 * Dynamic type for global arguments.
 */
export type RootCommand = typeof rootCommand;

// End users of this tool will have to import their subcommands, and call it following example subcommand.
activateUser(rootCommand);
addUserToGroup(rootCommand);
createUser(rootCommand);
deactivateUser(rootCommand);
deleteUser(rootCommand);
expirePasswordAndGetTemporaryPassword(rootCommand);
listGroups(rootCommand);
listUsers(rootCommand);
ping(rootCommand);
removeUserFromGroup(rootCommand);
logs(rootCommand);

void rootCommand.demandCommand().strict().help().argv;
