import { Argv } from 'yargs';
import { RootCommand } from '..';
import { generate } from 'generate-password';

import { User, UserService, OktaUserService } from './services/user-service';
import { oktaManageClient } from './services/client-service';

import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { flow, pipe } from 'fp-ts/lib/function';
import * as Console from 'fp-ts/lib/Console';

const createUser = (
  service: UserService,
  password: string,
  email: string,
  firstName: string,
  lastName: string
): TE.TaskEither<string, User> =>
  pipe(
    email,
    service.getUser,
    TE.chain(
      flow(
        O.fold(
          () => service.createUser(email, firstName, lastName, password),
          // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
          (user) =>
            TE.left(
              `User [${email}] already exists with id [${user.id}]. Can not create a new user.`
            )
        )
      )
    ),
    TE.chainFirstIOK((user) =>
      Console.info(
        `Created new user with login [${user.login}] and name [${user.name}].\nPassword: [${password}]`
      )
    )
  );

export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly organisationUrl: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
}> =>
  rootCommand.command(
    'create-user [email]',
    'Creates a new user with an active status, automatically generates and displays a password for the new user. Only works if no other user has the same login information.',
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
      readonly firstName: string;
      readonly lastName: string;
      // eslint-disable-next-line @typescript-eslint/require-await
    }) => {
      const password = String(
        generate({
          length: 10,
          numbers: true,
          symbols: true,
          strict: true,
        })
      );

      const client = oktaManageClient({ ...args });
      const service = new OktaUserService(client);

      const result = await createUser(
        service,
        password,
        args.email,
        args.firstName,
        args.lastName
      )();

      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(result.left);
      }
    }
  );
