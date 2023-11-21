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
import { activateUserInvoker } from './activate-user';

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
      const activateUserResult = await activateUserInvoker(
        userService,
        user.id,
        false,
        false
      )();

      // Then we should have a left
      expect(activateUserResult).toEqualRight(user);

      // When we attempt to activate a user with status that isn't DEPROVISIONED or STAGED and send activation email
      const activateUserAndSendEmailResult = await activateUserInvoker(
        userService,
        user.id,
        false,
        false
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
    const activateUserResult = await activateUserInvoker(
      userService,
      deactivatedUser.id,
      true,
      false
    )();
    // Then the activateUser function should not have been called
    expect(activateUserResult).toEqualRight(deactivatedUser);

    // When we attempt to activate the user and send activation email in dry run mode
    const activateUserAndSendEmailResult = await activateUserInvoker(
      userService,
      deactivatedUser.id,
      true,
      true
    )();
    // Then the activateUser function should not have been called
    expect(activateUserAndSendEmailResult).toEqualRight(deactivatedUser);

    expect(userService.activateUser).not.toHaveBeenCalled();
  });

  it('fails when attempting to activate a user and the request fails', async () => {
    // Given a user
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.left(new Error('expected error'))),
      getUser: () => TE.right(O.some(deactivatedUser)),
    };

    // When we attempt to activate the user and the request fails
    const activateUserResult = await activateUserInvoker(
      userService,
      deactivatedUser.id,
      false,
      false
    )();

    // Then we should have a left
    expect(activateUserResult).toEqualLeft(new Error('expected error'));

    // When we attempt to activate the user and send activation email, but the request fails
    const activateUserAndSendEmailResult = await activateUserInvoker(
      userService,
      deactivatedUser.id,
      false,
      true
    )();

    // Then we should have a left
    expect(activateUserAndSendEmailResult).toEqualLeft(
      new Error('expected error')
    );
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
    const activateUserResult = await activateUserInvoker(
      userService,
      deactivatedUser.id,
      false,
      false
    )();
    // Then we should have a left
    expect(activateUserResult).toEqualLeft(
      new Error('User [user_id] does not exist. Can not activate.')
    );

    // When we attempt to activate a non-existent user and send activation email
    const activateUserSendEmailResult = await activateUserInvoker(
      userService,
      deactivatedUser.id,
      false,
      true
    )();
    // Then we should have a left
    expect(activateUserSendEmailResult).toEqualLeft(
      new Error('User [user_id] does not exist. Can not activate.')
    );

    expect(userService.activateUser).not.toHaveBeenCalled();
  });

  it.each([
    [
      okta.UserStatus.ACTIVE,
      new Error(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. User [user_id] [test@localhost] has status [${okta.UserStatus.ACTIVE}].`
      ),
    ],
    [
      okta.UserStatus.PROVISIONED,
      new Error(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. User [user_id] [test@localhost] has status [${okta.UserStatus.PROVISIONED}]. To transition user to ACTIVE status, please follow through with the activation workflow.`
      ),
    ],
    [
      okta.UserStatus.LOCKED_OUT,
      new Error(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. User [user_id] [test@localhost] has status [${okta.UserStatus.LOCKED_OUT}]. To transition user to ACTIVE status, please use the unlock command.`
      ),
    ],
    [
      okta.UserStatus.PASSWORD_EXPIRED,
      new Error(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. User [user_id] [test@localhost] has status [${okta.UserStatus.PASSWORD_EXPIRED}]. To transition user to ACTIVE status, please instruct user to login with temporary password and follow the password reset process.`
      ),
    ],
    [
      okta.UserStatus.RECOVERY,
      new Error(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. User [user_id] [test@localhost] has status [${okta.UserStatus.RECOVERY}]. To transition user to ACTIVE status, please follow through with the activation workflow or restart the workflow using the reactivate-user command.`
      ),
    ],
    [
      okta.UserStatus.SUSPENDED,
      new Error(
        `Activation is reserved for users with status ${okta.UserStatus.STAGED} or ${okta.UserStatus.DEPROVISIONED}. User [user_id] [test@localhost] has status [${okta.UserStatus.SUSPENDED}]. To transition user to ACTIVE status, please use the unsuspend-user command.`
      ),
    ],
  ])(
    'fails when attempting to activate a user with status %s',
    async (status, error) => {
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
      const activateUserResult = await activateUserInvoker(
        userService,
        user.id,
        false,
        false
      )();

      // Then we should have a left
      expect(activateUserResult).toEqualLeft(error);

      // When we attempt to activate a user with status that isn't DEPROVISIONED or STAGED and send activation email
      const activateUserSendEmailResult = await activateUserInvoker(
        userService,
        user.id,
        false,
        true
      )();

      // Then we should have a left
      expect(activateUserSendEmailResult).toEqualLeft(error);
      expect(userService.activateUser).not.toHaveBeenCalled();
    }
  );

  it('fails when retrieving the user fails', async () => {
    // Given that activateUser works, but getUser retrieves no valid users
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.right(deactivatedUser)),
      getUser: () => TE.left(new Error('expected error')),
    };

    // When we attempt to activate a user but retrieving the user fails
    const activateUserResult = await activateUserInvoker(
      userService,
      deactivatedUser.id,
      false,
      false
    )();
    // Then we should have a left
    expect(activateUserResult).toEqualLeft(new Error('expected error'));

    // When we attempt to activate a user and send activation email but retrieving the user fails
    const activateUserAndSendEmailResult = await activateUserInvoker(
      userService,
      deactivatedUser.id,
      false,
      true
    )();
    // Then we should have a left
    expect(activateUserAndSendEmailResult).toEqualLeft(
      new Error('expected error')
    );

    // And we also expect the user service's activateUser to not have been called
    expect(userService.activateUser).not.toHaveBeenCalled();
  });
});
