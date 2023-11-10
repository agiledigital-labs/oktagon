/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */
/* eslint-disable functional/functional-parameters */
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { UserService } from './services/user-service';

import { baseUserService, user } from './__fixtures__/data-providers';
import { expirePasswordAndGetTemporaryPassword } from './expire-password-and-get-temporary-password';

describe('Expiring the password for a user and getting a temporary password for a user', () => {
  it('passes when attempting to expire the password for a user and get a temporary password', async () => {
    // Given a user that is active
    const userService: UserService = {
      ...baseUserService(),
      expirePasswordAndGetTemporaryPassword: jest.fn(() =>
        TE.right({ user, temporaryPassword: 'temporaryPassword' })
      ),
      getUser: () => TE.right(O.some(user)),
    };

    // When we attempt to expire the password for a user and get a temporary password
    const result = await expirePasswordAndGetTemporaryPassword(
      userService,
      user.id
    )();

    // Then the user should be returned
    expect(result).toEqualRight({
      user,
      temporaryPassword: 'temporaryPassword',
    });
    expect(
      userService.expirePasswordAndGetTemporaryPassword
    ).toHaveBeenCalled();
  });

  it('fails when attempting to expire the password for a user and get a temporary password and the request fails', async () => {
    // Given a user
    const userService: UserService = {
      ...baseUserService(),
      expirePasswordAndGetTemporaryPassword: jest.fn(() =>
        TE.left('expected error')
      ),
      getUser: () => TE.right(O.some(user)),
    };

    // When we attempt to expire the password for a user and get a temporary password and the request fails
    const result = await expirePasswordAndGetTemporaryPassword(
      userService,
      user.id
    )();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');
    expect(
      userService.expirePasswordAndGetTemporaryPassword
    ).toHaveBeenCalled();
  });

  it('fails when attempting to get a temporary password for a non-existent user', async () => {
    // Given a user that does not exist
    const userService: UserService = {
      ...baseUserService(),
      expirePasswordAndGetTemporaryPassword: jest.fn(() =>
        TE.right({ user, temporaryPassword: 'temporaryPassword' })
      ),
      getUser: () => TE.right(O.none),
    };

    // When we attempt to expire the password for a non-existent user and get a temporary password
    const result = await expirePasswordAndGetTemporaryPassword(
      userService,
      user.id
    )();

    // Then we should have a left
    expect(result).toEqualLeft(
      'User [user_id] does not exist. Cannot get temporary user password.'
    );
    expect(
      userService.expirePasswordAndGetTemporaryPassword
    ).not.toHaveBeenCalled();
  });

  it('fails when retrieving the user fails', async () => {
    // Given that expirePasswordAndGetTemporaryPassword works, but getUser retrieves no valid users
    const userService: UserService = {
      ...baseUserService(),
      expirePasswordAndGetTemporaryPassword: jest.fn(() =>
        TE.right({ user, temporaryPassword: 'temporaryPassword' })
      ),
      getUser: () => TE.left('expected error'),
    };

    // When we attempt to expire the password for a user and get a temporary password but retrieving the user fails
    const result = await expirePasswordAndGetTemporaryPassword(
      userService,
      user.id
    )();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');

    // And we also expect the user service's expirePasswordAndGetTemporaryPassword to not have been called
    expect(
      userService.expirePasswordAndGetTemporaryPassword
    ).not.toHaveBeenCalled();
  });
});
