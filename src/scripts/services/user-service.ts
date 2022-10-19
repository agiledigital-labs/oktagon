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
  readonly getUser = (userId: string): TE.TaskEither<string, O.Option<User>> =>
    TE.tryCatch(
      // eslint-disable-next-line functional/functional-parameters
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
        `Failed fetching user details for [${userId}] because of [${JSON.stringify(
          error
        )}]`
    );

  readonly createUser = (
    email: string,
    firstName: string,
    lastName: string,
    password: string
  ): TE.TaskEither<string, User> => {
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
      // eslint-disable-next-line functional/functional-parameters, functional/no-this-expression
      () => this.client.createUser(userToCreate).then(oktaUserAsUser),
      (error: unknown) =>
        `Failed to create user [${email}] because of [${JSON.stringify(
          error
        )}].`
    );
  };

  // eslint-disable-next-line functional/functional-parameters
  readonly listUsers = (): TE.TaskEither<string, readonly User[]> =>
    // eslint-disable-next-line functional/no-this-expression
    this.privateListUsers(TE.right(this.client));

  readonly listUsersInGroup = (
    group: Group
  ): TE.TaskEither<string, readonly User[]> =>
    pipe(
      group,
      (group: Group) =>
        TE.tryCatch(
          // eslint-disable-next-line functional/functional-parameters, functional/no-this-expression
          () => this.client.getGroup(group.id),
          (error: unknown) => `Fail ${JSON.stringify(error)}`
        ),
      // eslint-disable-next-line functional/no-this-expression
      this.privateListUsers
    );

  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  readonly privateListUsers = (
    groupOrClient: TE.TaskEither<string, okta.Group | okta.Client>
  ) =>
    // We need to populate users with all of the client data so it can be
    // returned. Okta's listUsers() function returns a custom collection that
    // does not allow for any form of mapping, so array mutation is needed.
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    TE.chain((maybeGroupOrClient: okta.Client | okta.Group) =>
      TE.tryCatch(
        // eslint-disable-next-line functional/functional-parameters
        () => {
          // eslint-disable-next-line functional/prefer-readonly-type
          const users: User[] = [];
          return (
            maybeGroupOrClient
              .listUsers()
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
          `Failed to list users because of [${JSON.stringify(error)}].`
      )
    )(groupOrClient);

  readonly deleteUser = (userId: string): TE.TaskEither<string, User> =>
    TE.tryCatch(
      // eslint-disable-next-line functional/functional-parameters
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
        `Failed to delete user [${userId}] because of [${JSON.stringify(
          error
        )}].`
    );

  readonly deactivateUser = (userId: string): TE.TaskEither<string, User> =>
    TE.tryCatch(
      // eslint-disable-next-line functional/functional-parameters
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
        `Failed to deactivate user [${userId}] because of [${JSON.stringify(
          error
        )}].`
    );
}

export type UserService = {
  readonly createUser: OktaUserService['createUser'];
  readonly listUsers: OktaUserService['listUsers'];
  readonly listUsersInGroup: OktaUserService['listUsersInGroup'];
  readonly getUser: OktaUserService['getUser'];
  readonly deleteUser: OktaUserService['deleteUser'];
  readonly deactivateUser: OktaUserService['deactivateUser'];
};
