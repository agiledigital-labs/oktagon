/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-expression-statement */
/* eslint-disable functional/functional-parameters */
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { UserService } from './services/user-service';

import {
  baseUserService,
  deactivatedUser,
  user,
} from './__fixtures__/data-providers';
import { activateUser } from './activate-user';

describe('Activating users', () => {
  it('passes when attempting to activate a user', async () => {
    // Given a user that is deactivated
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.right(deactivatedUser)),
      getUser: () => TE.right(O.some(deactivatedUser)),
    };

    // When we attempt to activate the user
    const result = await activateUser(userService, deactivatedUser.id)();

    // Then the user should be returned
    expect(result).toEqualRight(deactivatedUser);
    expect(userService.activateUser).toHaveBeenCalled();
  });

  it('fails when attempting to activate a user and the request fails', async () => {
    // Given a user
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.left('expected error')),
      getUser: () => TE.right(O.some(user)),
    };

    // When we attempt to activate the user and the request fails
    const result = await activateUser(userService, user.id)();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');
    expect(userService.activateUser).toHaveBeenCalled();
  });

  it('fails when attempting to activate a non-existent user', async () => {
    // Given a user that does not exist
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.right(user)),
      getUser: () => TE.right(O.none),
    };

    // When we attempt to activate a non-existent user
    const result = await activateUser(userService, user.id)();

    // Then we should have a left
    expect(result).toEqualLeft(
      'User [user_id] does not exist. Cannot activate.'
    );
    expect(userService.activateUser).not.toHaveBeenCalled();
  });

  it('fails when retrieving the user fails', async () => {
    // Given that activateUser works, but getUser retrieves no valid users
    const userService: UserService = {
      ...baseUserService(),
      activateUser: jest.fn(() => TE.right(user)),
      getUser: () => TE.left('expected error'),
    };

    // When we attempt to activate a user but retrieving the user fails
    const result = await activateUser(userService, user.id)();

    // Then we should have a left
    expect(result).toEqualLeft('expected error');

    // And we also expect the user service's activateUser to not have been called
    expect(userService.activateUser).not.toHaveBeenCalled();
  });
});
