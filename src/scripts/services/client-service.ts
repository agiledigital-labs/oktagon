import * as okta from '@okta/okta-sdk-nodejs';
import { TokenEndpointResponse } from '@okta/okta-sdk-nodejs/src/types/oauth';
import * as TE from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';

/**
 * Configuration required to create an Okta client.
 */
export type OktaConfiguration = {
  /** The identifier of the client application in Okta. */
  readonly clientId: string;
  /** JSON encoded private key for the application. */
  readonly privateKey: string;
  /** URL of the Okta organisation. */
  readonly organisationUrl: string;
};

/**
 * Creates a client that can read user information from Okta.
 * @param oktaConfiguration configuration to use when construction the client.
 * @param scopes read scopes to be used with the client
 * @returns the Okta client.
 */
export const oktaReadOnlyClient = (
  oktaConfiguration: OktaConfiguration,
  scopes: readonly string[] = ['users']
) =>
  new okta.Client({
    ...oktaConfiguration,
    authorizationMode: 'PrivateKey',
    scopes: scopes.map((scope) => 'okta.' + scope + '.read'),
  });

/**
 * Creates a client that can read and manage user information in Okta.
 * @param oktaConfiguration configuration to use when construction the client.
 * @param scopes manage scopes to be used with the client
 * @returns the Okta client.
 */
export const oktaManageClient = (
  oktaConfiguration: OktaConfiguration,
  scopes: readonly string[] = ['users']
): okta.Client =>
  new okta.Client({
    ...oktaConfiguration,
    authorizationMode: 'PrivateKey',
    scopes: scopes.map((scope) => 'okta.' + scope + '.manage'),
  });

/**
 * Validates the credentials provided to the tool.
 * @param client - the Okta client to use to validate the credentials.
 * @returns a TaskEither that resolves to the token endpoint response if the credentials are valid, otherwise an error.
 */
export const validateCredentials = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  client: okta.Client
): TE.TaskEither<Error, TokenEndpointResponse> => {
  return pipe(
    TE.tryCatch(
      () => client.oauth.getAccessToken(),
      (error) =>
        new Error('Failed to get access token', {
          cause: error,
        })
    )
  );
};
