import * as okta from '@okta/okta-sdk-nodejs';

/**
 * Subset of Group information provided by Okta. See okta.Group for further information on it's derived type.
 * @see https://developer.okta.com/docs/reference/api/groups/
 */
export type Group = {
  /** The internal Okta identifier. */
  readonly id: string;
  /**
   * Name of the group.
   */
  readonly name: string;
  /**
   * Group type.
   */
  readonly type: string;
};

/**
 * Converts an Okta User into a simplified version that has only
 * the information needed by the tool.
 * @param oktaGroup the Okta group to convert.
 * @returns the converted User.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const oktaGroupAsGroup = (oktaGroup: okta.Group): Group => ({
  id: oktaGroup.id,
  name: oktaGroup.profile.name,
  type: oktaGroup.type,
});

/**
 * Retrieves a group's details from Okta
 * @param groupId the id of the group whose details should be retrieved.
 * @param client the client that should be used to retrieve the details.
 * @returns either the group details or undefined if that group does not exist.
 */
export const getGroup = async (
  groupId: string,
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  client: okta.Client
): Promise<okta.Group | undefined> => {
  return client.getGroup(groupId).catch((error) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return typeof error === 'object' && error.status === 404
      ? Promise.resolve(undefined)
      : Promise.reject(error);
  });
};