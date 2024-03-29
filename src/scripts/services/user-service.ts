import * as okta from '@okta/okta-sdk-nodejs';
import * as TE from 'fp-ts/lib/TaskEither';
import * as O from 'fp-ts/lib/Option';
import { Group } from './group-service';
import { pipe } from 'fp-ts/lib/function';

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
   * Whether the user is deactivated.
   */
  readonly deactivated: boolean;
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
  deactivated: oktaUser.status === okta.UserStatus.DEPROVISIONED,
});

// eslint-disable-next-line functional/no-class
export class OktaUserService {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  constructor(private readonly client: okta.Client) {}

  /**
   * Retrieves a user's details from Okta
   * @param client the client that should be used to retrieve the details.
   * @param userId the id of the user whose details should be retrieved.
   * @returns either the user details or undefined if that user does not exist.
   */
  readonly getUser = (userId: string): TE.TaskEither<Error, O.Option<User>> =>
    TE.tryCatch(
      () =>
        // eslint-disable-next-line functional/no-this-expression
        this.client
          .getUser(userId)
          .then(oktaUserAsUser)
          .then(O.some)
          .catch((error) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            return typeof error === 'object' && error.status === 404
              ? Promise.resolve(O.none)
              : Promise.reject(error);
          }),
      (error: unknown) =>
        new Error(`Failed fetching user details for [${userId}].`, {
          cause: error,
        })
    );

  readonly createUser = (
    email: string,
    firstName: string,
    lastName: string,
    password: string
  ): TE.TaskEither<Error, User> => {
    const userToCreate = {
      profile: {
        firstName: firstName,
        lastName: lastName,
        email: email,
        login: email,
      },
      credentials: {
        password: { value: password },
      },
    };
    return TE.tryCatch(
      // eslint-disable-next-line functional/no-this-expression
      () => this.client.createUser(userToCreate).then(oktaUserAsUser),
      (error: unknown) =>
        new Error(`Failed to create user [${email}].`, {
          cause: error,
        })
    );
  };

  readonly listUsers = (
    listAll: boolean
  ): TE.TaskEither<Error, readonly User[]> =>
    // eslint-disable-next-line functional/no-this-expression
    this.privateListUsers(TE.right(this.client), listAll);

  readonly listUsersInGroup = (
    group: Group,
    listAll: boolean
  ): TE.TaskEither<Error, readonly User[]> =>
    pipe(
      group,
      (group: Group) =>
        TE.tryCatch(
          // eslint-disable-next-line functional/no-this-expression
          () => this.client.getGroup(group.id),
          (error: unknown) =>
            new Error(`Failed to list users in group [${group.id}].`, {
              cause: error,
            })
        ),
      // eslint-disable-next-line functional/no-this-expression
      (group) => this.privateListUsers(group, listAll)
    );

  /**
   * Lists all users in a group or client.
   * @param groupOrClient - Either a group or a client
   * @param listAl - Whether to list all users or just non-deprovisioned users
   * @link https://developer.okta.com/docs/reference/api/users/#list-all-users
   * @returns a list of users
   */
  readonly privateListUsers = (
    groupOrClient: TE.TaskEither<Error, okta.Group | okta.Client>,
    listAll: boolean
  ) =>
    // We need to populate users with all of the client data so it can be
    // returned. Okta's listUsers() function returns a custom collection that
    // does not allow for any form of mapping, so array mutation is needed.
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    TE.chain((maybeGroupOrClient: okta.Client | okta.Group) =>
      TE.tryCatch(
        () => {
          // eslint-disable-next-line functional/prefer-readonly-type
          const users: User[] = [];
          return (
            maybeGroupOrClient
              .listUsers({
                // Without this filter, Okta will only return non-deprovisioned users.
                // link: https://developer.okta.com/docs/reference/api/users/#list-all-users
                filter: listAll
                  ? Object.keys(okta.UserStatus)
                      .map((status) => `status eq "${status}"`)
                      .join(' or ')
                  : undefined,
              })
              // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
              .each((oktaUser) => {
                // eslint-disable-next-line functional/immutable-data
                return users.push(oktaUserAsUser(oktaUser));
              })
              // eslint-disable-next-line functional/functional-parameters
              .then(() => {
                return users;
              })
          );
        },
        (error: unknown) =>
          new Error('Failed to list users.', {
            cause: error,
          })
      )
    )(groupOrClient);

  readonly deleteUser = (userId: string): TE.TaskEither<Error, User> =>
    TE.tryCatch(
      () =>
        // eslint-disable-next-line functional/no-this-expression, @typescript-eslint/prefer-readonly-parameter-types
        this.client.getUser(userId).then((user) =>
          user
            .delete({
              sendEmail: false,
            })
            // eslint-disable-next-line functional/functional-parameters
            .then(() => oktaUserAsUser(user))
        ),
      (error: unknown) =>
        new Error(`Failed to delete user [${userId}].`, {
          cause: error,
        })
    );

  readonly deactivateUser = (userId: string): TE.TaskEither<Error, User> =>
    TE.tryCatch(
      () =>
        // eslint-disable-next-line functional/no-this-expression, @typescript-eslint/prefer-readonly-parameter-types
        this.client.getUser(userId).then((user) =>
          user
            .deactivate({
              sendEmail: false,
            })
            // eslint-disable-next-line functional/functional-parameters
            .then(() => oktaUserAsUser(user))
        ),
      (error: unknown) =>
        new Error(`Failed to deactivate user [${userId}].`, {
          cause: error,
        })
    );

  /**
   * Activates a user in Okta.
   * @param userId - the id of the user to activate
   * @param sendEmail - whether to send an activation email to the user
   * @returns the activated user
   */
  readonly activateUser = (
    userId: string,
    sendEmail: boolean
  ): TE.TaskEither<Error, User> =>
    TE.tryCatch(
      () =>
        // eslint-disable-next-line functional/no-this-expression, @typescript-eslint/prefer-readonly-parameter-types
        this.client.getUser(userId).then((user) =>
          user
            .activate({
              sendEmail,
            })
            // eslint-disable-next-line functional/functional-parameters
            .then(() => oktaUserAsUser(user))
        ),
      (error: unknown) =>
        new Error(`Failed to activate user [${userId}].`, {
          cause: error,
        })
    );

  readonly expirePasswordAndGetTemporaryPassword = (
    userId: string
  ): TE.TaskEither<
    Error,
    { readonly user: User; readonly temporaryPassword: string }
  > =>
    TE.tryCatch(
      () =>
        // eslint-disable-next-line functional/no-this-expression, @typescript-eslint/prefer-readonly-parameter-types
        this.client.getUser(userId).then((user) =>
          user
            .expirePasswordAndGetTemporaryPassword()
            .then((oktaTempPassword) => ({
              user: oktaUserAsUser(user),
              temporaryPassword: oktaTempPassword.tempPassword,
            }))
        ),
      (error: unknown) =>
        new Error(`Failed to expire user password [${userId}].`, {
          cause: error,
        })
    );
}

export type UserService = {
  readonly createUser: OktaUserService['createUser'];
  readonly listUsers: OktaUserService['listUsers'];
  readonly listUsersInGroup: OktaUserService['listUsersInGroup'];
  readonly getUser: OktaUserService['getUser'];
  readonly deleteUser: OktaUserService['deleteUser'];
  readonly deactivateUser: OktaUserService['deactivateUser'];
  readonly activateUser: OktaUserService['activateUser'];
  readonly expirePasswordAndGetTemporaryPassword: OktaUserService['expirePasswordAndGetTemporaryPassword'];
};
