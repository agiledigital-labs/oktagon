import * as okta from '@okta/okta-sdk-nodejs';
import * as TE from 'fp-ts/lib/TaskEither';
import * as O from 'fp-ts/lib/Option';
import { Response } from 'node-fetch';

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

// eslint-disable-next-line functional/no-class
export class OktaGroupService {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  constructor(private readonly client: okta.Client) {}

  /**
   * Retrieves a group's details from Okta
   * @param groupId the id of the group whose details should be retrieved.
   * @param client the client that should be used to retrieve the details.
   * @returns either the group details or undefined if that group does not exist.
   */
  readonly getGroup = (
    groupId: string
  ): TE.TaskEither<string, O.Option<Group>> =>
    TE.tryCatch(
      // eslint-disable-next-line functional/functional-parameters
      () =>
        // eslint-disable-next-line functional/no-this-expression
        this.client
          .getGroup(groupId)
          .then(oktaGroupAsGroup)
          .then(O.some)
          .catch((error) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            return typeof error === 'object' && error.status === 404
              ? Promise.resolve(O.none)
              : Promise.reject(error);
          }),
      (error: unknown) =>
        `Failed fetching group details for [${groupId}] because of [${JSON.stringify(
          error
        )}]`
    );

  readonly addUserToGroup = (
    groupId: string,
    userId: string
  ): TE.TaskEither<string, Response> =>
    TE.tryCatch(
      // eslint-disable-next-line functional/functional-parameters
      () =>
        // eslint-disable-next-line functional/no-this-expression
        this.client
          .getUser(userId)
          // eslint-disable-next-line
          .then((user: okta.User) => user.addToGroup(groupId)),
      (error: unknown) =>
        `Failed to add user [${userId}] to group [${groupId}] because of [${JSON.stringify(
          error
        )}].`
    );

  readonly removeUserFromGroup = (
    groupId: string,
    userId: string
  ): TE.TaskEither<string, Response> =>
    TE.tryCatch(
      // eslint-disable-next-line functional/functional-parameters
      () =>
        // eslint-disable-next-line functional/no-this-expression
        this.client
          .getGroup(groupId)
          // eslint-disable-next-line
            .then((group: okta.Group) => group.removeUser(userId)),
      (error: unknown) =>
        `Failed to remove user [${userId}] to group [${groupId}] because of [${JSON.stringify(
          error
        )}].`
    );

  // eslint-disable-next-line functional/functional-parameters
  readonly listGroups = (): TE.TaskEither<string, readonly Group[]> => {
    // We need to populate groups with all of the client data so it can be
    // returned. Okta's listGroups() function returns a custom collection that
    // does not allow for any form of mapping, so array mutation is needed.

    return TE.tryCatch(
      // eslint-disable-next-line functional/functional-parameters
      () => {
        // eslint-disable-next-line functional/prefer-readonly-type
        const groups: Group[] = [];

        return (
          // eslint-disable-next-line functional/no-this-expression
          this.client
            .listGroups()
            // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
            .each((oktaGroup) => {
              // eslint-disable-next-line functional/immutable-data
              return groups.push(oktaGroupAsGroup(oktaGroup));
            })
            // eslint-disable-next-line functional/functional-parameters
            .then(() => {
              return groups;
            })
        );
      },
      (error: unknown) =>
        `Failed to list groups because of [${JSON.stringify(error)}].`
    );
  };
}

export type GroupService = {
  readonly getGroup: OktaGroupService['getGroup'];
  readonly addUserToGroup: OktaGroupService['addUserToGroup'];
  readonly removeUserFromGroup: OktaGroupService['removeUserFromGroup'];
  readonly listGroups: OktaGroupService['listGroups'];
};
