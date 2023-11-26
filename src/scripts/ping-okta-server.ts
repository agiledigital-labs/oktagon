import fetch from 'node-fetch';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { RootCommand } from '..';
import * as Console from 'fp-ts/lib/Console';
import { pipe } from 'fp-ts/lib/function';
import { Argv } from 'yargs';

export const pingOktaServer = async (
  clientId: string,
  organisationUrl: string
): Promise<TE.TaskEither<Error, string>> => {
  const response = await TE.chain(
    ({
      organisationUrl,
      clientId,
    }: {
      readonly organisationUrl: string;
      readonly clientId: string;
    }) =>
      TE.tryCatch(
        async () => {
          return await fetch(
            `${organisationUrl}/oauth2/default/.well-known/oauth-authorization-server?client_id=${clientId}`
          );
        },
        (error: unknown) => {
          // eslint-disable-next-line functional/no-conditional-statement
          if (error instanceof Error) {
            return error;
          }
          return new Error('Failed to list users.', {
            cause: error,
          });
        }
      )
  )(TE.right({ organisationUrl, clientId }))();

  // eslint-disable-next-line functional/no-conditional-statement
  if (E.isLeft(response)) {
    return TE.left(response.left);
  }
  const rightResponse = response.right;
  // eslint-disable-next-line functional/no-conditional-statement
  if (rightResponse.status >= 500) {
    return TE.left(
      new Error('Server error. Please wait and try again later.', {
        cause: rightResponse,
      })
    );
  }
  // eslint-disable-next-line functional/no-conditional-statement
  if (rightResponse.status >= 400 && rightResponse.status < 500) {
    return TE.left(
      new Error(
        'Client error. Please check your client id and the URL of your organisation.',
        {
          cause: rightResponse,
        }
      )
    );
  }
  // eslint-disable-next-line functional/no-conditional-statement
  if (rightResponse.status >= 200 && rightResponse.status < 300) {
    return TE.right('Okta server is up and running.');
  }
  return TE.left(
    new Error('Unexpected response', {
      cause: rightResponse,
    })
  );
};

export default (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  rootCommand: RootCommand
): Argv<{
  readonly clientId: string;
  readonly privateKey: string;
  readonly organisationUrl: string;
  readonly groupId?: string;
}> =>
  rootCommand.command(
    'list-users2',
    // eslint-disable-next-line quotes
    "Provides a list of all users' ID's, email addresses, display names, and statuses. Allows a specification of a group to list from.",
    // eslint-disable-next-line functional/no-return-void, @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => {
      // eslint-disable-next-line functional/no-expression-statement
      yargs.positional('group', {
        type: 'string',
        alias: ['group-id'],
        // eslint-disable-next-line quotes
        describe: "The group's ID",
      });
    },
    async ({
      clientId,
      organisationUrl,
    }: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
      readonly groupId?: string;
    }) => {
      const result = await pipe(
        await pingOktaServer(clientId, organisationUrl),
        TE.tapIO((message) => Console.info(message))
      )();
      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw result.left;
      }
    }
  );
