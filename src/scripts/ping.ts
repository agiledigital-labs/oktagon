import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { RootCommand } from '..';
import * as Console from 'fp-ts/lib/Console';
import { pipe } from 'fp-ts/lib/function';
import { Argv } from 'yargs';
import { oktaReadOnlyClient } from './services/client-service';
import { pingOktaServer, validateCredentials } from './services/okta-service';
import * as okta from '@okta/okta-sdk-nodejs';

/**
 * Validates that the okta server is up and running.
 * @param clientId - the client id of the okta application.
 * @param organisationUrl - the url of the okta organisation.
 * @returns a TaskEither that resolves to a string if the okta server is up and running, otherwise an error message.
 */
export const validateOktaServerIsRunning = (
  clientId: string,
  organisationUrl: string
): TE.TaskEither<Error, 'Okta server is up and running.'> =>
  pipe(
    Console.info('Pinging okta server...'),
    TE.rightIO,
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() =>
      TE.chain(
        ({
          organisationUrl,
          clientId,
        }: {
          readonly organisationUrl: string;
          readonly clientId: string;
        }) => pingOktaServer(clientId, organisationUrl)
      )(TE.right({ organisationUrl, clientId }))
    )
  );

/**
 * Validates that the okta server is up and running and that the credentials are valid.
 * @param client - the okta client
 * @param clientId - the client id of the okta application.
 * @param organisationUrl - the url of the okta organisation.
 * @returns a TaskEither that resolves to a string if the okta server is up and running, otherwise an error message.
 */
export const validateOktaServerAndCredentials = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  client: okta.Client,
  clientId: string,
  organisationUrl: string
) =>
  pipe(
    validateOktaServerIsRunning(clientId, organisationUrl),
    TE.tapIO(Console.info),
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => validateCredentials(client))
  );

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
    'ping',
    // eslint-disable-next-line quotes
    "Pings the okta server to see if it's running and check user credentials along with organisation url",
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => yargs.argv,
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
    }) => {
      const client = oktaReadOnlyClient({ ...args });

      const { clientId, organisationUrl } = args;
      const result = await validateOktaServerAndCredentials(
        client,
        clientId,
        organisationUrl
      )();
      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw result.left;
      }
    }
  );
