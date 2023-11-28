import * as okta from '@okta/okta-sdk-nodejs';
import * as TE from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import fetch from 'node-fetch';
import { oktaAPIErrorSchema, urlSchema } from '../../schema';

/**
 * Parses a url to check whether it is valid
 * @param url - the url to parse
 * @returns a TaskEither that resolves to the url if it is valid, otherwise an error.
 */
export const parseUrl = (url: string): TE.TaskEither<Error, string> => {
  const parsedURL = urlSchema.safeParse(url);
  return parsedURL.success
    ? TE.right(parsedURL.data)
    : TE.left(
        new Error(`Client error. Invalid URL [${url}].`, {
          cause: parsedURL.error.issues,
        })
      );
};

/**
 * Validates the credentials provided to the tool.
 * @param client - the Okta client to use to validate the credentials.
 * @returns a TaskEither that resolves to true if the credentials are valid, otherwise an error.
 */
export const validateCredentials = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  client: okta.Client
): TE.TaskEither<Error, boolean> => {
  return pipe(
    TE.tryCatch(
      () => client.oauth.getAccessToken(),
      (error) =>
        new Error('Failed to get access token.', {
          cause: error,
        })
    ),
    // eslint-disable-next-line functional/functional-parameters
    TE.chain(() => TE.right(true)),
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    TE.mapLeft((error) => {
      const underlyingError =
        error.cause instanceof Error ? error.cause : error;
      const apiError = oktaAPIErrorSchema.safeParse(underlyingError);
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
        case underlyingErrorMessage ===
          'error:0180006C:bignum routines::no inverse':
        case underlyingErrorMessage ===
          'error:1E08010C:DECODER routines::unsupported': {
          return new Error('Client error. Please check your private key.', {
            cause: underlyingError,
          });
        }
        default: {
          return underlyingError;
        }
      }
    })
  );
};

/**
 * Pings the okta server to see if it is up and running.
 * @param clientId - the client id of the okta application.
 * @param organisationUrl - the url of the okta organisation.
 * @returns a TaskEither that resolves to a string if the okta server is up and running, otherwise an error message.
 */
export const pingOktaServer = (
  clientId: string,
  organisationUrl: string
): TE.TaskEither<Error, 'Okta server is up and running.'> =>
  pipe(
    TE.tryCatch(
      async () => {
        return await fetch(
          `${organisationUrl}/oauth2/default/.well-known/oauth-authorization-server?client_id=${clientId}`
        );
      },
      (error: unknown) =>
        new Error('Failed to ping okta server.', {
          cause: error,
        })
    ),
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    TE.chain((response) => {
      // eslint-disable-next-line functional/no-conditional-statement
      if (response.status >= 500 && response.status < 600) {
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
