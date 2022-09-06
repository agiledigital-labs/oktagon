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
  readonly status: okta.UserStatus;
  /**
   * User password as a string (optional).
   */
  readonly password?: string;
};

/**
 * Converts an Okta User into a simplified version that has only
 * the information needed by the tool.
 * @param oktaUser the Okta user to convert.
 * @returns the converted User.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const oktaUserAsUser = (oktaUser: okta.User) => ({
  id: oktaUser.id,
  login: oktaUser.profile.login,
  email: oktaUser.profile.email,
  name: [oktaUser.profile.firstName, oktaUser.profile.lastName]
    .filter((s) => s.length > 0)
    .join(' '),
  status: oktaUser.status,
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
 * Retrieves a user's details from Okta
 * @param userId the id of the user whose details should be retrieved.
 * @param client the client that should be used to retrieve the details.
 * @returns either the user details or undefined if that user does not exist.
 */
export const getUser = async (
  userId: string,
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  client: okta.Client
): Promise<okta.User | undefined> => {
  return client.getUser(userId).catch((error) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return typeof error === 'object' && error.status === 404
      ? Promise.resolve(undefined)
      : Promise.reject(error);
  });
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
