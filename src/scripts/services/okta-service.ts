import * as okta from '@okta/okta-sdk-nodejs';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import fetch from 'node-fetch';
import { oktaAPIErrorSchema, urlSchema } from '../../schema';
import { ReadonlyDate, ReadonlyURL } from 'readonly-types';

/**
 * Parses a url to check whether it is valid
 * @param url - the url to parse
 * @returns a TaskEither that resolves to the url if it is valid, otherwise an error.
 */
export const parseUrl = (url: string): E.Either<Error, ReadonlyURL> => {
  const parsedURL = urlSchema.safeParse(url);
  return parsedURL.success
    ? E.right(parsedURL.data)
    : E.left(
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
 * Retrieves logs from the okta server. Unlike other service methods, this method does not filter the Okta specific types
 * down into a domain specific one because the primary use case of this method is to provide flexible display to the end user
 * in conjunction with another tool like `jq`.
 *
 * @param client the Okta client to use to retrieve the logs.
 * @param limit the maximum number of logs to retrieve.
 * @param query the query to filter the logs by (e.g. OIDC).
 * @param filter the filter to filter the logs by (e.g. eventType eq "user.session.start").
 * @param since the date from which to retrieve logs.
 * @param until the date until which to retrieve logs.
 * @returns the logs retrieved from the Okta server.
 */
export const retrieveLogs = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  client: okta.Client,
  limit: number,
  query?: string,
  filter?: string,
  since?: ReadonlyDate,
  until?: ReadonlyDate
) => {
  return pipe(
    TE.tryCatch(
      // eslint-disable-next-line functional/no-return-void
      async () => {
        // eslint-disable-next-line functional/no-let, functional/prefer-readonly-type
        const logs: okta.LogEvent[] = [];
        return await client
          .getLogs({
            limit,
            q: query,
            filter,
            since: since?.toISOString(),
            until: until?.toISOString(),
          })
          // eslint-disable-next-line functional/immutable-data, @typescript-eslint/prefer-readonly-parameter-types
          .each((log) => logs.push(log))
          // eslint-disable-next-line functional/functional-parameters
          .then(() => logs);
      },
      (error) =>
        new Error('Failed to retrieve logs.', {
          cause: error,
        })
    )
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
