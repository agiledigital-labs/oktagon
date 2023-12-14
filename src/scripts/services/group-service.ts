import * as okta from '@okta/okta-sdk-nodejs';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { constant, pipe } from 'fp-ts/function';

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
  ): TE.TaskEither<Error, O.Option<Group>> =>
    TE.tryCatch(
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
        new Error(`Failed fetching group details for [${groupId}].`, {
          cause: error,
        })
    );

  readonly addUserToGroup = (
    userId: string,
    groupId: string
  ): TE.TaskEither<Error, string> =>
    pipe(
      TE.tryCatch(
        () =>
          // eslint-disable-next-line functional/no-this-expression
          this.client
            .getUser(userId)
            // eslint-disable-next-line
            .then((user: okta.User) => user.addToGroup(groupId)),
        (error: unknown) =>
          new Error(`Failed to add user [${userId}] to group [${groupId}].`, {
            cause: error,
          })
      ),
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
      TE.chain((response) =>
        response.ok
          ? TE.right(`Added user [${userId}] to group [${groupId}].`)
          : TE.left(
              new Error('Something went wrong.', {
                cause: response,
              })
            )
      )
    );

  readonly removeUserFromGroup = (
    userId: string,
    groupId: string
  ): TE.TaskEither<Error, string> =>
    pipe(
      TE.tryCatch(
        () =>
          // eslint-disable-next-line functional/no-this-expression
          this.client
            .getGroup(groupId)
            // eslint-disable-next-line
            .then((group: okta.Group) => group.removeUser(userId)),
        (error: unknown) =>
          new Error(
            `Failed to remove user [${userId}] to group [${groupId}].`,
            {
              cause: error,
            }
          )
      ),
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
      TE.chain((response) =>
        response.ok
          ? TE.right(`Removed user [${userId}] from group [${groupId}].`)
          : TE.left(
              new Error('Something went wrong.', {
                cause: response,
              })
            )
      )
    );

  /**
   * Returns a `TaskEither` that resolves to a list of all groups or rejects
   * with an error.
   *
   * @returns A `TaskEither` that resolves to an array of groups or rejects with
   * an error.
   */
  // eslint-disable-next-line functional/functional-parameters
  readonly listGroups: () => TE.TaskEither<Error, readonly Group[]> = () =>
    TE.tryCatch(
      () => {
        /* We need to populate groups with all of the client data so it can be
        returned. */
        // eslint-disable-next-line functional/prefer-readonly-type
        const groups: Group[] = [];

        return (
          // eslint-disable-next-line functional/no-this-expression
          this.client
            .listGroups()
            /* Okta's `listGroups` method returns a custom collection that does
            not allow for any form of mapping, so array mutation is needed. */
            // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types, functional/immutable-data
            .each((oktaGroup) => groups.push(oktaGroupAsGroup(oktaGroup)))
            .then(constant(groups))
        );
      },
      (error: unknown) =>
        new Error('Failed to list groups.', {
          cause: error,
        })
    );

  /**
   * Returns a `TaskEither` that resolves to a list of groups that the user with
   * the given user ID is a member of or rejects with an error.
   *
   * @param userId The user ID of the user whose groups are to be listed.
   * @returns A `TaskEither` that resolves to an array of groups or rejects with
   * an error.
   */
  readonly listUserGroups: (
    userId: string
  ) => TE.TaskEither<Error, readonly Group[]> = (userId) =>
    TE.tryCatch(
      () => {
        /* We need to populate groups with all of the client data so it can be
        returned. */
        // eslint-disable-next-line functional/prefer-readonly-type
        const groups: Group[] = [];

        return (
          // eslint-disable-next-line functional/no-this-expression
          this.client
            .listUserGroups(userId)
            /* Okta's `listUserGroups` method returns a custom collection that
            does not allow for any form of mapping, so array mutation is needed.
            */
            // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types, functional/immutable-data
            .each((oktaGroup) => groups.push(oktaGroupAsGroup(oktaGroup)))
            .then(constant(groups))
        );
      },
      (error: unknown) =>
        new Error('Failed to list user groups.', {
          cause: error,
        })
    );
}

export type GroupService = {
  readonly getGroup: OktaGroupService['getGroup'];
  readonly addUserToGroup: OktaGroupService['addUserToGroup'];
  readonly removeUserFromGroup: OktaGroupService['removeUserFromGroup'];
  readonly listGroups: OktaGroupService['listGroups'];
  readonly listUserGroups: OktaGroupService['listUserGroups'];
};
