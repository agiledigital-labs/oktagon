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
};

/**
 * Converts an Okta User into a simplified version that has only
 * the information needed by the tool.
 * @param oktaUser the Okta user to convert.
 * @returns the converted User.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const oktaUserAsUser = (oktaUser: okta.User): User => ({
  id: oktaUser.id,
  login: oktaUser.profile.login,
  email: oktaUser.profile.email,
  name: [oktaUser.profile.firstName, oktaUser.profile.lastName]
    .filter((s) => s.length > 0)
    .join(' '),
  status: oktaUser.status,
});

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
