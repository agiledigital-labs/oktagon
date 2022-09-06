import { CreateUserRequestOptions } from '@okta/okta-sdk-nodejs';
import { Argv } from 'yargs';
import { RootCommand } from '..';

import {
  oktaManageClient,
  OktaConfiguration,
  User,
  oktaUserAsUser,
  getUser,
} from './services/user-service';

import { generatePassword } from './services/password_manager';

const createUser = async (
  oktaConfiguration: OktaConfiguration,
  password: string,
  email: string,
  firstName = 'Unknown',
  lastName = 'User'
): Promise<User> => {
  const client = oktaManageClient(oktaConfiguration);

  const maybeOktaUser = getUser(email, client);
  // eslint-disable-next-line functional/no-expression-statement
  const newUser: CreateUserRequestOptions = {
    profile: {
      firstName: firstName,
      lastName: lastName,
      email: email,
      login: email,
    },
    credentials: {
      password: { value: password },
    },
  };

  // eslint-disable-next-line functional/functional-parameters
  const throwOnExisting = () => {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(
      `User [${email}] already exists. Can not create a new user.`
    );
  };

  return (await maybeOktaUser) === undefined
    ? oktaUserAsUser(await client.createUser(newUser))
    : throwOnExisting();
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
        .option('email', {
          type: 'string',
          alias: ['login'],
          // eslint-disable-next-line quotes
          describe: "The new user's login/email",
          demandOption: true,
        })
        .option('fname', {
          type: 'string',
          alias: ['first-name'],
          // eslint-disable-next-line quotes
          describe: "The new user's first name",
          demandOption: true,
        })
        .option('lname', {
          type: 'string',
          alias: ['last-name'],
          // eslint-disable-next-line quotes
          describe: "The new user's last name",
          demandOption: true,
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
        const password = generatePassword(20);

        const user = await createUser(
          {
            ...args,
          },
          password,
          args.email,
          args.firstName,
          args.lastName
        );
        // eslint-disable-next-line functional/no-expression-statement
        console.info(
          `Created new user with login [${user.login}] and name [${user.name}].\nPassword: [${password}]`
        );
      } catch (error: unknown) {
        // eslint-disable-next-line functional/no-throw-statement
        throw error instanceof Error
          ? new Error(
              `Failed to create new user [${args.email}] in [${args.organisationUrl}].`,
              {
                cause: error,
              }
            )
          : new Error(
              `Failed to create new user [${args.email}] in [${
                args.organisationUrl
              }] because of [${JSON.stringify(error)}].`
            );
      }
    }
  );
