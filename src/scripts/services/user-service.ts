import * as okta from '@okta/okta-sdk-nodejs';

/**
 * Subset of User information provided by Okta. See okta.User for further information on it's derived type.
 * @see https://developer.okta.com/docs/reference/api/users/
 */
export type User = {
  /** The internal Okta identifier. */
  readonly id: string;
  /**
   * User login string.
   */
  readonly login: string;
  /**
   * User email adress.
   */
  readonly email: string;
  /**
   * Name of the user.
   */
  readonly name: string;
  /**
   * User status as a string.
   */
  readonly status: string;
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const user = (oktaUser: okta.User) => ({
  id: oktaUser.id,
  login: oktaUser.profile.login,
  email: oktaUser.profile.email,
  name: oktaUser.profile.displayName,
  status: String(oktaUser.status),
});

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
 * @returns the Okta client.
 */
export const oktaReadOnlyClient = (oktaConfiguration: OktaConfiguration) =>
  new okta.Client({
    ...oktaConfiguration,
    authorizationMode: 'PrivateKey',
    scopes: ['okta.users.read'],
  });

/**
 * Creates a client that can read and manage user information in Okta.
 * @param oktaConfiguration configuration to use when construction the client.
 * @returns the Okta client.
 */
export const oktaManageClient = (oktaConfiguration: OktaConfiguration) =>
  new okta.Client({
    ...oktaConfiguration,
    authorizationMode: 'PrivateKey',
    scopes: ['okta.users.manage'],
  });
