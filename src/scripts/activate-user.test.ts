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
import {
  activateUser,
  activateUserAndSendEmail,
  activateUserHandler,
  dryRunActivateUser,
  dryRunActivateUserAndSendEmail,
} from './activate-user';

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
      const activateUserResult = await activateUserHandler(
        userService,
        user.id,
        activateUser(userService)
      )();

      // Then we should have a left
      expect(activateUserResult).toEqualRight(user);

      // When we attempt to activate a user with status that isn't DEPROVISIONED or STAGED and send activation email
      const activateUserAndSendEmailResult = await activateUserHandler(
        userService,
        user.id,
        activateUserAndSendEmail(userService)
      )();

      // Then we should have a left
      expect(activateUserAndSendEmailResult).toEqualRight(user);

      expect(userService.activateUser).toHaveBeenCalledTimes(2);
    }
  );

  it('does not attempt to activate a user if dryRun is true', async () => {
    // Given a DEPROVISIONED user
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.right(deactivatedUser)),
      getUser: () => TE.right(O.some(deactivatedUser)),
    };

    // When we attempt to activate the user in dry run mode
    const activateUserResult = await activateUserHandler(
      userService,
      deactivatedUser.id,
      dryRunActivateUser
    )();
    // Then the activateUser function should not have been called
    expect(activateUserResult).toEqualRight(deactivatedUser);

    // When we attempt to activate the user and send activation email in dry run mode
    const activateUserAndSendEmailResult = await activateUserHandler(
      userService,
      deactivatedUser.id,
      dryRunActivateUserAndSendEmail
    )();
    // Then the activateUser function should not have been called
    expect(activateUserAndSendEmailResult).toEqualRight(deactivatedUser);

    expect(userService.activateUser).not.toHaveBeenCalled();
  });

  it('fails when attempting to activate a user and the request fails', async () => {
    // Given a user
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.left('expected error')),
      getUser: () => TE.right(O.some(deactivatedUser)),
    };

    // When we attempt to activate the user and the request fails
    const activateUserResult = await activateUserHandler(
      userService,
      deactivatedUser.id,
      activateUser(userService)
    )();

    // Then we should have a left
    expect(activateUserResult).toEqualLeft('expected error');

    // When we attempt to activate the user and send activation email, but the request fails
    const activateUserAndSendEmailResult = await activateUserHandler(
      userService,
      deactivatedUser.id,
      activateUserAndSendEmail(userService)
    )();

    // Then we should have a left
    expect(activateUserAndSendEmailResult).toEqualLeft('expected error');
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
    const activateUserResult = await activateUserHandler(
      userService,
      deactivatedUser.id,
      activateUser(userService)
    )();
    // Then we should have a left
    expect(activateUserResult).toEqualLeft(
      'User [user_id] does not exist. Can not activate.'
    );

    // When we attempt to activate a non-existent user and send activation email
    const activateUserSendEmailResult = await activateUserHandler(
      userService,
      deactivatedUser.id,
      activateUserAndSendEmail(userService)
    )();
    // Then we should have a left
    expect(activateUserSendEmailResult).toEqualLeft(
      'User [user_id] does not exist. Can not activate.'
    );

    expect(userService.activateUser).not.toHaveBeenCalled();
  });

  it.each([
    [
      okta.UserStatus.ACTIVE,
      `User [user_id] [test@localhost] has status [${okta.UserStatus.ACTIVE}]. Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}.`,
    ],
    [
      okta.UserStatus.PROVISIONED,
      `User [user_id] [test@localhost] has status [${okta.UserStatus.PROVISIONED}]. Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please follow through with the activation workflow.`,
    ],
    [
      okta.UserStatus.LOCKED_OUT,
      `User [user_id] [test@localhost] has status [${okta.UserStatus.LOCKED_OUT}]. Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please use the unlock command.`,
    ],
    [
      okta.UserStatus.PASSWORD_EXPIRED,
      `User [user_id] [test@localhost] has status [${okta.UserStatus.PASSWORD_EXPIRED}]. Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please instruct user to login with temporary password and follow the password reset process.`,
    ],
    [
      okta.UserStatus.RECOVERY,
      `User [user_id] [test@localhost] has status [${okta.UserStatus.RECOVERY}]. Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please follow through with the activation workflow or restart the workflow using the reactivate-user command.`,
    ],
    [
      okta.UserStatus.SUSPENDED,
      `User [user_id] [test@localhost] has status [${okta.UserStatus.SUSPENDED}]. Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. To transition user to ACTIVE status, please use the unsuspend-user command.`,
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
      const activateUserResult = await activateUserHandler(
        userService,
        user.id,
        activateUser(userService)
      )();

      // Then we should have a left
      expect(activateUserResult).toEqualLeft(errorMessage);

      // When we attempt to activate a user with status that isn't DEPROVISIONED or STAGED and send activation email
      const activateUserSendEmailResult = await activateUserHandler(
        userService,
        user.id,
        activateUserAndSendEmail(userService)
      )();

      // Then we should have a left
      expect(activateUserSendEmailResult).toEqualLeft(errorMessage);
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
    const activateUserResult = await activateUserHandler(
      userService,
      deactivatedUser.id,
      activateUser(userService)
    )();
    // Then we should have a left
    expect(activateUserResult).toEqualLeft('expected error');

    // When we attempt to activate a user and send activation email but retrieving the user fails
    const activateUserAndSendEmailResult = await activateUserHandler(
      userService,
      deactivatedUser.id,
      activateUserAndSendEmail(userService)
    )();
    // Then we should have a left
    expect(activateUserAndSendEmailResult).toEqualLeft('expected error');

    // And we also expect the user service's activateUser to not have been called
    expect(userService.activateUser).not.toHaveBeenCalled();
  });
});
