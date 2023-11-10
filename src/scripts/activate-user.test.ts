/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */
/* eslint-disable functional/functional-parameters */
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { User, UserService } from './services/user-service';
import * as okta from '@okta/okta-sdk-nodejs';

import {
  baseUserService,
  deactivatedUser,
} from './__fixtures__/data-providers';
import { activateUser } from './activate-user';

describe('Activating users', () => {
  it.each([okta.UserStatus.DEPROVISIONED, okta.UserStatus.STAGED])(
    'passes when attempting to activate a user with status %s',
    async (status) => {
      // Given a user with status status
      const user: User = {
        ...deactivatedUser,
        status: status,
      };
      const userService: UserService = {
        ...baseUserService(),
        activateUser: jest.fn(() => TE.right(user)),
        getUser: () => TE.right(O.some(user)),
      };

      // When we attempt to activate a user with status that isn't DEPROVISIONED or STAGED
      const result = await activateUser(userService, user.id)();

      // Then we should have a left
      expect(result).toEqualRight(user);
      expect(userService.activateUser).toHaveBeenCalled();
    }
  );

  it('fails when attempting to activate a user and the request fails', async () => {
    // Given a user
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.left('expected error')),
      getUser: () => TE.right(O.some(deactivatedUser)),
    };

    // When we attempt to activate the user and the request fails
    const result = await activateUser(userService, deactivatedUser.id)();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');
    expect(userService.activateUser).toHaveBeenCalled();
  });

  it('fails when attempting to activate a non-existent user', async () => {
    // Given a user that does not exist
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.right(deactivatedUser)),
      getUser: () => TE.right(O.none),
    };

    // When we attempt to activate a non-existent user
    const result = await activateUser(userService, deactivatedUser.id)();

    // Then we should have a left
    expect(result).toEqualLeft('User [user_id] does not exist.');
    expect(userService.activateUser).not.toHaveBeenCalled();
  });

  it.each([
    [
      okta.UserStatus.ACTIVE,
      `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. User [user_id] is already ${okta.UserStatus.ACTIVE}.`,
    ],
    [
      okta.UserStatus.PROVISIONED,
      `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please follow through with the activation workflow.`,
    ],
    [
      okta.UserStatus.LOCKED_OUT,
      `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please use the unlock command.`,
    ],
    [
      okta.UserStatus.PASSWORD_EXPIRED,
      `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please instruct user to login with temporary password and follow the password reset process.`,
    ],
    [
      okta.UserStatus.RECOVERY,
      `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please follow through with the activation workflow or restart the workflow using the reactivate-user command.`,
    ],
    [
      okta.UserStatus.SUSPENDED,
      `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please use the unsuspend-user command.`,
    ],
  ])(
    'fails when attempting to activate a user with status %s',
    async (status, errorMessage) => {
      // Given a user with status status
      const user: User = {
        ...deactivatedUser,
        status: status,
      };
      const userService: UserService = {
        ...baseUserService(),
        activateUser: jest.fn(() => TE.right(user)),
        getUser: () => TE.right(O.some(user)),
      };

      // When we attempt to activate a user with status that isn't DEPROVISIONED or STAGED
      const result = await activateUser(userService, user.id)();

      // Then we should have a left
      expect(result).toEqualLeft(errorMessage);
      expect(userService.activateUser).not.toHaveBeenCalled();
    }
  );

  it('fails when retrieving the user fails', async () => {
    // Given that activateUser works, but getUser retrieves no valid users
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.right(deactivatedUser)),
      getUser: () => TE.left('expected error'),
    };

    // When we attempt to activate a user but retrieving the user fails
    const result = await activateUser(userService, deactivatedUser.id)();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');

    // And we also expect the user service's activateUser to not have been called
    expect(userService.activateUser).not.toHaveBeenCalled();
  });
});
