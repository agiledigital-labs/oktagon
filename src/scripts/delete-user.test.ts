/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */
/* eslint-disable functional/functional-parameters */
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { UserService } from './services/user-service';
import { deleteUser } from './delete-user';

import * as DP from './__fixtures__/data-providers';

describe('Deleting users without using force', () => {
  it('passes when attempting to delete a deprovisioned user', async () => {
    // Given a deleteUser function that can succsessfully delete a given user
    const userService: UserService = {
      ...DP.baseUserService(),
      deleteUser: () => TE.right(DP.deactivatedUser),
      getUser: () => TE.right(O.some(DP.deactivatedUser)),
    };

    // When we attempt to delete an existing deprovisioned user
    const result = await deleteUser(
      userService,
      DP.deactivatedUser.id,
      false
    )();

    // Then we should have a right
    expect(result).toEqualRight(DP.deactivatedUser);
  });

  it('fails when attempting to delete a non-deprovisioned user', async () => {
    // Given a deleteUser function that can succsessfully delete a given user (which theoretically cannot happen if not deprovisioned)
    const userService: UserService = {
      ...DP.baseUserService(),
      deleteUser: jest.fn(() => TE.right(DP.user)),
      getUser: () => TE.right(O.some(DP.user)),
    };

    // When we attempt to delete an existing non-deprovisioned user
    const result = await deleteUser(userService, DP.user.id, false)();

    // Then we should have a left
    expect(result).toEqualLeft(
      'User [user_id] has not been deprovisioned. Deprovision before deleting.'
    );

    // And we also expect delete/decativate user to have never been called
    expect(userService.deleteUser).not.toHaveBeenCalled();
    expect(userService.deactivateUser).not.toHaveBeenCalled();
  });
});

describe('Deleting a user with force', () => {
  it('passes when attempting to delete a non-deprovisioned user', async () => {
    // Given a deleteUser/deactivateUser function that can succsessfully deactivate and delete a given user
    const userService: UserService = {
      ...DP.baseUserService(),
      deleteUser: () => TE.right(DP.user),
      deactivateUser: jest.fn(() => TE.right(DP.user)),
      getUser: () => TE.right(O.some(DP.user)),
    };

    // When we attempt to delete an existing non-deprovisioned user
    const result = await deleteUser(userService, DP.user.id, true)();

    // Then we should have a right
    expect(result).toEqualRight(DP.user);

    // And we also expect decativate to have been called
    expect(userService.deactivateUser).toHaveBeenCalled();
  });

  it('passes when attempting to delete an already deprovisioned user', async () => {
    // Given a deleteUser function that can succsessfully delete a given user
    const userService: UserService = {
      ...DP.baseUserService(),
      deleteUser: () => TE.right(DP.deactivatedUser),
      getUser: () => TE.right(O.some(DP.deactivatedUser)),
    };

    // When we attempt to delete an existing non-deprovisioned user
    const result = await deleteUser(userService, DP.deactivatedUser.id, true)();

    // Then we should have a right
    expect(result).toEqualRight(DP.deactivatedUser);

    // And we also expect decativate to have not been called
    expect(userService.deactivateUser).not.toHaveBeenCalled();
  });

  it('fails when attempting to deprovision a user fails', async () => {
    // Given the deactivateUser function that cannot deactivate a user, but deleteUser and getUser works fine
    const userService: UserService = {
      ...DP.baseUserService(),
      deleteUser: jest.fn(() => TE.right(DP.user)),
      deactivateUser: () => TE.left('expected error'),
      getUser: () => TE.right(O.some(DP.user)),
    };

    // When we attempt to delete an existing non-deprovisioned user
    const result = await deleteUser(userService, DP.user.id, true)();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');

    // And we also expect the user service's deleteUser to not have been called
    expect(userService.deleteUser).not.toHaveBeenCalled();
  });
});

// Some operations should remain constant regardless of if the force flag is set or not
describe('Deleting a user with or without force', () => {
  test.each([
    ['with force', true],
    ['without force', false],
  ])(
    'fails when attempting to delete a user does not work, %s',
    async (_desc, force) => {
      // Given that getUser works, but deleteUser does not
      const userService: UserService = {
        ...DP.baseUserService(),
        deleteUser: () => TE.left('expected error'),
        getUser: () => TE.right(O.some(DP.deactivatedUser)),
      };

      // When we attempt to delete an existing user both with and without force
      const result = await deleteUser(
        userService,
        DP.deactivatedUser.id,
        force
      )();

      // Then we should have a left
      expect(result).toEqualLeft('expected error');
    }
  );

  test.each([
    ['with force', true],
    ['without force', false],
  ])(
    'fails when attempting to delete a non-existent user, %s',
    async (_desc, force) => {
      // Given that deleteUser works, but the user in question does not exist
      const userService: UserService = {
        ...DP.baseUserService(),
        deleteUser: jest.fn(() => TE.right(DP.user)),
        getUser: () => TE.right(O.none),
      };

      // When we attempt to delete an existing user both with and without force
      const result = await deleteUser(userService, DP.user.id, force)();
      // Then we should have a left
      expect(result).toEqualLeft(
        'User [user_id] does not exist. Can not delete.'
      );

      // And we also expect the user service's deleteUser to not have been called
      expect(userService.deleteUser).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['with force', true],
    ['without force', false],
  ])('fails when retreiving the user fails, %s', async (_desc, force) => {
    // Given that deleteUser works, but getUser retrieves no valid users
    const userService: UserService = {
      ...DP.baseUserService(),
      deleteUser: jest.fn(() => TE.right(DP.user)),
      getUser: () => TE.left('expected error'),
    };

    // When we attempt to delete an existing user both with and without force
    const result = await deleteUser(userService, DP.user.id, force)();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');

    // And we also expect the user service's deleteUser to not have been called
    expect(userService.deleteUser).not.toHaveBeenCalled();
  });
});
