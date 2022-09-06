import { CreateUserRequestOptions } from '@okta/okta-sdk-nodejs';
import { Argv } from 'yargs';
import { RootCommand } from '..';

import {
  oktaManageClient,
  OktaConfiguration,
  User,
  oktaUserAsUser,
} from './services/user-service';

const createUser = async (
  oktaConfiguration: OktaConfiguration,
  email: string,
  firstName = '',
  lastName = ''
): Promise<User> => {
  const client = oktaManageClient(oktaConfiguration);

  const newUser: CreateUserRequestOptions = {
    profile: {
      firstName: firstName,
      lastName: lastName,
      email: email,
      login: email,
    },
  };

  return oktaUserAsUser(await client.createUser(newUser));
};

export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly organisationUrl: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
}> =>
  rootCommand.command(
    'create-user [email]',
    'Deletes the specified user',
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs
        .positional('email', {
          type: 'string',
          alias: ['login'],
          // eslint-disable-next-line quotes
          describe: "The new user's login/email",
        })
        .option('fname', {
          type: 'string',
          alias: ['first-name'],
          // eslint-disable-next-line quotes
          describe: "The new user's first name",
        })
        .option('lname', {
          type: 'string',
          alias: ['last-name'],
          // eslint-disable-next-line quotes
          describe: "The new user's last name",
        });
    },
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
      readonly email: string;
      readonly firstName?: string;
      readonly lastName?: string;
      // eslint-disable-next-line @typescript-eslint/require-await
    }) => {
      // eslint-disable-next-line functional/no-try-statement
      try {
        const user = await createUser(
          {
            ...args,
          },
          args.email,
          args.firstName,
          args.lastName
        );
        // eslint-disable-next-line functional/no-expression-statement
        console.info(
          `Created user with login [${user.login}] and name [${user.name}].`
        );
      } catch (error: unknown) {
        // eslint-disable-next-line functional/no-throw-statement
        throw error instanceof Error
          ? new Error(
              `Failed to create user [${args.email}] in [${args.organisationUrl}].`,
              {
                cause: error,
              }
            )
          : new Error(
              `Failed to create user [${args.email}] in [${
                args.organisationUrl
              }] because of [${JSON.stringify(error)}].`
            );
      }
    }
  );
