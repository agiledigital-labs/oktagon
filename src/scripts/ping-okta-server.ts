import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { RootCommand } from '..';
import * as Console from 'fp-ts/lib/Console';
import { pipe } from 'fp-ts/lib/function';
import { Argv } from 'yargs';
import { oktaAPIError } from '../schema';
import { oktaReadOnlyClient } from './services/client-service';
import { OktaUserService, UserService } from './services/user-service';
import { pingOktaServer } from './services/validation-service';

export const callListUsers = (service: UserService) => service.listUsers();

/**
 * Pings the okta server to see if it is up and running.
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
        }) => pingOktaServer(organisationUrl, clientId)
      )(TE.right({ organisationUrl, clientId }))
    ),
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    TE.chain((response) => {
      // eslint-disable-next-line functional/no-conditional-statement
      if (response.status >= 500) {
        return TE.left(
          new Error('Server error. Please wait and try again later.', {
            cause: response,
          })
        );
      }
      // eslint-disable-next-line functional/no-conditional-statement
      if (response.status >= 400 && response.status < 500) {
        return TE.left(
          new Error(
            `Client error. Please check your client id [${clientId}] and the URL of your organisation [${organisationUrl}].`,
            {
              cause: response,
            }
          )
        );
      }
      // eslint-disable-next-line functional/no-conditional-statement
      if (response.status >= 200 && response.status < 300) {
        return TE.right('Okta server is up and running.');
      }
      return TE.left(
        new Error('Unexpected response from pinging okta server.', {
          cause: response,
        })
      );
    })
  );

/**
 * Validates the credentials of a service.
 * @param result - the result of a service
 * @returns the result of the service if it was successful, otherwise a refined error in consideration to credentials.
 */
export const validateCredentials = <T>(
  result: TE.TaskEither<Error, T>
): TE.TaskEither<Error, T> =>
  pipe(
    result,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    TE.mapLeft((error) => {
      const underlyingError =
        error.cause instanceof Error ? error.cause : error;
      const apiError = oktaAPIError.safeParse(underlyingError);
      const underlyingErrorMessage = underlyingError.message;
      // eslint-disable-next-line functional/no-conditional-statement
      switch (true) {
        case apiError.success &&
          apiError.data.status >= 400 &&
          apiError.data.status < 500:
        case underlyingErrorMessage.startsWith(
          'Unable to convert private key from PEM to JWK:'
        ):
        case underlyingErrorMessage.startsWith('Key type') &&
          underlyingErrorMessage.endsWith('is not supported.'):
        case underlyingErrorMessage ===
          'The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object. Received undefined':
        case underlyingErrorMessage === 'Key type undefined is not supported.':
        case underlyingErrorMessage ===
          'error:0180006C:bignum routines::no inverse':
        case underlyingErrorMessage ===
          'error:1E08010C:DECODER routines::unsupported': {
          return new Error('Failed to decode the private key.', {
            cause: underlyingError,
          });
        }
        default: {
          return underlyingError;
        }
      }
    })
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
    "Pings the okta server to see if it's running and check user credentials",
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    (yargs) => yargs.argv,
    async (args: {
      readonly clientId: string;
      readonly privateKey: string;
      readonly organisationUrl: string;
    }) => {
      const client = oktaReadOnlyClient({ ...args });
      const userService = new OktaUserService(client);

      const { clientId, organisationUrl } = args;
      const result = await pipe(
        validateOktaServerIsRunning(clientId, organisationUrl),
        TE.tapIO(Console.info),
        // eslint-disable-next-line functional/functional-parameters
        TE.chain(() => callListUsers(userService)),
        validateCredentials
      )();
      // eslint-disable-next-line functional/no-conditional-statement
      if (E.isLeft(result)) {
        // eslint-disable-next-line functional/no-throw-statement
        throw result.left;
      }
    }
  );
